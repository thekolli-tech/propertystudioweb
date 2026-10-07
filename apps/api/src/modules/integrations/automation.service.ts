import { Injectable, Logger } from '@nestjs/common';
import { type CreateAutomationRuleRequest } from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async createRule(
    actor: AuthActor,
    organizationPublicId: string,
    body: CreateAutomationRuleRequest,
    request?: { requestId?: string },
  ) {
    if (
      !actorHasPermission(actor, 'automations:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { publicId: organizationPublicId },
    });
    if (!org) {
      throw new AppError('NOT_FOUND', 'Organization not found.');
    }
    if (
      !actorHasPermission(actor, 'admin:integrations:manage') &&
      actor.activeOrganizationId !== org.id
    ) {
      throw new AppError('FORBIDDEN', 'Cross-tenant access denied.');
    }

    const publicId = await this.publicIds.nextAutomationRulePublicId();
    const rule = await this.prisma.automationRule.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: org.id,
        name: body.name,
        triggerEvent: body.triggerEvent,
        actionType: body.actionType,
        actionConfig: body.actionConfig as object,
        status: 'ENABLED',
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: org.id,
      action: 'automation.rule.created',
      resourceType: 'automation_rule',
      resourceId: rule.publicId,
      requestId: request?.requestId,
    });

    return this.toSummary(rule);
  }

  async listRules(actor: AuthActor, organizationPublicId: string) {
    if (
      !actorHasPermission(actor, 'automations:read') &&
      !actorHasPermission(actor, 'admin:integrations:read')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const org = await this.prisma.organization.findUnique({
      where: { publicId: organizationPublicId },
    });
    if (!org) {
      throw new AppError('NOT_FOUND', 'Organization not found.');
    }
    if (
      !actorHasPermission(actor, 'admin:integrations:read') &&
      actor.activeOrganizationId !== org.id
    ) {
      throw new AppError('FORBIDDEN', 'Cross-tenant access denied.');
    }

    const rows = await this.prisma.automationRule.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map((row) => this.toSummary(row)) };
  }

  async handleEvent(input: {
    eventType: string;
    organizationId: string;
    resourcePublicId: string | null;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: {
        organizationId: input.organizationId,
        triggerEvent: input.eventType,
        status: 'ENABLED',
      },
    });

    for (const rule of rules) {
      try {
        await this.executeRule(rule, input);
      } catch (error) {
        this.logger.warn(
          `Automation rule ${rule.publicId} failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
  }

  private async executeRule(
    rule: {
      id: string;
      publicId: string;
      organizationId: string;
      actionType: string;
      actionConfig: unknown;
      createdBy: string | null;
    },
    input: {
      eventType: string;
      resourcePublicId: string | null;
      payload: Record<string, unknown>;
    },
  ) {
    if (rule.actionType === 'NOOP') {
      return;
    }

    if (rule.actionType === 'CREATE_FOLLOW_UP') {
      const config = (rule.actionConfig ?? {}) as { title?: string; dueInHours?: number };
      const leadPublicId =
        typeof input.payload.leadPublicId === 'string'
          ? input.payload.leadPublicId
          : input.resourcePublicId;
      if (!leadPublicId) return;

      const lead = await this.prisma.lead.findFirst({
        where: { publicId: leadPublicId, recipientOrganizationId: rule.organizationId },
      });
      if (!lead) return;

      const contact = await this.prisma.crmContact.findFirst({
        where: { organizationId: rule.organizationId, sourceLeadId: lead.id },
      });
      if (!contact) return;

      const dueAt = new Date(Date.now() + (config.dueInHours ?? 24) * 60 * 60 * 1000);
      await this.prisma.crmFollowUp.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextTaskPublicId(),
          organizationId: rule.organizationId,
          contactId: contact.id,
          leadId: lead.id,
          title: config.title ?? `Follow up (${input.eventType})`,
          dueAt,
          status: 'OPEN',
          priority: 'MEDIUM',
          createdBy: rule.createdBy,
        },
      });
      return;
    }

    if (rule.actionType === 'SEND_NOTIFICATION') {
      const config = (rule.actionConfig ?? {}) as {
        userId?: string;
        title?: string;
        body?: string;
      };
      const userId = config.userId ?? rule.createdBy;
      if (!userId) return;
      await this.notifications.create({
        userId,
        orgId: rule.organizationId,
        type: 'SYSTEM',
        title: config.title ?? `Automation: ${input.eventType}`,
        body: config.body ?? `Triggered by ${input.eventType}`,
        severity: 'INFO',
        entityType: 'AUTOMATION_RULE',
        entityId: rule.id,
      });
    }
  }

  private toSummary(row: {
    publicId: string;
    name: string;
    triggerEvent: string;
    actionType: string;
    actionConfig: unknown;
    status: string;
    createdAt: Date;
  }) {
    return {
      publicId: row.publicId,
      name: row.name,
      triggerEvent: row.triggerEvent,
      actionType: row.actionType,
      actionConfig: (row.actionConfig ?? {}) as Record<string, unknown>,
      status: row.status as 'ENABLED' | 'DISABLED',
      createdAt: row.createdAt.toISOString(),
    };
  }
}
