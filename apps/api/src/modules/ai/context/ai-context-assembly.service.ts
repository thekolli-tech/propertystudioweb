import { Injectable } from '@nestjs/common';
import {
  type AiAssembledContextQuery,
  type AiAssembledContextResponse,
  type AiConversationContextHints,
  type AiNextBestAction,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../../common/auth/current-actor.decorator';
import { PrismaService } from '../../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../../common/tenancy/access-scope';
import { AI_DISCLAIMER } from '../providers/ai-provider';
import { NextBestActionService } from './next-best-action.service';

const MAX_SAVED = 20;
const MAX_ACTIONS = 8;

/**
 * Server-side authorized context for the AI Copilot.
 * Hints are never treated as proof of access — every resource is re-checked.
 */
@Injectable()
export class AiContextAssemblyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nextBestActions: NextBestActionService,
  ) {}

  async assemble(
    actor: AuthActor,
    hints: AiAssembledContextQuery | AiConversationContextHints | null | undefined,
    request?: AuthenticatedRequest,
  ): Promise<AiAssembledContextResponse> {
    void request;
    const normalized = this.normalizeHints(hints);
    const roleLabel = this.resolveRoleLabel(actor);
    const activeOrganizationPublicId = actor.activeOrganizationPublicId;

    // Reject frontend-supplied org that does not match active membership (non-admin).
    if (
      normalized.organizationPublicId &&
      normalized.organizationPublicId !== activeOrganizationPublicId &&
      !actor.platformRoles.includes('ADMIN') &&
      !actor.platformRoles.includes('SUPER_ADMIN')
    ) {
      normalized.organizationPublicId = activeOrganizationPublicId;
    }

    const summary = {
      savedPropertyCount: null as number | null,
      savedSearchCount: null as number | null,
      activeRequirementCount: null as number | null,
      openLeadCount: null as number | null,
      overdueFollowUpCount: null as number | null,
      upcomingSiteVisitCount: null as number | null,
      openDealCount: null as number | null,
    };

    const labels: string[] = [`Role: ${roleLabel}`];
    if (activeOrganizationPublicId) {
      labels.push(`Organization: ${activeOrganizationPublicId}`);
    }

    if (actorHasPermission(actor, 'saved-property:read')) {
      summary.savedPropertyCount = await this.prisma.savedProperty.count({
        where: { userId: actor.userId, deletedAt: null },
      });
      labels.push(`Saved properties: ${summary.savedPropertyCount}`);
    }
    if (actorHasPermission(actor, 'saved-search:read')) {
      summary.savedSearchCount = await this.prisma.savedSearch.count({
        where: { userId: actor.userId, deletedAt: null },
      });
      labels.push(`Saved searches: ${summary.savedSearchCount}`);
    }
    if (actorHasPermission(actor, 'requirement:read:own')) {
      summary.activeRequirementCount = await this.prisma.requirement.count({
        where: {
          ownerUserId: actor.userId,
          status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] },
        },
      });
      labels.push(`Requirements: ${summary.activeRequirementCount}`);
    }

    if (
      actor.activeOrganizationId &&
      (actorHasPermission(actor, 'crm:read') || actorHasPermission(actor, 'lead:read'))
    ) {
      const orgId = actor.activeOrganizationId;
      const now = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [openLeads, overdueFollowUps, upcomingVisits, openDeals] = await Promise.all([
        this.prisma.lead.count({
          where: {
            recipientOrganizationId: orgId,
            status: { notIn: ['CLOSED', 'LOST', 'BOOKED'] },
          },
        }),
        this.prisma.crmFollowUp.count({
          where: {
            organizationId: orgId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            dueAt: { lt: now },
          },
        }),
        this.prisma.crmSiteVisit.count({
          where: {
            organizationId: orgId,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            scheduledAt: { gte: now, lte: weekAhead },
          },
        }),
        this.prisma.crmDeal.count({
          where: {
            organizationId: orgId,
            status: { in: ['OPEN', 'NEGOTIATION'] },
          },
        }),
      ]);
      summary.openLeadCount = openLeads;
      summary.overdueFollowUpCount = overdueFollowUps;
      summary.upcomingSiteVisitCount = upcomingVisits;
      summary.openDealCount = openDeals;
      labels.push(`Open leads: ${openLeads}`);
      if (overdueFollowUps > 0) labels.push(`Overdue follow-ups: ${overdueFollowUps}`);
    }

    const focusedProperty = await this.resolveFocusedProperty(actor, normalized.propertyPublicId);
    const focusedProject = await this.resolveFocusedProject(actor, normalized.projectPublicId);
    const focusedRequirement = await this.resolveFocusedRequirement(
      actor,
      normalized.requirementPublicId,
    );

    if (focusedProperty) {
      labels.push(`Property context: ${focusedProperty.publicId}`);
    }
    if (focusedProject) {
      labels.push(`Project context: ${focusedProject.publicId}`);
    }
    if (focusedRequirement) {
      labels.push(`Requirement context: ${focusedRequirement.publicId}`);
    }
    if (normalized.focus && normalized.focus !== 'general') {
      labels.push(`Focus: ${normalized.focus.replaceAll('_', ' ')}`);
    }

    const actions = await this.nextBestActions.recommend(actor, normalized);
    const coverageState =
      labels.length > 1 || focusedProperty || focusedProject || focusedRequirement
        ? 'READY'
        : 'INSUFFICIENT_DATA';

    return {
      roleLabel,
      userPublicId: actor.userPublicId,
      activeOrganizationPublicId,
      labels: labels.slice(0, 24),
      hints: normalized,
      summary,
      focusedProperty,
      focusedProject,
      focusedRequirement,
      nextBestActions: actions.slice(0, MAX_ACTIONS),
      coverageState,
      disclaimer: AI_DISCLAIMER,
    };
  }

  async listAuthorizedSavedProperties(actor: AuthActor, limit = MAX_SAVED) {
    if (!actorHasPermission(actor, 'saved-property:read')) {
      return { coverageState: 'UNAVAILABLE' as const, items: [] };
    }
    const rows = await this.prisma.savedProperty.findMany({
      where: { userId: actor.userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, MAX_SAVED),
      include: {
        property: {
          select: {
            publicId: true,
            title: true,
            city: true,
            locality: true,
            priceMinor: true,
            currency: true,
            configuration: true,
            bedrooms: true,
            propertyType: true,
            publicationStatus: true,
            deletedAt: true,
          },
        },
      },
    });
    return {
      coverageState: 'READY' as const,
      items: rows
        .filter(
          (row) =>
            row.property.deletedAt === null && row.property.publicationStatus === 'PUBLISHED',
        )
        .map((row) => ({
          savedPublicId: row.publicId,
          propertyPublicId: row.property.publicId,
          title: row.property.title,
          city: row.property.city,
          locality: row.property.locality,
          priceMinor: row.property.priceMinor.toString(),
          currency: row.property.currency,
          configuration: row.property.configuration,
          bedrooms: row.property.bedrooms,
          propertyType: row.property.propertyType,
        })),
    };
  }

  async listAuthorizedSavedSearches(actor: AuthActor, limit = MAX_SAVED) {
    if (!actorHasPermission(actor, 'saved-search:read')) {
      return { coverageState: 'UNAVAILABLE' as const, items: [] };
    }
    const rows = await this.prisma.savedSearch.findMany({
      where: { userId: actor.userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, MAX_SAVED),
      include: { _count: { select: { matches: true } } },
    });
    return {
      coverageState: 'READY' as const,
      items: rows.map((row) => ({
        publicId: row.publicId,
        name: row.name,
        criteria: row.criteria,
        alertFrequency: row.alertFrequency,
        matchCount: row._count.matches,
      })),
    };
  }

  async listAuthorizedRequirements(actor: AuthActor, limit = MAX_SAVED) {
    if (!actorHasPermission(actor, 'requirement:read:own')) {
      return { coverageState: 'UNAVAILABLE' as const, items: [] };
    }
    const rows = await this.prisma.requirement.findMany({
      where: {
        ownerUserId: actor.userId,
        status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, MAX_SAVED),
      select: {
        publicId: true,
        notes: true,
        status: true,
        city: true,
        locality: true,
        propertyType: true,
        configuration: true,
        bedrooms: true,
        budgetMinMinor: true,
        budgetMaxMinor: true,
        transactionType: true,
      },
    });
    return {
      coverageState: rows.length > 0 ? ('READY' as const) : ('INSUFFICIENT_DATA' as const),
      items: rows.map((row) => ({
        publicId: row.publicId,
        title: row.notes?.slice(0, 80) ?? `${row.configuration ?? row.propertyType} in ${row.city}`,
        status: row.status,
        city: row.city,
        locality: row.locality,
        propertyType: row.propertyType,
        configuration: row.configuration,
        bedrooms: row.bedrooms,
        budgetMinMinor: row.budgetMinMinor?.toString() ?? null,
        budgetMaxMinor: row.budgetMaxMinor?.toString() ?? null,
        transactionType: row.transactionType,
      })),
    };
  }

  normalizeHints(
    hints: AiAssembledContextQuery | AiConversationContextHints | null | undefined,
  ): AiConversationContextHints {
    if (!hints) return { focus: 'general' };
    return {
      route: hints.route ?? null,
      propertyPublicId: hints.propertyPublicId ?? null,
      projectPublicId: hints.projectPublicId ?? null,
      requirementPublicId: hints.requirementPublicId ?? null,
      organizationPublicId: hints.organizationPublicId ?? null,
      focus: hints.focus ?? 'general',
    };
  }

  private resolveRoleLabel(actor: AuthActor): string {
    if (actor.platformRoles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
    if (actor.platformRoles.includes('ADMIN')) return 'ADMIN';
    if (actor.platformRoles.includes('PROPERTY_ADMIN')) return 'PROPERTY_ADMIN';
    if (actor.organizationRole === 'DEVELOPER' || actor.organizationRole === 'DEVELOPER_STAFF') {
      return actor.organizationRole;
    }
    if (actor.organizationRole === 'AGENT' || actor.organizationRole === 'AGENT_STAFF') {
      return actor.organizationRole;
    }
    if (actor.personas.includes('INVESTOR')) return 'INVESTOR';
    if (actor.personas.includes('PROPERTY_SEEKER')) return 'PROPERTY_SEEKER';
    return 'USER';
  }

  private async resolveFocusedProperty(actor: AuthActor, publicId: string | null | undefined) {
    if (!publicId) return null;
    const property = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null },
      select: {
        id: true,
        publicId: true,
        title: true,
        publicationStatus: true,
        organizationId: true,
      },
    });
    if (!property) return null;

    if (property.publicationStatus === 'PUBLISHED') {
      return {
        publicId: property.publicId,
        title: property.title,
        coverageState: 'READY' as const,
      };
    }

    // Unpublished: only org members / property admins with assignment / platform admins.
    if (
      actor.platformRoles.includes('ADMIN') ||
      actor.platformRoles.includes('SUPER_ADMIN') ||
      (actor.activeOrganizationId && actor.activeOrganizationId === property.organizationId)
    ) {
      return {
        publicId: property.publicId,
        title: property.title,
        coverageState: 'READY' as const,
      };
    }

    if (actor.platformRoles.includes('PROPERTY_ADMIN')) {
      const assignment = await this.prisma.resourceAssignment.findFirst({
        where: {
          userId: actor.userId,
          resourceType: 'PROPERTY',
          resourceId: property.id,
        },
      });
      if (assignment) {
        return {
          publicId: property.publicId,
          title: property.title,
          coverageState: 'READY' as const,
        };
      }
    }

    return null;
  }

  private async resolveFocusedProject(actor: AuthActor, publicId: string | null | undefined) {
    if (!publicId) return null;
    const project = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null },
      select: {
        id: true,
        publicId: true,
        name: true,
        lifecycleStatus: true,
        organizationId: true,
      },
    });
    if (!project) return null;

    if (project.lifecycleStatus === 'PUBLISHED') {
      return {
        publicId: project.publicId,
        name: project.name,
        coverageState: 'READY' as const,
      };
    }

    if (
      actor.platformRoles.includes('ADMIN') ||
      actor.platformRoles.includes('SUPER_ADMIN') ||
      (actor.activeOrganizationId && actor.activeOrganizationId === project.organizationId)
    ) {
      return {
        publicId: project.publicId,
        name: project.name,
        coverageState: 'READY' as const,
      };
    }

    if (actor.platformRoles.includes('PROPERTY_ADMIN')) {
      const assignment = await this.prisma.resourceAssignment.findFirst({
        where: {
          userId: actor.userId,
          resourceType: 'PROJECT',
          resourceId: project.id,
        },
      });
      if (assignment) {
        return {
          publicId: project.publicId,
          name: project.name,
          coverageState: 'READY' as const,
        };
      }
    }

    return null;
  }

  private async resolveFocusedRequirement(actor: AuthActor, publicId: string | null | undefined) {
    if (!publicId) return null;
    if (!actorHasPermission(actor, 'requirement:read:own')) return null;
    const requirement = await this.prisma.requirement.findFirst({
      where: { publicId, ownerUserId: actor.userId },
      select: {
        publicId: true,
        notes: true,
        city: true,
        propertyType: true,
        configuration: true,
      },
    });
    if (!requirement) return null;
    return {
      publicId: requirement.publicId,
      title:
        requirement.notes?.slice(0, 80) ??
        `${requirement.configuration ?? requirement.propertyType} in ${requirement.city}`,
      coverageState: 'READY' as const,
    };
  }
}

export type { AiNextBestAction };
