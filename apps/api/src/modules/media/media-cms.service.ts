import { Injectable } from '@nestjs/common';
import {
  type CreateMediaCmsRequest,
  type MediaCmsListQuery,
  type ModerateMediaRequest,
  type UpdateMediaCmsRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { MediaAccessService } from './media-access.service';
import { buildSeoMetadata, slugify } from './media-seo.util';

@Injectable()
export class MediaCmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: MediaAccessService,
    private readonly storage: ObjectStorageService,
  ) {}

  async listPublic(query: MediaCmsListQuery) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        lifecycleStatus: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        ...(query.mediaType ? { mediaType: query.mediaType } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.tag ? { tags: { has: query.tag } } : {}),
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { publicId: query.cursor },
            skip: 1,
          }
        : {}),
    });
    const page = rows.slice(0, query.limit);
    return {
      media: await Promise.all(page.map((row) => this.toDetail(row))),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  async getPublic(slugOrPublicId: string) {
    const row = await this.prisma.mediaAsset.findFirst({
      where: {
        deletedAt: null,
        OR: [{ slug: slugOrPublicId }, { publicId: slugOrPublicId }],
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
    });
    if (!row || !this.access.isPubliclyReadable(row)) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return this.toDetail(row);
  }

  async create(actor: AuthActor, body: CreateMediaCmsRequest, request?: AuthenticatedRequest) {
    await this.access.requirePermission(actor, 'media:create', 'media', request);

    let organizationId: string | null = null;
    let organizationPublicId: string | null = body.organizationPublicId ?? null;
    if (body.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: body.organizationPublicId, status: 'ACTIVE' },
      });
      if (!org) {
        return await this.access.deny(actor, body.organizationPublicId, request);
      }
      const allowed = await this.access.canManageOrganizationMedia(actor, org.id, 'media:create');
      if (!allowed) {
        return await this.access.deny(actor, body.organizationPublicId, request);
      }
      organizationId = org.id;
      organizationPublicId = org.publicId;
    }

    let entityType = body.entityType ?? null;
    let entityId: string | null = null;
    if (body.entityPublicId && body.entityType) {
      const resolved = await this.resolveEntity(body.entityType, body.entityPublicId);
      if (!resolved) {
        return await this.access.deny(actor, body.entityPublicId, request);
      }
      entityType = body.entityType;
      entityId = resolved.id;
      organizationId = resolved.organizationId;
      const org = await this.prisma.organization.findFirst({
        where: { id: organizationId },
        select: { publicId: true },
      });
      organizationPublicId = org?.publicId ?? null;
      const allowed = await this.access.canManageOrganizationMedia(
        actor,
        organizationId,
        'media:create',
      );
      if (!allowed) {
        return await this.access.deny(actor, body.entityPublicId, request);
      }
    }

    let storageKey = this.storage.assertSafeStorageKey(body.storageKey);
    let thumbnailStorageKey = body.thumbnailStorageKey
      ? this.storage.assertSafeStorageKey(body.thumbnailStorageKey)
      : null;
    let posterStorageKey = body.posterStorageKey
      ? this.storage.assertSafeStorageKey(body.posterStorageKey)
      : null;
    if (organizationPublicId && !storageKey.startsWith('embed://')) {
      storageKey = this.storage.assertOrganizationScopedKey(storageKey, organizationPublicId);
      if (thumbnailStorageKey) {
        thumbnailStorageKey = this.storage.assertOrganizationScopedKey(
          thumbnailStorageKey,
          organizationPublicId,
        );
      }
      if (posterStorageKey) {
        posterStorageKey = this.storage.assertOrganizationScopedKey(
          posterStorageKey,
          organizationPublicId,
        );
      }
    }

    const slug = body.slug ?? (body.title ? slugify(body.title) : null);
    const asset = await this.prisma.mediaAsset.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextMediaPublicId(),
        organizationId,
        entityType,
        entityId,
        storageKey,
        mimeType: body.mimeType,
        mediaType: body.mediaType,
        fileSizeBytes: body.fileSizeBytes,
        sortOrder: body.sortOrder,
        altText: body.altText ?? null,
        visibility: body.visibility,
        title: body.title ?? null,
        description: body.description ?? null,
        caption: body.caption ?? null,
        slug,
        durationSeconds: body.durationSeconds ?? null,
        widthPx: body.widthPx ?? null,
        heightPx: body.heightPx ?? null,
        thumbnailStorageKey,
        posterStorageKey,
        source: body.source ?? null,
        sourceUrl: body.sourceUrl ?? null,
        category: body.category ?? null,
        tags: body.tags ?? [],
        lifecycleStatus: 'DRAFT',
        moderationStatus: 'PENDING_REVIEW',
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        canonicalPath: body.canonicalPath ?? (slug ? `/media/${slug}` : null),
        ogTitle: body.ogTitle ?? null,
        ogDescription: body.ogDescription ?? null,
        twitterTitle: body.twitterTitle ?? null,
        twitterDescription: body.twitterDescription ?? null,
        indexable: false,
        authorUserId: actor.userId,
        createdBy: actor.userId,
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'media.created',
      resourceType: 'media',
      resourceId: asset.publicId,
      requestId: request?.requestId,
    });

    return this.toDetail(asset);
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateMediaCmsRequest,
    request?: AuthenticatedRequest,
  ) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, publicId, request);
    }
    await this.access.requireMediaManage(actor, asset, 'media:update', request);

    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        title: body.title === undefined ? undefined : body.title,
        description: body.description === undefined ? undefined : body.description,
        caption: body.caption === undefined ? undefined : body.caption,
        altText: body.altText === undefined ? undefined : body.altText,
        slug: body.slug === undefined ? undefined : body.slug,
        durationSeconds: body.durationSeconds === undefined ? undefined : body.durationSeconds,
        widthPx: body.widthPx === undefined ? undefined : body.widthPx,
        heightPx: body.heightPx === undefined ? undefined : body.heightPx,
        thumbnailStorageKey:
          body.thumbnailStorageKey === undefined ? undefined : body.thumbnailStorageKey,
        posterStorageKey: body.posterStorageKey === undefined ? undefined : body.posterStorageKey,
        source: body.source === undefined ? undefined : body.source,
        sourceUrl: body.sourceUrl === undefined ? undefined : body.sourceUrl,
        category: body.category === undefined ? undefined : body.category,
        tags: body.tags === undefined ? undefined : body.tags,
        visibility: body.visibility === undefined ? undefined : body.visibility,
        sortOrder: body.sortOrder === undefined ? undefined : body.sortOrder,
        seoTitle: body.seoTitle === undefined ? undefined : body.seoTitle,
        seoDescription: body.seoDescription === undefined ? undefined : body.seoDescription,
        canonicalPath: body.canonicalPath === undefined ? undefined : body.canonicalPath,
        ogTitle: body.ogTitle === undefined ? undefined : body.ogTitle,
        ogDescription: body.ogDescription === undefined ? undefined : body.ogDescription,
        twitterTitle: body.twitterTitle === undefined ? undefined : body.twitterTitle,
        twitterDescription:
          body.twitterDescription === undefined ? undefined : body.twitterDescription,
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: asset.organizationId,
      action: 'media.updated',
      resourceType: 'media',
      resourceId: asset.publicId,
      requestId: request?.requestId,
    });

    return this.toDetail(updated);
  }

  async publish(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, publicId, request);
    }
    await this.access.requireMediaManage(actor, asset, 'media:publish', request);

    if (asset.moderationStatus === 'REJECTED' || asset.moderationStatus === 'FLAGGED') {
      throw new AppError('VALIDATION_ERROR', 'Cannot publish media in current moderation state.');
    }

    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        lifecycleStatus: 'PUBLISHED',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        publishedAt: new Date(),
        indexable: true,
        canonicalPath: asset.canonicalPath ?? (asset.slug ? `/media/${asset.slug}` : null),
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: asset.organizationId,
      action: 'media.published',
      resourceType: 'media',
      resourceId: asset.publicId,
      requestId: request?.requestId,
    });

    return this.toDetail(updated);
  }

  async archive(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, publicId, request);
    }
    await this.access.requireMediaManage(actor, asset, 'media:archive', request);

    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        lifecycleStatus: 'ARCHIVED',
        indexable: false,
        visibility: 'PRIVATE',
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: asset.organizationId,
      action: 'media.archived',
      resourceType: 'media',
      resourceId: asset.publicId,
      requestId: request?.requestId,
    });

    return this.toDetail(updated);
  }

  async moderate(
    actor: AuthActor,
    publicId: string,
    body: ModerateMediaRequest,
    request?: AuthenticatedRequest,
  ) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, publicId, request);
    }
    await this.access.requirePermission(actor, 'media:moderate', publicId, request);

    const updated = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        moderationStatus: body.moderationStatus,
        lifecycleStatus:
          body.moderationStatus === 'REJECTED'
            ? 'REJECTED'
            : body.moderationStatus === 'ARCHIVED'
              ? 'ARCHIVED'
              : undefined,
        indexable: body.moderationStatus === 'APPROVED' ? asset.indexable : false,
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: asset.organizationId,
      action: 'media.moderated',
      resourceType: 'media',
      resourceId: asset.publicId,
      after: { moderationStatus: body.moderationStatus, reason: body.reason ?? null },
      requestId: request?.requestId,
    });

    return this.toDetail(updated);
  }

  async getAccessUrl(actor: AuthActor | null, publicId: string, request?: AuthenticatedRequest) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      if (actor) {
        return await this.access.deny(actor, publicId, request);
      }
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    await this.access.requireMediaRead(actor, asset, request);

    if (asset.mediaType === 'EMBED' || asset.storageKey.startsWith('embed://')) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Embed media does not use object storage access URLs.',
      );
    }

    const signed = await this.storage.createSignedDownloadUrl(asset.storageKey, 120);
    return {
      publicId: asset.publicId,
      url: signed.url,
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async listAdmin(actor: AuthActor, query: MediaCmsListQuery, request?: AuthenticatedRequest) {
    await this.access.requirePermission(actor, 'admin:media:read', 'media', request);
    const orgFilter = query.organizationPublicId
      ? await this.prisma.organization.findFirst({
          where: { publicId: query.organizationPublicId },
        })
      : null;
    if (query.organizationPublicId && !orgFilter) {
      return { media: [], nextCursor: null };
    }

    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        deletedAt: null,
        ...(orgFilter ? { organizationId: orgFilter.id } : {}),
        ...(query.mediaType ? { mediaType: query.mediaType } : {}),
        ...(query.lifecycleStatus ? { lifecycleStatus: query.lifecycleStatus } : {}),
        ...(query.category ? { category: query.category } : {}),
      },
      include: {
        authorUser: { include: { creatorProfile: true } },
        organization: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { publicId: query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, query.limit);
    return {
      media: await Promise.all(page.map((row) => this.toDetail(row))),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  async sitemap() {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        lifecycleStatus: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        indexable: true,
        slug: { not: null },
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 5000,
    });
    return {
      entries: rows.map((row) => ({
        path: `/media/${row.slug}`,
        lastModified: (row.publishedAt ?? row.updatedAt).toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    };
  }

  private async resolveEntity(entityType: string, entityPublicId: string) {
    if (entityType === 'PROPERTY') {
      return this.prisma.property.findFirst({
        where: { publicId: entityPublicId, deletedAt: null },
        select: { id: true, organizationId: true },
      });
    }
    if (entityType === 'PROJECT') {
      return this.prisma.project.findFirst({
        where: { publicId: entityPublicId, deletedAt: null },
        select: { id: true, organizationId: true },
      });
    }
    if (entityType === 'COMMUNITY') {
      return this.prisma.community.findFirst({
        where: { publicId: entityPublicId, deletedAt: null },
        select: { id: true, organizationId: true },
      });
    }
    return null;
  }

  private async toDetail(row: {
    publicId: string;
    mediaType: string;
    mimeType: string;
    title: string | null;
    description: string | null;
    caption: string | null;
    altText: string | null;
    slug: string | null;
    durationSeconds: number | null;
    widthPx: number | null;
    heightPx: number | null;
    source: string | null;
    sourceUrl: string | null;
    lifecycleStatus: string;
    moderationStatus: string;
    visibility: string;
    category: string | null;
    tags: string[];
    publishedAt: Date | null;
    sortOrder: number;
    entityType: string | null;
    entityId: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalPath: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    indexable: boolean;
    organization: { publicId: string } | null;
    authorUser: {
      publicId: string;
      creatorProfile: { displayName: string } | null;
    } | null;
  }) {
    let entityPublicId: string | null = null;
    if (row.entityType && row.entityId) {
      if (row.entityType === 'PROPERTY') {
        entityPublicId =
          (
            await this.prisma.property.findFirst({
              where: { id: row.entityId },
              select: { publicId: true },
            })
          )?.publicId ?? null;
      } else if (row.entityType === 'PROJECT') {
        entityPublicId =
          (
            await this.prisma.project.findFirst({
              where: { id: row.entityId },
              select: { publicId: true },
            })
          )?.publicId ?? null;
      } else if (row.entityType === 'COMMUNITY') {
        entityPublicId =
          (
            await this.prisma.community.findFirst({
              where: { id: row.entityId },
              select: { publicId: true },
            })
          )?.publicId ?? null;
      }
    }

    const publiclyReadable =
      row.visibility === 'PUBLIC' &&
      row.lifecycleStatus === 'PUBLISHED' &&
      row.moderationStatus === 'APPROVED';

    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      mediaType: row.mediaType,
      mimeType: row.mimeType,
      title: row.title,
      description: row.description,
      caption: row.caption,
      altText: row.altText,
      slug: row.slug,
      durationSeconds: row.durationSeconds,
      widthPx: row.widthPx,
      heightPx: row.heightPx,
      source: row.source,
      sourceUrl: row.sourceUrl,
      lifecycleStatus: row.lifecycleStatus,
      moderationStatus: row.moderationStatus,
      visibility: row.visibility,
      category: row.category,
      tags: row.tags,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      authorPublicId: row.authorUser?.publicId ?? null,
      authorDisplayName: row.authorUser?.creatorProfile?.displayName ?? null,
      entityType: row.entityType,
      entityPublicId,
      sortOrder: row.sortOrder,
      seo: buildSeoMetadata({
        title: row.title,
        description: row.description,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        canonicalPath: row.canonicalPath,
        ogTitle: row.ogTitle,
        ogDescription: row.ogDescription,
        twitterTitle: row.twitterTitle,
        twitterDescription: row.twitterDescription,
        indexable: publiclyReadable && row.indexable,
        fallbackPath: row.slug ? `/media/${row.slug}` : null,
      }),
      accessUrlAvailable: !row.sourceUrl || !String(row.mediaType).includes('EMBED'),
    };
  }
}
