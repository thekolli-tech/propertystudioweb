import { Injectable } from '@nestjs/common';
import {
  type CreateMarketplaceLeadRequest,
  type LeadListQuery,
  type LeadStatus,
  type MatchResult,
  type UpdateLeadStatusRequest,
} from '@property-studio/contracts';
import { Prisma } from '../../generated/prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { LeadTransitionService } from '../crm/lead-transition.service';
import { LeadAccessService } from './lead-access.service';
import { LeadEligibilityService } from './lead-eligibility.service';
import { decodeCursor, encodeCursor, toPublicRequirementSummary } from './marketplace.util';
import { RequirementMatchingService } from './requirement-matching.service';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly eligibility: LeadEligibilityService,
    private readonly matching: RequirementMatchingService,
    private readonly leadAccess: LeadAccessService,
    private readonly transitions: LeadTransitionService,
  ) {}

  /**
   * Server-side marketplace lead creation. Idempotent on (requirement, recipient org).
   * Never exposes buyer PII — recipients receive anonymized requirement projection only.
   */
  async createMarketplaceLead(
    actor: AuthActor,
    body: CreateMarketplaceLeadRequest,
    request?: AuthenticatedRequest,
  ) {
    const { organization, eligibility } = await this.eligibility.requireEligibleOrganization(
      actor,
      body.organizationPublicId,
      'lead:assign',
      request,
    );

    if (!eligibility.eligible && !actorHasPermission(actor, 'platform:admin')) {
      throw new AppError('FORBIDDEN', eligibility.reason ?? 'Organization is not eligible.');
    }

    const requirement = await this.prisma.requirement.findFirst({
      where: { publicId: body.requirementPublicId },
    });
    if (!requirement) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    if (requirement.status !== 'ACTIVE' || requirement.visibility !== 'MARKETPLACE') {
      throw new AppError('CONFLICT', 'Only active marketplace requirements can generate leads.');
    }

    let matchedProperty: {
      id: string;
      publicId: string;
      propertyType: string;
      listingType: 'SALE' | 'RENT';
      configuration: string | null;
      bedrooms: number | null;
      priceMinor: bigint;
      city: string | null;
      locality: string | null;
      amenities: string[];
    } | null = null;
    let matchedProject: { id: string; publicId: string } | null = null;

    if (body.matchedPropertyPublicId) {
      const property = await this.prisma.property.findFirst({
        where: {
          publicId: body.matchedPropertyPublicId,
          organizationId: organization.id,
          deletedAt: null,
        },
      });
      if (!property) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      matchedProperty = {
        id: property.id,
        publicId: property.publicId,
        propertyType: property.propertyType,
        listingType: property.listingType,
        configuration: property.configuration,
        bedrooms: property.bedrooms,
        priceMinor: property.priceMinor,
        city: property.city,
        locality: property.locality,
        amenities: [],
      };
    }

    if (body.matchedProjectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: {
          publicId: body.matchedProjectPublicId,
          organizationId: organization.id,
          deletedAt: null,
        },
      });
      if (!project) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      matchedProject = { id: project.id, publicId: project.publicId };
    }

    const match = this.computeMatch(requirement, matchedProperty, organization);

    const existing = await this.prisma.lead.findUnique({
      where: {
        requirementId_recipientOrganizationId: {
          requirementId: requirement.id,
          recipientOrganizationId: organization.id,
        },
      },
      include: this.leadInclude(),
    });

    if (existing) {
      return this.toLeadSummary(existing);
    }

    const id = newUuid();
    const publicId = await this.publicIds.nextLeadPublicId();

    try {
      const lead = await this.prisma.lead.create({
        data: {
          id,
          publicId,
          requirementId: requirement.id,
          recipientOrganizationId: organization.id,
          recipientUserId: actor.userId,
          matchedPropertyId: matchedProperty?.id ?? null,
          matchedProjectId: matchedProject?.id ?? null,
          matchScore: match.score,
          matchedCriteria: match.matched as unknown as Prisma.InputJsonValue,
          unmatchedCriteria: match.unmatched as unknown as Prisma.InputJsonValue,
          matchExplanation: match.explanation,
          source: 'REQUIREMENT_MARKETPLACE',
          status: 'ASSIGNED',
          priority: match.score >= 80 ? 'HIGH' : 'NORMAL',
          assignedAt: new Date(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        include: this.leadInclude(),
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: organization.id,
        action: 'lead.created',
        resourceType: 'lead',
        resourceId: publicId,
        requestId: request?.requestId,
        after: {
          requirementPublicId: requirement.publicId,
          matchScore: match.score,
          status: lead.status,
        },
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: organization.id,
        action: 'lead.assigned',
        resourceType: 'lead',
        resourceId: publicId,
        requestId: request?.requestId,
        after: { recipientOrganizationPublicId: organization.publicId },
      });

      return this.toLeadSummary(lead);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.lead.findUnique({
          where: {
            requirementId_recipientOrganizationId: {
              requirementId: requirement.id,
              recipientOrganizationId: organization.id,
            },
          },
          include: this.leadInclude(),
        });
        if (duplicate) {
          return this.toLeadSummary(duplicate);
        }
      }
      throw error;
    }
  }

  async listForOrganization(
    actor: AuthActor,
    query: LeadListQuery,
    request?: AuthenticatedRequest,
  ) {
    if (!query.organizationPublicId) {
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }

    const { organization } = await this.eligibility.requireEligibleOrganization(
      actor,
      query.organizationPublicId,
      'lead:read',
      request,
    );

    const where: Record<string, unknown> = {
      recipientOrganizationId: organization.id,
    };
    if (query.status) where.status = query.status;
    if (query.requirementPublicId) {
      const requirement = await this.prisma.requirement.findFirst({
        where: { publicId: query.requirementPublicId },
      });
      if (!requirement) {
        return { leads: [], nextCursor: null };
      }
      where.requirementId = requirement.id;
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.lead.findMany({
      where,
      include: this.leadInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      leads: page.map((row) => this.toLeadSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async listAdmin(actor: AuthActor, query: LeadListQuery, _request?: AuthenticatedRequest) {
    if (
      !actorHasPermission(actor, 'admin:leads:read') &&
      !actorHasPermission(actor, 'platform:admin')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.organizationPublicId) {
      const organization = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!organization) {
        return { leads: [], nextCursor: null };
      }
      where.recipientOrganizationId = organization.id;
    }
    if (query.requirementPublicId) {
      const requirement = await this.prisma.requirement.findFirst({
        where: { publicId: query.requirementPublicId },
      });
      if (!requirement) {
        return { leads: [], nextCursor: null };
      }
      where.requirementId = requirement.id;
    }
    this.applyCursor(where, query.cursor);

    const rows = await this.prisma.lead.findMany({
      where,
      include: this.leadInclude(),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    return {
      leads: page.map((row) => this.toLeadSummary(row)),
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getOne(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const lead = await this.prisma.lead.findFirst({
      where: { publicId },
      include: this.leadInclude(),
    });
    if (!lead) {
      return await this.deny(actor, publicId, request);
    }

    const isAdmin =
      actorHasPermission(actor, 'platform:admin') || actorHasPermission(actor, 'admin:leads:read');

    if (!isAdmin) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: lead.recipientOrganizationId,
          userId: actor.userId,
          status: 'ACTIVE',
        },
      });
      if (!membership || !actorHasPermission(actor, 'lead:read')) {
        return await this.deny(actor, publicId, request);
      }
    }

    if (lead.firstViewedAt === null && !isAdmin) {
      const updated = await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          firstViewedAt: new Date(),
          status: lead.status === 'NEW' || lead.status === 'ASSIGNED' ? 'VIEWED' : lead.status,
          version: { increment: 1 },
          updatedBy: actor.userId,
        },
        include: this.leadInclude(),
      });
      return this.toLeadSummary(updated);
    }

    // Privacy boundary: contact reveal remains closed in Phase 7.
    void this.leadAccess.canRevealBuyerContact({
      leadId: lead.id,
      organizationId: lead.recipientOrganizationId,
      actorUserId: actor.userId,
    });

    return this.toLeadSummary(lead);
  }

  async updateStatus(
    actor: AuthActor,
    publicId: string,
    body: UpdateLeadStatusRequest,
    request?: AuthenticatedRequest,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { publicId },
      include: this.leadInclude(),
    });
    if (!lead) {
      return await this.deny(actor, publicId, request);
    }

    const isAdmin = actorHasPermission(actor, 'platform:admin');
    if (!isAdmin) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId: lead.recipientOrganizationId,
          userId: actor.userId,
          status: 'ACTIVE',
        },
      });
      if (!membership || !actorHasPermission(actor, 'lead:update')) {
        return await this.deny(actor, publicId, request);
      }
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== lead.version) {
      throw new AppError('CONFLICT', 'Lead was modified by another request.');
    }

    this.transitions.assertTransition(lead.status as LeadStatus, body.status);

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: body.status,
        contactedAt: body.status === 'CONTACTED' && !lead.contactedAt ? new Date() : undefined,
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: this.leadInclude(),
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: lead.recipientOrganizationId,
      action: 'lead.status_changed',
      resourceType: 'lead',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { status: lead.status },
      after: { status: updated.status },
    });

    return this.toLeadSummary(updated);
  }

  private computeMatch(
    requirement: {
      propertyType: string;
      transactionType: 'BUY' | 'RENT';
      configuration: string | null;
      bedrooms: number | null;
      budgetMinMinor: bigint | null;
      budgetMaxMinor: bigint | null;
      city: string;
      locality: string | null;
      microMarket: string | null;
      purpose: string;
      timeline: string;
      vaastuRequired: boolean;
      amenities: string[];
    },
    property: {
      propertyType: string;
      listingType: 'SALE' | 'RENT';
      configuration: string | null;
      bedrooms: number | null;
      priceMinor: bigint;
      city: string | null;
      locality: string | null;
      amenities: string[];
    } | null,
    organization: {
      type: string;
      developerProfile?: { operatingZones: string[]; headquartersCity: string | null } | null;
      agencyProfile?: { operatingZones: string[]; headquartersCity: string | null } | null;
    },
  ): MatchResult {
    const zones =
      organization.developerProfile?.operatingZones ??
      organization.agencyProfile?.operatingZones ??
      [];
    const hq =
      organization.developerProfile?.headquartersCity ??
      organization.agencyProfile?.headquartersCity ??
      null;

    const candidateCity = property?.city ?? hq;
    const candidateLocality = property?.locality ?? null;
    const zoneMatch =
      zones.some((zone) => zone.toLowerCase() === requirement.city.toLowerCase()) ||
      (candidateCity !== null && candidateCity.toLowerCase() === requirement.city.toLowerCase());

    return this.matching.score(
      {
        propertyType: requirement.propertyType,
        transactionType: requirement.transactionType,
        configuration: requirement.configuration,
        bedrooms: requirement.bedrooms,
        budgetMinMinor: requirement.budgetMinMinor,
        budgetMaxMinor: requirement.budgetMaxMinor,
        city: requirement.city,
        locality: requirement.locality,
        microMarket: requirement.microMarket,
        purpose: requirement.purpose,
        timeline: requirement.timeline,
        vaastuRequired: requirement.vaastuRequired,
        amenities: requirement.amenities,
      },
      {
        propertyType: property?.propertyType ?? null,
        listingType:
          property?.listingType ?? (requirement.transactionType === 'BUY' ? 'SALE' : 'RENT'),
        configuration: property?.configuration ?? requirement.configuration,
        bedrooms: property?.bedrooms ?? requirement.bedrooms,
        priceMinor: property?.priceMinor ?? requirement.budgetMaxMinor,
        city: zoneMatch ? requirement.city : candidateCity,
        locality: candidateLocality ?? requirement.locality,
        microMarket: requirement.microMarket,
        amenities: property?.amenities?.length ? property.amenities : requirement.amenities,
        vaastuCompliant: requirement.vaastuRequired ? true : null,
        purposeFit: requirement.purpose,
        timelineFit: requirement.timeline,
      },
    );
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

  private toLeadSummary(lead: {
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
    requirement: Parameters<typeof toPublicRequirementSummary>[0];
    recipientOrganization: { publicId: string };
    recipientUser: { publicId: string } | null;
    matchedProperty: { publicId: string } | null;
    matchedProject: { publicId: string } | null;
  }) {
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
      status: lead.status as never,
      priority: lead.priority as never,
      requirement: toPublicRequirementSummary(lead.requirement),
      assignedAt: lead.assignedAt?.toISOString() ?? null,
      firstViewedAt: lead.firstViewedAt?.toISOString() ?? null,
      contactedAt: lead.contactedAt?.toISOString() ?? null,
      version: lead.version,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }

  private applyCursor(where: Record<string, unknown>, cursor?: string) {
    if (!cursor) return;
    try {
      const decoded = decodeCursor(cursor);
      where.OR = [
        { createdAt: { lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { lt: decoded.id } },
      ];
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
    }
  }

  private async deny(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'lead',
      resourceId: publicId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
