import { Injectable } from '@nestjs/common';
import { type AiConversationContextHints, type AiNextBestAction } from '@property-studio/contracts';

import { PrismaService } from '../../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../../common/tenancy/access-scope';

/**
 * Deterministic "Recommended next actions" from live system state.
 * Not ML — every action cites concrete evidence from authorized records.
 */
@Injectable()
export class NextBestActionService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(
    actor: AuthActor,
    hints: AiConversationContextHints,
  ): Promise<AiNextBestAction[]> {
    const actions: AiNextBestAction[] = [];
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (actorHasPermission(actor, 'saved-search:read')) {
      const recentMatches = await this.prisma.savedSearchMatch.findMany({
        where: { userId: actor.userId },
        orderBy: { matchedAt: 'desc' },
        take: 5,
        include: {
          savedSearch: { select: { publicId: true, name: true } },
          property: { select: { publicId: true, title: true } },
        },
      });
      for (const match of recentMatches) {
        actions.push({
          id: `match:${match.publicId}`,
          title: `Review match for “${match.savedSearch.name}”`,
          rationale: `${match.property.title} matched your saved search.`,
          priority: 'MEDIUM',
          category: 'SAVED_SEARCH',
          href: `/properties/${match.property.publicId}`,
          entityType: 'PROPERTY',
          entityPublicId: match.property.publicId,
          evidence: [
            `savedSearch=${match.savedSearch.publicId}`,
            `matchedAt=${match.matchedAt.toISOString()}`,
          ],
        });
      }
    }

    if (actorHasPermission(actor, 'requirement:read:own')) {
      const activeReqs = await this.prisma.requirement.count({
        where: { ownerUserId: actor.userId, status: 'ACTIVE' },
      });
      const savedCount = actorHasPermission(actor, 'saved-property:read')
        ? await this.prisma.savedProperty.count({
            where: { userId: actor.userId, deletedAt: null },
          })
        : 0;
      if (activeReqs > 0 && savedCount === 0) {
        actions.push({
          id: 'seeker:no-saved',
          title: 'Save properties that match your requirement',
          rationale: 'You have an active requirement but no saved properties yet.',
          priority: 'MEDIUM',
          category: 'REQUIREMENT',
          href: '/properties',
          entityType: null,
          entityPublicId: null,
          evidence: [`activeRequirements=${activeReqs}`],
        });
      }
    }

    if (
      actor.activeOrganizationId &&
      (actorHasPermission(actor, 'crm:read') || actorHasPermission(actor, 'crm:followups:create'))
    ) {
      const orgId = actor.activeOrganizationId;
      const overdue = await this.prisma.crmFollowUp.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueAt: { lt: now },
        },
        orderBy: { dueAt: 'asc' },
        take: 5,
        select: { publicId: true, title: true, dueAt: true },
      });
      for (const followUp of overdue) {
        actions.push({
          id: `followup:${followUp.publicId}`,
          title: `Overdue follow-up: ${followUp.title}`,
          rationale: 'Follow-up due date has passed and status is still open.',
          priority: 'HIGH',
          category: 'FOLLOW_UP',
          href: null,
          entityType: 'CRM_FOLLOW_UP',
          entityPublicId: followUp.publicId,
          evidence: [`dueAt=${followUp.dueAt.toISOString()}`],
        });
      }

      const visits = await this.prisma.crmSiteVisit.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gte: now, lte: weekAhead },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: { publicId: true, scheduledAt: true },
      });
      for (const visit of visits) {
        actions.push({
          id: `visit:${visit.publicId}`,
          title: 'Upcoming site visit',
          rationale: 'A site visit is scheduled within the next 7 days.',
          priority: 'HIGH',
          category: 'SITE_VISIT',
          href: null,
          entityType: 'CRM_SITE_VISIT',
          entityPublicId: visit.publicId,
          evidence: [`scheduledAt=${visit.scheduledAt.toISOString()}`],
        });
      }

      const uncontacted = await this.prisma.lead.findMany({
        where: {
          recipientOrganizationId: orgId,
          status: { in: ['NEW', 'ASSIGNED', 'VIEWED'] },
          contactedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: { publicId: true, status: true, createdAt: true },
      });
      for (const lead of uncontacted) {
        actions.push({
          id: `lead:${lead.publicId}`,
          title: `Contact lead ${lead.publicId}`,
          rationale: 'Lead has not been contacted yet.',
          priority: 'MEDIUM',
          category: 'LEAD',
          href: null,
          entityType: 'LEAD',
          entityPublicId: lead.publicId,
          evidence: [`status=${lead.status}`, `createdAt=${lead.createdAt.toISOString()}`],
        });
      }

      const staleDeals = await this.prisma.crmDeal.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['OPEN', 'NEGOTIATION'] },
          updatedAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { updatedAt: 'asc' },
        take: 3,
        select: { publicId: true, status: true, updatedAt: true },
      });
      for (const deal of staleDeals) {
        actions.push({
          id: `deal:${deal.publicId}`,
          title: `Review inactive deal ${deal.publicId}`,
          rationale: 'Deal has had no updates for 14+ days.',
          priority: 'MEDIUM',
          category: 'DEAL',
          href: null,
          entityType: 'CRM_DEAL',
          entityPublicId: deal.publicId,
          evidence: [`status=${deal.status}`, `updatedAt=${deal.updatedAt.toISOString()}`],
        });
      }
    }

    if (actor.platformRoles.includes('PROPERTY_ADMIN')) {
      const assignments = await this.prisma.resourceAssignment.count({
        where: { userId: actor.userId },
      });
      if (assignments === 0) {
        actions.push({
          id: 'padmin:none',
          title: 'No resource assignments',
          rationale: 'PROPERTY_ADMIN accounts only see explicitly assigned resources.',
          priority: 'LOW',
          category: 'GENERAL',
          href: '/app/property-admin',
          entityType: null,
          entityPublicId: null,
          evidence: ['assignments=0'],
        });
      }
    }

    if (hints.focus === 'pipeline' && actions.length === 0) {
      actions.push({
        id: 'pipeline:empty',
        title: 'No pipeline actions required',
        rationale: 'No overdue follow-ups, upcoming visits, or uncontacted leads in scope.',
        priority: 'LOW',
        category: 'GENERAL',
        href: null,
        entityType: null,
        entityPublicId: null,
        evidence: ['INSUFFICIENT_DATA'],
      });
    }

    const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    return actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 12);
  }
}
