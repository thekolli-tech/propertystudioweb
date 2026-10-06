import { Injectable } from '@nestjs/common';
import {
  type CreateEditorialContentRequest,
  type EditorialContentDetail,
  type EditorialContentSummary,
  type EditorialListQuery,
  type EditorialListResponse,
  type UpdateEditorialContentRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { MediaAccessService } from './media-access.service';
import { buildSeoMetadata, slugify, toIso } from './media-seo.util';

@Injectable()
export class EditorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: MediaAccessService,
  ) {}

  async listPublic(query: EditorialListQuery): Promise<EditorialListResponse> {
    const rows = await this.prisma.editorialContent.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.featured !== undefined ? { featured: query.featured } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { publicId: query.cursor }, skip: 1 } : {}),
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    const page = rows.slice(0, query.limit);
    return {
      contents: page.map((row) => this.toSummary(row)),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  async getPublic(slug: string): Promise<EditorialContentDetail> {
    const row = await this.prisma.editorialContent.findFirst({
      where: { slug, deletedAt: null },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    if (!row || !this.access.isPubliclyReadableEditorial(row)) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return this.toDetail(row);
  }

  async create(
    actor: AuthActor,
    body: CreateEditorialContentRequest,
    request?: AuthenticatedRequest,
  ): Promise<EditorialContentDetail> {
    await this.access.requirePermission(actor, 'content:create', 'editorial', request);
    const organizationId = await this.access.resolveOrganizationId(
      actor,
      body.organizationPublicId,
      request,
    );
    const allowed = await this.access.canManageOrganizationMedia(
      actor,
      organizationId,
      'content:create',
    );
    if (!allowed) {
      return await this.access.deny(
        actor,
        body.organizationPublicId ?? 'editorial',
        request,
        'editorial',
      );
    }

    const coverMediaId = await this.resolveCoverMediaId(body.coverMediaPublicId, organizationId);
    const slug = body.slug ?? slugify(body.title);

    const created = await this.prisma.editorialContent.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextEditorialContentPublicId(),
        organizationId,
        kind: body.kind,
        status: 'DRAFT',
        title: body.title,
        slug,
        excerpt: body.excerpt ?? null,
        bodyMarkdown: body.bodyMarkdown,
        authorUserId: actor.userId,
        coverMediaId,
        category: body.category ?? null,
        tags: body.tags ?? [],
        featured: body.featured ?? false,
        relatedPropertyIds: body.relatedPropertyPublicIds ?? [],
        relatedProjectIds: body.relatedProjectPublicIds ?? [],
        relatedLocalities: body.relatedLocalities ?? [],
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        canonicalPath: body.canonicalPath ?? `/editorial/${slug}`,
        ogTitle: body.ogTitle ?? null,
        ogDescription: body.ogDescription ?? null,
        twitterTitle: body.twitterTitle ?? null,
        twitterDescription: body.twitterDescription ?? null,
        indexable: false,
        moderationStatus: 'PENDING_REVIEW',
        createdBy: actor.userId,
      },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });

    await this.createRevision(created, actor.userId);
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'editorial.created',
      resourceType: 'editorial',
      resourceId: created.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(created);
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateEditorialContentRequest,
    request?: AuthenticatedRequest,
  ): Promise<EditorialContentDetail> {
    const editorial = await this.findOrDeny(actor, publicId, request);
    await this.access.requireEditorialManage(actor, editorial, 'content:update', request);

    if (editorial.status === 'PUBLISHED' || editorial.status === 'ARCHIVED') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Published or archived editorial must be revised via a new draft cycle.',
      );
    }

    const coverMediaId =
      body.coverMediaPublicId === undefined
        ? undefined
        : await this.resolveCoverMediaId(body.coverMediaPublicId, editorial.organizationId);

    const updated = await this.prisma.editorialContent.update({
      where: { id: editorial.id },
      data: {
        kind: body.kind,
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt === undefined ? undefined : body.excerpt,
        bodyMarkdown: body.bodyMarkdown,
        coverMediaId,
        category: body.category === undefined ? undefined : body.category,
        tags: body.tags,
        featured: body.featured,
        relatedPropertyIds: body.relatedPropertyPublicIds,
        relatedProjectIds: body.relatedProjectPublicIds,
        relatedLocalities: body.relatedLocalities,
        scheduledAt:
          body.scheduledAt === undefined
            ? undefined
            : body.scheduledAt
              ? new Date(body.scheduledAt)
              : null,
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
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });

    await this.createRevision(updated, actor.userId);
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: editorial.organizationId,
      action: 'editorial.updated',
      resourceType: 'editorial',
      resourceId: editorial.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(updated);
  }

  async submitReview(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<EditorialContentDetail> {
    const editorial = await this.findOrDeny(actor, publicId, request);
    await this.access.requireEditorialManage(actor, editorial, 'content:update', request);
    if (editorial.status !== 'DRAFT') {
      throw new AppError('VALIDATION_ERROR', 'Only draft editorial can be submitted for review.');
    }
    const updated = await this.prisma.editorialContent.update({
      where: { id: editorial.id },
      data: { status: 'IN_REVIEW' },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: editorial.organizationId,
      action: 'editorial.submitted_review',
      resourceType: 'editorial',
      resourceId: editorial.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(updated);
  }

  async approve(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<EditorialContentDetail> {
    const editorial = await this.findOrDeny(actor, publicId, request);
    await this.access.requireEditorialManage(actor, editorial, 'content:update', request);
    if (editorial.status !== 'IN_REVIEW' && editorial.status !== 'DRAFT') {
      throw new AppError('VALIDATION_ERROR', 'Editorial must be in review (or draft) to approve.');
    }
    const updated = await this.prisma.editorialContent.update({
      where: { id: editorial.id },
      data: { status: 'APPROVED', moderationStatus: 'APPROVED' },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: editorial.organizationId,
      action: 'editorial.approved',
      resourceType: 'editorial',
      resourceId: editorial.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(updated);
  }

  async publish(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<EditorialContentDetail> {
    const editorial = await this.findOrDeny(actor, publicId, request);
    await this.access.requireEditorialManage(actor, editorial, 'content:publish', request);
    if (editorial.moderationStatus !== 'APPROVED' && editorial.status !== 'APPROVED') {
      throw new AppError('VALIDATION_ERROR', 'Editorial must be approved before publish.');
    }
    if (editorial.status === 'ARCHIVED') {
      throw new AppError('VALIDATION_ERROR', 'Archived editorial cannot be published.');
    }
    const updated = await this.prisma.editorialContent.update({
      where: { id: editorial.id },
      data: {
        status: 'PUBLISHED',
        moderationStatus: 'APPROVED',
        publishedAt: editorial.publishedAt ?? new Date(),
        indexable: true,
      },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: editorial.organizationId,
      action: 'editorial.published',
      resourceType: 'editorial',
      resourceId: editorial.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(updated);
  }

  async archive(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<EditorialContentDetail> {
    const editorial = await this.findOrDeny(actor, publicId, request);
    await this.access.requireEditorialManage(actor, editorial, 'content:archive', request);
    const updated = await this.prisma.editorialContent.update({
      where: { id: editorial.id },
      data: { status: 'ARCHIVED', indexable: false },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: editorial.organizationId,
      action: 'editorial.archived',
      resourceType: 'editorial',
      resourceId: editorial.publicId,
      requestId: request?.requestId,
    });
    return this.toDetail(updated);
  }

  async listAdmin(
    actor: AuthActor,
    query: EditorialListQuery,
    request?: AuthenticatedRequest,
  ): Promise<EditorialListResponse> {
    await this.access.requirePermission(actor, 'admin:content:read', 'editorial', request);
    const rows = await this.prisma.editorialContent.findMany({
      where: {
        deletedAt: null,
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(!this.access.isPlatformAdmin(actor) && actor.activeOrganizationId
          ? { organizationId: actor.activeOrganizationId }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { publicId: query.cursor }, skip: 1 } : {}),
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    const page = rows.slice(0, query.limit);
    return {
      contents: page.map((row) => this.toSummary(row)),
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  private async createRevision(
    editorial: { id: string; title: string; excerpt: string | null; bodyMarkdown: string },
    createdBy: string,
  ) {
    const count = await this.prisma.editorialContentRevision.count({
      where: { editorialContentId: editorial.id },
    });
    await this.prisma.editorialContentRevision.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextEditorialRevisionPublicId(),
        editorialContentId: editorial.id,
        revisionNumber: count + 1,
        title: editorial.title,
        excerpt: editorial.excerpt,
        bodyMarkdown: editorial.bodyMarkdown,
        createdBy,
      },
    });
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
    const editorial = await this.prisma.editorialContent.findFirst({
      where: { publicId, deletedAt: null },
      include: {
        organization: true,
        authorUser: { include: { creatorProfile: true } },
        coverMedia: true,
      },
    });
    if (!editorial) {
      return await this.access.deny(actor, publicId, request, 'editorial');
    }
    return editorial;
  }

  private toSummary(row: {
    publicId: string;
    kind: EditorialContentSummary['kind'];
    status: EditorialContentSummary['status'];
    title: string;
    slug: string;
    excerpt: string | null;
    category: string | null;
    tags: string[];
    featured: boolean;
    moderationStatus: EditorialContentSummary['moderationStatus'];
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalPath: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    indexable: boolean;
    organization?: { publicId: string } | null;
    authorUser: { publicId: string; creatorProfile: { displayName: string } | null };
    coverMedia?: { publicId: string } | null;
  }): EditorialContentSummary {
    const published = row.status === 'PUBLISHED' && row.moderationStatus === 'APPROVED';
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      kind: row.kind,
      status: row.status,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      category: row.category,
      tags: row.tags,
      featured: row.featured,
      publishedAt: toIso(row.publishedAt),
      authorPublicId: row.authorUser.publicId,
      authorDisplayName: row.authorUser.creatorProfile?.displayName ?? null,
      coverMediaPublicId: row.coverMedia?.publicId ?? null,
      moderationStatus: row.moderationStatus,
      seo: buildSeoMetadata({
        title: row.title,
        description: row.excerpt,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        canonicalPath: row.canonicalPath,
        ogTitle: row.ogTitle,
        ogDescription: row.ogDescription,
        twitterTitle: row.twitterTitle,
        twitterDescription: row.twitterDescription,
        indexable: published && row.indexable,
        visibility: published ? 'PUBLIC' : 'PRIVATE',
        fallbackPath: `/editorial/${row.slug}`,
      }),
    };
  }

  private toDetail(row: {
    publicId: string;
    kind: EditorialContentSummary['kind'];
    status: EditorialContentSummary['status'];
    title: string;
    slug: string;
    excerpt: string | null;
    bodyMarkdown: string;
    category: string | null;
    tags: string[];
    featured: boolean;
    moderationStatus: EditorialContentSummary['moderationStatus'];
    publishedAt: Date | null;
    scheduledAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalPath: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    twitterTitle: string | null;
    twitterDescription: string | null;
    indexable: boolean;
    relatedPropertyIds: string[];
    relatedProjectIds: string[];
    relatedLocalities: string[];
    organization?: { publicId: string } | null;
    authorUser: { publicId: string; creatorProfile: { displayName: string } | null };
    coverMedia?: { publicId: string } | null;
  }): EditorialContentDetail {
    return {
      ...this.toSummary(row),
      bodyMarkdown: row.bodyMarkdown,
      relatedPropertyPublicIds: row.relatedPropertyIds,
      relatedProjectPublicIds: row.relatedProjectIds,
      relatedLocalities: row.relatedLocalities,
      scheduledAt: toIso(row.scheduledAt),
    };
  }
}
