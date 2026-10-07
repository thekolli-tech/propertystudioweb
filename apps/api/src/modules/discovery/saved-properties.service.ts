import { Injectable } from '@nestjs/common';
import {
  type CreateSavedPropertyRequest,
  type SavedPropertyListQuery,
  type SavedPropertyListResponse,
  type SavedPropertySummary,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { bigintToString, toIso as catalogToIso } from '../catalog/catalog.util';
import { decodeCursor, encodeCursor } from './discovery.util';

@Injectable()
export class SavedPropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actor: AuthActor,
    body: CreateSavedPropertyRequest,
    request?: AuthenticatedRequest,
  ): Promise<SavedPropertySummary> {
    this.requirePermission(actor, 'saved-property:create');
    const property = await this.prisma.property.findFirst({
      where: {
        publicId: body.propertyPublicId,
        deletedAt: null,
        publicationStatus: 'PUBLISHED',
      },
      include: {
        project: { select: { publicId: true } },
        organization: {
          select: {
            developerProfile: { select: { publicId: true, displayName: true } },
          },
        },
      },
    });
    if (!property) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const existing = await this.prisma.savedProperty.findFirst({
      where: { userId: actor.userId, propertyId: property.id },
    });
    if (existing && !existing.deletedAt) {
      throw new AppError('CONFLICT', 'Property is already saved.');
    }

    const row = existing
      ? await this.prisma.savedProperty.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            note: body.note ?? null,
            publicId: existing.publicId,
          },
        })
      : await this.prisma.savedProperty.create({
          data: {
            id: newUuid(),
            publicId: await this.publicIds.nextSavedPropertyPublicId(),
            userId: actor.userId,
            propertyId: property.id,
            note: body.note ?? null,
          },
        });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'saved_property.created',
      resourceType: 'saved_property',
      resourceId: row.publicId,
      requestId: request?.requestId,
      after: { propertyPublicId: property.publicId },
    });

    return {
      publicId: row.publicId,
      propertyPublicId: property.publicId,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      property: {
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
        priceMinor: bigintToString(property.priceMinor) ?? '0',
        currency: property.currency,
        availabilityStatus: property.availabilityStatus,
        city: property.city,
        locality: property.locality,
        publishedAt: catalogToIso(property.publishedAt),
      },
    };
  }

  async list(
    actor: AuthActor,
    query: SavedPropertyListQuery,
    _request?: AuthenticatedRequest,
  ): Promise<SavedPropertyListResponse> {
    this.requirePermission(actor, 'saved-property:read');
    const where: Record<string, unknown> = {
      userId: actor.userId,
      deletedAt: null,
    };
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.savedProperty.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        property: {
          include: {
            project: { select: { publicId: true } },
            organization: {
              select: {
                developerProfile: { select: { publicId: true, displayName: true } },
              },
            },
          },
        },
      },
    });

    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      savedProperties: page.map((row) => ({
        publicId: row.publicId,
        propertyPublicId: row.property.publicId,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        property:
          row.property.deletedAt || row.property.publicationStatus !== 'PUBLISHED'
            ? null
            : {
                publicId: row.property.publicId,
                projectPublicId: row.property.project?.publicId ?? null,
                developerPublicId: row.property.organization.developerProfile?.publicId ?? null,
                developerDisplayName:
                  row.property.organization.developerProfile?.displayName ?? null,
                title: row.property.title,
                propertyType: row.property.propertyType,
                listingType: row.property.listingType,
                configuration: row.property.configuration,
                bedrooms: row.property.bedrooms,
                bathrooms: row.property.bathrooms,
                priceMinor: bigintToString(row.property.priceMinor) ?? '0',
                currency: row.property.currency,
                availabilityStatus: row.property.availabilityStatus,
                city: row.property.city,
                locality: row.property.locality,
                publishedAt: catalogToIso(row.property.publishedAt),
              },
      })),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async softDelete(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    this.requirePermission(actor, 'saved-property:delete');
    const row = await this.prisma.savedProperty.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!row || row.userId !== actor.userId) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    await this.prisma.savedProperty.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'saved_property.deleted',
      resourceType: 'saved_property',
      resourceId: publicId,
      requestId: request?.requestId,
    });
    return { ok: true as const };
  }

  private requirePermission(
    actor: AuthActor,
    permission: 'saved-property:create' | 'saved-property:read' | 'saved-property:delete',
  ) {
    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }
}
