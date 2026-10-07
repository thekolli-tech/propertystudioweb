import { Injectable } from '@nestjs/common';
import {
  type ConstructionPhase,
  type CreateDocumentAssetRequest,
  type CreateMediaAssetRequest,
  type CreateProjectRequest,
  type ProjectListQuery,
  type PublicProjectListQuery,
  type UpdateProjectRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { DomainEventBus } from '../integrations/domain-event-bus.service';
import { CatalogAccessService } from './catalog-access.service';
import {
  bigintToString,
  decimalToNumber,
  decodeCursor,
  encodeCursor,
  slugify,
  toDateOnly,
  toIso,
} from './catalog.util';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CatalogAccessService,
    private readonly storage: ObjectStorageService,
    private readonly domainEvents: DomainEventBus,
  ) {}

  async create(actor: AuthActor, body: CreateProjectRequest, request?: AuthenticatedRequest) {
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      body.organizationPublicId,
      'project:create',
      request,
    );

    const slug = body.slug ?? slugify(body.name);
    const existing = await this.prisma.project.findFirst({
      where: { organizationId: organization.id, slug, deletedAt: null },
    });
    if (existing) {
      throw new AppError('CONFLICT', 'A project with this slug already exists.');
    }

    const id = newUuid();
    const publicId = await this.publicIds.nextProjectPublicId();
    const project = await this.prisma.project.create({
      data: {
        id,
        publicId,
        organizationId: organization.id,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        name: body.name,
        slug,
        description: body.description ?? null,
        projectType: body.projectType,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        locality: body.locality ?? null,
        microMarket: body.microMarket ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        postalCode: body.postalCode ?? null,
        countryCode: body.countryCode,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        totalAreaSqft: body.totalAreaSqft ?? null,
        totalUnits: body.totalUnits ?? null,
        startingPriceMinor: body.startingPriceMinor ?? null,
        currency: body.currency,
        possessionDate: body.possessionDate ? new Date(body.possessionDate) : null,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'project.created',
      resourceType: 'project',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { name: project.name, lifecycleStatus: project.lifecycleStatus },
    });

    await this.domainEvents.emit({
      eventType: 'project.created',
      resourceType: 'project',
      resourcePublicId: publicId,
      organizationId: organization.id,
      payload: {
        projectPublicId: publicId,
        organizationPublicId: organization.publicId,
        lifecycleStatus: project.lifecycleStatus,
      },
    });

    return this.toDetail(project, organization.publicId, 0, [], []);
  }

  async list(actor: AuthActor, query: ProjectListQuery, request?: AuthenticatedRequest) {
    if (!query.organizationPublicId) {
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      query.organizationPublicId,
      'project:read',
      request,
    );

    const where: Record<string, unknown> = {
      organizationId: organization.id,
      deletedAt: null,
    };
    if (query.city) where.city = query.city;
    if (query.state) where.state = query.state;
    if (query.locality) where.locality = query.locality;
    if (query.microMarket) where.microMarket = query.microMarket;
    if (query.projectType) where.projectType = query.projectType;
    if (query.lifecycleStatus) where.lifecycleStatus = query.lifecycleStatus;
    if (query.cursor) {
      try {
        const cursor = decodeCursor(query.cursor);
        where.OR = [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ];
      } catch {
        throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
      }
    }

    const rows = await this.prisma.project.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      projects: page.map((row) => this.toSummary(row, organization.publicId)),
      nextCursor: next,
    };
  }

  async getOne(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const project = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null },
      include: {
        organization: true,
        _count: { select: { properties: { where: { deletedAt: null } } } },
      },
    });
    if (!project) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requireDeveloperOrganization(
      actor,
      project.organization.publicId,
      'project:read',
      request,
    );

    const [media, documents] = await Promise.all([
      this.listMedia(project.id, false),
      this.listDocuments(project.id, false),
    ]);

    return this.toDetail(
      project,
      project.organization.publicId,
      project._count.properties,
      media,
      documents,
    );
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateProjectRequest,
    request?: AuthenticatedRequest,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, publicId, request);
    }

    const needsPublish = body.lifecycleStatus === 'PUBLISHED' || body.lifecycleStatus === 'DRAFT';
    await this.access.requireDeveloperOrganization(
      actor,
      project.organization.publicId,
      needsPublish && body.lifecycleStatus ? 'project:publish' : 'project:update',
      request,
    );

    if (body.expectedVersion !== undefined && body.expectedVersion !== project.version) {
      throw new AppError('CONFLICT', 'Project was modified by another request.');
    }

    if (body.slug && body.slug !== project.slug) {
      const clash = await this.prisma.project.findFirst({
        where: {
          organizationId: project.organizationId,
          slug: body.slug,
          deletedAt: null,
          NOT: { id: project.id },
        },
      });
      if (clash) {
        throw new AppError('CONFLICT', 'A project with this slug already exists.');
      }
    }

    let publishedAt = project.publishedAt;
    let action = 'project.updated';
    if (body.lifecycleStatus === 'PUBLISHED' && project.lifecycleStatus !== 'PUBLISHED') {
      publishedAt = new Date();
      action = 'project.published';
    } else if (body.lifecycleStatus === 'DRAFT' && project.lifecycleStatus === 'PUBLISHED') {
      publishedAt = null;
      action = 'project.unpublished';
    } else if (body.lifecycleStatus === 'ARCHIVED') {
      action = 'project.archived';
    }

    const updated = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        description: body.description === undefined ? undefined : body.description,
        projectType: body.projectType ?? undefined,
        lifecycleStatus: body.lifecycleStatus ?? undefined,
        addressLine1: body.addressLine1 === undefined ? undefined : body.addressLine1,
        addressLine2: body.addressLine2 === undefined ? undefined : body.addressLine2,
        locality: body.locality === undefined ? undefined : body.locality,
        microMarket: body.microMarket === undefined ? undefined : body.microMarket,
        city: body.city === undefined ? undefined : body.city,
        state: body.state === undefined ? undefined : body.state,
        postalCode: body.postalCode === undefined ? undefined : body.postalCode,
        countryCode: body.countryCode ?? undefined,
        latitude: body.latitude === undefined ? undefined : body.latitude,
        longitude: body.longitude === undefined ? undefined : body.longitude,
        totalAreaSqft: body.totalAreaSqft === undefined ? undefined : body.totalAreaSqft,
        totalUnits: body.totalUnits === undefined ? undefined : body.totalUnits,
        startingPriceMinor:
          body.startingPriceMinor === undefined ? undefined : body.startingPriceMinor,
        currency: body.currency ?? undefined,
        possessionDate:
          body.possessionDate === undefined
            ? undefined
            : body.possessionDate
              ? new Date(body.possessionDate)
              : null,
        publishedAt,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
      include: {
        organization: true,
        _count: { select: { properties: { where: { deletedAt: null } } } },
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: project.organizationId,
      action,
      resourceType: 'project',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { lifecycleStatus: project.lifecycleStatus, version: project.version },
      after: { lifecycleStatus: updated.lifecycleStatus, version: updated.version },
    });

    if (action === 'project.published') {
      await this.domainEvents.emit({
        eventType: 'project.published',
        resourceType: 'project',
        resourcePublicId: publicId,
        organizationId: project.organizationId,
        payload: {
          projectPublicId: publicId,
          lifecycleStatus: updated.lifecycleStatus,
        },
      });
    } else if (action === 'project.updated' || action === 'project.unpublished' || action === 'project.archived') {
      await this.domainEvents.emit({
        eventType: 'project.updated',
        resourceType: 'project',
        resourcePublicId: publicId,
        organizationId: project.organizationId,
        payload: {
          projectPublicId: publicId,
          lifecycleStatus: updated.lifecycleStatus,
        },
      });
    }

    const [media, documents] = await Promise.all([
      this.listMedia(updated.id, false),
      this.listDocuments(updated.id, false),
    ]);

    return this.toDetail(
      updated,
      updated.organization.publicId,
      updated._count.properties,
      media,
      documents,
    );
  }

  async softDelete(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const project = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requireDeveloperOrganization(
      actor,
      project.organization.publicId,
      'project:update',
      request,
    );

    // Soft-delete project only. Properties remain and projectId is retained until
    // explicitly changed; FK uses ON DELETE SET NULL for hard deletes only.
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        deletedAt: new Date(),
        lifecycleStatus: 'ARCHIVED',
        publishedAt: null,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: project.organizationId,
      action: 'project.deleted',
      resourceType: 'project',
      resourceId: publicId,
      requestId: request?.requestId,
    });

    return { ok: true as const };
  }

  async listPublic(query: PublicProjectListQuery) {
    const where: Record<string, unknown> = {
      deletedAt: null,
      lifecycleStatus: 'PUBLISHED',
    };
    if (query.city) where.city = query.city;
    if (query.state) where.state = query.state;
    if (query.locality) where.locality = query.locality;
    if (query.microMarket) where.microMarket = query.microMarket;
    if (query.projectType) where.projectType = query.projectType;
    if (query.cursor) {
      try {
        const cursor = decodeCursor(query.cursor);
        where.OR = [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ];
      } catch {
        throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
      }
    }

    const rows = await this.prisma.project.findMany({
      where,
      include: { organization: { include: { developerProfile: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      projects: page.map((row) => ({
        publicId: row.publicId,
        developerPublicId: row.organization.developerProfile?.publicId ?? null,
        developerDisplayName: row.organization.developerProfile?.displayName ?? null,
        name: row.name,
        slug: row.slug,
        projectType: row.projectType,
        city: row.city,
        locality: row.locality,
        microMarket: row.microMarket,
        startingPriceMinor: bigintToString(row.startingPriceMinor),
        currency: row.currency,
        publishedAt: toIso(row.publishedAt),
      })),
      nextCursor: next,
    };
  }

  async getPublic(publicId: string) {
    const project = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null, lifecycleStatus: 'PUBLISHED' },
      include: {
        organization: { include: { developerProfile: true } },
        _count: {
          select: {
            properties: {
              where: { deletedAt: null, publicationStatus: 'PUBLISHED' },
            },
          },
        },
      },
    });
    if (!project) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const [media, documents] = await Promise.all([
      this.listMedia(project.id, true),
      this.listDocuments(project.id, true),
    ]);

    return {
      publicId: project.publicId,
      developerPublicId: project.organization.developerProfile?.publicId ?? null,
      developerDisplayName: project.organization.developerProfile?.displayName ?? null,
      name: project.name,
      slug: project.slug,
      projectType: project.projectType,
      city: project.city,
      locality: project.locality,
      microMarket: project.microMarket,
      startingPriceMinor: bigintToString(project.startingPriceMinor),
      currency: project.currency,
      publishedAt: toIso(project.publishedAt),
      description: project.description,
      state: project.state,
      countryCode: project.countryCode,
      totalAreaSqft: decimalToNumber(project.totalAreaSqft),
      totalUnits: project.totalUnits,
      possessionDate: toDateOnly(project.possessionDate),
      propertyCount: project._count.properties,
      trustStatus: project.trustStatus,
      verifiedBadge: project.trustStatus === 'VERIFIED',
      media,
      documents,
    };
  }

  async attachMedia(
    actor: AuthActor,
    body: CreateMediaAssetRequest,
    request?: AuthenticatedRequest,
  ) {
    if (body.entityType !== 'PROJECT') {
      throw new AppError('VALIDATION_ERROR', 'Unsupported media entity type.');
    }
    const project = await this.prisma.project.findFirst({
      where: { publicId: body.entityPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, body.entityPublicId, request);
    }
    await this.access.requireDeveloperOrganization(
      actor,
      project.organization.publicId,
      'project:update',
      request,
    );

    const storageKey = this.storage.assertOrganizationScopedKey(
      body.storageKey,
      project.organization.publicId,
    );

    const asset = await this.prisma.mediaAsset.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextMediaPublicId(),
        organizationId: project.organizationId,
        entityType: 'PROJECT',
        entityId: project.id,
        storageKey,
        mimeType: body.mimeType,
        mediaType: body.mediaType,
        fileSizeBytes: body.fileSizeBytes,
        sortOrder: body.sortOrder,
        altText: body.altText ?? null,
        visibility: body.visibility,
        lifecycleStatus: 'READY',
        moderationStatus: 'APPROVED',
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: project.organizationId,
      action: 'media.associated',
      resourceType: 'media',
      resourceId: asset.publicId,
      metadata: { entityType: 'PROJECT', entityPublicId: project.publicId },
      requestId: request?.requestId,
    });

    return {
      publicId: asset.publicId,
      mediaType: asset.mediaType,
      mimeType: asset.mimeType,
      sortOrder: asset.sortOrder,
      altText: asset.altText,
      visibility: asset.visibility,
    };
  }

  async attachDocument(
    actor: AuthActor,
    body: CreateDocumentAssetRequest,
    request?: AuthenticatedRequest,
  ) {
    if (body.entityType !== 'PROJECT') {
      throw new AppError('VALIDATION_ERROR', 'Unsupported document entity type.');
    }
    const project = await this.prisma.project.findFirst({
      where: { publicId: body.entityPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, body.entityPublicId, request);
    }
    await this.access.requireDeveloperOrganization(
      actor,
      project.organization.publicId,
      'project:update',
      request,
    );

    const storageKey = this.storage.assertOrganizationScopedKey(
      body.storageKey,
      project.organization.publicId,
    );

    const asset = await this.prisma.documentAsset.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextDocumentPublicId(),
        organizationId: project.organizationId,
        entityType: 'PROJECT',
        entityId: project.id,
        storageKey,
        mimeType: body.mimeType,
        documentType: body.documentType,
        title: body.title,
        fileSizeBytes: body.fileSizeBytes,
        visibility: body.visibility,
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: project.organizationId,
      action: 'document.associated',
      resourceType: 'document',
      resourceId: asset.publicId,
      metadata: { entityType: 'PROJECT', entityPublicId: project.publicId },
      requestId: request?.requestId,
    });

    return {
      publicId: asset.publicId,
      documentType: asset.documentType,
      title: asset.title,
      mimeType: asset.mimeType,
      visibility: asset.visibility,
    };
  }

  private async listMedia(entityId: string, publicOnly: boolean) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        entityType: 'PROJECT',
        entityId,
        deletedAt: null,
        ...(publicOnly ? { visibility: 'PUBLIC' } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({
      publicId: row.publicId,
      mediaType: row.mediaType,
      mimeType: row.mimeType,
      sortOrder: row.sortOrder,
      altText: row.altText,
      visibility: row.visibility,
    }));
  }

  private async listDocuments(entityId: string, publicOnly: boolean) {
    const rows = await this.prisma.documentAsset.findMany({
      where: {
        entityType: 'PROJECT',
        entityId,
        deletedAt: null,
        ...(publicOnly ? { visibility: 'PUBLIC' } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      publicId: row.publicId,
      documentType: row.documentType,
      title: row.title,
      mimeType: row.mimeType,
      visibility: row.visibility,
    }));
  }

  private toSummary(
    row: {
      publicId: string;
      name: string;
      slug: string;
      projectType: CreateProjectRequest['projectType'];
      lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      city: string | null;
      locality: string | null;
      microMarket: string | null;
      startingPriceMinor: bigint | null;
      currency: string;
      constructionPhase?: string;
      trustStatus?: string;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
  ) {
    return {
      publicId: row.publicId,
      organizationPublicId,
      name: row.name,
      slug: row.slug,
      projectType: row.projectType,
      lifecycleStatus: row.lifecycleStatus,
      city: row.city,
      locality: row.locality,
      microMarket: row.microMarket,
      startingPriceMinor: bigintToString(row.startingPriceMinor),
      currency: row.currency,
      constructionPhase: row.constructionPhase
        ? (row.constructionPhase as ConstructionPhase)
        : undefined,
      trustStatus: row.trustStatus,
      publishedAt: toIso(row.publishedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(
    row: {
      publicId: string;
      name: string;
      slug: string;
      description: string | null;
      projectType: CreateProjectRequest['projectType'];
      lifecycleStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      addressLine1: string | null;
      addressLine2: string | null;
      locality: string | null;
      microMarket: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      countryCode: string;
      latitude: { toString(): string } | null;
      longitude: { toString(): string } | null;
      totalAreaSqft: { toString(): string } | null;
      totalUnits: number | null;
      startingPriceMinor: bigint | null;
      currency: string;
      possessionDate: Date | null;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    },
    organizationPublicId: string,
    propertyCount: number,
    media: Array<{
      publicId: string;
      mediaType: 'IMAGE' | 'VIDEO' | 'FLOOR_PLAN' | 'AUDIO' | 'DOCUMENT' | 'EMBED' | 'OTHER';
      mimeType: string;
      sortOrder: number;
      altText: string | null;
      visibility: 'PRIVATE' | 'PUBLIC';
    }>,
    documents: Array<{
      publicId: string;
      documentType: string;
      title: string;
      mimeType: string;
      visibility: 'PRIVATE' | 'PUBLIC';
    }>,
  ) {
    return {
      ...this.toSummary(row, organizationPublicId),
      description: row.description,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      state: row.state,
      postalCode: row.postalCode,
      countryCode: row.countryCode,
      latitude: decimalToNumber(row.latitude),
      longitude: decimalToNumber(row.longitude),
      totalAreaSqft: decimalToNumber(row.totalAreaSqft),
      totalUnits: row.totalUnits,
      possessionDate: toDateOnly(row.possessionDate),
      version: row.version,
      propertyCount,
      media,
      documents,
    };
  }
}
