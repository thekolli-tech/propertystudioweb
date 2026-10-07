import { Injectable } from '@nestjs/common';
import {
  type AdminDashboardResponse,
  type AgentDashboardResponse,
  type DeveloperDashboardResponse,
  type PropertyAdminDashboardResponse,
  type SeekerDashboardResponse,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

const ACTIVE_LEAD_STATUSES = [
  'NEW',
  'ASSIGNED',
  'VIEWED',
  'CONTACTED',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeveloper(
    actor: AuthActor,
    organizationPublicId: string | undefined,
    _request?: AuthenticatedRequest,
  ): Promise<DeveloperDashboardResponse> {
    const org = await this.requireOrgMember(actor, organizationPublicId, 'DEVELOPER');
    const base = `/app/org/${org.publicId}`;

    const [
      activeProjects,
      activeInventory,
      newLeads,
      qualifiedLeads,
      upcomingSiteVisits,
      activeDeals,
      pendingVerification,
      failedWebhooks,
      recentProjects,
      recentProperties,
      auditRows,
      leadPipeline,
    ] = await Promise.all([
      this.prisma.project.count({
        where: { organizationId: org.id, deletedAt: null, lifecycleStatus: 'PUBLISHED' },
      }),
      this.prisma.property.count({
        where: {
          organizationId: org.id,
          deletedAt: null,
          publicationStatus: 'PUBLISHED',
          availabilityStatus: 'AVAILABLE',
        },
      }),
      this.prisma.lead.count({
        where: { recipientOrganizationId: org.id, status: 'NEW' },
      }),
      this.prisma.lead.count({
        where: { recipientOrganizationId: org.id, status: 'QUALIFIED' },
      }),
      this.prisma.crmSiteVisit.count({
        where: {
          organizationId: org.id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gte: new Date() },
        },
      }),
      this.prisma.crmDeal.count({
        where: { organizationId: org.id, status: { in: ['OPEN', 'NEGOTIATION', 'BOOKED'] } },
      }),
      this.prisma.verificationCase.count({
        where: {
          organizationId: org.id,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] },
        },
      }),
      this.prisma.webhookDelivery.count({
        where: {
          endpoint: { partnerIntegration: { organizationId: org.id } },
          status: { in: ['FAILED', 'DEAD_LETTER'] },
        },
      }),
      this.prisma.project.findMany({
        where: { organizationId: org.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { publicId: true, name: true, lifecycleStatus: true, updatedAt: true },
      }),
      this.prisma.property.findMany({
        where: { organizationId: org.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          publicId: true,
          title: true,
          publicationStatus: true,
          availabilityStatus: true,
          updatedAt: true,
        },
      }),
      this.prisma.auditEvent.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { recipientOrganizationId: org.id },
        _count: { _all: true },
      }),
    ]);

    const pipelineMap = new Map(leadPipeline.map((row) => [row.status, row._count._all]));

    return {
      role: 'DEVELOPER',
      organizationPublicId: org.publicId,
      organizationName: org.name,
      metrics: [
        {
          key: 'activeProjects',
          label: 'Active projects',
          value: activeProjects,
          href: `${base}/projects`,
        },
        {
          key: 'activeInventory',
          label: 'Available inventory',
          value: activeInventory,
          href: `${base}/properties`,
        },
        { key: 'newLeads', label: 'New leads', value: newLeads, href: `${base}/crm/leads` },
        {
          key: 'qualifiedLeads',
          label: 'Qualified leads',
          value: qualifiedLeads,
          href: `${base}/crm/leads`,
        },
        {
          key: 'upcomingSiteVisits',
          label: 'Upcoming site visits',
          value: upcomingSiteVisits,
          href: `${base}/crm/site-visits`,
        },
        {
          key: 'activeDeals',
          label: 'Active deals',
          value: activeDeals,
          href: `${base}/crm/deals`,
        },
      ],
      pipeline: [
        { key: 'NEW', label: 'New', count: pipelineMap.get('NEW') ?? 0 },
        { key: 'VIEWED', label: 'Viewed', count: pipelineMap.get('VIEWED') ?? 0 },
        { key: 'CONTACTED', label: 'Contacted', count: pipelineMap.get('CONTACTED') ?? 0 },
        { key: 'QUALIFIED', label: 'Qualified', count: pipelineMap.get('QUALIFIED') ?? 0 },
        { key: 'SITE_VISIT', label: 'Site visit', count: pipelineMap.get('SITE_VISIT') ?? 0 },
        { key: 'NEGOTIATION', label: 'Negotiation', count: pipelineMap.get('NEGOTIATION') ?? 0 },
        { key: 'BOOKED', label: 'Booked', count: pipelineMap.get('BOOKED') ?? 0 },
        { key: 'CLOSED', label: 'Closed', count: pipelineMap.get('CLOSED') ?? 0 },
      ],
      recentActivity: auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        resourceType: row.resourceType,
        resourcePublicId: row.resourceId,
        summary: row.action,
        occurredAt: row.createdAt.toISOString(),
      })),
      attentionItems: [
        ...(pendingVerification > 0
          ? [
              {
                key: 'verification',
                severity: 'WARNING' as const,
                title: 'Verification pending',
                description: `${pendingVerification} verification case(s) need attention.`,
                href: `${base}/verification`,
                count: pendingVerification,
              },
            ]
          : []),
        ...(newLeads > 0
          ? [
              {
                key: 'leads',
                severity: 'INFO' as const,
                title: 'Leads awaiting action',
                description: `${newLeads} new lead(s) in the CRM pipeline.`,
                href: `${base}/crm/leads`,
                count: newLeads,
              },
            ]
          : []),
        ...(upcomingSiteVisits > 0
          ? [
              {
                key: 'siteVisits',
                severity: 'INFO' as const,
                title: 'Upcoming site visits',
                description: `${upcomingSiteVisits} visit(s) scheduled.`,
                href: `${base}/crm/site-visits`,
                count: upcomingSiteVisits,
              },
            ]
          : []),
        ...(failedWebhooks > 0
          ? [
              {
                key: 'webhooks',
                severity: 'CRITICAL' as const,
                title: 'Webhook failures',
                description: `${failedWebhooks} failed or dead-lettered delivery(ies).`,
                href: `${base}/integrations`,
                count: failedWebhooks,
              },
            ]
          : []),
      ],
      recentProjects: recentProjects.map((row) => ({
        publicId: row.publicId,
        title: row.name,
        status: row.lifecycleStatus,
        href: `${base}/projects/${row.publicId}`,
        occurredAt: row.updatedAt.toISOString(),
      })),
      recentProperties: recentProperties.map((row) => ({
        publicId: row.publicId,
        title: row.title,
        status: row.availabilityStatus ?? row.publicationStatus,
        href: `${base}/properties/${row.publicId}`,
        occurredAt: row.updatedAt.toISOString(),
      })),
      quickActions: [
        {
          key: 'addProperty',
          label: 'Add property',
          href: `${base}/properties`,
          description: null,
        },
        {
          key: 'createProject',
          label: 'Create project',
          href: `${base}/projects`,
          description: null,
        },
        { key: 'viewLeads', label: 'View leads', href: `${base}/crm/leads`, description: null },
        { key: 'openCrm', label: 'Open CRM', href: `${base}/crm`, description: null },
        {
          key: 'inventory',
          label: 'Manage inventory',
          href: `${base}/properties`,
          description: null,
        },
        { key: 'ai', label: 'Open AI Copilot', href: '/app/ai/chat', description: null },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async getAgent(
    actor: AuthActor,
    organizationPublicId: string | undefined,
    _request?: AuthenticatedRequest,
  ): Promise<AgentDashboardResponse> {
    const org = await this.requireOrgMember(actor, organizationPublicId, 'AGENCY');
    const base = `/app/org/${org.publicId}`;

    const [
      activeLeads,
      followUpsDue,
      upcomingSiteVisits,
      openDeals,
      contacts,
      requirementsAvailable,
      wallet,
      verificationPending,
      recentLeads,
      auditRows,
      leadPipeline,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: {
          recipientOrganizationId: org.id,
          status: { in: [...ACTIVE_LEAD_STATUSES] },
        },
      }),
      this.prisma.crmFollowUp.count({
        where: {
          organizationId: org.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueAt: { lte: endOfTodayUtc() },
        },
      }),
      this.prisma.crmSiteVisit.count({
        where: {
          organizationId: org.id,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gte: new Date() },
        },
      }),
      this.prisma.crmDeal.count({
        where: { organizationId: org.id, status: { in: ['OPEN', 'NEGOTIATION'] } },
      }),
      this.prisma.crmContact.count({ where: { organizationId: org.id } }),
      this.prisma.requirement.count({
        where: { status: 'ACTIVE', visibility: 'MARKETPLACE' },
      }),
      this.prisma.wallet.findFirst({
        where: { organizationId: org.id },
        select: { balanceMinor: true, currency: true },
      }),
      this.prisma.verificationCase.count({
        where: {
          organizationId: org.id,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] },
        },
      }),
      this.prisma.lead.findMany({
        where: { recipientOrganizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { publicId: true, status: true, createdAt: true, matchScore: true },
      }),
      this.prisma.auditEvent.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { recipientOrganizationId: org.id },
        _count: { _all: true },
      }),
    ]);

    const pipelineMap = new Map(leadPipeline.map((row) => [row.status, row._count._all]));

    return {
      role: 'AGENT',
      organizationPublicId: org.publicId,
      organizationName: org.name,
      metrics: [
        {
          key: 'requirements',
          label: 'Public requirements',
          value: requirementsAvailable,
          href: `${base}/requirements`,
        },
        {
          key: 'activeLeads',
          label: 'Active leads',
          value: activeLeads,
          href: `${base}/crm/leads`,
        },
        { key: 'contacts', label: 'CRM contacts', value: contacts, href: `${base}/crm/contacts` },
        {
          key: 'followUpsDue',
          label: 'Follow-ups due',
          value: followUpsDue,
          href: `${base}/crm/follow-ups`,
        },
        {
          key: 'siteVisits',
          label: 'Upcoming site visits',
          value: upcomingSiteVisits,
          href: `${base}/crm/site-visits`,
        },
        { key: 'deals', label: 'Open deals', value: openDeals, href: `${base}/crm/deals` },
      ],
      pipeline: [
        { key: 'NEW', label: 'New', count: pipelineMap.get('NEW') ?? 0 },
        { key: 'QUALIFIED', label: 'Qualified', count: pipelineMap.get('QUALIFIED') ?? 0 },
        { key: 'SITE_VISIT', label: 'Site visit', count: pipelineMap.get('SITE_VISIT') ?? 0 },
        { key: 'NEGOTIATION', label: 'Negotiation', count: pipelineMap.get('NEGOTIATION') ?? 0 },
        { key: 'BOOKED', label: 'Booked', count: pipelineMap.get('BOOKED') ?? 0 },
      ],
      recentActivity: auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        resourceType: row.resourceType,
        resourcePublicId: row.resourceId,
        summary: row.action,
        occurredAt: row.createdAt.toISOString(),
      })),
      attentionItems: [
        ...(followUpsDue > 0
          ? [
              {
                key: 'followUps',
                severity: 'WARNING' as const,
                title: 'Follow-ups due',
                description: `${followUpsDue} follow-up(s) due today or earlier.`,
                href: `${base}/crm/follow-ups`,
                count: followUpsDue,
              },
            ]
          : []),
        ...(verificationPending > 0
          ? [
              {
                key: 'verification',
                severity: 'WARNING' as const,
                title: 'Verification pending',
                description: `${verificationPending} verification case(s) open.`,
                href: `${base}/verification`,
                count: verificationPending,
              },
            ]
          : []),
      ],
      recentLeads: recentLeads.map((row) => ({
        publicId: row.publicId,
        title: row.publicId,
        subtitle: `Match ${row.matchScore}`,
        status: row.status,
        href: `${base}/crm/leads/${row.publicId}`,
        occurredAt: row.createdAt.toISOString(),
      })),
      quickActions: [
        { key: 'requirements', label: 'Browse requirements', href: `${base}/requirements` },
        { key: 'leads', label: 'View leads', href: `${base}/crm/leads` },
        { key: 'crm', label: 'Open CRM', href: `${base}/crm` },
        { key: 'wallet', label: 'Wallet', href: `${base}/billing/wallet` },
        { key: 'ai', label: 'Open AI Copilot', href: '/app/ai/chat' },
      ],
      walletBalanceMinor: wallet ? wallet.balanceMinor.toString() : null,
      walletCurrency: wallet?.currency ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  async getSeeker(
    actor: AuthActor,
    _request?: AuthenticatedRequest,
  ): Promise<SeekerDashboardResponse> {
    this.requireAuthenticated(actor);
    if (
      !actor.personas.includes('PROPERTY_SEEKER') &&
      !actor.personas.includes('INVESTOR') &&
      !actor.personas.includes('PROPERTY_OWNER') &&
      !actor.personas.includes('LAND_OWNER') &&
      !actorHasPermission(actor, 'platform:admin')
    ) {
      // Still allow any authenticated user with requirement permissions.
      if (!actorHasPermission(actor, 'requirement:read:own')) {
        throw new AppError('FORBIDDEN', 'Seeker dashboard is not available for this account.');
      }
    }

    const [requirements, notifications, openConversations] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { ownerUserId: actor.userId },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          publicId: true,
          city: true,
          status: true,
          propertyType: true,
          updatedAt: true,
        },
      }),
      this.prisma.notification.findMany({
        where: { userId: actor.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { publicId: true, title: true, type: true, createdAt: true },
      }),
      this.prisma.conversation.count({
        where: {
          status: 'OPEN',
          participants: { some: { userId: actor.userId } },
        },
      }),
    ]);

    const draftCount = requirements.filter((row) => row.status === 'DRAFT').length;
    const activeCount = requirements.filter((row) => row.status === 'ACTIVE').length;

    return {
      role: 'SEEKER',
      metrics: [
        {
          key: 'requirements',
          label: 'My requirements',
          value: requirements.length,
          href: '/app/requirements',
        },
        {
          key: 'active',
          label: 'Active requirements',
          value: activeCount,
          href: '/app/requirements',
        },
        {
          key: 'conversations',
          label: 'Open conversations',
          value: openConversations,
          href: '/app/inbox',
        },
        {
          key: 'notifications',
          label: 'Recent notifications',
          value: notifications.length,
          href: '/app/notifications',
        },
      ],
      recentRequirements: requirements.map((row) => ({
        publicId: row.publicId,
        title: `${row.propertyType} · ${row.city}`,
        status: row.status,
        href: `/app/requirements/${row.publicId}`,
        occurredAt: row.updatedAt.toISOString(),
      })),
      recentNotifications: notifications.map((row) => ({
        publicId: row.publicId,
        title: row.title,
        subtitle: row.type,
        href: '/app/notifications',
        occurredAt: row.createdAt.toISOString(),
      })),
      attentionItems:
        draftCount > 0
          ? [
              {
                key: 'drafts',
                severity: 'INFO' as const,
                title: 'Draft requirements',
                description: `${draftCount} draft requirement(s) can be activated when ready.`,
                href: '/app/requirements',
                count: draftCount,
              },
            ]
          : [],
      quickActions: [
        { key: 'newRequirement', label: 'Create requirement', href: '/app/requirements/new' },
        { key: 'browse', label: 'Browse properties', href: '/properties' },
        { key: 'saved', label: 'Saved', href: '/app/saved' },
        { key: 'ai', label: 'Open AI Copilot', href: '/app/ai/chat' },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async getPropertyAdmin(
    actor: AuthActor,
    _request?: AuthenticatedRequest,
  ): Promise<PropertyAdminDashboardResponse> {
    this.requireAuthenticated(actor);
    if (
      !actor.platformRoles.includes('PROPERTY_ADMIN') &&
      !actorHasPermission(actor, 'platform:admin')
    ) {
      throw new AppError('FORBIDDEN', 'Property Admin dashboard requires PROPERTY_ADMIN role.');
    }

    const assignments = await this.prisma.resourceAssignment.findMany({
      where: { userId: actor.userId },
      select: { resourceType: true, resourceId: true },
    });
    const propertyIds = assignments
      .filter((row) => row.resourceType === 'PROPERTY')
      .map((row) => row.resourceId);
    const projectIds = assignments
      .filter((row) => row.resourceType === 'PROJECT')
      .map((row) => row.resourceId);

    const [properties, projects] = await Promise.all([
      propertyIds.length
        ? this.prisma.property.findMany({
            where: { id: { in: propertyIds }, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 12,
            select: {
              publicId: true,
              title: true,
              availabilityStatus: true,
              publicationStatus: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
      projectIds.length
        ? this.prisma.project.findMany({
            where: { id: { in: projectIds }, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            take: 8,
            select: {
              publicId: true,
              name: true,
              lifecycleStatus: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const available = properties.filter((row) => row.availabilityStatus === 'AVAILABLE').length;

    return {
      role: 'PROPERTY_ADMIN',
      metrics: [
        {
          key: 'assignedProperties',
          label: 'Assigned properties',
          value: properties.length,
          href: '/app/property-admin/properties',
        },
        {
          key: 'assignedProjects',
          label: 'Assigned projects',
          value: projects.length,
          href: '/app/property-admin/projects',
        },
        {
          key: 'available',
          label: 'Available inventory',
          value: available,
          href: '/app/property-admin/inventory',
        },
      ],
      assignedProperties: properties.map((row) => ({
        publicId: row.publicId,
        title: row.title,
        status: row.availabilityStatus,
        href: '/app/property-admin/properties',
        occurredAt: row.updatedAt.toISOString(),
      })),
      assignedProjects: projects.map((row) => ({
        publicId: row.publicId,
        title: row.name,
        status: row.lifecycleStatus,
        href: '/app/property-admin/projects',
        occurredAt: row.updatedAt.toISOString(),
      })),
      attentionItems:
        properties.length === 0
          ? [
              {
                key: 'noAssignments',
                severity: 'INFO' as const,
                title: 'No assignments yet',
                description: 'A Super Admin must assign properties or projects to your account.',
                href: null,
              },
            ]
          : [],
      quickActions: [
        { key: 'properties', label: 'Assigned properties', href: '/app/property-admin/properties' },
        { key: 'inventory', label: 'Inventory', href: '/app/property-admin/inventory' },
        { key: 'media', label: 'Media', href: '/app/property-admin/media' },
        { key: 'community', label: 'Community', href: '/app/property-admin/community' },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async getAdmin(
    actor: AuthActor,
    _request?: AuthenticatedRequest,
  ): Promise<AdminDashboardResponse> {
    this.requireAuthenticated(actor);
    if (
      !actorHasPermission(actor, 'platform:admin') &&
      !actor.platformRoles.includes('ADMIN') &&
      !actor.platformRoles.includes('SUPER_ADMIN')
    ) {
      throw new AppError('FORBIDDEN', 'Admin dashboard requires platform admin access.');
    }

    const [
      users,
      organizations,
      developers,
      agencies,
      properties,
      projects,
      requirements,
      leads,
      verificationQueue,
      openReports,
      subscriptions,
      deadLetters,
      failedJobs,
      auditRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { type: 'DEVELOPER' } }),
      this.prisma.organization.count({ where: { type: 'AGENCY' } }),
      this.prisma.property.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.requirement.count(),
      this.prisma.lead.count(),
      this.prisma.verificationCase.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] } },
      }),
      this.prisma.contentReport.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      this.prisma.organizationSubscription.count({
        where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      }),
      this.prisma.deadLetterEvent.count({ where: { status: 'OPEN' } }),
      this.prisma.backgroundJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
      this.prisma.auditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      role: 'ADMIN',
      metrics: [
        { key: 'users', label: 'Users', value: users, href: '/admin/users' },
        {
          key: 'organizations',
          label: 'Organizations',
          value: organizations,
          href: '/admin/organizations',
        },
        { key: 'developers', label: 'Developers', value: developers, href: '/admin/organizations' },
        { key: 'agents', label: 'Agencies', value: agencies, href: '/admin/organizations' },
        { key: 'properties', label: 'Properties', value: properties, href: '/admin/properties' },
        { key: 'projects', label: 'Projects', value: projects, href: '/admin/projects' },
        {
          key: 'requirements',
          label: 'Requirements',
          value: requirements,
          href: '/admin/requirements',
        },
        { key: 'leads', label: 'Leads', value: leads, href: '/admin/leads' },
        {
          key: 'verification',
          label: 'Verification queue',
          value: verificationQueue,
          href: '/admin/verification',
        },
        {
          key: 'subscriptions',
          label: 'Active subscriptions',
          value: subscriptions,
          href: '/admin/subscriptions',
        },
      ],
      attentionItems: [
        ...(verificationQueue > 0
          ? [
              {
                key: 'verification',
                severity: 'WARNING' as const,
                title: 'Verification queue',
                description: `${verificationQueue} case(s) awaiting review.`,
                href: '/admin/verification',
                count: verificationQueue,
              },
            ]
          : []),
        ...(openReports > 0
          ? [
              {
                key: 'reports',
                severity: 'WARNING' as const,
                title: 'Open content reports',
                description: `${openReports} report(s) open.`,
                href: '/admin/reports',
                count: openReports,
              },
            ]
          : []),
        ...(deadLetters > 0
          ? [
              {
                key: 'deadLetters',
                severity: 'CRITICAL' as const,
                title: 'Dead-letter events',
                description: `${deadLetters} open dead-letter event(s).`,
                href: '/admin/integrations',
                count: deadLetters,
              },
            ]
          : []),
        ...(failedJobs > 0
          ? [
              {
                key: 'jobs',
                severity: 'CRITICAL' as const,
                title: 'Failed background jobs',
                description: `${failedJobs} failed or dead-lettered job(s).`,
                href: '/admin/integrations',
                count: failedJobs,
              },
            ]
          : []),
      ],
      recentActivity: auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        resourceType: row.resourceType,
        resourcePublicId: row.resourceId,
        summary: row.action,
        occurredAt: row.createdAt.toISOString(),
      })),
      quickActions: [
        { key: 'users', label: 'Users', href: '/admin/users' },
        { key: 'orgs', label: 'Organizations', href: '/admin/organizations' },
        { key: 'verification', label: 'Verification', href: '/admin/verification' },
        { key: 'integrations', label: 'Integrations', href: '/admin/integrations' },
        { key: 'ai', label: 'AI Copilot', href: '/app/ai/chat' },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  private requireAuthenticated(actor: AuthActor): void {
    if (!actor.userId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.');
    }
  }

  private async requireOrgMember(
    actor: AuthActor,
    organizationPublicId: string | undefined,
    expectedType: 'DEVELOPER' | 'AGENCY',
  ) {
    this.requireAuthenticated(actor);
    const publicId = organizationPublicId ?? actor.activeOrganizationPublicId;
    if (!publicId) {
      throw new AppError('FORBIDDEN', 'Active organization context is required.');
    }

    const org = await this.prisma.organization.findFirst({
      where: { publicId },
      select: { id: true, publicId: true, name: true, type: true },
    });
    if (!org || org.type !== expectedType) {
      throw new AppError('NOT_FOUND', 'Organization not found.');
    }

    if (actorHasPermission(actor, 'platform:admin')) {
      return org;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: org.id,
        userId: actor.userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!membership) {
      throw new AppError('NOT_FOUND', 'Organization not found.');
    }
    return org;
  }
}

function endOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
}
