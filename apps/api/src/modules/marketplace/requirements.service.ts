import { Injectable } from '@nestjs/common';
import {
  type AdminRequirementListQuery,
  type CreateRequirementRequest,
  type PublicRequirementListQuery,
  type RequirementListQuery,
  type UpdateRequirementRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import {
  decodeCursor,
  encodeCursor,
  toPublicRequirementDetail,
  toPublicRequirementSummary,
  toRequirementDetail,
  toRequirementSummary,
} from './marketplace.util';

const OWNER_MUTABLE_STATUSES = new Set(['DRAFT', 'ACTIVE', 'PAUSED']);
const PUBLISHABLE_STATUSES = new Set(['DRAFT', 'PAUSED']);

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: AuthActor, body: CreateRequirementRequest, request?: AuthenticatedRequest) {
    this.requireOwnerPermission(actor, 'requirement:create');

    const id = newUuid();
    const publicId = await this.publicIds.nextRequirementPublicId();
    const row = await this.prisma.requirement.create({
      data: {
        id,
        publicId,
        ownerUserId: actor.userId,
        propertyType: body.propertyType,
        transactionType: body.transactionType,
        configuration: body.configuration ?? null,
        bedrooms: body.bedrooms ?? null,
        budgetMinMinor: body.budgetMinMinor ?? null,
        budgetMaxMinor: body.budgetMaxMinor ?? null,
        currency: body.currency,
        city: body.city,
        locality: body.locality ?? null,
        microMarket: body.microMarket ?? null,
        preferredProject: body.preferredProject ?? null,
        purpose: body.purpose,
        timeline: body.timeline,
        vaastuRequired: body.vaastuRequired,
        amenities: body.amenities,
        notes: body.notes ?? null,
        status: 'DRAFT',
        visibility: body.visibility,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'requirement.created',
      resourceType: 'requirement',
      resourceId: publicId,
      requestId: request?.requestId,
      after: {
        status: row.status,
        visibility: row.visibility,
        city: row.city,
        propertyType: row.propertyType,
      },
    });

    return toRequirementDetail(row, actor.userPublicId);
  }

  async listMine(actor: AuthActor, query: RequirementListQuery, _request?: AuthenticatedRequest) {
    this.requireOwnerPermission(actor, 'requirement:read:own');

    const where: Record<string, unknown> = { ownerUserId: actor.userId };
    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.city) where.city = query.city;
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.requirement.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      requirements: page.map((row) => toRequirementSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getMine(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const row = await this.requireOwnedRequirement(
      actor,
      publicId,
      'requirement:read:own',
      request,
    );
    return toRequirementDetail(row, actor.userPublicId);
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateRequirementRequest,
    request?: AuthenticatedRequest,
  ) {
    const row = await this.requireOwnedRequirement(
      actor,
      publicId,
      'requirement:update:own',
      request,
    );

    if (!OWNER_MUTABLE_STATUSES.has(row.status) && !this.isPlatformAdmin(actor)) {
      throw new AppError('CONFLICT', 'Requirement cannot be updated in its current status.');
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== row.version) {
      throw new AppError('CONFLICT', 'Requirement was modified by another request.');
    }

    const updated = await this.prisma.requirement.update({
      where: { id: row.id },
      data: {
        propertyType: body.propertyType ?? undefined,
        transactionType: body.transactionType ?? undefined,
        configuration: body.configuration === undefined ? undefined : body.configuration,
        bedrooms: body.bedrooms === undefined ? undefined : body.bedrooms,
        budgetMinMinor: body.budgetMinMinor === undefined ? undefined : body.budgetMinMinor,
        budgetMaxMinor: body.budgetMaxMinor === undefined ? undefined : body.budgetMaxMinor,
        currency: body.currency ?? undefined,
        city: body.city ?? undefined,
        locality: body.locality === undefined ? undefined : body.locality,
        microMarket: body.microMarket === undefined ? undefined : body.microMarket,
        preferredProject: body.preferredProject === undefined ? undefined : body.preferredProject,
        purpose: body.purpose ?? undefined,
        timeline: body.timeline ?? undefined,
        vaastuRequired: body.vaastuRequired ?? undefined,
        amenities: body.amenities ?? undefined,
        notes: body.notes === undefined ? undefined : body.notes,
        visibility: body.visibility ?? undefined,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'requirement.updated',
      resourceType: 'requirement',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { version: row.version, status: row.status },
      after: { version: updated.version, status: updated.status },
    });

    return toRequirementDetail(updated, actor.userPublicId);
  }

  async publish(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const row = await this.requireOwnedRequirement(actor, publicId, 'requirement:publish', request);
    if (!PUBLISHABLE_STATUSES.has(row.status) && row.status !== 'ACTIVE') {
      throw new AppError('CONFLICT', 'Only draft or paused requirements can be published.');
    }

    const updated = await this.prisma.requirement.update({
      where: { id: row.id },
      data: {
        status: 'ACTIVE',
        visibility: 'MARKETPLACE',
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'requirement.published',
      resourceType: 'requirement',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { status: row.status, visibility: row.visibility },
      after: { status: updated.status, visibility: updated.visibility },
    });

    return toRequirementDetail(updated, actor.userPublicId);
  }

  async pause(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const row = await this.requireOwnedRequirement(
      actor,
      publicId,
      'requirement:update:own',
      request,
    );
    if (row.status !== 'ACTIVE') {
      throw new AppError('CONFLICT', 'Only active requirements can be paused.');
    }

    const updated = await this.prisma.requirement.update({
      where: { id: row.id },
      data: {
        status: 'PAUSED',
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'requirement.paused',
      resourceType: 'requirement',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { status: row.status },
      after: { status: updated.status },
    });

    return toRequirementDetail(updated, actor.userPublicId);
  }

  async close(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const row = await this.requireOwnedRequirement(
      actor,
      publicId,
      'requirement:update:own',
      request,
    );
    if (row.status === 'CLOSED' || row.status === 'CANCELLED') {
      throw new AppError('CONFLICT', 'Requirement is already closed.');
    }

    const updated = await this.prisma.requirement.update({
      where: { id: row.id },
      data: {
        status: 'CLOSED',
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'requirement.closed',
      resourceType: 'requirement',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { status: row.status },
      after: { status: updated.status },
    });

    return toRequirementDetail(updated, actor.userPublicId);
  }

  async listPublic(query: PublicRequirementListQuery) {
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      visibility: 'MARKETPLACE',
    };
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.configuration) where.configuration = query.configuration;
    if (query.bedrooms !== undefined) where.bedrooms = query.bedrooms;
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.locality) where.locality = { equals: query.locality, mode: 'insensitive' };
    if (query.microMarket) {
      where.microMarket = { equals: query.microMarket, mode: 'insensitive' };
    }
    if (query.timeline) where.timeline = query.timeline;
    if (query.minBudgetMinor !== undefined || query.maxBudgetMinor !== undefined) {
      where.AND = [
        ...(query.maxBudgetMinor !== undefined
          ? [{ OR: [{ budgetMinMinor: null }, { budgetMinMinor: { lte: query.maxBudgetMinor } }] }]
          : []),
        ...(query.minBudgetMinor !== undefined
          ? [{ OR: [{ budgetMaxMinor: null }, { budgetMaxMinor: { gte: query.minBudgetMinor } }] }]
          : []),
      ];
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.requirement.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      requirements: page.map((row) => toPublicRequirementSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getPublic(publicId: string) {
    const row = await this.prisma.requirement.findFirst({
      where: {
        publicId,
        status: 'ACTIVE',
        visibility: 'MARKETPLACE',
      },
    });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return toPublicRequirementDetail(row);
  }

  async listAdmin(
    actor: AuthActor,
    query: AdminRequirementListQuery,
    _request?: AuthenticatedRequest,
  ) {
    if (
      !actorHasPermission(actor, 'admin:requirements:read') &&
      !actorHasPermission(actor, 'platform:admin')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.city) where.city = query.city;
    if (query.ownerUserPublicId) {
      const owner = await this.prisma.user.findFirst({
        where: { publicId: query.ownerUserPublicId },
      });
      if (!owner) {
        return { requirements: [], nextCursor: null };
      }
      where.ownerUserId = owner.id;
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.requirement.findMany({
      where,
      include: { owner: { select: { publicId: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      requirements: page.map((row) => ({
        ...toRequirementSummary(row),
        ownerUserPublicId: row.owner.publicId,
      })),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  private requireOwnerPermission(
    actor: AuthActor,
    permission:
      | 'requirement:create'
      | 'requirement:read:own'
      | 'requirement:update:own'
      | 'requirement:publish',
  ) {
    if (this.isPlatformAdmin(actor)) return;
    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  private isPlatformAdmin(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:requirements:read')
    );
  }

  private async requireOwnedRequirement(
    actor: AuthActor,
    publicId: string,
    permission: 'requirement:read:own' | 'requirement:update:own' | 'requirement:publish',
    request?: AuthenticatedRequest,
  ) {
    const row = await this.prisma.requirement.findFirst({ where: { publicId } });
    if (!row) {
      return await this.deny(actor, publicId, request);
    }

    if (this.isPlatformAdmin(actor)) {
      return row;
    }

    if (row.ownerUserId !== actor.userId) {
      return await this.deny(actor, publicId, request);
    }

    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    return row;
  }

  private applyCursor(where: Record<string, unknown>, cursor?: string) {
    if (!cursor) return;
    try {
      const decoded = decodeCursor(cursor);
      where.OR = [
        { createdAt: { lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { lt: decoded.id } },
      ];
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
    }
  }

  private async deny(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'requirement',
      resourceId: publicId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
