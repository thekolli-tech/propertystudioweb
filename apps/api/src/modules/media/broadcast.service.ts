import { Injectable } from '@nestjs/common';
import {
  type BroadcastPresentationSection,
  type BroadcastProjectPresentation,
  type BroadcastPropertyPresentation,
  type BroadcastStudioConfig,
  type UpdateBroadcastStudioConfigRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ProjectIntelligenceService } from '../intelligence/project-intelligence.service';
import { PropertyIntelligenceService } from '../intelligence/property-intelligence.service';
import { MediaAccessService } from './media-access.service';

@Injectable()
export class BroadcastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: MediaAccessService,
    private readonly propertyIntelligence: PropertyIntelligenceService,
    private readonly projectIntelligence: ProjectIntelligenceService,
  ) {}

  async getConfig(
    actor: AuthActor,
    request?: AuthenticatedRequest,
  ): Promise<BroadcastStudioConfig> {
    await this.access.requirePermission(actor, 'admin:broadcast:read', 'broadcast', request);

    const organizationId = actor.activeOrganizationId;
    let config = await this.prisma.broadcastStudioConfig.findFirst({
      where: organizationId ? { organizationId } : { organizationId: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!config) {
      config = await this.prisma.broadcastStudioConfig.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextBroadcastConfigPublicId(),
          organizationId,
          createdBy: actor.userId,
        },
      });
    }

    return {
      publicId: config.publicId,
      name: config.name,
      defaultHomeRoute: config.defaultHomeRoute,
      touchTargetMinPx: config.touchTargetMinPx,
      enabledSections: config.enabledSections,
    };
  }

  async updateConfig(
    actor: AuthActor,
    body: UpdateBroadcastStudioConfigRequest,
    request?: AuthenticatedRequest,
  ): Promise<BroadcastStudioConfig> {
    await this.access.requirePermission(actor, 'admin:broadcast:manage', 'broadcast', request);

    const organizationId = actor.activeOrganizationId;
    let config = await this.prisma.broadcastStudioConfig.findFirst({
      where: organizationId ? { organizationId } : { organizationId: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!config) {
      config = await this.prisma.broadcastStudioConfig.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextBroadcastConfigPublicId(),
          organizationId,
          name: body.name ?? 'Property Studio Broadcast',
          defaultHomeRoute: body.defaultHomeRoute ?? '/studio',
          touchTargetMinPx: body.touchTargetMinPx ?? 56,
          enabledSections: body.enabledSections ?? [],
          createdBy: actor.userId,
        },
      });
    } else {
      config = await this.prisma.broadcastStudioConfig.update({
        where: { id: config.id },
        data: {
          name: body.name,
          defaultHomeRoute: body.defaultHomeRoute,
          touchTargetMinPx: body.touchTargetMinPx,
          enabledSections: body.enabledSections,
        },
      });
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: config.organizationId,
      action: 'broadcast.config.updated',
      resourceType: 'broadcast_config',
      resourceId: config.publicId,
      requestId: request?.requestId,
    });

    return {
      publicId: config.publicId,
      name: config.name,
      defaultHomeRoute: config.defaultHomeRoute,
      touchTargetMinPx: config.touchTargetMinPx,
      enabledSections: config.enabledSections,
    };
  }

  /**
   * Aggregates real property + intelligence APIs. Never fabricates charts —
   * unavailable sections report available=false with a reason.
   */
  async presentationForProperty(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<BroadcastPropertyPresentation> {
    const property = await this.propertyIntelligence.getProperty(actor, publicId, request);

    const propertyRow = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null },
      select: { id: true },
    });
    if (!propertyRow) {
      return await this.access.deny(actor, publicId, request, 'property');
    }

    const mediaRows = await this.prisma.mediaAsset.findMany({
      where: {
        entityType: 'PROPERTY',
        entityId: propertyRow.id,
        deletedAt: null,
        lifecycleStatus: 'PUBLISHED',
        moderationStatus: 'APPROVED',
      },
      orderBy: [{ sortOrder: 'asc' }, { publicId: 'asc' }],
      take: 50,
      select: {
        publicId: true,
        title: true,
        mediaType: true,
        visibility: true,
      },
    });

    const sections: BroadcastPresentationSection[] = [
      {
        id: 'overview',
        title: 'Overview',
        available: true,
        unavailableReason: null,
        data: {
          publicId: property.publicId,
          title: property.title,
          priceMinor: property.priceMinor,
          currency: property.currency,
          city: property.city,
          locality: property.locality,
          configuration: property.configuration,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          coverageState: property.coverageState,
        },
      },
      {
        id: 'market',
        title: 'Market',
        available: Boolean(property.market),
        unavailableReason: property.market ? null : 'No market snapshot for this locality.',
        data: property.market
          ? ({
              coverageState: property.marketCoverageState,
              snapshot: property.market,
            } as Record<string, unknown>)
          : null,
      },
      {
        id: 'infrastructure',
        title: 'Infrastructure',
        available: property.infrastructure.length > 0,
        unavailableReason:
          property.infrastructure.length > 0 ? null : 'No infrastructure assets nearby.',
        data:
          property.infrastructure.length > 0
            ? ({
                coverageState: property.infrastructureCoverageState,
                assets: property.infrastructure,
              } as Record<string, unknown>)
            : null,
      },
      {
        id: 'trust',
        title: 'Trust',
        available: Boolean(property.trustScore),
        unavailableReason: property.trustScore ? null : 'Trust score unavailable.',
        data: property.trustScore
          ? ({ trustScore: property.trustScore, trustStatus: property.trustStatus } as Record<
              string,
              unknown
            >)
          : null,
      },
      {
        id: 'media',
        title: 'Media',
        available: mediaRows.length > 0,
        unavailableReason: mediaRows.length > 0 ? null : 'No published media for this property.',
        data: mediaRows.length > 0 ? ({ media: mediaRows } as Record<string, unknown>) : null,
      },
    ];

    return {
      propertyPublicId: property.publicId,
      title: property.title,
      sections,
    };
  }

  async presentationForProject(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<BroadcastProjectPresentation> {
    const project = await this.projectIntelligence.getProject(actor, publicId, request);

    const projectRow = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null },
      select: { id: true },
    });
    if (!projectRow) {
      return await this.access.deny(actor, publicId, request, 'project');
    }

    const mediaRows = await this.prisma.mediaAsset.findMany({
      where: {
        entityType: 'PROJECT',
        entityId: projectRow.id,
        deletedAt: null,
        lifecycleStatus: 'PUBLISHED',
        moderationStatus: 'APPROVED',
      },
      orderBy: [{ sortOrder: 'asc' }, { publicId: 'asc' }],
      take: 50,
      select: {
        publicId: true,
        title: true,
        mediaType: true,
        visibility: true,
      },
    });

    const sections: BroadcastPresentationSection[] = [
      {
        id: 'overview',
        title: 'Overview',
        available: true,
        unavailableReason: null,
        data: {
          publicId: project.publicId,
          name: project.name,
          city: project.city,
          locality: project.locality,
          microMarket: project.microMarket,
          startingPriceMinor: project.startingPriceMinor,
          currency: project.currency,
          coverageState: project.coverageState,
        },
      },
      {
        id: 'market',
        title: 'Market',
        available: Boolean(project.market),
        unavailableReason: project.market ? null : 'No market snapshot for this locality.',
        data: project.market
          ? ({
              coverageState: project.marketCoverageState,
              snapshot: project.market,
            } as Record<string, unknown>)
          : null,
      },
      {
        id: 'infrastructure',
        title: 'Infrastructure',
        available: project.infrastructure.length > 0,
        unavailableReason:
          project.infrastructure.length > 0 ? null : 'No infrastructure assets nearby.',
        data:
          project.infrastructure.length > 0
            ? ({
                coverageState: project.infrastructureCoverageState,
                assets: project.infrastructure,
              } as Record<string, unknown>)
            : null,
      },
      {
        id: 'trust',
        title: 'Trust',
        available: Boolean(project.trustScore),
        unavailableReason: project.trustScore ? null : 'Trust score unavailable.',
        data: project.trustScore
          ? ({ trustScore: project.trustScore } as Record<string, unknown>)
          : null,
      },
      {
        id: 'media',
        title: 'Media',
        available: mediaRows.length > 0,
        unavailableReason: mediaRows.length > 0 ? null : 'No published media for this project.',
        data: mediaRows.length > 0 ? ({ media: mediaRows } as Record<string, unknown>) : null,
      },
    ];

    return {
      projectPublicId: project.publicId,
      name: project.name,
      sections,
    };
  }
}
