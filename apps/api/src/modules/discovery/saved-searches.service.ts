import { Injectable } from '@nestjs/common';
import {
  type CreateSavedSearchRequest,
  type DiscoveryCriteria,
  type RunSavedSearchResponse,
  type SavedSearchListQuery,
  type SavedSearchListResponse,
  type SavedSearchMatchListQuery,
  type SavedSearchMatchListResponse,
  type SavedSearchSummary,
  type UpdateSavedSearchRequest,
  discoveryCriteriaSchema,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { DiscoveryService } from './discovery.service';
import { decodeCursor, encodeCursor, toIso } from './discovery.util';

@Injectable()
export class SavedSearchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly discovery: DiscoveryService,
  ) {}

  async create(
    actor: AuthActor,
    body: CreateSavedSearchRequest,
    request?: AuthenticatedRequest,
  ): Promise<SavedSearchSummary> {
    this.requirePermission(actor, 'saved-search:create', request);
    const criteria = this.discovery.normalizeCriteria(body.criteria);
    const row = await this.prisma.savedSearch.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextSavedSearchPublicId(),
        userId: actor.userId,
        name: body.name,
        criteria: criteria as object,
        alertFrequency: body.alertFrequency ?? 'OFF',
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'saved_search.created',
      resourceType: 'saved_search',
      resourceId: row.publicId,
      requestId: request?.requestId,
      after: { name: row.name, alertFrequency: row.alertFrequency },
    });

    return this.toSummary(row, 0);
  }

  async list(
    actor: AuthActor,
    query: SavedSearchListQuery,
    request?: AuthenticatedRequest,
  ): Promise<SavedSearchListResponse> {
    this.requirePermission(actor, 'saved-search:read', request);
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

    const rows = await this.prisma.savedSearch.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: { _count: { select: { matches: true } } },
    });

    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      savedSearches: page.map((row) => this.toSummary(row, row._count.matches)),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async get(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<SavedSearchSummary> {
    this.requirePermission(actor, 'saved-search:read', request);
    const row = await this.findOwned(actor.userId, publicId);
    const matchCount = await this.prisma.savedSearchMatch.count({
      where: { savedSearchId: row.id },
    });
    return this.toSummary(row, matchCount);
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateSavedSearchRequest,
    request?: AuthenticatedRequest,
  ): Promise<SavedSearchSummary> {
    this.requirePermission(actor, 'saved-search:update', request);
    const existing = await this.findOwned(actor.userId, publicId);
    const criteria =
      body.criteria !== undefined ? this.discovery.normalizeCriteria(body.criteria) : undefined;

    const row = await this.prisma.savedSearch.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? undefined,
        criteria: criteria === undefined ? undefined : (criteria as object),
        alertFrequency: body.alertFrequency ?? undefined,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'saved_search.updated',
      resourceType: 'saved_search',
      resourceId: row.publicId,
      requestId: request?.requestId,
      before: {
        name: existing.name,
        alertFrequency: existing.alertFrequency,
      },
      after: {
        name: row.name,
        alertFrequency: row.alertFrequency,
      },
    });

    const matchCount = await this.prisma.savedSearchMatch.count({
      where: { savedSearchId: row.id },
    });
    return this.toSummary(row, matchCount);
  }

  async softDelete(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    this.requirePermission(actor, 'saved-search:delete', request);
    const existing = await this.findOwned(actor.userId, publicId);
    await this.prisma.savedSearch.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), alertFrequency: 'OFF' },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'saved_search.deleted',
      resourceType: 'saved_search',
      resourceId: publicId,
      requestId: request?.requestId,
    });
    return { ok: true as const };
  }

  async run(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<RunSavedSearchResponse> {
    this.requirePermission(actor, 'saved-search:read', request);
    const row = await this.findOwned(actor.userId, publicId);
    const criteria = discoveryCriteriaSchema.parse(row.criteria);
    const result = await this.discovery.searchPublic({
      city: criteria.city,
      locality: criteria.locality,
      state: criteria.state,
      propertyType: criteria.propertyType,
      listingType: criteria.listingType,
      configuration: criteria.configuration,
      bedrooms: criteria.bedrooms,
      minBedrooms: criteria.minBedrooms,
      minPriceMinor:
        criteria.minPriceMinor !== undefined ? BigInt(criteria.minPriceMinor) : undefined,
      maxPriceMinor:
        criteria.maxPriceMinor !== undefined ? BigInt(criteria.maxPriceMinor) : undefined,
      availabilityStatus: criteria.availabilityStatus,
      projectPublicId: criteria.projectPublicId,
      q: criteria.q,
      sort: 'newest',
      includeFacets: false,
      limit: 24,
    });
    await this.prisma.savedSearch.update({
      where: { id: row.id },
      data: { lastRunAt: new Date() },
    });
    return {
      savedSearchPublicId: row.publicId,
      result,
    };
  }

  async listMatches(
    actor: AuthActor,
    query: SavedSearchMatchListQuery,
    request?: AuthenticatedRequest,
  ): Promise<SavedSearchMatchListResponse> {
    this.requirePermission(actor, 'saved-search:read', request);
    const where: Record<string, unknown> = { userId: actor.userId };
    if (query.savedSearchPublicId) {
      const search = await this.findOwned(actor.userId, query.savedSearchPublicId);
      where.savedSearchId = search.id;
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { matchedAt: { lt: cursor.createdAt } },
        { matchedAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.savedSearchMatch.findMany({
      where,
      orderBy: [{ matchedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        savedSearch: { select: { publicId: true, name: true } },
        property: { select: { publicId: true, title: true } },
      },
    });

    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      matches: page.map((row) => ({
        publicId: row.publicId,
        savedSearchPublicId: row.savedSearch.publicId,
        savedSearchName: row.savedSearch.name,
        propertyPublicId: row.property.publicId,
        propertyTitle: row.property.title,
        matchedAt: row.matchedAt.toISOString(),
        notifiedAt: toIso(row.notifiedAt),
      })),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.matchedAt, last.id) : null,
    };
  }

  parseCriteria(raw: unknown): DiscoveryCriteria {
    return this.discovery.normalizeCriteria(discoveryCriteriaSchema.parse(raw));
  }

  private async findOwned(userId: string, publicId: string) {
    const row = await this.prisma.savedSearch.findFirst({
      where: { publicId, deletedAt: null },
    });
    if (!row || row.userId !== userId) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return row;
  }

  private toSummary(
    row: {
      publicId: string;
      name: string;
      criteria: unknown;
      alertFrequency: 'OFF' | 'IMMEDIATE';
      lastAlertedAt: Date | null;
      lastRunAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    matchCount: number,
  ): SavedSearchSummary {
    return {
      publicId: row.publicId,
      name: row.name,
      criteria: this.parseCriteria(row.criteria),
      alertFrequency: row.alertFrequency,
      lastAlertedAt: toIso(row.lastAlertedAt),
      lastRunAt: toIso(row.lastRunAt),
      matchCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private requirePermission(
    actor: AuthActor,
    permission:
      'saved-search:create' | 'saved-search:read' | 'saved-search:update' | 'saved-search:delete',
    request?: AuthenticatedRequest,
  ) {
    if (!actorHasPermission(actor, permission)) {
      void request;
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }
}
