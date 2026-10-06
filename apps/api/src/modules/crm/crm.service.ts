import { Injectable } from '@nestjs/common';
import {
  type AssignCrmLeadRequest,
  type CreateCrmActivityRequest,
  type CreateCrmContactRequest,
  type CreateCrmDealRequest,
  type CreateCrmFollowUpRequest,
  type CreateCrmSiteVisitRequest,
  type CrmActivityListQuery,
  type CrmContactListQuery,
  type CrmDealListQuery,
  type CrmFollowUpListQuery,
  type CrmLeadListQuery,
  type CrmOverviewQuery,
  type CrmSiteVisitListQuery,
  type LeadStatus,
  type MatchResult,
  type UpdateCrmContactRequest,
  type UpdateCrmDealRequest,
  type UpdateCrmFollowUpRequest,
  type UpdateCrmLeadStatusRequest,
  type UpdateCrmSiteVisitRequest,
} from '@property-studio/contracts';
import { type Permission } from '@property-studio/permissions';
import { Prisma } from '../../generated/prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { toPublicRequirementSummary } from '../marketplace/marketplace.util';
import { CrmAccessService } from './crm-access.service';
import {
  applyCreatedCursor,
  bigintToString,
  encodeCursor,
  endOfTodayUtc,
  startOfTodayUtc,
  toDateOnly,
  toIso,
} from './crm.util';
import { LeadTransitionService } from './lead-transition.service';

const ACTIVE_LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'ASSIGNED',
  'VIEWED',
  'CONTACTED',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
  'BOOKED',
];

const OPEN_FOLLOW_UP_STATUSES = ['OPEN', 'IN_PROGRESS'] as const;
const TERMINAL_DEAL_STATUSES = new Set(['BOOKED', 'CLOSED', 'LOST']);

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CrmAccessService,
    private readonly transitions: LeadTransitionService,
  ) {}

  async overview(actor: AuthActor, query: CrmOverviewQuery, request?: AuthenticatedRequest) {
    const organization = await this.requireOrg(actor, query.organizationPublicId, 'crm:read', request);
    const todayEnd = endOfTodayUtc();

    const [
      activeLeads,
      newLeads,
      followUpsDue,
      upcomingSiteVisits,
      qualifiedLeads,
      openNegotiations,
      bookedDeals,
      closedDeals,
      contacts,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: {
          recipientOrganizationId: organization.id,
          status: { in: ACTIVE_LEAD_STATUSES },
        },
      }),
      this.prisma.lead.count({
        where: { recipientOrganizationId: organization.id, status: 'NEW' },
      }),
      this.prisma.crmFollowUp.count({
        where: {
          organizationId: organization.id,
          status: { in: [...OPEN_FOLLOW_UP_STATUSES] },
          dueAt: { lte: todayEnd },
        },
      }),
      this.prisma.crmSiteVisit.count({
        where: {
          organizationId: organization.id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
      }),
      this.prisma.lead.count({
        where: { recipientOrganizationId: organization.id, status: 'QUALIFIED' },
      }),
      this.prisma.crmDeal.count({
        where: {
          organizationId: organization.id,
          status: { in: ['OPEN', 'NEGOTIATION'] },
        },
      }),
      this.prisma.crmDeal.count({
        where: { organizationId: organization.id, status: 'BOOKED' },
      }),
      this.prisma.crmDeal.count({
        where: { organizationId: organization.id, status: 'CLOSED' },
      }),
      this.prisma.crmContact.count({
        where: { organizationId: organization.id },
      }),
    ]);

    return {
      organizationPublicId: organization.publicId,
      activeLeads,
      newLeads,
      followUpsDue,
      upcomingSiteVisits,
      qualifiedLeads,
      openNegotiations,
      bookedDeals,
      closedDeals,
      contacts,
    };
  }

  async listContacts(
    actor: AuthActor,
    query: CrmContactListQuery,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      query.organizationPublicId,
      'crm:contacts:read',
      request,
    );

    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.status) where.status = query.status;
    if (query.ownerUserPublicId) {
      const owner = await this.prisma.user.findFirst({
        where: { publicId: query.ownerUserPublicId },
        select: { id: true },
      });
      if (!owner) {
        return { contacts: [], nextCursor: null };
      }
      where.ownerUserId = owner.id;
    }
    if (query.sourceLeadPublicId) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          publicId: query.sourceLeadPublicId,
          recipientOrganizationId: organization.id,
        },
        select: { id: true },
      });
      if (!lead) {
        return { contacts: [], nextCursor: null };
      }
      where.sourceLeadId = lead.id;
    }
    if (query.q) {
      where.AND = [
        {
          OR: [
            { displayName: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      ];
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.crmContact.findMany({
      where,
      include: this.contactInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      contacts: page.map((row) => this.toContactSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async createContact(
    actor: AuthActor,
    body: CreateCrmContactRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:contacts:create',
      request,
    );

    let sourceLeadId: string | null = null;
    if (body.sourceLeadPublicId) {
      const lead = await this.requireOrgLead(organization.id, body.sourceLeadPublicId);
      sourceLeadId = lead.id;
    }

    let ownerUserId: string | null = null;
    if (body.ownerUserPublicId) {
      const owner = await this.access.requireOrgMemberUser(
        organization.id,
        body.ownerUserPublicId,
      );
      ownerUserId = owner.id;
    }

    const publicId = await this.publicIds.nextContactPublicId();
    const contact = await this.prisma.crmContact.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: organization.id,
        sourceLeadId,
        contactType: body.contactType,
        displayName: body.displayName,
        phone: body.phone ?? null,
        email: body.email ?? null,
        preferredContactMethod: body.preferredContactMethod,
        notes: body.notes ?? null,
        ownerUserId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: this.contactInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'crm.contact.created',
      resourceType: 'crm_contact',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { displayName: contact.displayName, sourceLeadPublicId: body.sourceLeadPublicId ?? null },
    });

    return this.toContactSummary(contact);
  }

  async getContact(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const contact = await this.prisma.crmContact.findFirst({
      where: { publicId },
      include: this.contactInclude(),
    });
    if (!contact) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(actor, contact.organization.publicId, 'crm:contacts:read', request);
    return this.toContactSummary(contact);
  }

  async updateContact(
    actor: AuthActor,
    publicId: string,
    body: UpdateCrmContactRequest,
    request?: AuthenticatedRequest,
  ) {
    const contact = await this.prisma.crmContact.findFirst({
      where: { publicId },
      include: this.contactInclude(),
    });
    if (!contact) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(actor, contact.organization.publicId, 'crm:contacts:update', request);

    if (body.expectedVersion !== undefined && body.expectedVersion !== contact.version) {
      throw new AppError('CONFLICT', 'Contact was modified by another request.');
    }

    let sourceLeadId = contact.sourceLeadId;
    if (body.sourceLeadPublicId !== undefined) {
      if (body.sourceLeadPublicId === null) {
        sourceLeadId = null;
      } else {
        const lead = await this.requireOrgLead(contact.organizationId, body.sourceLeadPublicId);
        sourceLeadId = lead.id;
      }
    }

    let ownerUserId = contact.ownerUserId;
    if (body.ownerUserPublicId !== undefined) {
      if (body.ownerUserPublicId === null) {
        ownerUserId = null;
      } else {
        const owner = await this.access.requireOrgMemberUser(
          contact.organizationId,
          body.ownerUserPublicId,
        );
        ownerUserId = owner.id;
      }
    }

    const updated = await this.prisma.crmContact.update({
      where: { id: contact.id },
      data: {
        sourceLeadId,
        contactType: body.contactType ?? undefined,
        displayName: body.displayName ?? undefined,
        phone: body.phone === undefined ? undefined : body.phone,
        email: body.email === undefined ? undefined : body.email,
        preferredContactMethod: body.preferredContactMethod ?? undefined,
        notes: body.notes === undefined ? undefined : body.notes,
        ownerUserId,
        status: body.status ?? undefined,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.contactInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: contact.organizationId,
      action: 'crm.contact.updated',
      resourceType: 'crm_contact',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { displayName: updated.displayName, status: updated.status },
    });

    return this.toContactSummary(updated);
  }

  async listActivities(
    actor: AuthActor,
    query: CrmActivityListQuery,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      query.organizationPublicId,
      'crm:activities:read',
      request,
    );

    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.activityType) where.activityType = query.activityType;
    if (query.contactPublicId) {
      const contact = await this.prisma.crmContact.findFirst({
        where: { publicId: query.contactPublicId, organizationId: organization.id },
        select: { id: true },
      });
      if (!contact) return { activities: [], nextCursor: null };
      where.contactId = contact.id;
    }
    if (query.leadPublicId) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          publicId: query.leadPublicId,
          recipientOrganizationId: organization.id,
        },
        select: { id: true },
      });
      if (!lead) return { activities: [], nextCursor: null };
      where.leadId = lead.id;
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.crmActivity.findMany({
      where,
      include: this.activityInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      activities: page.map((row) => this.toActivitySummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async createActivity(
    actor: AuthActor,
    body: CreateCrmActivityRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:activities:create',
      request,
    );

    let contactId: string | null = null;
    if (body.contactPublicId) {
      const contact = await this.requireOrgContact(organization.id, body.contactPublicId);
      contactId = contact.id;
    }

    let leadId: string | null = null;
    if (body.leadPublicId) {
      const lead = await this.requireOrgLead(organization.id, body.leadPublicId);
      leadId = lead.id;
    }

    const activity = await this.writeActivity({
      organizationId: organization.id,
      contactId,
      leadId,
      actorUserId: actor.userId,
      activityType: body.activityType,
      subject: body.subject,
      description: body.description ?? null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'crm.activity.created',
      resourceType: 'crm_activity',
      resourceId: activity.publicId,
      requestId: request?.requestId,
      after: { activityType: activity.activityType, subject: activity.subject },
    });

    return this.toActivitySummary(activity);
  }

  async listFollowUps(
    actor: AuthActor,
    query: CrmFollowUpListQuery,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(actor, query.organizationPublicId, 'crm:read', request);

    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedUserPublicId) {
      const user = await this.prisma.user.findFirst({
        where: { publicId: query.assignedUserPublicId },
        select: { id: true },
      });
      if (!user) return { followUps: [], nextCursor: null };
      where.assignedUserId = user.id;
    }
    if (query.leadPublicId) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          publicId: query.leadPublicId,
          recipientOrganizationId: organization.id,
        },
        select: { id: true },
      });
      if (!lead) return { followUps: [], nextCursor: null };
      where.leadId = lead.id;
    }
    this.applyFollowUpBucket(where, query.bucket);
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.crmFollowUp.findMany({
      where,
      include: this.followUpInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      followUps: page.map((row) => this.toFollowUpSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async createFollowUp(
    actor: AuthActor,
    body: CreateCrmFollowUpRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:followups:create',
      request,
    );

    let contactId: string | null = null;
    if (body.contactPublicId) {
      contactId = (await this.requireOrgContact(organization.id, body.contactPublicId)).id;
    }
    let leadId: string | null = null;
    if (body.leadPublicId) {
      leadId = (await this.requireOrgLead(organization.id, body.leadPublicId)).id;
    }
    let assignedUserId: string | null = null;
    if (body.assignedUserPublicId) {
      assignedUserId = (
        await this.access.requireOrgMemberUser(organization.id, body.assignedUserPublicId)
      ).id;
    }

    const publicId = await this.publicIds.nextTaskPublicId();
    const followUp = await this.prisma.crmFollowUp.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: organization.id,
        contactId,
        leadId,
        assignedUserId,
        title: body.title,
        description: body.description ?? null,
        dueAt: new Date(body.dueAt),
        priority: body.priority,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: this.followUpInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'crm.followup.created',
      resourceType: 'crm_follow_up',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { title: followUp.title, dueAt: followUp.dueAt.toISOString() },
    });

    return this.toFollowUpSummary(followUp);
  }

  async updateFollowUp(
    actor: AuthActor,
    publicId: string,
    body: UpdateCrmFollowUpRequest,
    request?: AuthenticatedRequest,
  ) {
    const followUp = await this.prisma.crmFollowUp.findFirst({
      where: { publicId },
      include: this.followUpInclude(),
    });
    if (!followUp) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(
      actor,
      followUp.organization.publicId,
      'crm:followups:update',
      request,
    );

    if (body.expectedVersion !== undefined && body.expectedVersion !== followUp.version) {
      throw new AppError('CONFLICT', 'Follow-up was modified by another request.');
    }

    let assignedUserId = followUp.assignedUserId;
    if (body.assignedUserPublicId !== undefined) {
      if (body.assignedUserPublicId === null) {
        assignedUserId = null;
      } else {
        assignedUserId = (
          await this.access.requireOrgMemberUser(
            followUp.organizationId,
            body.assignedUserPublicId,
          )
        ).id;
      }
    }

    const nextStatus = body.status ?? followUp.status;
    let completedAt = followUp.completedAt;
    if (nextStatus === 'COMPLETED' && followUp.status !== 'COMPLETED') {
      completedAt = new Date();
    } else if (nextStatus !== 'COMPLETED') {
      completedAt = null;
    }

    const updated = await this.prisma.crmFollowUp.update({
      where: { id: followUp.id },
      data: {
        title: body.title ?? undefined,
        description: body.description === undefined ? undefined : body.description,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        priority: body.priority ?? undefined,
        status: body.status ?? undefined,
        assignedUserId,
        reminderAt: body.reminderAt === undefined ? undefined : body.reminderAt ? new Date(body.reminderAt) : null,
        completedAt,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.followUpInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: followUp.organizationId,
      action: 'crm.followup.updated',
      resourceType: 'crm_follow_up',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { status: updated.status, dueAt: updated.dueAt.toISOString() },
    });

    return this.toFollowUpSummary(updated);
  }

  async listSiteVisits(
    actor: AuthActor,
    query: CrmSiteVisitListQuery,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(actor, query.organizationPublicId, 'crm:read', request);

    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.status) where.status = query.status;
    if (query.leadPublicId) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          publicId: query.leadPublicId,
          recipientOrganizationId: organization.id,
        },
        select: { id: true },
      });
      if (!lead) return { siteVisits: [], nextCursor: null };
      where.leadId = lead.id;
    }
    this.applySiteVisitBucket(where, query.bucket);
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.crmSiteVisit.findMany({
      where,
      include: this.siteVisitInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      siteVisits: page.map((row) => this.toSiteVisitSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async createSiteVisit(
    actor: AuthActor,
    body: CreateCrmSiteVisitRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:sitevisits:create',
      request,
    );

    const lead = await this.requireOrgLead(organization.id, body.leadPublicId);
    let contactId: string | null = null;
    if (body.contactPublicId) {
      contactId = (await this.requireOrgContact(organization.id, body.contactPublicId)).id;
    }
    let assignedUserId: string | null = null;
    if (body.assignedUserPublicId) {
      assignedUserId = (
        await this.access.requireOrgMemberUser(organization.id, body.assignedUserPublicId)
      ).id;
    }
    const propertyId = body.propertyPublicId
      ? (await this.requireOrgProperty(organization.id, body.propertyPublicId)).id
      : null;
    const projectId = body.projectPublicId
      ? (await this.requireOrgProject(organization.id, body.projectPublicId)).id
      : null;

    const publicId = await this.publicIds.nextVisitPublicId();
    const siteVisit = await this.prisma.crmSiteVisit.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: organization.id,
        leadId: lead.id,
        contactId,
        assignedUserId,
        propertyId,
        projectId,
        scheduledAt: new Date(body.scheduledAt),
        notes: body.notes ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: this.siteVisitInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'crm.sitevisit.created',
      resourceType: 'crm_site_visit',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { leadPublicId: body.leadPublicId, scheduledAt: siteVisit.scheduledAt.toISOString() },
    });

    return this.toSiteVisitSummary(siteVisit);
  }

  async updateSiteVisit(
    actor: AuthActor,
    publicId: string,
    body: UpdateCrmSiteVisitRequest,
    request?: AuthenticatedRequest,
  ) {
    const siteVisit = await this.prisma.crmSiteVisit.findFirst({
      where: { publicId },
      include: this.siteVisitInclude(),
    });
    if (!siteVisit) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(
      actor,
      siteVisit.organization.publicId,
      'crm:sitevisits:update',
      request,
    );

    if (body.expectedVersion !== undefined && body.expectedVersion !== siteVisit.version) {
      throw new AppError('CONFLICT', 'Site visit was modified by another request.');
    }

    let contactId = siteVisit.contactId;
    if (body.contactPublicId !== undefined) {
      contactId =
        body.contactPublicId === null
          ? null
          : (await this.requireOrgContact(siteVisit.organizationId, body.contactPublicId)).id;
    }

    let assignedUserId = siteVisit.assignedUserId;
    if (body.assignedUserPublicId !== undefined) {
      assignedUserId =
        body.assignedUserPublicId === null
          ? null
          : (
              await this.access.requireOrgMemberUser(
                siteVisit.organizationId,
                body.assignedUserPublicId,
              )
            ).id;
    }

    let propertyId = siteVisit.propertyId;
    if (body.propertyPublicId !== undefined) {
      propertyId =
        body.propertyPublicId === null
          ? null
          : (await this.requireOrgProperty(siteVisit.organizationId, body.propertyPublicId)).id;
    }

    let projectId = siteVisit.projectId;
    if (body.projectPublicId !== undefined) {
      projectId =
        body.projectPublicId === null
          ? null
          : (await this.requireOrgProject(siteVisit.organizationId, body.projectPublicId)).id;
    }

    const updated = await this.prisma.crmSiteVisit.update({
      where: { id: siteVisit.id },
      data: {
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status: body.status ?? undefined,
        outcome: body.outcome === undefined ? undefined : body.outcome,
        notes: body.notes === undefined ? undefined : body.notes,
        contactId,
        assignedUserId,
        propertyId,
        projectId,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.siteVisitInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: siteVisit.organizationId,
      action: 'crm.sitevisit.updated',
      resourceType: 'crm_site_visit',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { status: updated.status, outcome: updated.outcome },
    });

    return this.toSiteVisitSummary(updated);
  }

  async listDeals(actor: AuthActor, query: CrmDealListQuery, request?: AuthenticatedRequest) {
    const organization = await this.requireOrg(actor, query.organizationPublicId, 'crm:read', request);

    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.status) where.status = query.status;
    if (query.leadPublicId) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          publicId: query.leadPublicId,
          recipientOrganizationId: organization.id,
        },
        select: { id: true },
      });
      if (!lead) return { deals: [], nextCursor: null };
      where.leadId = lead.id;
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.crmDeal.findMany({
      where,
      include: this.dealInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      deals: page.map((row) => this.toDealSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async createDeal(
    actor: AuthActor,
    body: CreateCrmDealRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:deals:create',
      request,
    );

    const lead = await this.requireOrgLead(organization.id, body.leadPublicId);
    let contactId: string | null = null;
    if (body.contactPublicId) {
      contactId = (await this.requireOrgContact(organization.id, body.contactPublicId)).id;
    }
    const propertyId = body.propertyPublicId
      ? (await this.requireOrgProperty(organization.id, body.propertyPublicId)).id
      : null;
    const projectId = body.projectPublicId
      ? (await this.requireOrgProject(organization.id, body.projectPublicId)).id
      : null;

    const publicId = await this.publicIds.nextDealPublicId();
    const closedAt = TERMINAL_DEAL_STATUSES.has(body.status) ? new Date() : null;
    const deal = await this.prisma.crmDeal.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: organization.id,
        leadId: lead.id,
        contactId,
        propertyId,
        projectId,
        status: body.status,
        expectedValueMinor:
          body.expectedValueMinor === undefined || body.expectedValueMinor === null
            ? null
            : body.expectedValueMinor,
        currency: body.currency,
        expectedCloseDate:
          body.expectedCloseDate === undefined || body.expectedCloseDate === null
            ? null
            : new Date(body.expectedCloseDate),
        notes: body.notes ?? null,
        closedAt,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: this.dealInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'crm.deal.created',
      resourceType: 'crm_deal',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { leadPublicId: body.leadPublicId, status: deal.status },
    });

    return this.toDealSummary(deal);
  }

  async getDeal(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const deal = await this.prisma.crmDeal.findFirst({
      where: { publicId },
      include: this.dealInclude(),
    });
    if (!deal) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(actor, deal.organization.publicId, 'crm:read', request);
    return this.toDealSummary(deal);
  }

  async updateDeal(
    actor: AuthActor,
    publicId: string,
    body: UpdateCrmDealRequest,
    request?: AuthenticatedRequest,
  ) {
    const deal = await this.prisma.crmDeal.findFirst({
      where: { publicId },
      include: this.dealInclude(),
    });
    if (!deal) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(actor, deal.organization.publicId, 'crm:deals:update', request);

    if (body.expectedVersion !== undefined && body.expectedVersion !== deal.version) {
      throw new AppError('CONFLICT', 'Deal was modified by another request.');
    }

    let contactId = deal.contactId;
    if (body.contactPublicId !== undefined) {
      contactId =
        body.contactPublicId === null
          ? null
          : (await this.requireOrgContact(deal.organizationId, body.contactPublicId)).id;
    }
    let propertyId = deal.propertyId;
    if (body.propertyPublicId !== undefined) {
      propertyId =
        body.propertyPublicId === null
          ? null
          : (await this.requireOrgProperty(deal.organizationId, body.propertyPublicId)).id;
    }
    let projectId = deal.projectId;
    if (body.projectPublicId !== undefined) {
      projectId =
        body.projectPublicId === null
          ? null
          : (await this.requireOrgProject(deal.organizationId, body.projectPublicId)).id;
    }

    const nextStatus = body.status ?? deal.status;
    let closedAt = deal.closedAt;
    if (TERMINAL_DEAL_STATUSES.has(nextStatus) && !TERMINAL_DEAL_STATUSES.has(deal.status)) {
      closedAt = new Date();
    } else if (!TERMINAL_DEAL_STATUSES.has(nextStatus)) {
      closedAt = null;
    }

    const updated = await this.prisma.crmDeal.update({
      where: { id: deal.id },
      data: {
        contactId,
        propertyId,
        projectId,
        status: body.status ?? undefined,
        expectedValueMinor:
          body.expectedValueMinor === undefined
            ? undefined
            : body.expectedValueMinor === null
              ? null
              : body.expectedValueMinor,
        currency: body.currency ?? undefined,
        expectedCloseDate:
          body.expectedCloseDate === undefined
            ? undefined
            : body.expectedCloseDate === null
              ? null
              : new Date(body.expectedCloseDate),
        notes: body.notes === undefined ? undefined : body.notes,
        closedAt,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.dealInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: deal.organizationId,
      action: 'crm.deal.updated',
      resourceType: 'crm_deal',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { status: updated.status },
    });

    return this.toDealSummary(updated);
  }

  async listLeads(actor: AuthActor, query: CrmLeadListQuery, request?: AuthenticatedRequest) {
    const organization = await this.requireOrg(actor, query.organizationPublicId, 'crm:read', request);

    const where: Record<string, unknown> = {
      recipientOrganizationId: organization.id,
    };
    if (query.status) where.status = query.status;
    if (query.assignedUserPublicId) {
      const user = await this.prisma.user.findFirst({
        where: { publicId: query.assignedUserPublicId },
        select: { id: true },
      });
      if (!user) return { leads: [], nextCursor: null };
      where.recipientUserId = user.id;
    }
    if (query.q) {
      where.AND = [
        {
          OR: [
            { publicId: { contains: query.q, mode: 'insensitive' } },
            {
              crmContacts: {
                some: {
                  OR: [
                    { displayName: { contains: query.q, mode: 'insensitive' } },
                    { phone: { contains: query.q, mode: 'insensitive' } },
                    { email: { contains: query.q, mode: 'insensitive' } },
                  ],
                },
              },
            },
            { requirement: { city: { contains: query.q, mode: 'insensitive' } } },
            { requirement: { locality: { contains: query.q, mode: 'insensitive' } } },
          ],
        },
      ];
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.lead.findMany({
      where,
      include: this.leadInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const summaries = await Promise.all(page.map((row) => this.toCrmLeadSummary(row)));
    return {
      leads: summaries,
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getLeadDetail(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const lead = await this.prisma.lead.findFirst({
      where: { publicId },
      include: this.leadInclude(),
    });
    if (!lead) {
      return await this.denyResource(actor, publicId, request);
    }
    await this.requireOrg(actor, lead.recipientOrganization.publicId, 'crm:read', request);

    const [contacts, activities, followUps, siteVisits, deals, summary] = await Promise.all([
      this.prisma.crmContact.findMany({
        where: { organizationId: lead.recipientOrganizationId, sourceLeadId: lead.id },
        include: this.contactInclude(),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.crmActivity.findMany({
        where: { organizationId: lead.recipientOrganizationId, leadId: lead.id },
        include: this.activityInclude(),
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
      this.prisma.crmFollowUp.findMany({
        where: { organizationId: lead.recipientOrganizationId, leadId: lead.id },
        include: this.followUpInclude(),
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.crmSiteVisit.findMany({
        where: { organizationId: lead.recipientOrganizationId, leadId: lead.id },
        include: this.siteVisitInclude(),
        orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.crmDeal.findMany({
        where: { organizationId: lead.recipientOrganizationId, leadId: lead.id },
        include: this.dealInclude(),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.toCrmLeadSummary(lead),
    ]);

    return {
      ...summary,
      contacts: contacts.map((row) => this.toContactSummary(row)),
      activities: activities.map((row) => this.toActivitySummary(row)),
      followUps: followUps.map((row) => this.toFollowUpSummary(row)),
      siteVisits: siteVisits.map((row) => this.toSiteVisitSummary(row)),
      deals: deals.map((row) => this.toDealSummary(row)),
    };
  }

  async assignLead(
    actor: AuthActor,
    publicId: string,
    body: AssignCrmLeadRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:leads:assign',
      request,
    );

    const lead = await this.prisma.lead.findFirst({
      where: { publicId, recipientOrganizationId: organization.id },
      include: this.leadInclude(),
    });
    if (!lead) {
      return await this.denyResource(actor, publicId, request);
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== lead.version) {
      throw new AppError('CONFLICT', 'Lead was modified by another request.');
    }

    let assigneeId: string | null = null;
    let assigneePublicId: string | null = null;
    if (body.assigneeUserPublicId) {
      const assignee = await this.access.requireOrgMemberUser(
        organization.id,
        body.assigneeUserPublicId,
      );
      assigneeId = assignee.id;
      assigneePublicId = assignee.publicId;
    }

    const previousAssigneePublicId = lead.recipientUser?.publicId ?? null;
    if (previousAssigneePublicId === assigneePublicId) {
      return this.toCrmLeadSummary(lead);
    }

    const nextStatus = lead.status === 'NEW' ? 'ASSIGNED' : lead.status;
    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        recipientUserId: assigneeId,
        status: nextStatus,
        assignedAt: assigneeId ? lead.assignedAt ?? new Date() : lead.assignedAt,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.leadInclude(),
    });

    const action = previousAssigneePublicId ? 'crm.lead.reassigned' : 'crm.lead.assigned';
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action,
      resourceType: 'lead',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { recipientUserPublicId: previousAssigneePublicId, status: lead.status },
      after: { recipientUserPublicId: assigneePublicId, status: updated.status },
    });

    await this.writeActivity({
      organizationId: organization.id,
      leadId: lead.id,
      actorUserId: actor.userId,
      activityType: 'ASSIGNMENT',
      subject: assigneePublicId
        ? `Lead assigned to ${assigneePublicId}`
        : 'Lead assignment cleared',
      description: previousAssigneePublicId
        ? `Reassigned from ${previousAssigneePublicId}`
        : null,
      occurredAt: new Date(),
      metadata: {
        fromUserPublicId: previousAssigneePublicId,
        toUserPublicId: assigneePublicId,
      },
    });

    return this.toCrmLeadSummary(updated);
  }

  async updateLeadStatus(
    actor: AuthActor,
    publicId: string,
    body: UpdateCrmLeadStatusRequest,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.requireOrg(
      actor,
      body.organizationPublicId,
      'crm:leads:update',
      request,
    );

    const lead = await this.prisma.lead.findFirst({
      where: { publicId, recipientOrganizationId: organization.id },
      include: this.leadInclude(),
    });
    if (!lead) {
      return await this.denyResource(actor, publicId, request);
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== lead.version) {
      throw new AppError('CONFLICT', 'Lead was modified by another request.');
    }

    const allowAdminOverride =
      Boolean(body.allowAdminOverride) && this.access.isPlatformAdmin(actor);
    this.transitions.assertTransition(lead.status as LeadStatus, body.status, {
      allowAdminOverride,
    });

    if (lead.status === body.status) {
      return this.toCrmLeadSummary(lead);
    }

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: body.status,
        contactedAt:
          body.status === 'CONTACTED' && !lead.contactedAt ? new Date() : undefined,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.leadInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'crm.lead.status_changed',
      resourceType: 'lead',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { status: lead.status },
      after: { status: updated.status, allowAdminOverride },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'lead.status_changed',
      resourceType: 'lead',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { status: lead.status },
      after: { status: updated.status },
    });

    await this.writeActivity({
      organizationId: organization.id,
      leadId: lead.id,
      actorUserId: actor.userId,
      activityType: 'STATUS_CHANGE',
      subject: `Status changed to ${updated.status}`,
      description: `From ${lead.status} to ${updated.status}`,
      occurredAt: new Date(),
      metadata: { from: lead.status, to: updated.status },
    });

    return this.toCrmLeadSummary(updated);
  }

  private async writeActivity(input: {
    organizationId: string;
    contactId?: string | null;
    leadId?: string | null;
    actorUserId: string;
    activityType:
      | 'NOTE'
      | 'CALL'
      | 'EMAIL'
      | 'WHATSAPP'
      | 'MEETING'
      | 'SITE_VISIT'
      | 'STATUS_CHANGE'
      | 'ASSIGNMENT'
      | 'FOLLOW_UP';
    subject: string;
    description?: string | null;
    occurredAt: Date;
    metadata?: Prisma.InputJsonValue;
  }) {
    const publicId = await this.publicIds.nextActivityPublicId();
    return this.prisma.crmActivity.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: input.organizationId,
        contactId: input.contactId ?? null,
        leadId: input.leadId ?? null,
        actorUserId: input.actorUserId,
        activityType: input.activityType,
        subject: input.subject,
        description: input.description ?? null,
        occurredAt: input.occurredAt,
        metadata: input.metadata ?? undefined,
      },
      include: this.activityInclude(),
    });
  }

  private applyFollowUpBucket(
    where: Record<string, unknown>,
    bucket?: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED',
  ) {
    if (!bucket) return;
    const start = startOfTodayUtc();
    const end = endOfTodayUtc();
    if (bucket === 'COMPLETED') {
      where.status = 'COMPLETED';
      return;
    }
    if (bucket === 'OVERDUE') {
      where.status = { in: [...OPEN_FOLLOW_UP_STATUSES] };
      where.dueAt = { lt: start };
      return;
    }
    if (bucket === 'TODAY') {
      where.status = { in: [...OPEN_FOLLOW_UP_STATUSES] };
      where.dueAt = { gte: start, lte: end };
      return;
    }
    where.status = { in: [...OPEN_FOLLOW_UP_STATUSES] };
    where.dueAt = { gt: end };
  }

  private applySiteVisitBucket(
    where: Record<string, unknown>,
    bucket?: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  ) {
    if (!bucket) return;
    if (bucket === 'UPCOMING') {
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
      return;
    }
    where.status = bucket;
  }

  private async toCrmLeadSummary(lead: {
    id: string;
    publicId: string;
    matchScore: number;
    matchedCriteria: unknown;
    unmatchedCriteria: unknown;
    matchExplanation: string;
    source: string;
    status: string;
    priority: string;
    assignedAt: Date | null;
    firstViewedAt: Date | null;
    contactedAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    recipientOrganizationId: string;
    requirement: Parameters<typeof toPublicRequirementSummary>[0];
    recipientOrganization: { publicId: string };
    recipientUser: { publicId: string } | null;
    matchedProperty: { publicId: string } | null;
    matchedProject: { publicId: string } | null;
  }) {
    const [contact, nextFollowUp, lastActivity] = await Promise.all([
      this.prisma.crmContact.findFirst({
        where: {
          organizationId: lead.recipientOrganizationId,
          sourceLeadId: lead.id,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { publicId: true, displayName: true },
      }),
      this.prisma.crmFollowUp.findFirst({
        where: {
          organizationId: lead.recipientOrganizationId,
          leadId: lead.id,
          status: { in: [...OPEN_FOLLOW_UP_STATUSES] },
        },
        orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
        select: { dueAt: true },
      }),
      this.prisma.crmActivity.findFirst({
        where: {
          organizationId: lead.recipientOrganizationId,
          leadId: lead.id,
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        select: { occurredAt: true },
      }),
    ]);

    return {
      publicId: lead.publicId,
      requirementPublicId: lead.requirement.publicId,
      recipientOrganizationPublicId: lead.recipientOrganization.publicId,
      recipientUserPublicId: lead.recipientUser?.publicId ?? null,
      matchedPropertyPublicId: lead.matchedProperty?.publicId ?? null,
      matchedProjectPublicId: lead.matchedProject?.publicId ?? null,
      matchScore: lead.matchScore,
      matchedCriteria: lead.matchedCriteria as MatchResult['matched'],
      unmatchedCriteria: lead.unmatchedCriteria as MatchResult['unmatched'],
      matchExplanation: lead.matchExplanation,
      source: lead.source as 'REQUIREMENT_MARKETPLACE',
      status: lead.status as LeadStatus,
      priority: lead.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
      requirement: toPublicRequirementSummary(lead.requirement),
      assignedAt: toIso(lead.assignedAt),
      firstViewedAt: toIso(lead.firstViewedAt),
      contactedAt: toIso(lead.contactedAt),
      version: lead.version,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      contactPublicId: contact?.publicId ?? null,
      contactDisplayName: contact?.displayName ?? null,
      nextFollowUpAt: toIso(nextFollowUp?.dueAt ?? null),
      lastActivityAt: toIso(lastActivity?.occurredAt ?? null),
    };
  }

  private toContactSummary(row: {
    publicId: string;
    contactType: string;
    displayName: string;
    phone: string | null;
    email: string | null;
    preferredContactMethod: string;
    notes: string | null;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    organization: { publicId: string };
    sourceLead: { publicId: string } | null;
    ownerUser: { publicId: string } | null;
  }) {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization.publicId,
      sourceLeadPublicId: row.sourceLead?.publicId ?? null,
      contactType: row.contactType as 'BUYER' | 'INVESTOR' | 'REFERRAL' | 'OTHER',
      displayName: row.displayName,
      phone: row.phone,
      email: row.email,
      preferredContactMethod: row.preferredContactMethod as
        | 'PHONE'
        | 'EMAIL'
        | 'WHATSAPP'
        | 'IN_PERSON'
        | 'OTHER',
      notes: row.notes,
      ownerUserPublicId: row.ownerUser?.publicId ?? null,
      status: row.status as 'ACTIVE' | 'ARCHIVED',
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toActivitySummary(row: {
    publicId: string;
    activityType: string;
    subject: string;
    description: string | null;
    occurredAt: Date;
    createdAt: Date;
    organization: { publicId: string };
    contact: { publicId: string } | null;
    lead: { publicId: string } | null;
    actorUser: { publicId: string };
  }) {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization.publicId,
      contactPublicId: row.contact?.publicId ?? null,
      leadPublicId: row.lead?.publicId ?? null,
      actorUserPublicId: row.actorUser.publicId,
      activityType: row.activityType as
        | 'NOTE'
        | 'CALL'
        | 'EMAIL'
        | 'WHATSAPP'
        | 'MEETING'
        | 'SITE_VISIT'
        | 'STATUS_CHANGE'
        | 'ASSIGNMENT'
        | 'FOLLOW_UP',
      subject: row.subject,
      description: row.description,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toFollowUpSummary(row: {
    publicId: string;
    title: string;
    description: string | null;
    dueAt: Date;
    priority: string;
    status: string;
    reminderAt: Date | null;
    completedAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    organization: { publicId: string };
    contact: { publicId: string } | null;
    lead: { publicId: string } | null;
    assignedUser: { publicId: string } | null;
  }) {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization.publicId,
      contactPublicId: row.contact?.publicId ?? null,
      leadPublicId: row.lead?.publicId ?? null,
      assignedUserPublicId: row.assignedUser?.publicId ?? null,
      title: row.title,
      description: row.description,
      dueAt: row.dueAt.toISOString(),
      priority: row.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      status: row.status as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
      reminderAt: toIso(row.reminderAt),
      completedAt: toIso(row.completedAt),
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toSiteVisitSummary(row: {
    publicId: string;
    scheduledAt: Date;
    status: string;
    outcome: string | null;
    notes: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    organization: { publicId: string };
    lead: { publicId: string };
    contact: { publicId: string } | null;
    assignedUser: { publicId: string } | null;
    property: { publicId: string } | null;
    project: { publicId: string } | null;
  }) {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization.publicId,
      leadPublicId: row.lead.publicId,
      contactPublicId: row.contact?.publicId ?? null,
      assignedUserPublicId: row.assignedUser?.publicId ?? null,
      propertyPublicId: row.property?.publicId ?? null,
      projectPublicId: row.project?.publicId ?? null,
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status as 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
      outcome: (row.outcome as
        | 'INTERESTED'
        | 'FOLLOW_UP'
        | 'NEGOTIATION'
        | 'NOT_INTERESTED'
        | 'UNKNOWN'
        | null) ?? null,
      notes: row.notes,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDealSummary(row: {
    publicId: string;
    status: string;
    expectedValueMinor: bigint | null;
    currency: string;
    expectedCloseDate: Date | null;
    closedAt: Date | null;
    notes: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    organization: { publicId: string };
    lead: { publicId: string };
    contact: { publicId: string } | null;
    property: { publicId: string } | null;
    project: { publicId: string } | null;
  }) {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization.publicId,
      leadPublicId: row.lead.publicId,
      contactPublicId: row.contact?.publicId ?? null,
      propertyPublicId: row.property?.publicId ?? null,
      projectPublicId: row.project?.publicId ?? null,
      status: row.status as 'OPEN' | 'NEGOTIATION' | 'BOOKED' | 'CLOSED' | 'LOST',
      expectedValueMinor: bigintToString(row.expectedValueMinor),
      currency: row.currency,
      expectedCloseDate: toDateOnly(row.expectedCloseDate),
      closedAt: toIso(row.closedAt),
      notes: row.notes,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private contactInclude() {
    return {
      organization: { select: { publicId: true } },
      sourceLead: { select: { publicId: true } },
      ownerUser: { select: { publicId: true } },
    } as const;
  }

  private activityInclude() {
    return {
      organization: { select: { publicId: true } },
      contact: { select: { publicId: true } },
      lead: { select: { publicId: true } },
      actorUser: { select: { publicId: true } },
    } as const;
  }

  private followUpInclude() {
    return {
      organization: { select: { publicId: true } },
      contact: { select: { publicId: true } },
      lead: { select: { publicId: true } },
      assignedUser: { select: { publicId: true } },
    } as const;
  }

  private siteVisitInclude() {
    return {
      organization: { select: { publicId: true } },
      lead: { select: { publicId: true } },
      contact: { select: { publicId: true } },
      assignedUser: { select: { publicId: true } },
      property: { select: { publicId: true } },
      project: { select: { publicId: true } },
    } as const;
  }

  private dealInclude() {
    return {
      organization: { select: { publicId: true } },
      lead: { select: { publicId: true } },
      contact: { select: { publicId: true } },
      property: { select: { publicId: true } },
      project: { select: { publicId: true } },
    } as const;
  }

  private leadInclude() {
    return {
      requirement: true,
      recipientOrganization: { select: { publicId: true } },
      recipientUser: { select: { publicId: true } },
      matchedProperty: { select: { publicId: true } },
      matchedProject: { select: { publicId: true } },
    } as const;
  }

  private async requireOrg(
    actor: AuthActor,
    organizationPublicId: string,
    permission: Permission,
    request?: AuthenticatedRequest,
  ) {
    return this.access.requireOrganization(actor, organizationPublicId, permission, request);
  }

  private async requireOrgLead(organizationId: string, leadPublicId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { publicId: leadPublicId, recipientOrganizationId: organizationId },
      select: { id: true, publicId: true },
    });
    if (!lead) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return lead;
  }

  private async requireOrgContact(organizationId: string, contactPublicId: string) {
    const contact = await this.prisma.crmContact.findFirst({
      where: { publicId: contactPublicId, organizationId },
      select: { id: true, publicId: true },
    });
    if (!contact) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return contact;
  }

  private async requireOrgProperty(organizationId: string, propertyPublicId: string) {
    const property = await this.prisma.property.findFirst({
      where: { publicId: propertyPublicId, organizationId, deletedAt: null },
      select: { id: true, publicId: true },
    });
    if (!property) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return property;
  }

  private async requireOrgProject(organizationId: string, projectPublicId: string) {
    const project = await this.prisma.project.findFirst({
      where: { publicId: projectPublicId, organizationId, deletedAt: null },
      select: { id: true, publicId: true },
    });
    if (!project) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return project;
  }

  private applyCursor(where: Record<string, unknown>, cursor?: string) {
    if (!cursor) return;
    try {
      if (Array.isArray(where.AND)) {
        const temp: Record<string, unknown> = {};
        applyCreatedCursor(temp, cursor);
        (where.AND as unknown[]).push({ OR: temp.OR });
        return;
      }
      applyCreatedCursor(where, cursor);
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
    }
  }

  private async denyResource(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'crm',
      resourceId: publicId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
