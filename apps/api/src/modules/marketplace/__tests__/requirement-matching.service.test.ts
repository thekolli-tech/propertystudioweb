import { describe, expect, it } from 'vitest';

import { MATCHING_WEIGHTS, RequirementMatchingService } from '../requirement-matching.service';

describe('RequirementMatchingService', () => {
  const matching = new RequirementMatchingService();

  const baseRequirement = {
    propertyType: 'VILLA',
    transactionType: 'BUY' as const,
    configuration: 'FOUR_BHK',
    bedrooms: 4,
    budgetMinMinor: 600_000_000_00n,
    budgetMaxMinor: 800_000_000_00n,
    city: 'Hyderabad',
    locality: 'Tellapur',
    microMarket: 'Tellapur',
    purpose: 'INVESTMENT',
    timeline: 'WITHIN_3_MONTHS',
    vaastuRequired: true,
    amenities: ['Gated Community', 'Pool'],
  };

  it('scores a strong location/budget/type match deterministically', () => {
    const first = matching.score(baseRequirement, {
      propertyType: 'VILLA',
      listingType: 'SALE',
      configuration: 'FOUR_BHK',
      bedrooms: 4,
      priceMinor: 750_000_000_00n,
      city: 'Hyderabad',
      locality: 'Tellapur',
      microMarket: 'Tellapur',
      amenities: ['Gated Community', 'Pool', 'Clubhouse'],
      vaastuCompliant: true,
      purposeFit: 'INVESTMENT',
      timelineFit: 'WITHIN_3_MONTHS',
    });
    const second = matching.score(baseRequirement, {
      propertyType: 'VILLA',
      listingType: 'SALE',
      configuration: 'FOUR_BHK',
      bedrooms: 4,
      priceMinor: 750_000_000_00n,
      city: 'Hyderabad',
      locality: 'Tellapur',
      microMarket: 'Tellapur',
      amenities: ['Gated Community', 'Pool', 'Clubhouse'],
      vaastuCompliant: true,
      purposeFit: 'INVESTMENT',
      timelineFit: 'WITHIN_3_MONTHS',
    });

    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(88);
    expect(first.matched.some((item) => item.key === 'location')).toBe(true);
    expect(first.matched.some((item) => item.key === 'budget')).toBe(true);
    expect(first.explanation).toMatch(/Score: \d+\/100/);
  });

  it('penalizes unmatched location and budget', () => {
    const result = matching.score(baseRequirement, {
      propertyType: 'APARTMENT',
      listingType: 'RENT',
      configuration: 'TWO_BHK',
      bedrooms: 2,
      priceMinor: 50_000_00n,
      city: 'Bengaluru',
      locality: 'Whitefield',
      microMarket: null,
      amenities: [],
      vaastuCompliant: false,
      purposeFit: 'END_USE',
      timelineFit: 'FLEXIBLE',
    });

    expect(result.score).toBeLessThan(40);
    expect(result.unmatched.some((item) => item.key === 'location')).toBe(true);
    expect(result.unmatched.some((item) => item.key === 'budget')).toBe(true);
    expect(result.unmatched.some((item) => item.key === 'propertyType')).toBe(true);
  });

  it('uses documented weight totals of 100', () => {
    const total = Object.values(MATCHING_WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(100);
  });
});
