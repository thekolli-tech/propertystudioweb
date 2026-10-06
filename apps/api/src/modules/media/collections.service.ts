import { Injectable } from '@nestjs/common';
import {
  type AddMediaCollectionItemRequest,
  type CreateMediaCollectionRequest,
  type MediaCollectionDetail,
  type MediaCollectionListResponse,
  type MediaCollectionSummary,
  type UpdateMediaCollectionRequest,
} from '@property-studio/contracts';
import { type CursorPaginationQuery } from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { MediaAccessService } from './media-access.service';
import { buildSeoMetadata, resolveIndexable, slugify, toIso } from './media-seo.util';

type CollectionListQuery = CursorPaginationQuery & {
  category?: string;
  status?: MediaCollectionSummary['status'];
  visibility?: MediaCollectionSummary['visibility'];
  organizationPublicId?: string;
};

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: MediaAccessService,
  ) {}

  async listPublic(query: CollectionListQuery): Promise<MediaCollectionListResponse> {
    const rows = await this.prisma.mediaCollection.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { publicId: query.cursor }, skip: 1 } : {}),
      include: {
        organization: true,
        coverMedia: true,
        _count: { select: { items: true } },
      },
    });
    const page = rows.slice(0, query.limit);
    return {
      collections: page.map((row) => this.toSummary(row)),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  async getPublic(slug: string): Promise<MediaCollectionDetail> {
    const row = await this.prisma.mediaCollection.findFirst({
      where: { slug, deletedAt: null },
      include: {
        organization: true,
        coverMedia: true,
        items: {
          include: { mediaAsset: true, editorial: true },
          orderBy: [{ sortOrder: 'asc' }, { publicId: 'asc' }],
        },
        _count: { select: { items: true } },
      },
    });
    if (!row || !this.access.isPubliclyReadableCollection(row)) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return this.toDetail(row);
  }

  async create(
    actor: AuthActor,
    body: CreateMediaCollectionRequest,
    request?: AuthenticatedRequest,
  ): Promise<MediaCollectionDetail> {
    await this.access.requirePermission(actor, 'collections:create', 'collection', request);
    const organizationId = await this.access.resolveOrganizationId(
      actor,
      body.organizationPublicId,
      request,
    );
    const allowed = await this.access.canManageOrganizationMedia(
      actor,
      organizationId,
      'collections:create',
    );
    if (!allowed) {
      return await this.access.deny(
        actor,
        body.organizationPublicId ?? 'collection',
        request,
        'collection',
      );
    }

    const coverMediaId = await this.resolveCoverMediaId(body.coverMediaPublicId, organizationId);
    const visibility = body.visibility ?? 'PRIVATE';

    const created = await this.prisma.mediaCollection.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextMediaCollectionPublicId(),
        organizationId,
        ownerUserId: actor.userId,
        title: body.title,
        slug: body.slug ?? slugify(body.title),
        description: body.description ?? null,
        coverMediaId,
        visibility,
        status: 'DRAFT',
        category: body.category ?? null,
        tags: body.tags ?? [],
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        indexable: false,
        createdBy: actor.userId,
      },
      include: {
        organization: true,
        coverMedia: true,
        items: {
          include: { mediaAsset: true, editorial: true },
          orderBy: [{ sortOrder: 'asc' }, { publicId: 'asc' }],
        },
        _count: { select: { items: true } },
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'collection.created',
      resourceType: 'collection',
      resourceId: created.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(created);
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateMediaCollectionRequest,
    request?: AuthenticatedRequest,
  ): Promise<MediaCollectionDetail> {
    const collection = await this.findOrDeny(actor, publicId, request);
    await this.access.requireCollectionManage(actor, collection, 'collections:update', request);

    const coverMediaId =
      body.coverMediaPublicId === undefined
        ? undefined
        : await this.resolveCoverMediaId(body.coverMediaPublicId, collection.organizationId);

    await this.prisma.mediaCollection.update({
      where: { id: collection.id },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description === undefined ? undefined : body.description,
        coverMediaId,
        visibility: body.visibility,
        category: body.category === undefined ? undefined : body.category,
        tags: body.tags,
        seoTitle: body.seoTitle === undefined ? undefined : body.seoTitle,
        seoDescription: body.seoDescription === undefined ? undefined : body.seoDescription,
        indexable:
          body.visibility !== undefined
            ? resolveIndexable(body.visibility, collection.indexable)
            : undefined,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: collection.organizationId,
      action: 'collection.updated',
      resourceType: 'collection',
      resourceId: collection.publicId,
      requestId: request?.requestId,
    });
    return this.getManaged(actor, publicId, request);
  }

  async addItem(
    actor: AuthActor,
    publicId: string,
    body: AddMediaCollectionItemRequest,
    request?: AuthenticatedRequest,
  ): Promise<MediaCollectionDetail> {
    const collection = await this.findOrDeny(actor, publicId, request);
    await this.access.requireCollectionManage(actor, collection, 'collections:update', request);

    if (body.itemKind === 'MEDIA') {
      if (!body.mediaPublicId) {
        throw new AppError('VALIDATION_ERROR', 'mediaPublicId is required for MEDIA items.');
      }
      const media = await this.prisma.mediaAsset.findFirst({
        where: { publicId: body.mediaPublicId, deletedAt: null },
      });
      if (!media) return await this.access.deny(actor, body.mediaPublicId, request);
      await this.prisma.mediaCollectionItem.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextMediaCollectionItemPublicId(),
          collectionId: collection.id,
          itemKind: 'MEDIA',
          mediaAssetId: media.id,
          sortOrder: body.sortOrder,
          createdBy: actor.userId,
        },
      });
    } else {
      if (!body.editorialPublicId) {
        throw new AppError('VALIDATION_ERROR', 'editorialPublicId is required for EDITORIAL items.');
      }
      const editorial = await this.prisma.editorialContent.findFirst({
        where: { publicId: body.editorialPublicId, deletedAt: null },
      });
      if (!editorial) {
        return await this.access.deny(actor, body.editorialPublicId, request, 'editorial');
      }
      await this.prisma.mediaCollectionItem.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextMediaCollectionItemPublicId(),
          collectionId: collection.id,
          itemKind: 'EDITORIAL',
          editorialId: editorial.id,
          sortOrder: body.sortOrder,
          createdBy: actor.userId,
        },
      });
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: collection.organizationId,
      action: 'collection.item_added',
      resourceType: 'collection',
      resourceId: collection.publicId,
      requestId: request?.requestId,
    });
    return this.getManaged(actor, publicId, request);
  }

  async publish(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<MediaCollectionDetail> {
    const collection = await this.findOrDeny(actor, publicId, request);
    await this.access.requireCollectionManage(actor, collection, 'collections:publish', request);

    await this.prisma.mediaCollection.update({
      where: { id: collection.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: collection.publishedAt ?? new Date(),
        indexable: resolveIndexable(collection.visibility, true),
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: collection.organizationId,
      action: 'collection.published',
      resourceType: 'collection',
      resourceId: collection.publicId,
      requestId: request?.requestId,
    });
    return this.getManaged(actor, publicId, request);
  }

  async listAdmin(
    actor: AuthActor,
    query: CollectionListQuery,
    request?: AuthenticatedRequest,
  ): Promise<MediaCollectionListResponse> {
    await this.access.requirePermission(actor, 'admin:media:read', 'collection', request);

    let organizationId: string | undefined;
    if (query.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!org) return { collections: [], nextCursor: null };
      organizationId = org.id;
    } else if (!this.access.isPlatformAdmin(actor) && actor.activeOrganizationId) {
      organizationId = actor.activeOrganizationId;
    }

    const rows = await this.prisma.mediaCollection.findMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.visibility ? { visibility: query.visibility } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { publicId: query.cursor }, skip: 1 } : {}),
      include: {
        organization: true,
        coverMedia: true,
        _count: { select: { items: true } },
      },
    });
    const page = rows.slice(0, query.limit);
    return {
      collections: page.map((row) => this.toSummary(row)),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  private async getManaged(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<MediaCollectionDetail> {
    const row = await this.prisma.mediaCollection.findFirst({
      where: { publicId, deletedAt: null },
      include: {
        organization: true,
        coverMedia: true,
        items: {
          include: { mediaAsset: true, editorial: true },
          orderBy: [{ sortOrder: 'asc' }, { publicId: 'asc' }],
        },
        _count: { select: { items: true } },
      },
    });
    if (!row) return await this.access.deny(actor, publicId, request, 'collection');
    return this.toDetail(row);
  }

  private async resolveCoverMediaId(
    coverMediaPublicId: string | null | undefined,
    organizationId: string | null,
  ): Promise<string | null> {
    if (!coverMediaPublicId) return null;
    const media = await this.prisma.mediaAsset.findFirst({
      where: { publicId: coverMediaPublicId, deletedAt: null },
    });
    if (!media) throw new AppError('NOT_FOUND', 'Cover media not found.');
    if (organizationId && media.organizationId && media.organizationId !== organizationId) {
      throw new AppError('NOT_FOUND', 'Cover media not found.');
    }
    return media.id;
  }

  private async findOrDeny(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const collection = await this.prisma.mediaCollection.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!collection) return await this.access.deny(actor, publicId, request, 'collection');
    return collection;
  }

  private toSummary(row: {
    publicId: string;
    title: string;
    slug: string;
    description: string | null;
    visibility: MediaCollectionSummary['visibility'];
    status: MediaCollectionSummary['status'];
    category: string | null;
    tags: string[];
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    indexable: boolean;
    organization?: { publicId: string } | null;
    coverMedia?: { publicId: string } | null;
    _count?: { items: number };
  }): MediaCollectionSummary {
    const published = row.status === 'PUBLISHED' && row.visibility === 'PUBLIC';
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      title: row.title,
      slug: row.slug,
      description: row.description,
      coverMediaPublicId: row.coverMedia?.publicId ?? null,
      visibility: row.visibility,
      status: row.status,
      publishedAt: toIso(row.publishedAt),
      category: row.category,
      tags: row.tags,
      itemCount: row._count?.items ?? 0,
      seo: buildSeoMetadata({
        title: row.seoTitle ?? row.title,
        description: row.seoDescription ?? row.description,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        indexable: published && row.indexable,
        visibility: row.visibility,
        fallbackPath: `/collections/${row.slug}`,
      }),
    };
  }

  private toDetail(row: {
    publicId: string;
    title: string;
    slug: string;
    description: string | null;
    visibility: MediaCollectionSummary['visibility'];
    status: MediaCollectionSummary['status'];
    category: string | null;
    tags: string[];
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    indexable: boolean;
    organization?: { publicId: string } | null;
    coverMedia?: { publicId: string } | null;
    _count?: { items: number };
    items: Array<{
      publicId: string;
      itemKind: 'MEDIA' | 'EDITORIAL';
      sortOrder: number;
      mediaAsset?: { publicId: string; title: string | null } | null;
      editorial?: { publicId: string; title: string } | null;
    }>;
  }): MediaCollectionDetail {
    return {
      ...this.toSummary(row),
      items: row.items.map((item) => ({
        publicId: item.publicId,
        itemKind: item.itemKind,
        mediaPublicId: item.mediaAsset?.publicId ?? null,
        editorialPublicId: item.editorial?.publicId ?? null,
        sortOrder: item.sortOrder,
        title: item.mediaAsset?.title ?? item.editorial?.title ?? null,
      })),
    };
  }
}
