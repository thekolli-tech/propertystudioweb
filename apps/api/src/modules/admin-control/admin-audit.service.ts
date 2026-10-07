import { Injectable } from '@nestjs/common';
import {
  type AdminAuditEvent,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
  type AdminAiGovernanceResponse,
} from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { requireAdminAiRead, requireAuditRead } from './admin-access';

const SECURITY_ACTIONS = [
  'authorization.denied',
  'auth.login.failed',
  'auth.logout',
  'auth.login',
  'auth.password.reset',
  'session.revoked',
  'platform.role.granted',
  'platform.role.revoked',
  'api-key.created',
  'api-key.revoked',
];

const SENSITIVE_METADATA_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'apiKey',
  'keyHash',
  'signature',
  'webhookSecret',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
]);

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt: string;
      id: string;
    };
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
  }
}

function safeMetadataKeys(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  return Object.keys(metadata as Record<string, unknown>).filter(
    (key) => !SENSITIVE_METADATA_KEYS.has(key),
  );
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(actor: AuthActor, query: AdminAuditListQuery): Promise<AdminAuditListResponse> {
    requireAuditRead(actor);

    const where: Record<string, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.securityOnly) {
      where.action = {
        in: SECURITY_ACTIONS,
        ...(query.action ? { equals: query.action } : {}),
      };
      // Prefer OR for security filter when no explicit action:
      if (!query.action) {
        where.OR = [
          { action: { in: SECURITY_ACTIONS } },
          { action: { contains: 'denied' } },
          { action: { startsWith: 'auth.' } },
        ];
        delete where.action;
      }
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.actorUserPublicId) {
      const user = await this.prisma.user.findFirst({
        where: { publicId: query.actorUserPublicId },
        select: { id: true },
      });
      where.actorUserId = user?.id ?? '00000000-0000-0000-0000-000000000000';
    }
    if (query.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
        select: { id: true },
      });
      where.organizationId = org?.id ?? '00000000-0000-0000-0000-000000000000';
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ];
    }

    const rows = await this.prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        actorUserId: true,
        organizationId: true,
        requestId: true,
        metadata: true,
        createdAt: true,
      },
    });

    const page = rows.slice(0, query.limit);
    const actorIds = [...new Set(page.map((row) => row.actorUserId).filter(Boolean))] as string[];
    const orgIds = [...new Set(page.map((row) => row.organizationId).filter(Boolean))] as string[];
    const [users, orgs] = await Promise.all([
      actorIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, publicId: true },
          })
        : Promise.resolve([]),
      orgIds.length
        ? this.prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, publicId: true },
          })
        : Promise.resolve([]),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u.publicId]));
    const orgMap = new Map(orgs.map((o) => [o.id, o.publicId]));

    const items: AdminAuditEvent[] = page.map((row) => ({
      id: row.id,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      actorUserPublicId: row.actorUserId ? (userMap.get(row.actorUserId) ?? null) : null,
      organizationPublicId: row.organizationId ? (orgMap.get(row.organizationId) ?? null) : null,
      requestId: row.requestId,
      createdAt: row.createdAt.toISOString(),
      metadataKeys: safeMetadataKeys(row.metadata),
    }));

    const last = page[page.length - 1];
    return {
      items,
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  async getAiGovernance(actor: AuthActor): Promise<AdminAiGovernanceResponse> {
    requireAdminAiRead(actor);

    const [
      conversations,
      activeConversations,
      messages,
      toolInvocations,
      unavailableAssistantReplies,
      analyticsByType,
    ] = await Promise.all([
      this.prisma.aiConversation.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.aiConversation.count({ where: { status: 'ACTIVE' } }),
      this.prisma.aiConversationMessage.count(),
      this.prisma.aiChatAnalyticsEvent.count({ where: { eventType: 'TOOL_INVOKED' } }),
      this.prisma.aiConversationMessage.count({
        where: { role: 'ASSISTANT', coverageState: 'UNAVAILABLE' },
      }),
      this.prisma.aiChatAnalyticsEvent.groupBy({
        by: ['eventType'],
        _count: { _all: true },
      }),
    ]);

    const asMetric = (
      key: string,
      label: string,
      value: number,
    ): AdminAiGovernanceResponse['conversations'] => ({
      key,
      label,
      value,
      coverageState: value === 0 ? 'ZERO' : 'READY',
      unit: 'count',
      currency: null,
      href: '/admin/ai',
      note: null,
    });

    return {
      providerName: 'DeterministicAiProvider',
      providerStatus: 'CONFIGURED',
      conversations: asMetric('ai.conversations', 'Conversations', conversations),
      activeConversations: asMetric(
        'ai.activeConversations',
        'Active conversations',
        activeConversations,
      ),
      messages: asMetric('ai.messages', 'Messages', messages),
      toolInvocations: asMetric('ai.toolInvocations', 'Tool invocations', toolInvocations),
      unavailableAssistantReplies: asMetric(
        'ai.unavailable',
        'UNAVAILABLE assistant replies',
        unavailableAssistantReplies,
      ),
      analyticsByType: analyticsByType.map((row) => ({
        key: row.eventType,
        label: row.eventType.replaceAll('_', ' '),
        count: row._count._all,
      })),
      note: 'Private conversation content is not exposed. Token/cost telemetry is unavailable.',
      generatedAt: new Date().toISOString(),
    };
  }
}
