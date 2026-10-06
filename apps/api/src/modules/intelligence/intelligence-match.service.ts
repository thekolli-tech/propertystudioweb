import { Injectable } from '@nestjs/common';
import {
  type IntelligenceMatchItem,
  type IntelligenceMatchRequest,
  type IntelligenceMatchResponse,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { IntelligenceAccessService } from './intelligence-access.service';
import { INTELLIGENCE_DISCLAIMER } from './intelligence.util';

type MatchCriteria = {
  propertyType?: string;
  transactionType?: 'BUY' | 'RENT';
  configuration?: string | null;
  bedrooms?: number | null;
  budgetMinMinor?: bigint | null;
  budgetMaxMinor?: bigint | null;
  city?: string;
  locality?: string | null;
  microMarket?: string | null;
  amenities?: string[];
};

const WEIGHTS = {
  location: 30,
  budget: 25,
  propertyType: 15,
  configuration: 12,
  bedrooms: 10,
  amenities: 8,
} as const;

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

/**
 * Recommendation matching for intelligence/AI — separate from Phase 7 lead matching.
 * Scores published inventory against criteria with deterministic weights. No PII.
 */
@Injectable()
export class IntelligenceMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IntelligenceAccessService,
  ) {}

  async match(
    actor: AuthActor,
    body: IntelligenceMatchRequest,
    request?: AuthenticatedRequest,
  ): Promise<IntelligenceMatchResponse> {
    if (!this.access.canMatch(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const criteria = await this.resolveCriteria(actor, body, request);
    if (!criteria.city && !criteria.propertyType && !criteria.bedrooms && !criteria.budgetMaxMinor) {
      return {
        matches: [],
        coverageState: 'INSUFFICIENT_DATA',
        disclaimer: INTELLIGENCE_DISCLAIMER,
      };
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
    };
    if (criteria.city) {
      where.city = { equals: criteria.city, mode: 'insensitive' };
    }
    if (criteria.propertyType) {
      where.propertyType = criteria.propertyType;
    }
    if (criteria.transactionType === 'BUY') {
      where.listingType = 'SALE';
    } else if (criteria.transactionType === 'RENT') {
      where.listingType = 'RENT';
    }

    const candidates = await this.prisma.property.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }],
      take: 100,
    });

    if (candidates.length === 0) {
      return {
        matches: [],
        coverageState: 'INSUFFICIENT_DATA',
        disclaimer: INTELLIGENCE_DISCLAIMER,
      };
    }

    const scored: IntelligenceMatchItem[] = candidates
      .map((candidate) => this.scoreCandidate(criteria, candidate))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, body.limit);

    return {
      matches: scored,
      coverageState: scored.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      disclaimer: INTELLIGENCE_DISCLAIMER,
    };
  }

  private async resolveCriteria(
    actor: AuthActor,
    body: IntelligenceMatchRequest,
    request?: AuthenticatedRequest,
  ): Promise<MatchCriteria> {
    if (body.requirementPublicId) {
      const requirement = await this.prisma.requirement.findFirst({
        where: { publicId: body.requirementPublicId },
      });
      if (!requirement) {
        return await this.access.deny(actor, body.requirementPublicId, 'requirement', request);
      }
      const canReadOwn =
        requirement.ownerUserId === actor.userId &&
        actorHasPermission(actor, 'requirement:read:own');
      const canReadMarketplace =
        requirement.visibility === 'PUBLIC' &&
        requirement.status === 'ACTIVE' &&
        actorHasPermission(actor, 'requirement:read:marketplace');
      const isAdmin =
        actorHasPermission(actor, 'platform:admin') ||
        actorHasPermission(actor, 'admin:requirements:read');
      if (!canReadOwn && !canReadMarketplace && !isAdmin) {
        return await this.access.deny(actor, body.requirementPublicId, 'requirement', request);
      }
      return {
        propertyType: requirement.propertyType,
        transactionType: requirement.transactionType,
        configuration: requirement.configuration,
        bedrooms: requirement.bedrooms,
        budgetMinMinor: requirement.budgetMinMinor,
        budgetMaxMinor: requirement.budgetMaxMinor,
        city: requirement.city,
        locality: requirement.locality,
        microMarket: requirement.microMarket,
        amenities: requirement.amenities,
      };
    }

    if (!body.criteria) {
      throw new AppError('VALIDATION_ERROR', 'Provide criteria or requirementPublicId.');
    }

    return {
      propertyType: body.criteria.propertyType,
      transactionType: body.criteria.transactionType,
      configuration: body.criteria.configuration,
      bedrooms: body.criteria.bedrooms,
      budgetMinMinor: body.criteria.budgetMinMinor ?? null,
      budgetMaxMinor: body.criteria.budgetMaxMinor ?? null,
      city: body.criteria.city,
      locality: body.criteria.locality,
      microMarket: body.criteria.microMarket,
      amenities: body.criteria.amenities ?? [],
    };
  }

  private scoreCandidate(
    criteria: MatchCriteria,
    candidate: {
      publicId: string;
      title: string;
      city: string | null;
      locality: string | null;
      priceMinor: bigint;
      currency: string;
      propertyType: string;
      listingType: string;
      configuration: string | null;
      bedrooms: number | null;
      description: string | null;
    },
  ): IntelligenceMatchItem {
    const reasons: string[] = [];
    const unmatched: string[] = [];
    let score = 0;

    const reqCity = normalize(criteria.city);
    const candCity = normalize(candidate.city);
    const reqLocality = normalize(criteria.locality);
    const candLocality = normalize(candidate.locality);

    if (reqCity && candCity && reqCity === candCity) {
      let points = 20;
      reasons.push(`City match: ${candidate.city}`);
      if (reqLocality && candLocality && reqLocality === candLocality) {
        points = WEIGHTS.location;
        reasons.push(`Locality match: ${candidate.locality}`);
      }
      score += points;
    } else if (reqCity) {
      unmatched.push('location');
    }

    if (criteria.budgetMinMinor != null || criteria.budgetMaxMinor != null) {
      const min = criteria.budgetMinMinor ?? 0n;
      const max = criteria.budgetMaxMinor ?? min * 10n;
      if (candidate.priceMinor >= min && candidate.priceMinor <= max) {
        score += WEIGHTS.budget;
        reasons.push('Price within budget');
      } else {
        unmatched.push('budget');
      }
    }

    if (criteria.propertyType) {
      if (candidate.propertyType === criteria.propertyType) {
        score += WEIGHTS.propertyType;
        reasons.push(`Property type: ${candidate.propertyType}`);
      } else {
        unmatched.push('propertyType');
      }
    }

    if (criteria.configuration) {
      if (candidate.configuration === criteria.configuration) {
        score += WEIGHTS.configuration;
        reasons.push(`Configuration: ${candidate.configuration}`);
      } else {
        unmatched.push('configuration');
      }
    }

    if (criteria.bedrooms != null) {
      if (candidate.bedrooms === criteria.bedrooms) {
        score += WEIGHTS.bedrooms;
        reasons.push(`Bedrooms: ${candidate.bedrooms}`);
      } else {
        unmatched.push('bedrooms');
      }
    }

    if (criteria.amenities && criteria.amenities.length > 0) {
      const haystack = `${candidate.title} ${candidate.description ?? ''}`.toLowerCase();
      const matchedAmenities = criteria.amenities.filter((amenity) =>
        haystack.includes(amenity.toLowerCase()),
      );
      if (matchedAmenities.length > 0) {
        const fraction = matchedAmenities.length / criteria.amenities.length;
        const points = Math.round(WEIGHTS.amenities * fraction);
        score += points;
        reasons.push(`Amenities mentioned: ${matchedAmenities.join(', ')}`);
      } else {
        unmatched.push('amenities');
      }
    }

    return {
      propertyPublicId: candidate.publicId,
      title: candidate.title,
      city: candidate.city,
      locality: candidate.locality,
      priceMinor: candidate.priceMinor.toString(),
      currency: candidate.currency,
      score: Math.min(100, score),
      reasons,
      unmatched,
    };
  }
}
