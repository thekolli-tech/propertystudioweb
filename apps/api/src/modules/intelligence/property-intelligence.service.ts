import { Injectable } from '@nestjs/common';
import { type PropertyIntelligenceDetail } from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { TrustScoreService } from '../reviews/trust-score.service';
import { IntelligenceAccessService } from './intelligence-access.service';
import { decimalToNumber, INTELLIGENCE_DISCLAIMER, pricePerSqftMinor } from './intelligence.util';
import { InfrastructureService } from './infrastructure.service';
import { MarketIntelligenceService } from './market-intelligence.service';

@Injectable()
export class PropertyIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IntelligenceAccessService,
    private readonly market: MarketIntelligenceService,
    private readonly infrastructure: InfrastructureService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async getProperty(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<PropertyIntelligenceDetail> {
    const property = await this.prisma.property.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true, project: true },
    });
    if (!property) {
      return await this.access.deny(actor, publicId, 'property', request);
    }
    await this.access.requirePropertyIntelligenceAccess(actor, property, request);

    const carpet = decimalToNumber(property.carpetAreaSqft);
    const builtUp = decimalToNumber(property.builtUpAreaSqft);
    const area = carpet ?? builtUp;
    const pricePerSqft = pricePerSqftMinor(property.priceMinor, area);

    const [market, infrastructure, trust] = await Promise.all([
      this.market.lookupForLocation({
        city: property.city,
        locality: property.locality,
        propertyId: property.id,
        projectId: property.projectId,
      }),
      this.infrastructure.listNearby({
        city: property.city,
        locality: property.locality,
      }),
      this.safeTrustScore(publicId),
    ]);

    const marketCoverage = market ? market.coverageState : 'INSUFFICIENT_DATA';
    const infraCoverage = infrastructure.length > 0 ? ('READY' as const) : ('UNAVAILABLE' as const);
    const coverageState =
      marketCoverage === 'READY' || infraCoverage === 'READY' || trust?.state === 'READY'
        ? ('READY' as const)
        : ('INSUFFICIENT_DATA' as const);

    return {
      publicId: property.publicId,
      organizationPublicId: property.organization.publicId,
      projectPublicId: property.project?.publicId ?? null,
      title: property.title,
      propertyType: property.propertyType,
      listingType: property.listingType,
      configuration: property.configuration,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      priceMinor: property.priceMinor.toString(),
      pricePerSqftMinor: pricePerSqft,
      currency: property.currency,
      availabilityStatus: property.availabilityStatus,
      publicationStatus: property.publicationStatus,
      city: property.city,
      locality: property.locality,
      carpetAreaSqft: carpet,
      builtUpAreaSqft: builtUp,
      trustStatus: property.trustStatus,
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
      return await this.trustScore.compute('PROPERTY', publicId);
    } catch {
      return null;
    }
  }
}
