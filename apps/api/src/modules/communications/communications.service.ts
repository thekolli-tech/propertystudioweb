import { Injectable } from '@nestjs/common';
import {
  type ContentReportSummary,
  type ConversationDetail,
  type ConversationListQuery,
  type ConversationListResponse,
  type ConversationSummary,
  type CreateConversationRequest,
  type MessageSummary,
  type ReportMessageRequest,
  type RestrictConversationRequest,
  type SendMessageRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { NotificationService } from '../notifications/notification.service';
import { CommunicationsAccessService } from './communications-access.service';
import { applyUpdatedCursor, encodeCursor, toIso } from './communications.util';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CommunicationsAccessService,
    private readonly notifications: NotificationService,
  ) {}

  async createConversation(
    actor: AuthActor,
    body: CreateConversationRequest,
    request?: AuthenticatedRequest,
  ): Promise<ConversationDetail> {
    if (!actorHasPermission(actor, 'communications:create')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'communications:create',
      request,
    );

    const lead = await this.prisma.lead.findFirst({
      where: {
        publicId: body.leadPublicId,
        recipientOrganizationId: organization.id,
      },
      include: {
        requirement: { select: { ownerUserId: true, publicId: true } },
      },
    });
    if (!lead) {
      return await this.access.deny(actor, body.leadPublicId, request);
    }

    const grant = await this.prisma.leadAccessGrant.findFirst({
      where: {
        organizationId: organization.id,
        leadId: lead.id,
        accessState: { in: ['ACTIVE', 'PURCHASED'] },
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (!grant && !actorHasPermission(actor, 'platform:admin')) {
      throw new AppError('FORBIDDEN', 'Active lead access grant is required.');
    }

    const ownerUserId = lead.requirement.ownerUserId;
    const participantUserIds = [...new Set([actor.userId, ownerUserId])];

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'LEAD',
        leadId: lead.id,
        organizationId: organization.id,
      },
      include: {
        organization: true,
        lead: true,
        participants: { include: { user: { select: { id: true, publicId: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { publicId: true } } },
        },
      },
    });
    if (existing) {
      return this.toDetail(existing);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextConversationPublicId(),
        organizationId: organization.id,
        type: 'LEAD',
        leadId: lead.id,
        subjectLabel: body.subjectLabel ?? `Lead ${lead.publicId}`,
        status: 'OPEN',
        createdBy: actor.userId,
        participants: {
          create: participantUserIds.map((userId) => ({
            id: newUuid(),
            userId,
          })),
        },
      },
      include: {
        organization: true,
        lead: true,
        participants: { include: { user: { select: { id: true, publicId: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { publicId: true } } },
        },
      },
    });

    if (body.initialMessage) {
      await this.sendMessage(
        actor,
        conversation.publicId,
        { body: body.initialMessage },
        request,
      );
      return this.getConversation(actor, conversation.publicId, request);
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'conversation.created',
      resourceType: 'conversation',
      resourceId: conversation.publicId,
      requestId: request?.requestId,
      metadata: { leadPublicId: lead.publicId, type: 'LEAD' },
    });

    return this.toDetail(conversation);
  }

  async listConversations(
    actor: AuthActor,
    query: ConversationListQuery,
    request?: AuthenticatedRequest,
  ): Promise<ConversationListResponse> {
    if (!actorHasPermission(actor, 'communications:read') && !this.access.canModerate(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;

    if (this.access.canModerate(actor) && !query.organizationPublicId) {
      // platform moderators can list broadly
    } else if (query.organizationPublicId) {
      const organization = await this.access.requireOrganization(
        actor,
        query.organizationPublicId,
        'communications:read',
        request,
      );
      where.organizationId = organization.id;
    } else {
      where.participants = { some: { userId: actor.userId } };
    }

    applyUpdatedCursor(where, query.cursor);

    const rows = await this.prisma.conversation.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        organization: true,
        lead: true,
        participants: { include: { user: { select: { id: true, publicId: true } } } },
      },
    });
    const page = rows.slice(0, query.limit);

    return {
      conversations: page.map((row) => this.toSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.updatedAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getConversation(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ConversationDetail> {
    if (!actorHasPermission(actor, 'communications:read') && !this.access.canModerate(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const conversation = await this.access.requireParticipant(actor, publicId, request);
    return this.toDetail(conversation);
  }

  async sendMessage(
    actor: AuthActor,
    conversationPublicId: string,
    body: SendMessageRequest,
    request?: AuthenticatedRequest,
  ): Promise<MessageSummary> {
    if (!actorHasPermission(actor, 'communications:message')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const conversation = await this.access.requireParticipant(
      actor,
      conversationPublicId,
      request,
    );
    if (conversation.status === 'RESTRICTED') {
      throw new AppError('FORBIDDEN', 'Conversation is restricted.');
    }

    const isParticipant = conversation.participants.some((row) => row.userId === actor.userId);
    if (!isParticipant && !this.access.canModerate(actor)) {
      return await this.access.deny(actor, conversationPublicId, request);
    }

    const message = await this.prisma.message.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextMessagePublicId(),
        conversationId: conversation.id,
        senderUserId: actor.userId,
        body: body.body,
      },
      include: { sender: { select: { publicId: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const recipients = conversation.participants.filter((row) => row.userId !== actor.userId);
    await this.notifications.createMany(
      recipients.map((participant) => ({
        userId: participant.userId,
        orgId: conversation.organizationId,
        type: 'MESSAGE_RECEIVED' as const,
        title: 'New message',
        body: 'You received a new message in a conversation.',
        severity: 'INFO' as const,
        entityType: 'CONVERSATION',
        entityId: conversation.id,
      })),
    );

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: conversation.organizationId,
      action: 'message.sent',
      resourceType: 'message',
      resourceId: message.publicId,
      requestId: request?.requestId,
      metadata: { conversationPublicId },
    });

    return {
      publicId: message.publicId,
      conversationPublicId,
      senderUserPublicId: message.sender.publicId,
      body: message.body,
      createdAt: toIso(message.createdAt)!,
    };
  }

  async markRead(
    actor: AuthActor,
    conversationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<{ lastReadAt: string }> {
    if (!actorHasPermission(actor, 'communications:read')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const conversation = await this.access.requireParticipant(
      actor,
      conversationPublicId,
      request,
    );
    const participant = conversation.participants.find((row) => row.userId === actor.userId);
    if (!participant) {
      return await this.access.deny(actor, conversationPublicId, request);
    }
    const now = new Date();
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: now },
    });
    return { lastReadAt: toIso(now)! };
  }

  async reportMessage(
    actor: AuthActor,
    messagePublicId: string,
    body: ReportMessageRequest,
    request?: AuthenticatedRequest,
  ): Promise<ContentReportSummary> {
    if (!actorHasPermission(actor, 'communications:read')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const message = await this.prisma.message.findFirst({
      where: { publicId: messagePublicId },
      include: { conversation: true },
    });
    if (!message) {
      return await this.access.deny(actor, messagePublicId, request);
    }
    await this.access.requireParticipant(actor, message.conversation.publicId, request);

    const report = await this.prisma.contentReport.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextContentReportPublicId(),
        reporterUserId: actor.userId,
        entityType: 'MESSAGE',
        entityId: message.id,
        reason: body.reason,
        details: body.details ?? null,
        status: 'OPEN',
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'message.reported',
      resourceType: 'content_report',
      resourceId: report.publicId,
      requestId: request?.requestId,
      metadata: { messagePublicId, reason: body.reason },
    });

    return {
      publicId: report.publicId,
      entityType: 'MESSAGE',
      entityPublicId: message.publicId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: toIso(report.createdAt)!,
    };
  }

  async restrictConversation(
    actor: AuthActor,
    conversationPublicId: string,
    body: RestrictConversationRequest,
    request?: AuthenticatedRequest,
  ): Promise<ConversationSummary> {
    if (!this.access.canModerate(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const conversation = await this.prisma.conversation.findFirst({
      where: { publicId: conversationPublicId },
      include: {
        organization: true,
        lead: true,
        participants: { include: { user: { select: { id: true, publicId: true } } } },
      },
    });
    if (!conversation) {
      return await this.access.deny(actor, conversationPublicId, request);
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: body.status },
      include: {
        organization: true,
        lead: true,
        participants: { include: { user: { select: { id: true, publicId: true } } } },
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action: 'conversation.restricted',
      resourceType: 'conversation',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status: body.status },
    });

    return this.toSummary(updated);
  }

  private toSummary(row: {
    publicId: string;
    organization: { publicId: string } | null;
    type: ConversationSummary['type'];
    lead: { publicId: string } | null;
    subjectLabel: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Array<{
      user: { publicId: string };
      joinedAt: Date;
      lastReadAt: Date | null;
    }>;
  }): ConversationSummary {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      type: row.type,
      leadPublicId: row.lead?.publicId ?? null,
      subjectLabel: row.subjectLabel,
      status: row.status as ConversationSummary['status'],
      participants: row.participants.map((participant) => ({
        userPublicId: participant.user.publicId,
        joinedAt: toIso(participant.joinedAt)!,
        lastReadAt: toIso(participant.lastReadAt),
      })),
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }

  private toDetail(row: {
    publicId: string;
    organization: { publicId: string } | null;
    type: ConversationSummary['type'];
    lead: { publicId: string } | null;
    subjectLabel: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Array<{
      user: { publicId: string };
      joinedAt: Date;
      lastReadAt: Date | null;
    }>;
    messages: Array<{
      publicId: string;
      body: string;
      createdAt: Date;
      sender: { publicId: string };
    }>;
  }): ConversationDetail {
    return {
      ...this.toSummary(row),
      messages: row.messages.map((message) => ({
        publicId: message.publicId,
        conversationPublicId: row.publicId,
        senderUserPublicId: message.sender.publicId,
        body: message.body,
        createdAt: toIso(message.createdAt)!,
      })),
    };
  }
}
