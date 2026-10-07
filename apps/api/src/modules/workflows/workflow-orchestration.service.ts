import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  type EnsureCrmContactFromLeadRequest,
  type EnsureCrmContactFromLeadResponse,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { DomainEventBus } from '../integrations/domain-event-bus.service';
import { NotificationService } from '../notifications/notification.service';

/**
 * Thin cross-module orchestration over existing CRM / leads / notifications.
 * Does not replace domain services or introduce a second event bus.
 */
@Injectable()
export class WorkflowOrchestrationService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly events: DomainEventBus,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit(): void {
    this.events.subscribe('lead.assigned', async (event) => {
      if (!event.organizationId || !event.resourcePublicId) return;
      const lead = await this.prisma.lead.findFirst({
        where: { publicId: event.resourcePublicId },
        select: { id: true },
      });
      if (!lead) return;
      const members = await this.prisma.organizationMembership.findMany({
        where: { organizationId: event.organizationId, status: 'ACTIVE' },
        select: { userId: true },
        take: 20,
      });
      await this.notifications.createMany(
        members.map((member) => ({
          userId: member.userId,
          orgId: event.organizationId,
          type: 'LEAD_ASSIGNED' as const,
          title: 'Lead assigned',
          body: 'A lead was assigned or delivered to your organization.',
          severity: 'INFO' as const,
          entityType: 'LEAD',
          entityId: lead.id,
        })),
      );
    });

    this.events.subscribe('crm.site_visit.scheduled', async (event) => {
      if (!event.organizationId || !event.resourcePublicId) return;
      const visit = await this.prisma.crmSiteVisit.findFirst({
        where: { publicId: event.resourcePublicId },
        select: { assignedUserId: true, id: true },
      });
      if (!visit?.assignedUserId) return;
      await this.notifications.create({
        userId: visit.assignedUserId,
        orgId: event.organizationId,
        type: 'SITE_VISIT_CREATED',
        title: 'Site visit scheduled',
        body: 'A site visit was scheduled in your CRM pipeline.',
        severity: 'INFO',
        entityType: 'CRM_SITE_VISIT',
        entityId: visit.id,
      });
    });
  }

  /**
   * Idempotent lead → CRM contact bridge.
   * Never copies protected contact PII unless includeRevealedContact is true
   * AND an active access grant with lastRevealedAt exists.
   */
  async ensureCrmContactFromLead(
    actor: AuthActor,
    body: EnsureCrmContactFromLeadRequest,
    request?: AuthenticatedRequest,
  ): Promise<EnsureCrmContactFromLeadResponse> {
    if (
      !actorHasPermission(actor, 'crm:contacts:create') &&
      !actorHasPermission(actor, 'platform:admin')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const org = await this.prisma.organization.findFirst({
      where: { publicId: body.organizationPublicId },
      select: { id: true, publicId: true },
    });
    if (!org) {
      throw new AppError('NOT_FOUND', 'Organization not found.');
    }

    if (!actorHasPermission(actor, 'platform:admin')) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: { organizationId: org.id, userId: actor.userId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) {
        throw new AppError('NOT_FOUND', 'Organization not found.');
      }
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        publicId: body.leadPublicId,
        recipientOrganizationId: org.id,
      },
      include: {
        requirement: { select: { city: true, propertyType: true, ownerUserId: true } },
        leadAccessGrants: {
          where: { organizationId: org.id },
          take: 1,
        },
      },
    });
    if (!lead) {
      throw new AppError('NOT_FOUND', 'Lead not found.');
    }

    const existing = await this.prisma.crmContact.findFirst({
      where: { organizationId: org.id, sourceLeadId: lead.id },
      select: { publicId: true },
    });
    if (existing) {
      return {
        created: false,
        contactPublicId: existing.publicId,
        sourceLeadPublicId: lead.publicId,
        contactFieldsIncluded: false,
      };
    }

    const grant = lead.leadAccessGrants[0];
    const entitled =
      grant &&
      !grant.revokedAt &&
      (!grant.expiresAt || grant.expiresAt > new Date()) &&
      ['PURCHASED', 'ACTIVE'].includes(grant.accessState);

    if (!entitled) {
      throw new AppError(
        'FORBIDDEN',
        'Lead is not entitled for CRM contact creation. Purchase or access grant required.',
      );
    }

    let email: string | null = null;
    let displayName = `Lead ${lead.publicId}`;
    let contactFieldsIncluded = false;

    if (body.includeRevealedContact && grant.lastRevealedAt) {
      if (
        !actorHasPermission(actor, 'leads:contact:reveal') &&
        !actorHasPermission(actor, 'platform:admin')
      ) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions to include revealed contact.');
      }
      const owner = await this.prisma.user.findFirst({
        where: { id: lead.requirement.ownerUserId },
        select: { email: true },
      });
      if (owner?.email) {
        email = owner.email;
        displayName = owner.email.split('@')[0] || displayName;
        contactFieldsIncluded = true;
      }
    } else {
      displayName = `${lead.requirement.propertyType} · ${lead.requirement.city}`;
    }

    const publicId = await this.publicIds.nextContactPublicId();
    try {
      await this.prisma.crmContact.create({
        data: {
          id: newUuid(),
          publicId,
          organizationId: org.id,
          sourceLeadId: lead.id,
          contactType: 'BUYER',
          displayName: displayName.slice(0, 160),
          phone: null,
          email,
          preferredContactMethod: 'PHONE',
          notes: null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });
    } catch {
      // Race: unique (organizationId, sourceLeadId) — return existing.
      const raced = await this.prisma.crmContact.findFirst({
        where: { organizationId: org.id, sourceLeadId: lead.id },
        select: { publicId: true },
      });
      if (raced) {
        return {
          created: false,
          contactPublicId: raced.publicId,
          sourceLeadPublicId: lead.publicId,
          contactFieldsIncluded: false,
        };
      }
      throw new AppError('CONFLICT', 'Could not create CRM contact from lead.');
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: org.id,
      action: 'workflow.crm_contact_from_lead',
      resourceType: 'crm_contact',
      resourceId: publicId,
      requestId: request?.requestId,
      after: {
        sourceLeadPublicId: lead.publicId,
        contactFieldsIncluded,
      },
    });

    await this.events.emit({
      eventType: 'crm.contact.created',
      resourceType: 'crm_contact',
      resourcePublicId: publicId,
      organizationId: org.id,
      payload: {
        contactPublicId: publicId,
        sourceLeadPublicId: lead.publicId,
        contactFieldsIncluded,
      },
    });

    return {
      created: true,
      contactPublicId: publicId,
      sourceLeadPublicId: lead.publicId,
      contactFieldsIncluded,
    };
  }

  /** Emit helpers for CRM module hooks — keep domain services authoritative. */
  async emitCrmLifecycleEvent(input: {
    eventType:
      | 'crm.contact.created'
      | 'crm.follow_up.created'
      | 'crm.site_visit.scheduled'
      | 'crm.site_visit.completed'
      | 'crm.deal.created'
      | 'crm.deal.updated'
      | 'crm.deal.closed'
      | 'lead.accessed';
    organizationId: string;
    resourceType: string;
    resourcePublicId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.events.emit({
      eventType: input.eventType,
      resourceType: input.resourceType,
      resourcePublicId: input.resourcePublicId,
      organizationId: input.organizationId,
      payload: input.payload,
    });
  }
}
