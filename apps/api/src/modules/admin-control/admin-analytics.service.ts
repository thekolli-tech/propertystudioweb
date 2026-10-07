import { Injectable } from '@nestjs/common';
import {
  type AdminAnalyticsQuery,
  type AdminControlCenterResponse,
  type AdminControlMetric,
  type AdminFunnelStep,
  type AdminNamedCount,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { requirePlatformAdmin } from './admin-access';
import { resolveAdminPeriod } from './admin-period';

function metric(
  key: string,
  label: string,
  value: number | string | null,
  opts?: Partial<AdminControlMetric>,
): AdminControlMetric {
  const coverageState =
    opts?.coverageState ??
    (value === null
      ? 'UNAVAILABLE'
      : typeof value === 'number'
        ? value === 0
          ? 'ZERO'
          : 'READY'
        : value === '0'
          ? 'ZERO'
          : 'READY');
  return {
    key,
    label,
    value,
    coverageState,
    unit: opts?.unit ?? 'count',
    currency: opts?.currency ?? null,
    href: opts?.href ?? null,
    note: opts?.note ?? null,
  };
}

function namedCounts(
  rows: Array<{ key: string; _count: { _all: number } }>,
  labels?: Record<string, string>,
): AdminNamedCount[] {
  return rows
    .map((row) => ({
      key: row.key,
      label: labels?.[row.key] ?? row.key.replaceAll('_', ' '),
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getControlCenter(
    actor: AuthActor,
    query: AdminAnalyticsQuery,
    _request?: AuthenticatedRequest,
  ): Promise<AdminControlCenterResponse> {
    requirePlatformAdmin(actor);
    const range = resolveAdminPeriod(query);
    const { start, end } = range;
    const now = new Date();

    const [
      totalUsers,
      newUsers,
      personas,
      platformRoles,
      totalOrgs,
      developerOrgs,
      agencyOrgs,
      pendingVerificationOrgs,
      projects,
      properties,
      publishedProperties,
      draftProperties,
      communities,
      mediaAssets,
      projectsByStatus,
      propertiesByStatus,
      propertiesByCity,
      requirements,
      activeRequirements,
      marketplaceRequirements,
      leads,
      leadsCreatedInPeriod,
      leadLifecycle,
      requirementsByPropertyType,
      requirementsByCity,
      contacts,
      openFollowUps,
      scheduledSiteVisits,
      openDeals,
      closedDeals,
      pendingVerificationCases,
      verifiedDevelopers,
      verifiedAgents,
      publishedReviews,
      openReviewReports,
      openContentReports,
      activeSubscriptions,
      subscriptionsByStatus,
      paymentVolume,
      walletBalances,
      leadPurchasesInPeriod,
      refundsInPeriod,
      failedPaymentsInPeriod,
      publishedMedia,
      pendingModeration,
      mediaAnalyticsInPeriod,
      activeApiClients,
      activeWebhookEndpoints,
      failedWebhookDeliveries,
      openDeadLetters,
      failedBackgroundJobs,
      aiConversations,
      aiMessagesInPeriod,
      toolInvocationsInPeriod,
      unavailableAiReplies,
      requirementsCreatedInPeriod,
      marketplaceReqsCreatedInPeriod,
      contactedLeads,
      qualifiedLeads,
      siteVisitLeads,
      negotiationLeads,
      bookedLeads,
      closedLeads,
      leadAccessGrantsInPeriod,
      siteVisitsInPeriod,
      auditRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
      this.prisma.userPersona.groupBy({
        by: ['persona'],
        _count: { _all: true },
      }),
      this.prisma.userPlatformRole.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { type: 'DEVELOPER' } }),
      this.prisma.organization.count({ where: { type: 'AGENCY' } }),
      this.prisma.developerProfile
        .count({ where: { verificationStatus: 'PENDING' } })
        .then(async (devPending) => {
          const agencyPending = await this.prisma.agencyProfile.count({
            where: { verificationStatus: 'PENDING' },
          });
          return devPending + agencyPending;
        }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.property.count({ where: { deletedAt: null } }),
      this.prisma.property.count({
        where: { deletedAt: null, publicationStatus: 'PUBLISHED' },
      }),
      this.prisma.property.count({
        where: { deletedAt: null, publicationStatus: 'DRAFT' },
      }),
      this.prisma.community.count({ where: { deletedAt: null } }),
      this.prisma.mediaAsset.count({ where: { deletedAt: null } }),
      this.prisma.project.groupBy({
        by: ['lifecycleStatus'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['publicationStatus'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['city'],
        where: { deletedAt: null, publicationStatus: 'PUBLISHED' },
        _count: { _all: true },
        orderBy: { _count: { city: 'desc' } },
        take: 12,
      }),
      this.prisma.requirement.count(),
      this.prisma.requirement.count({
        where: { status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] } },
      }),
      this.prisma.requirement.count({
        where: { status: 'ACTIVE', visibility: 'MARKETPLACE' },
      }),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.requirement.groupBy({
        by: ['propertyType'],
        _count: { _all: true },
      }),
      this.prisma.requirement.groupBy({
        by: ['city'],
        _count: { _all: true },
        orderBy: { _count: { city: 'desc' } },
        take: 12,
      }),
      this.prisma.crmContact.count(),
      this.prisma.crmFollowUp.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.crmSiteVisit.count({
        where: { status: { in: ['SCHEDULED', 'CONFIRMED'] }, scheduledAt: { gte: now } },
      }),
      this.prisma.crmDeal.count({
        where: { status: { in: ['OPEN', 'NEGOTIATION'] } },
      }),
      this.prisma.crmDeal.count({
        where: { status: { in: ['CLOSED', 'LOST', 'BOOKED'] } },
      }),
      this.prisma.verificationCase.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] } },
      }),
      this.prisma.developerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.agencyProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.review.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.reviewReport.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      this.prisma.contentReport.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      this.prisma.organizationSubscription.count({
        where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      }),
      this.prisma.organizationSubscription.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          status: 'CAPTURED',
          createdAt: { gte: start, lte: end },
          type: { not: 'REFUND' },
        },
        _sum: { amountMinor: true },
      }),
      this.prisma.wallet.aggregate({ _sum: { balanceMinor: true } }),
      this.prisma.leadPurchase.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.refund.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.financialTransaction.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.mediaAsset.count({
        where: { deletedAt: null, lifecycleStatus: 'PUBLISHED' },
      }),
      this.prisma.mediaAsset.count({
        where: {
          deletedAt: null,
          moderationStatus: { in: ['PENDING_REVIEW', 'FLAGGED'] },
        },
      }),
      this.prisma.mediaAnalyticsEvent.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.apiClient.count({ where: { status: 'ACTIVE' } }),
      this.prisma.outboundWebhookEndpoint.count({ where: { status: 'ACTIVE' } }),
      this.prisma.webhookDelivery.count({
        where: { status: 'FAILED', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.deadLetterEvent.count({ where: { status: 'OPEN' } }),
      this.prisma.backgroundJob.count({
        where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
      }),
      this.prisma.aiConversation.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.aiConversationMessage.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.aiChatAnalyticsEvent.count({
        where: { eventType: 'TOOL_INVOKED', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.aiConversationMessage.count({
        where: {
          role: 'ASSISTANT',
          coverageState: 'UNAVAILABLE',
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.requirement.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.requirement.count({
        where: {
          status: 'ACTIVE',
          visibility: 'MARKETPLACE',
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.lead.count({ where: { status: 'CONTACTED' } }),
      this.prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      this.prisma.lead.count({ where: { status: 'SITE_VISIT' } }),
      this.prisma.lead.count({ where: { status: 'NEGOTIATION' } }),
      this.prisma.lead.count({ where: { status: 'BOOKED' } }),
      this.prisma.lead.count({ where: { status: { in: ['CLOSED', 'LOST'] } } }),
      this.prisma.leadAccessGrant.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.crmSiteVisit.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.auditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

    const paymentVolumeMinor = paymentVolume._sum.amountMinor?.toString() ?? '0';
    const walletBalancesMinor = walletBalances._sum.balanceMinor?.toString() ?? '0';

    const funnel: AdminFunnelStep[] = [
      {
        key: 'discovery',
        label: 'Property discovery',
        count: null,
        coverageState: 'UNAVAILABLE',
        note: 'Authenticated discovery views are not retained as funnel events.',
      },
      {
        key: 'requirement_created',
        label: 'Requirement created',
        count: requirementsCreatedInPeriod,
        coverageState: requirementsCreatedInPeriod === 0 ? 'ZERO' : 'READY',
      },
      {
        key: 'requirement_published',
        label: 'Requirement on marketplace',
        count: marketplaceReqsCreatedInPeriod,
        coverageState: marketplaceReqsCreatedInPeriod === 0 ? 'ZERO' : 'READY',
        note: 'Counts marketplace-visible requirements created in period (no separate publishedAt).',
      },
      {
        key: 'lead_generated',
        label: 'Lead generated',
        count: leadsCreatedInPeriod,
        coverageState: leadsCreatedInPeriod === 0 ? 'ZERO' : 'READY',
      },
      {
        key: 'lead_accessed',
        label: 'Lead accessed',
        count: leadAccessGrantsInPeriod,
        coverageState: leadAccessGrantsInPeriod === 0 ? 'ZERO' : 'READY',
      },
      {
        key: 'contacted',
        label: 'Contacted (current stock)',
        count: contactedLeads,
        coverageState: contactedLeads === 0 ? 'ZERO' : 'READY',
        note: 'Current lead status stock — historical transition counts unavailable.',
      },
      {
        key: 'qualified',
        label: 'Qualified (current stock)',
        count: qualifiedLeads,
        coverageState: qualifiedLeads === 0 ? 'ZERO' : 'READY',
      },
      {
        key: 'site_visit',
        label: 'Site visit',
        count: siteVisitsInPeriod,
        coverageState: siteVisitsInPeriod === 0 ? 'ZERO' : 'READY',
        note: 'CRM site visits created in period; lead SITE_VISIT stock shown separately in demand.',
      },
      {
        key: 'negotiation',
        label: 'Negotiation (current stock)',
        count: negotiationLeads,
        coverageState: negotiationLeads === 0 ? 'ZERO' : 'READY',
      },
      {
        key: 'booked',
        label: 'Booked (current stock)',
        count: bookedLeads,
        coverageState: bookedLeads === 0 ? 'ZERO' : 'READY',
      },
      {
        key: 'closed',
        label: 'Closed / lost (current stock)',
        count: closedLeads,
        coverageState: closedLeads === 0 ? 'ZERO' : 'READY',
      },
    ];

    const attentionItems = [
      ...(pendingVerificationCases > 0
        ? [
            {
              key: 'verification',
              severity: 'WARNING' as const,
              title: 'Verification queue',
              description: `${pendingVerificationCases} case(s) awaiting review.`,
              href: '/admin/verification',
              count: pendingVerificationCases,
            },
          ]
        : []),
      ...(openContentReports + openReviewReports > 0
        ? [
            {
              key: 'reports',
              severity: 'WARNING' as const,
              title: 'Open reports',
              description: `${openContentReports + openReviewReports} report(s) open.`,
              href: '/admin/moderation',
              count: openContentReports + openReviewReports,
            },
          ]
        : []),
      ...(openDeadLetters > 0
        ? [
            {
              key: 'deadLetters',
              severity: 'CRITICAL' as const,
              title: 'Dead-letter events',
              description: `${openDeadLetters} open dead-letter event(s).`,
              href: '/admin/integrations',
              count: openDeadLetters,
            },
          ]
        : []),
      ...(failedBackgroundJobs > 0
        ? [
            {
              key: 'jobs',
              severity: 'CRITICAL' as const,
              title: 'Failed background jobs',
              description: `${failedBackgroundJobs} failed or dead-lettered job(s).`,
              href: '/admin/integrations',
              count: failedBackgroundJobs,
            },
          ]
        : []),
    ];

    return {
      period: range.period,
      timezone: 'Asia/Kolkata',
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      users: {
        total: metric('users.total', 'Total users', totalUsers, { href: '/admin/users' }),
        newInPeriod: metric('users.new', 'New users in period', newUsers, {
          href: '/admin/users',
        }),
        byPersona: personas.map((row) => ({
          key: row.persona,
          label: row.persona.replaceAll('_', ' '),
          count: row._count._all,
        })),
        byPlatformRole: platformRoles.map((row) => ({
          key: row.role,
          label: row.role.replaceAll('_', ' '),
          count: row._count._all,
        })),
        activeUsers: metric('users.active', 'Active users', null, {
          coverageState: 'UNAVAILABLE',
          note: 'No durable session/activity definition for active users yet.',
        }),
      },
      organizations: {
        total: metric('orgs.total', 'Organizations', totalOrgs, {
          href: '/admin/organizations',
        }),
        developers: metric('orgs.developers', 'Developer orgs', developerOrgs, {
          href: '/admin/organizations',
        }),
        agencies: metric('orgs.agencies', 'Agency orgs', agencyOrgs, {
          href: '/admin/organizations',
        }),
        pendingVerification: metric(
          'orgs.pendingVerification',
          'Orgs pending verification',
          pendingVerificationOrgs,
          { href: '/admin/verification' },
        ),
      },
      catalog: {
        projects: metric('catalog.projects', 'Projects', projects, { href: '/admin/projects' }),
        properties: metric('catalog.properties', 'Properties', properties, {
          href: '/admin/properties',
        }),
        publishedProperties: metric(
          'catalog.publishedProperties',
          'Published properties',
          publishedProperties,
          { href: '/admin/catalog' },
        ),
        draftProperties: metric('catalog.draftProperties', 'Draft properties', draftProperties),
        communities: metric('catalog.communities', 'Communities', communities, {
          href: '/admin/communities',
        }),
        mediaAssets: metric('catalog.mediaAssets', 'Media assets', mediaAssets, {
          href: '/admin/media',
        }),
        projectsByStatus: namedCounts(
          projectsByStatus.map((row) => ({
            key: row.lifecycleStatus,
            _count: row._count,
          })),
        ),
        propertiesByStatus: namedCounts(
          propertiesByStatus.map((row) => ({
            key: row.publicationStatus,
            _count: row._count,
          })),
        ),
        propertiesByCity: propertiesByCity
          .filter((row) => row.city)
          .map((row) => ({
            key: row.city!,
            label: row.city!,
            count: row._count._all,
          })),
      },
      demand: {
        requirements: metric('demand.requirements', 'Requirements', requirements, {
          href: '/admin/requirements',
        }),
        activeRequirements: metric(
          'demand.activeRequirements',
          'Open requirements',
          activeRequirements,
          { href: '/admin/requirements' },
        ),
        marketplaceRequirements: metric(
          'demand.marketplaceRequirements',
          'Marketplace requirements',
          marketplaceRequirements,
        ),
        leads: metric('demand.leads', 'Leads', leads, { href: '/admin/leads' }),
        leadsCreatedInPeriod: metric(
          'demand.leadsCreatedInPeriod',
          'Leads created in period',
          leadsCreatedInPeriod,
        ),
        leadLifecycle: namedCounts(
          leadLifecycle.map((row) => ({ key: row.status, _count: row._count })),
        ),
        requirementsByPropertyType: namedCounts(
          requirementsByPropertyType.map((row) => ({
            key: row.propertyType,
            _count: row._count,
          })),
        ),
        requirementsByCity: requirementsByCity.map((row) => ({
          key: row.city,
          label: row.city,
          count: row._count._all,
        })),
      },
      crm: {
        contacts: metric('crm.contacts', 'CRM contacts', contacts),
        openFollowUps: metric('crm.openFollowUps', 'Open follow-ups', openFollowUps),
        scheduledSiteVisits: metric(
          'crm.scheduledSiteVisits',
          'Upcoming site visits',
          scheduledSiteVisits,
        ),
        openDeals: metric('crm.openDeals', 'Open deals', openDeals),
        closedDeals: metric('crm.closedDeals', 'Closed deals', closedDeals),
      },
      trust: {
        pendingVerificationCases: metric(
          'trust.pendingVerification',
          'Pending verification cases',
          pendingVerificationCases,
          { href: '/admin/verification' },
        ),
        verifiedDevelopers: metric(
          'trust.verifiedDevelopers',
          'Verified developers',
          verifiedDevelopers,
        ),
        verifiedAgents: metric('trust.verifiedAgents', 'Verified agencies', verifiedAgents),
        publishedReviews: metric('trust.publishedReviews', 'Published reviews', publishedReviews, {
          href: '/admin/reviews',
        }),
        openReviewReports: metric(
          'trust.openReviewReports',
          'Open review reports',
          openReviewReports,
          { href: '/admin/reports' },
        ),
        openContentReports: metric(
          'trust.openContentReports',
          'Open content reports',
          openContentReports,
          { href: '/admin/moderation' },
        ),
      },
      money: {
        activeSubscriptions: metric(
          'money.activeSubscriptions',
          'Active subscriptions',
          activeSubscriptions,
          { href: '/admin/billing' },
        ),
        subscriptionsByStatus: namedCounts(
          subscriptionsByStatus.map((row) => ({ key: row.status, _count: row._count })),
        ),
        paymentVolumeCapturedMinor: metric(
          'money.paymentVolume',
          'Captured payment volume (period)',
          paymentVolumeMinor,
          {
            unit: 'money_minor',
            currency: 'INR',
            href: '/admin/payments',
            coverageState: paymentVolumeMinor === '0' ? 'ZERO' : 'READY',
          },
        ),
        walletBalancesMinor: metric(
          'money.walletBalances',
          'Total wallet balances',
          walletBalancesMinor,
          {
            unit: 'money_minor',
            currency: 'INR',
            href: '/admin/wallets',
            coverageState: walletBalancesMinor === '0' ? 'ZERO' : 'READY',
          },
        ),
        leadPurchasesInPeriod: metric(
          'money.leadPurchases',
          'Lead purchases (period)',
          leadPurchasesInPeriod,
          { href: '/admin/billing' },
        ),
        refundsInPeriod: metric('money.refunds', 'Refunds (period)', refundsInPeriod, {
          href: '/admin/payments',
        }),
        failedPaymentsInPeriod: metric(
          'money.failedPayments',
          'Failed payments (period)',
          failedPaymentsInPeriod,
          { href: '/admin/payments' },
        ),
      },
      media: {
        publishedMedia: metric('media.published', 'Published media', publishedMedia, {
          href: '/admin/media',
        }),
        pendingModeration: metric(
          'media.pendingModeration',
          'Pending media moderation',
          pendingModeration,
          { href: '/admin/media' },
        ),
        analyticsEventsInPeriod: metric(
          'media.analyticsEvents',
          'Media analytics events (period)',
          mediaAnalyticsInPeriod,
          { href: '/admin/media/analytics' },
        ),
      },
      integrations: {
        activeApiClients: metric(
          'integrations.apiClients',
          'Active API clients',
          activeApiClients,
          { href: '/admin/integrations' },
        ),
        activeWebhookEndpoints: metric(
          'integrations.webhooks',
          'Active webhook endpoints',
          activeWebhookEndpoints,
          { href: '/admin/integrations' },
        ),
        failedWebhookDeliveries: metric(
          'integrations.failedDeliveries',
          'Failed webhook deliveries (period)',
          failedWebhookDeliveries,
          { href: '/admin/integrations' },
        ),
        openDeadLetters: metric(
          'integrations.deadLetters',
          'Open dead-letter events',
          openDeadLetters,
          { href: '/admin/integrations' },
        ),
        failedBackgroundJobs: metric(
          'integrations.failedJobs',
          'Failed background jobs',
          failedBackgroundJobs,
          { href: '/admin/integrations' },
        ),
      },
      ai: {
        conversations: metric('ai.conversations', 'AI conversations', aiConversations, {
          href: '/admin/ai',
        }),
        messagesInPeriod: metric('ai.messages', 'AI messages (period)', aiMessagesInPeriod, {
          href: '/admin/ai',
        }),
        toolInvocationsInPeriod: metric(
          'ai.toolInvocations',
          'AI tool invocations (period)',
          toolInvocationsInPeriod,
          { href: '/admin/ai' },
        ),
        unavailableResponsesInPeriod: metric(
          'ai.unavailable',
          'UNAVAILABLE assistant replies (period)',
          unavailableAiReplies,
          { href: '/admin/ai' },
        ),
        providerName: 'DeterministicAiProvider',
        providerStatus: 'CONFIGURED',
      },
      funnel,
      attentionItems,
      recentAudit: auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        resourceType: row.resourceType,
        resourcePublicId: row.resourceId,
        summary: row.action,
        occurredAt: row.createdAt.toISOString(),
      })),
      quickActions: [
        { key: 'overview', label: 'Overview', href: '/admin/overview' },
        { key: 'verification', label: 'Verification', href: '/admin/verification' },
        { key: 'moderation', label: 'Moderation', href: '/admin/moderation' },
        { key: 'billing', label: 'Billing', href: '/admin/billing' },
        { key: 'integrations', label: 'Integrations', href: '/admin/integrations' },
        { key: 'ai', label: 'AI governance', href: '/admin/ai' },
        { key: 'audit', label: 'Audit', href: '/admin/audit' },
        { key: 'system', label: 'System health', href: '/admin/system' },
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}
