import { Injectable } from '@nestjs/common';
import {
  type ProjectInventoryListQuery,
  type ProjectWorkspaceResponse,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { CatalogAccessService } from '../catalog/catalog-access.service';
import {
  bigintToString,
  decodeCursor,
  encodeCursor,
  toDateOnly,
  toIso,
} from '../catalog/catalog.util';

const OPEN_DEAL_STATUSES = ['OPEN', 'NEGOTIATION', 'BOOKED'] as const;
const OPEN_SITE_VISIT_STATUSES = ['SCHEDULED', 'CONFIRMED'] as const;
const OPEN_CLAIM_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] as const;

@Injectable()
export class ProjectWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CatalogAccessService,
  ) {}

  async getWorkspace(
    actor: AuthActor,
    orgPublicId: string,
    projectPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ProjectWorkspaceResponse> {
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      orgPublicId,
      'project:read',
      request,
    );

    const project = await this.prisma.project.findFirst({
      where: {
        publicId: projectPublicId,
        organizationId: organization.id,
        deletedAt: null,
      },
    });
    if (!project) {
      return await this.access.deny(actor, projectPublicId, request);
    }

    const [
      inventoryGroups,
      latestUpdates,
      communities,
      mediaCount,
      documentCount,
      leadCount,
      openDealCount,
      openSiteVisitCount,
      claim,
    ] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['availabilityStatus'],
        where: { projectId: project.id, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.constructionUpdate.findMany({
        where: { projectId: project.id },
        include: { organization: true, project: true },
        orderBy: [{ updateDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      this.prisma.community.findMany({
        where: { projectId: project.id, deletedAt: null },
        orderBy: { name: 'asc' },
        take: 50,
        select: {
          publicId: true,
          name: true,
          visibility: true,
          status: true,
        },
      }),
      this.prisma.mediaAsset.count({
        where: {
          entityType: 'PROJECT',
          entityId: project.id,
          deletedAt: null,
        },
      }),
      this.prisma.documentAsset.count({
        where: {
          entityType: 'PROJECT',
          entityId: project.id,
          deletedAt: null,
        },
      }),
      this.prisma.lead.count({
        where: { matchedProjectId: project.id },
      }),
      this.prisma.crmDeal.count({
        where: {
          projectId: project.id,
          organizationId: organization.id,
          status: { in: [...OPEN_DEAL_STATUSES] },
        },
      }),
      this.prisma.crmSiteVisit.count({
        where: {
          projectId: project.id,
          organizationId: organization.id,
          status: { in: [...OPEN_SITE_VISIT_STATUSES] },
        },
      }),
      this.prisma.projectClaim.findFirst({
        where: {
          projectId: project.id,
          claimingOrganizationId: organization.id,
          status: { in: [...OPEN_CLAIM_STATUSES, 'APPROVED', 'REJECTED'] },
        },
        include: {
          project: true,
          claimingOrganization: true,
          verificationCase: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      project: {
        publicId: project.publicId,
        organizationPublicId: organization.publicId,
        name: project.name,
        slug: project.slug,
        projectType: project.projectType,
        lifecycleStatus: project.lifecycleStatus,
        city: project.city,
        locality: project.locality,
        microMarket: project.microMarket,
        startingPriceMinor: bigintToString(project.startingPriceMinor),
        currency: project.currency,
        publishedAt: toIso(project.publishedAt),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        constructionPhase: project.constructionPhase,
        constructionPercent: project.constructionPercent,
        totalUnits: project.totalUnits,
        trustStatus: project.trustStatus,
      },
      inventoryByAvailability: inventoryGroups.map((row) => ({
        availabilityStatus: row.availabilityStatus,
        count: row._count._all,
      })),
      latestConstructionUpdates: latestUpdates.map((row) => ({
        publicId: row.publicId,
        projectPublicId: row.project.publicId,
        organizationPublicId: row.organization.publicId,
        title: row.title,
        description: row.description,
        milestone: row.milestone,
        percentComplete: row.percentComplete,
        updateDate: toDateOnly(row.updateDate)!,
        publicationStatus: row.publicationStatus,
        mediaPublicIds: row.mediaPublicIds,
        publishedAt: toIso(row.publishedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        version: row.version,
      })),
      communities,
      mediaCount,
      documentCount,
      leadCount,
      openDealCount,
      openSiteVisitCount,
      claim: claim
        ? {
            publicId: claim.publicId,
            projectPublicId: claim.project.publicId,
            claimingOrganizationPublicId: claim.claimingOrganization.publicId,
            status: claim.status,
            justification: claim.justification,
            authorizationNotes: claim.authorizationNotes,
            verificationCasePublicId: claim.verificationCase?.publicId ?? null,
            reviewNotes: claim.reviewNotes,
            submittedAt: toIso(claim.submittedAt),
            reviewedAt: toIso(claim.reviewedAt),
            approvedAt: toIso(claim.approvedAt),
            entitlementCheckedAt: toIso(claim.entitlementCheckedAt),
            createdAt: claim.createdAt.toISOString(),
            updatedAt: claim.updatedAt.toISOString(),
            version: claim.version,
          }
        : null,
    };
  }

  async listInventory(
    actor: AuthActor,
    orgPublicId: string,
    projectPublicId: string,
    query: ProjectInventoryListQuery,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      orgPublicId,
      'property:read',
      request,
    );

    const project = await this.prisma.project.findFirst({
      where: {
        publicId: projectPublicId,
        organizationId: organization.id,
        deletedAt: null,
      },
    });
    if (!project) {
      return await this.access.deny(actor, projectPublicId, request);
    }

    const where: Record<string, unknown> = {
      projectId: project.id,
      organizationId: organization.id,
      deletedAt: null,
    };
    if (query.availabilityStatus) where.availabilityStatus = query.availabilityStatus;
    if (query.publicationStatus) where.publicationStatus = query.publicationStatus;
    if (query.cursor) {
      try {
        const cursor = decodeCursor(query.cursor);
        where.OR = [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ];
      } catch {
        throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
      }
    }

    const rows = await this.prisma.property.findMany({
      where,
      include: { organization: true, project: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      properties: page.map((row) => ({
        publicId: row.publicId,
        organizationPublicId: row.organization.publicId,
        projectPublicId: row.project?.publicId ?? null,
        title: row.title,
        propertyType: row.propertyType,
        listingType: row.listingType,
        configuration: row.configuration,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        priceMinor: row.priceMinor.toString(),
        currency: row.currency,
        availabilityStatus: row.availabilityStatus,
        publicationStatus: row.publicationStatus,
        city: row.city,
        locality: row.locality,
        publishedAt: toIso(row.publishedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      nextCursor: next,
    };
  }
}
