import { Injectable } from '@nestjs/common';
import { type MatchResult } from '@property-studio/contracts';

export type MatchingRequirementInput = {
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
};

export type MatchingCandidateInput = {
  propertyType: string | null;
  listingType: 'SALE' | 'RENT' | null;
  configuration: string | null;
  bedrooms: number | null;
  priceMinor: bigint | null;
  city: string | null;
  locality: string | null;
  microMarket: string | null;
  amenities: string[];
  vaastuCompliant?: boolean | null;
  purposeFit?: string | null;
  timelineFit?: string | null;
};

const WEIGHTS = {
  location: 30,
  budget: 25,
  propertyType: 15,
  configuration: 10,
  bedrooms: 5,
  timeline: 5,
  amenities: 5,
  purpose: 5,
} as const;

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function listingMatchesTransaction(
  transactionType: 'BUY' | 'RENT',
  listingType: 'SALE' | 'RENT' | null,
): boolean {
  if (!listingType) return false;
  if (transactionType === 'BUY') return listingType === 'SALE';
  return listingType === 'RENT';
}

/**
 * Deterministic requirement ↔ inventory matching.
 *
 * Score totals 100:
 * - Location (city / locality / micro-market): 30
 * - Budget overlap: 25
 * - Property type: 15
 * - Configuration: 10
 * - Bedrooms: 5
 * - Timeline: 5
 * - Amenities / Vaastu preferences: 5
 * - Purpose: 5
 */
@Injectable()
export class RequirementMatchingService {
  score(requirement: MatchingRequirementInput, candidate: MatchingCandidateInput): MatchResult {
    const matched: MatchResult['matched'] = [];
    const unmatched: MatchResult['unmatched'] = [];
    let score = 0;

    const reqCity = normalize(requirement.city);
    const candCity = normalize(candidate.city);
    const reqLocality = normalize(requirement.locality);
    const candLocality = normalize(candidate.locality);
    const reqMicro = normalize(requirement.microMarket);
    const candMicro = normalize(candidate.microMarket);

    if (reqCity && candCity && reqCity === candCity) {
      let locationPoints = 18;
      const labels = [requirement.city];
      if (reqLocality && candLocality && reqLocality === candLocality) {
        locationPoints += 8;
        labels.push(requirement.locality!);
      }
      if (reqMicro && candMicro && reqMicro === candMicro) {
        locationPoints += 4;
        labels.push(requirement.microMarket!);
      }
      locationPoints = Math.min(WEIGHTS.location, locationPoints);
      score += locationPoints;
      matched.push({
        key: 'location',
        label: labels.join(' / '),
        weight: locationPoints,
      });
    } else {
      unmatched.push({
        key: 'location',
        label: requirement.locality
          ? `${requirement.city} / ${requirement.locality}`
          : requirement.city,
        weight: WEIGHTS.location,
      });
    }

    const budgetMatched = this.budgetMatches(requirement, candidate.priceMinor);
    if (budgetMatched) {
      score += WEIGHTS.budget;
      matched.push({ key: 'budget', label: 'Budget within range', weight: WEIGHTS.budget });
    } else {
      unmatched.push({ key: 'budget', label: 'Budget not aligned', weight: WEIGHTS.budget });
    }

    if (candidate.propertyType && candidate.propertyType === requirement.propertyType) {
      score += WEIGHTS.propertyType;
      matched.push({
        key: 'propertyType',
        label: requirement.propertyType,
        weight: WEIGHTS.propertyType,
      });
    } else {
      unmatched.push({
        key: 'propertyType',
        label: requirement.propertyType,
        weight: WEIGHTS.propertyType,
      });
    }

    if (
      requirement.configuration &&
      candidate.configuration &&
      requirement.configuration === candidate.configuration
    ) {
      score += WEIGHTS.configuration;
      matched.push({
        key: 'configuration',
        label: requirement.configuration,
        weight: WEIGHTS.configuration,
      });
    } else if (requirement.configuration) {
      unmatched.push({
        key: 'configuration',
        label: requirement.configuration,
        weight: WEIGHTS.configuration,
      });
    }

    if (
      requirement.bedrooms !== null &&
      candidate.bedrooms !== null &&
      requirement.bedrooms === candidate.bedrooms
    ) {
      score += WEIGHTS.bedrooms;
      matched.push({
        key: 'bedrooms',
        label: `${requirement.bedrooms} BHK`,
        weight: WEIGHTS.bedrooms,
      });
    } else if (requirement.bedrooms !== null) {
      unmatched.push({
        key: 'bedrooms',
        label: `${requirement.bedrooms} BHK`,
        weight: WEIGHTS.bedrooms,
      });
    }

    if (
      listingMatchesTransaction(requirement.transactionType, candidate.listingType) ||
      candidate.timelineFit === requirement.timeline
    ) {
      score += WEIGHTS.timeline;
      matched.push({
        key: 'timeline',
        label: requirement.timeline,
        weight: WEIGHTS.timeline,
      });
    } else {
      unmatched.push({
        key: 'timeline',
        label: requirement.timeline,
        weight: WEIGHTS.timeline,
      });
    }

    const amenityScore = this.scoreAmenities(requirement, candidate);
    if (amenityScore.points > 0) {
      score += amenityScore.points;
      matched.push({
        key: 'amenities',
        label: amenityScore.label,
        weight: amenityScore.points,
      });
    }
    if (amenityScore.unmatchedLabel) {
      unmatched.push({
        key: 'amenities',
        label: amenityScore.unmatchedLabel,
        weight: WEIGHTS.amenities - amenityScore.points,
      });
    }

    if (
      !candidate.purposeFit ||
      candidate.purposeFit === requirement.purpose ||
      requirement.purpose === 'BOTH' ||
      candidate.purposeFit === 'BOTH'
    ) {
      score += WEIGHTS.purpose;
      matched.push({
        key: 'purpose',
        label: requirement.purpose,
        weight: WEIGHTS.purpose,
      });
    } else {
      unmatched.push({
        key: 'purpose',
        label: requirement.purpose,
        weight: WEIGHTS.purpose,
      });
    }

    const clamped = Math.max(0, Math.min(100, score));
    return {
      score: clamped,
      matched,
      unmatched,
      explanation: `Score: ${clamped}/100`,
    };
  }

  private budgetMatches(requirement: MatchingRequirementInput, priceMinor: bigint | null): boolean {
    if (priceMinor === null) {
      return requirement.budgetMinMinor === null && requirement.budgetMaxMinor === null;
    }
    if (requirement.budgetMinMinor !== null && priceMinor < requirement.budgetMinMinor) {
      return false;
    }
    if (requirement.budgetMaxMinor !== null && priceMinor > requirement.budgetMaxMinor) {
      return false;
    }
    return true;
  }

  private scoreAmenities(
    requirement: MatchingRequirementInput,
    candidate: MatchingCandidateInput,
  ): { points: number; label: string; unmatchedLabel: string | null } {
    const requested = requirement.amenities.map((item) => normalize(item)!).filter(Boolean);
    const available = new Set(candidate.amenities.map((item) => normalize(item)!).filter(Boolean));
    let points = 0;
    const hits: string[] = [];
    const misses: string[] = [];

    if (requirement.vaastuRequired) {
      if (candidate.vaastuCompliant === true) {
        points += 2;
        hits.push('Vaastu');
      } else {
        misses.push('Vaastu preferred');
      }
    }

    for (const amenity of requested) {
      if (available.has(amenity)) {
        hits.push(amenity);
      } else {
        misses.push(amenity);
      }
    }

    if (requested.length > 0) {
      const ratio = hits.filter((h) => h !== 'Vaastu').length / requested.length;
      points += Math.round(ratio * (requirement.vaastuRequired ? 3 : 5));
    } else if (!requirement.vaastuRequired) {
      points = WEIGHTS.amenities;
      hits.push('No amenity preferences');
    } else if (candidate.vaastuCompliant === true && misses.length === 0) {
      points = WEIGHTS.amenities;
    }

    points = Math.min(WEIGHTS.amenities, points);
    return {
      points,
      label: hits.length > 0 ? hits.join(', ') : 'Amenities',
      unmatchedLabel: misses.length > 0 ? misses.join(', ') : null,
    };
  }
}

export const MATCHING_WEIGHTS = WEIGHTS;
