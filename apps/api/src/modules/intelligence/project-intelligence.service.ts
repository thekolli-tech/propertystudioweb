import { Injectable } from '@nestjs/common';
import { type ProjectIntelligenceDetail } from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { TrustScoreService } from '../reviews/trust-score.service';
import { IntelligenceAccessService } from './intelligence-access.service';
import { bigintToString, INTELLIGENCE_DISCLAIMER } from './intelligence.util';
import { InfrastructureService } from './infrastructure.service';
import { MarketIntelligenceService } from './market-intelligence.service';

@Injectable()
export class ProjectIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IntelligenceAccessService,
    private readonly market: MarketIntelligenceService,
    private readonly infrastructure: InfrastructureService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async getProject(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ProjectIntelligenceDetail> {
    const project = await this.prisma.project.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, publicId, 'project', request);
    }
    await this.access.requireProjectIntelligenceAccess(actor, project, request);

    const [market, infrastructure, trust] = await Promise.all([
      this.market.lookupForLocation({
        city: project.city,
        locality: project.locality,
        microMarket: project.microMarket,
        projectId: project.id,
      }),
      this.infrastructure.listNearby({
        city: project.city,
        locality: project.locality,
      }),
      this.safeTrustScore(publicId),
    ]);

    const marketCoverage = market ? market.coverageState : 'INSUFFICIENT_DATA';
    const infraCoverage =
      infrastructure.length > 0 ? ('READY' as const) : ('UNAVAILABLE' as const);
    const coverageState =
      marketCoverage === 'READY' || infraCoverage === 'READY' || trust?.state === 'READY'
        ? ('READY' as const)
        : ('INSUFFICIENT_DATA' as const);

    return {
      publicId: project.publicId,
      organizationPublicId: project.organization.publicId,
      name: project.name,
      projectType: project.projectType,
      lifecycleStatus: project.lifecycleStatus,
      city: project.city,
      locality: project.locality,
      microMarket: project.microMarket,
      startingPriceMinor: bigintToString(project.startingPriceMinor),
      currency: project.currency,
      trustStatus: project.trustStatus,
      trustScore: trust,
      market,
      marketCoverageState: marketCoverage,
      infrastructure,
      infrastructureCoverageState: infraCoverage,
      coverageState,
      disclaimer: INTELLIGENCE_DISCLAIMER,
    };
  }

  private async safeTrustScore(publicId: string) {
    try {
      return await this.trustScore.compute('PROJECT', publicId);
    } catch {
      return null;
    }
  }
}
