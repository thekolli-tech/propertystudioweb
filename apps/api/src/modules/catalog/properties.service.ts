import { Injectable } from '@nestjs/common';
import {
  type CreateDocumentAssetRequest,
  type CreateMediaAssetRequest,
  type CreatePropertyRequest,
  type PropertyListQuery,
  type PublicPropertyListQuery,
  type UpdatePropertyRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { CatalogAccessService } from './catalog-access.service';
import { decimalToNumber, decodeCursor, encodeCursor, toIso } from './catalog.util';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CatalogAccessService,
  ) {}

  async create(actor: AuthActor, body: CreatePropertyRequest, request?: AuthenticatedRequest) {
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      body.organizationPublicId,
      'property:create',
      request,
    );

    let projectId: string | null = null;
    if (body.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: {
          publicId: body.projectPublicId,
          organizationId: organization.id,
          deletedAt: null,
        },
      });
      if (!project) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      projectId = project.id;
    }

    const publicId = await this.publicIds.nextPropertyPublicId();
    const property = await this.prisma.property.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: organization.id,
        projectId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        title: body.title,
        propertyType: body.propertyType,
        listingType: body.listingType,
        configuration: body.configuration ?? null,
        bedrooms: body.bedrooms ?? null,
        bathrooms: body.bathrooms ?? null,
        carpetAreaSqft: body.carpetAreaSqft ?? null,
        builtUpAreaSqft: body.builtUpAreaSqft ?? null,
        plotAreaSqft: body.plotAreaSqft ?? null,
        floorNumber: body.floorNumber ?? null,
        totalFloors: body.totalFloors ?? null,
        facing: body.facing ?? null,
        priceMinor: body.priceMinor,
        currency: body.currency,
        availabilityStatus: body.availabilityStatus,
        description: body.description ?? null,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        locality: body.locality ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        postalCode: body.postalCode ?? null,
        countryCode: body.countryCode,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
      },
      include: { project: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'property.created',
      resourceType: 'property',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { title: property.title, publicationStatus: property.publicationStatus },
    });

    return this.toDetail(
      property,
      organization.publicId,
      property.project?.publicId ?? null,
      [],
      [],
    );
  }

  async list(actor: AuthActor, query: PropertyListQuery, request?: AuthenticatedRequest) {
    if (!query.organizationPublicId && !this.access.isPlatformAdmin(actor)) {
      // PROPERTY_ADMIN without org context: list only assigned properties.
      if (actor.platformRoles.includes('PROPERTY_ADMIN')) {
        return this.listAssigned(actor, query);
      }
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }

    if (query.organizationPublicId) {
      await this.access.requireDeveloperOrganization(
        actor,
        query.organizationPublicId,
        'property:read',
        request,
      );
    }

    const organization = query.organizationPublicId
      ? await this.prisma.organization.findFirst({
          where: { publicId: query.organizationPublicId },
        })
      : null;

    const where = await this.buildWhere(query, organization?.id);
    const rows = await this.prisma.property.findMany({
      where,
      include: {
        organization: true,
        project: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const visible: typeof rows = [];
    for (const row of rows) {
      if (await this.access.canAccessProperty(actor, row)) {
        visible.push(row);
      }
      if (visible.length > query.limit) break;
    }

    const page = visible.slice(0, query.limit);
    const next =
      visible.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      properties: page.map((row) =>
        this.toSummary(row, row.organization.publicId, row.project?.publicId ?? null),
      ),
      nextCursor: next,
    };
  }

  async getOne(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const property = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true, project: true },
    });
    if (!property) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requirePropertyAccess(actor, property, 'property:read', request);

    const [media, documents] = await Promise.all([
      this.listMedia(property.id, false),
      this.listDocuments(property.id, false),
    ]);

    return this.toDetail(
      property,
      property.organization.publicId,
      property.project?.publicId ?? null,
      media,
      documents,
    );
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdatePropertyRequest,
    request?: AuthenticatedRequest,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true, project: true },
    });
    if (!property) {
      return await this.access.deny(actor, publicId, request);
    }

    const needsPublish = body.publicationStatus !== undefined;
    await this.access.requirePropertyAccess(
      actor,
      property,
      needsPublish ? 'property:publish' : 'property:update',
      request,
    );

    if (body.expectedVersion !== undefined && body.expectedVersion !== property.version) {
      throw new AppError('CONFLICT', 'Property was modified by another request.');
    }

    let projectId = property.projectId;
    if (body.projectPublicId !== undefined) {
      if (body.projectPublicId === null) {
        projectId = null;
      } else {
        const project = await this.prisma.project.findFirst({
          where: {
            publicId: body.projectPublicId,
            organizationId: property.organizationId,
            deletedAt: null,
          },
        });
        if (!project) {
          throw new AppError('NOT_FOUND', 'Resource not found.');
        }
        projectId = project.id;
      }
    }

    let publishedAt = property.publishedAt;
    let action = 'property.updated';
    if (body.publicationStatus === 'PUBLISHED' && property.publicationStatus !== 'PUBLISHED') {
      publishedAt = new Date();
      action = 'property.published';
    } else if (body.publicationStatus === 'DRAFT' && property.publicationStatus === 'PUBLISHED') {
      publishedAt = null;
      action = 'property.unpublished';
    } else if (body.availabilityStatus && body.availabilityStatus !== property.availabilityStatus) {
      action = 'property.availability_changed';
    }

    const updated = await this.prisma.property.update({
      where: { id: property.id },
      data: {
        projectId,
        title: body.title ?? undefined,
        propertyType: body.propertyType ?? undefined,
        listingType: body.listingType ?? undefined,
        configuration: body.configuration === undefined ? undefined : body.configuration,
        bedrooms: body.bedrooms === undefined ? undefined : body.bedrooms,
        bathrooms: body.bathrooms === undefined ? undefined : body.bathrooms,
        carpetAreaSqft: body.carpetAreaSqft === undefined ? undefined : body.carpetAreaSqft,
        builtUpAreaSqft: body.builtUpAreaSqft === undefined ? undefined : body.builtUpAreaSqft,
        plotAreaSqft: body.plotAreaSqft === undefined ? undefined : body.plotAreaSqft,
        floorNumber: body.floorNumber === undefined ? undefined : body.floorNumber,
        totalFloors: body.totalFloors === undefined ? undefined : body.totalFloors,
        facing: body.facing === undefined ? undefined : body.facing,
        priceMinor: body.priceMinor ?? undefined,
        currency: body.currency ?? undefined,
        availabilityStatus: body.availabilityStatus ?? undefined,
        publicationStatus: body.publicationStatus ?? undefined,
        description: body.description === undefined ? undefined : body.description,
        addressLine1: body.addressLine1 === undefined ? undefined : body.addressLine1,
        addressLine2: body.addressLine2 === undefined ? undefined : body.addressLine2,
        locality: body.locality === undefined ? undefined : body.locality,
        city: body.city === undefined ? undefined : body.city,
        state: body.state === undefined ? undefined : body.state,
        postalCode: body.postalCode === undefined ? undefined : body.postalCode,
        countryCode: body.countryCode ?? undefined,
        latitude: body.latitude === undefined ? undefined : body.latitude,
        longitude: body.longitude === undefined ? undefined : body.longitude,
        publishedAt,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
      include: { organization: true, project: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: property.organizationId,
      action,
      resourceType: 'property',
      resourceId: publicId,
      requestId: request?.requestId,
      before: {
        publicationStatus: property.publicationStatus,
        availabilityStatus: property.availabilityStatus,
        version: property.version,
      },
      after: {
        publicationStatus: updated.publicationStatus,
        availabilityStatus: updated.availabilityStatus,
        version: updated.version,
      },
    });

    const [media, documents] = await Promise.all([
      this.listMedia(updated.id, false),
      this.listDocuments(updated.id, false),
    ]);

    return this.toDetail(
      updated,
      updated.organization.publicId,
      updated.project?.publicId ?? null,
      media,
      documents,
    );
  }

  async softDelete(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const property = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true },
    });
    if (!property) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requirePropertyAccess(actor, property, 'property:update', request);

    await this.prisma.property.update({
      where: { id: property.id },
      data: {
        deletedAt: new Date(),
        publicationStatus: 'DRAFT',
        publishedAt: null,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: property.organizationId,
      action: 'property.deleted',
      resourceType: 'property',
      resourceId: publicId,
      requestId: request?.requestId,
    });

    return { ok: true as const };
  }

  async listPublic(query: PublicPropertyListQuery) {
    const where: Record<string, unknown> = {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
    };
    if (query.city) where.city = query.city;
    if (query.locality) where.locality = query.locality;
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.configuration) where.configuration = query.configuration;
    if (query.bedrooms !== undefined) where.bedrooms = query.bedrooms;
    if (query.availabilityStatus) where.availabilityStatus = query.availabilityStatus;
    if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) {
      where.priceMinor = {
        ...(query.minPriceMinor !== undefined ? { gte: query.minPriceMinor } : {}),
        ...(query.maxPriceMinor !== undefined ? { lte: query.maxPriceMinor } : {}),
      };
    }
    if (query.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: {
          publicId: query.projectPublicId,
          deletedAt: null,
          lifecycleStatus: 'PUBLISHED',
        },
      });
      if (!project) {
        return { properties: [], nextCursor: null };
      }
      where.projectId = project.id;
    }
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

    const rows = await this.prisma.property.findMany({
      where,
      include: {
        organization: { include: { developerProfile: true } },
        project: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      properties: page.map((row) => ({
        publicId: row.publicId,
        projectPublicId: row.project?.publicId ?? null,
        developerPublicId: row.organization.developerProfile?.publicId ?? null,
        developerDisplayName: row.organization.developerProfile?.displayName ?? null,
        title: row.title,
        propertyType: row.propertyType,
        listingType: row.listingType,
        configuration: row.configuration,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        priceMinor: row.priceMinor.toString(),
        currency: row.currency,
        availabilityStatus: row.availabilityStatus,
        city: row.city,
        locality: row.locality,
        publishedAt: toIso(row.publishedAt),
      })),
      nextCursor: next,
    };
  }

  async getPublic(publicId: string) {
    const property = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null, publicationStatus: 'PUBLISHED' },
      include: {
        organization: { include: { developerProfile: true } },
        project: true,
      },
    });
    if (!property) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const [media, documents] = await Promise.all([
      this.listMedia(property.id, true),
      this.listDocuments(property.id, true),
    ]);

    return {
      publicId: property.publicId,
      projectPublicId: property.project?.publicId ?? null,
      developerPublicId: property.organization.developerProfile?.publicId ?? null,
      developerDisplayName: property.organization.developerProfile?.displayName ?? null,
      title: property.title,
      propertyType: property.propertyType,
      listingType: property.listingType,
      configuration: property.configuration,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      priceMinor: property.priceMinor.toString(),
      currency: property.currency,
      availabilityStatus: property.availabilityStatus,
      city: property.city,
      locality: property.locality,
      publishedAt: toIso(property.publishedAt),
      description: property.description,
      carpetAreaSqft: decimalToNumber(property.carpetAreaSqft),
      builtUpAreaSqft: decimalToNumber(property.builtUpAreaSqft),
      plotAreaSqft: decimalToNumber(property.plotAreaSqft),
      floorNumber: property.floorNumber,
      totalFloors: property.totalFloors,
      facing: property.facing,
      state: property.state,
      countryCode: property.countryCode,
      trustStatus: property.trustStatus,
      verifiedBadge: property.trustStatus === 'VERIFIED',
      media,
      documents,
    };
  }

  async attachMedia(
    actor: AuthActor,
    body: CreateMediaAssetRequest,
    request?: AuthenticatedRequest,
  ) {
    if (body.entityType !== 'PROPERTY') {
      throw new AppError('VALIDATION_ERROR', 'Unsupported media entity type.');
    }
    const property = await this.prisma.property.findFirst({
      where: { publicId: body.entityPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!property) {
      return await this.access.deny(actor, body.entityPublicId, request);
    }
    await this.access.requirePropertyAccess(actor, property, 'property:update', request);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextMediaPublicId(),
        organizationId: property.organizationId,
        entityType: 'PROPERTY',
        entityId: property.id,
        storageKey: body.storageKey,
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
      organizationId: property.organizationId,
      action: 'media.associated',
      resourceType: 'media',
      resourceId: asset.publicId,
      metadata: { entityType: 'PROPERTY', entityPublicId: property.publicId },
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
    if (body.entityType !== 'PROPERTY') {
      throw new AppError('VALIDATION_ERROR', 'Unsupported document entity type.');
    }
    const property = await this.prisma.property.findFirst({
      where: { publicId: body.entityPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!property) {
      return await this.access.deny(actor, body.entityPublicId, request);
    }
    await this.access.requirePropertyAccess(actor, property, 'property:update', request);

    const asset = await this.prisma.documentAsset.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextDocumentPublicId(),
        organizationId: property.organizationId,
        entityType: 'PROPERTY',
        entityId: property.id,
        storageKey: body.storageKey,
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
      organizationId: property.organizationId,
      action: 'document.associated',
      resourceType: 'document',
      resourceId: asset.publicId,
      metadata: { entityType: 'PROPERTY', entityPublicId: property.publicId },
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

  async getMedia(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, publicId, request);
    }
    if (asset.entityType === 'PROPERTY' && asset.entityId) {
      const property = await this.prisma.property.findFirst({
        where: { id: asset.entityId, deletedAt: null },
      });
      if (!property) {
        return await this.access.deny(actor, publicId, request);
      }
      await this.access.requirePropertyAccess(actor, property, 'property:read', request);
    } else if (asset.entityType === 'PROJECT' && asset.entityId) {
      const project = await this.prisma.project.findFirst({
        where: { id: asset.entityId, deletedAt: null },
        include: { organization: true },
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
    } else {
      return await this.access.deny(actor, publicId, request);
    }
    return {
      publicId: asset.publicId,
      mediaType: asset.mediaType,
      mimeType: asset.mimeType,
      sortOrder: asset.sortOrder,
      altText: asset.altText,
      visibility: asset.visibility,
    };
  }

  async getDocument(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const asset = await this.prisma.documentAsset.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, publicId, request);
    }
    if (asset.entityType === 'PROPERTY') {
      const property = await this.prisma.property.findFirst({
        where: { id: asset.entityId, deletedAt: null },
      });
      if (!property) {
        return await this.access.deny(actor, publicId, request);
      }
      await this.access.requirePropertyAccess(actor, property, 'property:read', request);
    } else if (asset.entityType === 'PROJECT') {
      const project = await this.prisma.project.findFirst({
        where: { id: asset.entityId, deletedAt: null },
        include: { organization: true },
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
    } else {
      return await this.access.deny(actor, publicId, request);
    }
    return {
      publicId: asset.publicId,
      documentType: asset.documentType,
      title: asset.title,
      mimeType: asset.mimeType,
      visibility: asset.visibility,
    };
  }

  async assignResource(
    actor: AuthActor,
    input: {
      userPublicId: string;
      resourceType: 'PROPERTY' | 'PROJECT';
      resourcePublicId: string;
    },
    request?: AuthenticatedRequest,
  ) {
    if (!this.access.isPlatformAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const user = await this.prisma.user.findFirst({ where: { publicId: input.userPublicId } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    let resourceId: string;
    let organizationId: string;
    if (input.resourceType === 'PROPERTY') {
      const property = await this.prisma.property.findFirst({
        where: { publicId: input.resourcePublicId, deletedAt: null },
      });
      if (!property) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      resourceId = property.id;
      organizationId = property.organizationId;
    } else {
      const project = await this.prisma.project.findFirst({
        where: { publicId: input.resourcePublicId, deletedAt: null },
      });
      if (!project) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      resourceId = project.id;
      organizationId = project.organizationId;
    }

    await this.prisma.resourceAssignment.upsert({
      where: {
        userId_resourceType_resourceId: {
          userId: user.id,
          resourceType: input.resourceType,
          resourceId,
        },
      },
      create: {
        id: newUuid(),
        userId: user.id,
        organizationId,
        resourceType: input.resourceType,
        resourceId,
        createdBy: actor.userId,
      },
      update: {},
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'resource_assignment.created',
      resourceType: input.resourceType.toLowerCase(),
      resourceId: input.resourcePublicId,
      metadata: { userPublicId: input.userPublicId },
      requestId: request?.requestId,
    });

    return { ok: true as const };
  }

  private async listAssigned(actor: AuthActor, query: PropertyListQuery) {
    const assignments = await this.prisma.resourceAssignment.findMany({
      where: { userId: actor.userId, resourceType: 'PROPERTY' },
    });
    const ids = assignments.map((row) => row.resourceId);
    if (!ids.length) {
      return { properties: [], nextCursor: null };
    }

    const where = await this.buildWhere(query, undefined);
    where.id = { in: ids };

    const rows = await this.prisma.property.findMany({
      where,
      include: { organization: true, project: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;
    return {
      properties: page.map((row) =>
        this.toSummary(row, row.organization.publicId, row.project?.publicId ?? null),
      ),
      nextCursor: next,
    };
  }

  private async buildWhere(query: PropertyListQuery, organizationId?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (organizationId) where.organizationId = organizationId;
    if (query.city) where.city = query.city;
    if (query.locality) where.locality = query.locality;
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.configuration) where.configuration = query.configuration;
    if (query.bedrooms !== undefined) where.bedrooms = query.bedrooms;
    if (query.availabilityStatus) where.availabilityStatus = query.availabilityStatus;
    if (query.publicationStatus) where.publicationStatus = query.publicationStatus;
    if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) {
      where.priceMinor = {
        ...(query.minPriceMinor !== undefined ? { gte: query.minPriceMinor } : {}),
        ...(query.maxPriceMinor !== undefined ? { lte: query.maxPriceMinor } : {}),
      };
    }
    if (query.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: { publicId: query.projectPublicId, deletedAt: null },
      });
      where.projectId = project?.id ?? '00000000-0000-0000-0000-000000000000';
    }
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
    return where;
  }

  private async listMedia(entityId: string, publicOnly: boolean) {
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        entityType: 'PROPERTY',
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
        entityType: 'PROPERTY',
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
      title: string;
      propertyType: CreatePropertyRequest['propertyType'];
      listingType: CreatePropertyRequest['listingType'];
      configuration: CreatePropertyRequest['configuration'] | null;
      bedrooms: number | null;
      bathrooms: number | null;
      priceMinor: bigint;
      currency: string;
      availabilityStatus: NonNullable<CreatePropertyRequest['availabilityStatus']>;
      publicationStatus: 'DRAFT' | 'PUBLISHED';
      city: string | null;
      locality: string | null;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
    projectPublicId: string | null,
  ) {
    return {
      publicId: row.publicId,
      organizationPublicId,
      projectPublicId,
      title: row.title,
      propertyType: row.propertyType,
      listingType: row.listingType,
      configuration: row.configuration ?? null,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      priceMinor: row.priceMinor.toString(),
      currency: row.currency,
      availabilityStatus: row.availabilityStatus,
      publicationStatus: row.publicationStatus,
      city: row.city,
      locality: row.locality,
      publishedAt: toIso(row.publishedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDetail(
    row: {
      publicId: string;
      title: string;
      propertyType: CreatePropertyRequest['propertyType'];
      listingType: CreatePropertyRequest['listingType'];
      configuration: CreatePropertyRequest['configuration'] | null;
      bedrooms: number | null;
      bathrooms: number | null;
      priceMinor: bigint;
      currency: string;
      availabilityStatus: NonNullable<CreatePropertyRequest['availabilityStatus']>;
      publicationStatus: 'DRAFT' | 'PUBLISHED';
      description: string | null;
      carpetAreaSqft: { toString(): string } | null;
      builtUpAreaSqft: { toString(): string } | null;
      plotAreaSqft: { toString(): string } | null;
      floorNumber: number | null;
      totalFloors: number | null;
      facing: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      locality: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      countryCode: string;
      latitude: { toString(): string } | null;
      longitude: { toString(): string } | null;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    },
    organizationPublicId: string,
    projectPublicId: string | null,
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
      ...this.toSummary(row, organizationPublicId, projectPublicId),
      description: row.description,
      carpetAreaSqft: decimalToNumber(row.carpetAreaSqft),
      builtUpAreaSqft: decimalToNumber(row.builtUpAreaSqft),
      plotAreaSqft: decimalToNumber(row.plotAreaSqft),
      floorNumber: row.floorNumber,
      totalFloors: row.totalFloors,
      facing: row.facing,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      state: row.state,
      postalCode: row.postalCode,
      countryCode: row.countryCode,
      latitude: decimalToNumber(row.latitude),
      longitude: decimalToNumber(row.longitude),
      version: row.version,
      media,
      documents,
    };
  }
}
