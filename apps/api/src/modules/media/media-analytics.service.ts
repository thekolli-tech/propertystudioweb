import { Injectable } from '@nestjs/common';
import {
  type CreateMediaAnalyticsEventRequest,
  type MediaAnalyticsEventSummary,
  type MediaAnalyticsListResponse,
} from '@property-studio/contracts';
import { type CursorPaginationQuery } from '@property-studio/contracts';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { MediaAccessService } from './media-access.service';
import { toIso } from './media-seo.util';

type AdminAnalyticsQuery = CursorPaginationQuery & {
  organizationPublicId?: string;
  eventType?: MediaAnalyticsEventSummary['eventType'];
  mediaPublicId?: string;
  editorialPublicId?: string;
};

@Injectable()
export class MediaAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly access: MediaAccessService,
  ) {}

  async writeEvent(
    actor: AuthActor | null,
    body: CreateMediaAnalyticsEventRequest,
    request?: AuthenticatedRequest,
  ): Promise<{ event: MediaAnalyticsEventSummary }> {
    if (!body.mediaPublicId && !body.editorialPublicId && !body.collectionPublicId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'At least one of mediaPublicId, editorialPublicId, or collectionPublicId is required.',
      );
    }

    let organizationId: string | null = null;
    let mediaAssetId: string | null = null;
    let editorialId: string | null = null;
    let collectionId: string | null = null;
    let mediaPublicId: string | null = null;
    let editorialPublicId: string | null = null;
    let collectionPublicId: string | null = null;

    if (body.mediaPublicId) {
      const media = await this.prisma.mediaAsset.findFirst({
        where: { publicId: body.mediaPublicId, deletedAt: null },
      });
      if (!media) throw new AppError('NOT_FOUND', 'Resource not found.');
      if (!this.access.isPubliclyReadableMedia(media)) {
        if (!actor || !actorHasPermission(actor, 'media:analytics:write')) {
          throw new AppError('NOT_FOUND', 'Resource not found.');
        }
        await this.access.requireMediaManage(actor, media, 'media:analytics:write', request);
      }
      mediaAssetId = media.id;
      mediaPublicId = media.publicId;
      organizationId = media.organizationId;
    }

    if (body.editorialPublicId) {
      const editorial = await this.prisma.editorialContent.findFirst({
        where: { publicId: body.editorialPublicId, deletedAt: null },
      });
      if (!editorial) throw new AppError('NOT_FOUND', 'Resource not found.');
      if (!this.access.isPubliclyReadableEditorial(editorial)) {
        if (!actor || !actorHasPermission(actor, 'media:analytics:write')) {
          throw new AppError('NOT_FOUND', 'Resource not found.');
        }
        await this.access.requireEditorialManage(
          actor,
          editorial,
          'media:analytics:write',
          request,
        );
      }
      editorialId = editorial.id;
      editorialPublicId = editorial.publicId;
      organizationId = organizationId ?? editorial.organizationId;
    }

    if (body.collectionPublicId) {
      const collection = await this.prisma.mediaCollection.findFirst({
        where: { publicId: body.collectionPublicId, deletedAt: null },
      });
      if (!collection) throw new AppError('NOT_FOUND', 'Resource not found.');
      if (!this.access.isPubliclyReadableCollection(collection)) {
        if (!actor || !actorHasPermission(actor, 'media:analytics:write')) {
          throw new AppError('NOT_FOUND', 'Resource not found.');
        }
        await this.access.requireCollectionManage(
          actor,
          collection,
          'media:analytics:write',
          request,
        );
      }
      collectionId = collection.id;
      collectionPublicId = collection.publicId;
      organizationId = organizationId ?? collection.organizationId;
    }

    const event = await this.prisma.mediaAnalyticsEvent.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextMediaAnalyticsEventPublicId(),
        organizationId,
        eventType: body.eventType,
        mediaAssetId,
        editorialId,
        collectionId,
        actorUserId: actor?.userId ?? null,
        sessionKey: body.sessionKey ?? null,
        metadata:
          body.metadata === undefined || body.metadata === null
            ? undefined
            : (JSON.parse(JSON.stringify(body.metadata)) as never),
      },
    });

    let organizationPublicId: string | null = null;
    if (organizationId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: organizationId },
        select: { publicId: true },
      });
      organizationPublicId = org?.publicId ?? null;
    }

    return {
      event: {
        publicId: event.publicId,
        eventType: event.eventType,
        mediaPublicId,
        editorialPublicId,
        collectionPublicId,
        organizationPublicId,
        occurredAt: toIso(event.occurredAt)!,
      },
    };
  }

  async listAdmin(
    actor: AuthActor,
    query: AdminAnalyticsQuery,
    request?: AuthenticatedRequest,
  ): Promise<MediaAnalyticsListResponse> {
    if (
      !actorHasPermission(actor, 'media:analytics:read') &&
      !actorHasPermission(actor, 'admin:media:read') &&
      !this.access.isPlatformAdmin(actor)
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.eventType) where.eventType = query.eventType;

    if (query.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!org) return { events: [], nextCursor: null };
      if (!this.access.isPlatformAdmin(actor) && !(await this.access.isOrgMember(actor, org.id))) {
        return await this.access.deny(actor, query.organizationPublicId, request, 'organization');
      }
      where.organizationId = org.id;
    } else if (!this.access.isPlatformAdmin(actor)) {
      if (!actor.activeOrganizationId) return { events: [], nextCursor: null };
      where.organizationId = actor.activeOrganizationId;
    }

    if (query.mediaPublicId) {
      const media = await this.prisma.mediaAsset.findFirst({
        where: { publicId: query.mediaPublicId },
      });
      if (!media) return { events: [], nextCursor: null };
      where.mediaAssetId = media.id;
    }
    if (query.editorialPublicId) {
      const editorial = await this.prisma.editorialContent.findFirst({
        where: { publicId: query.editorialPublicId },
      });
      if (!editorial) return { events: [], nextCursor: null };
      where.editorialId = editorial.id;
    }

    // Empty DB => empty list. No fabricated aggregates.
    const rows = await this.prisma.mediaAnalyticsEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { publicId: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { publicId: query.cursor }, skip: 1 } : {}),
      include: {
        organization: true,
        mediaAsset: true,
        editorial: true,
      },
    });
    const page = rows.slice(0, query.limit);

    const events: MediaAnalyticsEventSummary[] = [];
    for (const row of page) {
      let collectionPublicId: string | null = null;
      if (row.collectionId) {
        const collection = await this.prisma.mediaCollection.findFirst({
          where: { id: row.collectionId },
          select: { publicId: true },
        });
        collectionPublicId = collection?.publicId ?? null;
      }
      events.push({
        publicId: row.publicId,
        eventType: row.eventType,
        mediaPublicId: row.mediaAsset?.publicId ?? null,
        editorialPublicId: row.editorial?.publicId ?? null,
        collectionPublicId,
        organizationPublicId: row.organization?.publicId ?? null,
        occurredAt: toIso(row.occurredAt)!,
      });
    }

    return {
      events,
      nextCursor: rows.length > query.limit ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }
}
