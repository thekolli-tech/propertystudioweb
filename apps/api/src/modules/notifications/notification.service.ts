import { Injectable } from '@nestjs/common';
import {
  type NotificationListQuery,
  type NotificationListResponse,
  type NotificationPreferencesResponse,
  type NotificationSeverity,
  type NotificationSummary,
  type NotificationType,
  type UpdateNotificationPreferencesRequest,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { applyCreatedCursor, encodeCursor, toIso } from './notifications.util';

export type CreateNotificationInput = {
  userId: string;
  orgId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  entityType?: string | null;
  entityId?: string | null;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    if (input.type !== 'SYSTEM') {
      const preference = await this.prisma.notificationPreference.findUnique({
        where: {
          userId_type_channel: {
            userId: input.userId,
            type: input.type,
            channel: 'IN_APP',
          },
        },
      });
      if (preference && !preference.enabled) {
        return;
      }
    }

    await this.prisma.notification.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextNotificationPublicId(),
        userId: input.userId,
        organizationId: input.orgId ?? null,
        type: input.type,
        title: input.title.slice(0, 200),
        body: input.body.slice(0, 1000),
        severity: input.severity ?? 'INFO',
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) {
      await this.create(input);
    }
  }

  async list(
    actor: AuthActor,
    query: NotificationListQuery,
    _request?: AuthenticatedRequest,
  ): Promise<NotificationListResponse> {
    this.requirePermission(actor, 'notifications:read');

    const where: Record<string, unknown> = { userId: actor.userId };
    if (query.unreadOnly) {
      where.readAt = null;
    }
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        user: { select: { id: true } },
      },
    });

    const page = rows.slice(0, query.limit);
    const orgIds = [...new Set(page.map((row) => row.organizationId).filter(Boolean))] as string[];
    const orgs =
      orgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, publicId: true },
          })
        : [];
    const orgMap = new Map(orgs.map((org) => [org.id, org.publicId]));

    const entityPublicIdById = await this.resolveEntityPublicIds(
      page.map((row) => ({
        entityType: row.entityType,
        entityId: row.entityId,
      })),
    );

    return {
      notifications: page.map((row) =>
        this.toSummary(row, orgMap.get(row.organizationId ?? '') ?? null, entityPublicIdById),
      ),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async markRead(
    actor: AuthActor,
    publicId: string,
    _request?: AuthenticatedRequest,
  ): Promise<NotificationSummary> {
    this.requirePermission(actor, 'notifications:update');
    const row = await this.prisma.notification.findFirst({
      where: { publicId, userId: actor.userId },
    });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    const finalRow = row.readAt
      ? row
      : await this.prisma.notification.update({
          where: { id: row.id },
          data: { readAt: new Date() },
        });
    const org =
      finalRow.organizationId != null
        ? await this.prisma.organization.findFirst({
            where: { id: finalRow.organizationId },
            select: { publicId: true },
          })
        : null;
    const entityMap = await this.resolveEntityPublicIds([
      { entityType: finalRow.entityType, entityId: finalRow.entityId },
    ]);
    return this.toSummary(finalRow, org?.publicId ?? null, entityMap);
  }

  async markAllRead(
    actor: AuthActor,
    _request?: AuthenticatedRequest,
  ): Promise<{ updated: number }> {
    this.requirePermission(actor, 'notifications:update');
    const result = await this.prisma.notification.updateMany({
      where: { userId: actor.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async getPreferences(
    actor: AuthActor,
    _request?: AuthenticatedRequest,
  ): Promise<NotificationPreferencesResponse> {
    this.requirePermission(actor, 'notifications:read');
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId: actor.userId },
      orderBy: [{ type: 'asc' }, { channel: 'asc' }],
    });
    return {
      preferences: rows.map((row) => ({
        type: row.type,
        channel: row.channel,
        enabled: row.enabled,
      })),
    };
  }

  async updatePreferences(
    actor: AuthActor,
    body: UpdateNotificationPreferencesRequest,
    _request?: AuthenticatedRequest,
  ): Promise<NotificationPreferencesResponse> {
    this.requirePermission(actor, 'notifications:update');
    for (const preference of body.preferences) {
      await this.prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId: actor.userId,
            type: preference.type,
            channel: preference.channel,
          },
        },
        create: {
          id: newUuid(),
          userId: actor.userId,
          type: preference.type,
          channel: preference.channel,
          enabled: preference.enabled,
        },
        update: { enabled: preference.enabled },
      });
    }
    return this.getPreferences(actor);
  }

  private requirePermission(
    actor: AuthActor,
    permission: 'notifications:read' | 'notifications:update',
  ) {
    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  private toSummary(
    row: {
      publicId: string;
      type: NotificationType;
      title: string;
      body: string;
      severity: NotificationSeverity;
      readAt: Date | null;
      entityType: string | null;
      entityId: string | null;
      createdAt: Date;
    },
    organizationPublicId: string | null,
    entityPublicIdById: Map<string, string>,
  ): NotificationSummary {
    return {
      publicId: row.publicId,
      type: row.type,
      title: row.title,
      body: row.body,
      severity: row.severity,
      readAt: toIso(row.readAt),
      entityType: row.entityType,
      entityPublicId: row.entityId ? (entityPublicIdById.get(row.entityId) ?? null) : null,
      organizationPublicId,
      createdAt: toIso(row.createdAt)!,
    };
  }

  private async resolveEntityPublicIds(
    refs: Array<{ entityType: string | null; entityId: string | null }>,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const byType = new Map<string, string[]>();
    for (const ref of refs) {
      if (!ref.entityType || !ref.entityId) continue;
      const list = byType.get(ref.entityType) ?? [];
      list.push(ref.entityId);
      byType.set(ref.entityType, list);
    }

    const loaders: Array<[string, Promise<Array<{ id: string; publicId: string }>>]> = [];
    for (const [type, ids] of byType) {
      const unique = [...new Set(ids)];
      if (type === 'VERIFICATION_CASE') {
        loaders.push([
          type,
          this.prisma.verificationCase.findMany({
            where: { id: { in: unique } },
            select: { id: true, publicId: true },
          }),
        ]);
      } else if (type === 'LEAD') {
        loaders.push([
          type,
          this.prisma.lead.findMany({
            where: { id: { in: unique } },
            select: { id: true, publicId: true },
          }),
        ]);
      } else if (type === 'REVIEW') {
        loaders.push([
          type,
          this.prisma.review.findMany({
            where: { id: { in: unique } },
            select: { id: true, publicId: true },
          }),
        ]);
      } else if (type === 'CONVERSATION') {
        loaders.push([
          type,
          this.prisma.conversation.findMany({
            where: { id: { in: unique } },
            select: { id: true, publicId: true },
          }),
        ]);
      }
    }

    for (const [, promise] of loaders) {
      const rows = await promise;
      for (const row of rows) {
        map.set(row.id, row.publicId);
      }
    }
    return map;
  }
}
