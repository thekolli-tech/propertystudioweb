import { Injectable } from '@nestjs/common';
import {
  type DiscoveryCriteria,
  type DiscoveryPropertyListQuery,
  type DiscoveryPropertyListResponse,
  type PublicPropertySummary,
} from '@property-studio/contracts';
import { Prisma } from '../../generated/prisma/client';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { bigintToString, toIso } from '../catalog/catalog.util';
import { coerceMinor, decodeCursor, encodeCursor } from './discovery.util';

type PropertyRow = {
  id: string;
  publicId: string;
  title: string;
  propertyType: PublicPropertySummary['propertyType'];
  listingType: PublicPropertySummary['listingType'];
  configuration: PublicPropertySummary['configuration'];
  bedrooms: number | null;
  bathrooms: number | null;
  priceMinor: bigint;
  currency: string;
  availabilityStatus: PublicPropertySummary['availabilityStatus'];
  city: string | null;
  locality: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  project: { publicId: string } | null;
  organization: {
    developerProfile: { publicId: string; displayName: string } | null;
  };
};

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPublic(query: DiscoveryPropertyListQuery): Promise<DiscoveryPropertyListResponse> {
    const criteria = this.normalizeCriteria(query);
    const where = await this.buildPublishedWhere(criteria, query.cursor);

    const orderBy = this.resolveOrderBy(query.sort);
    const take = query.limit + 1;

    const [rows, totalEstimate, facets] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        take,
        include: {
          project: { select: { publicId: true } },
          organization: {
            select: {
              developerProfile: { select: { publicId: true, displayName: true } },
            },
          },
        },
      }),
      query.includeFacets
        ? this.prisma.property.count({ where: await this.buildPublishedWhere(criteria) })
        : Promise.resolve(null),
      query.includeFacets ? this.buildFacets(criteria) : Promise.resolve(null),
    ]);

    const page = rows.slice(0, query.limit) as unknown as PropertyRow[];
    const hasMore = rows.length > query.limit;
    const last = page[page.length - 1];

    return {
      properties: page.map((row) => this.toPublicSummary(row)),
      nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
      totalEstimate,
      facets,
      sort: query.sort,
    };
  }

  /**
   * Evaluate whether a published property matches durable saved-search criteria.
   * Used by smart alerts — must stay aligned with buildPublishedWhere filters.
   */
  propertyMatchesCriteria(
    property: {
      city: string | null;
      locality: string | null;
      state: string | null;
      propertyType: string;
      listingType: string;
      configuration: string | null;
      bedrooms: number | null;
      priceMinor: bigint;
      availabilityStatus: string;
      title: string;
      description: string | null;
      project?: { publicId: string } | null;
    },
    criteria: DiscoveryCriteria,
  ): boolean {
    const normalized = this.normalizeCriteria(criteria);
    if (normalized.city && property.city?.toLowerCase() !== normalized.city.toLowerCase()) {
      return false;
    }
    if (
      normalized.locality &&
      property.locality?.toLowerCase() !== normalized.locality.toLowerCase()
    ) {
      return false;
    }
    if (normalized.state && property.state?.toLowerCase() !== normalized.state.toLowerCase()) {
      return false;
    }
    if (normalized.propertyType && property.propertyType !== normalized.propertyType) {
      return false;
    }
    if (normalized.listingType && property.listingType !== normalized.listingType) {
      return false;
    }
    if (normalized.configuration && property.configuration !== normalized.configuration) {
      return false;
    }
    if (normalized.bedrooms !== undefined && property.bedrooms !== normalized.bedrooms) {
      return false;
    }
    if (
      normalized.minBedrooms !== undefined &&
      (property.bedrooms === null || property.bedrooms < normalized.minBedrooms)
    ) {
      return false;
    }
    if (
      normalized.minPriceMinor !== undefined &&
      property.priceMinor < coerceMinor(normalized.minPriceMinor)!
    ) {
      return false;
    }
    if (
      normalized.maxPriceMinor !== undefined &&
      property.priceMinor > coerceMinor(normalized.maxPriceMinor)!
    ) {
      return false;
    }
    if (
      normalized.availabilityStatus &&
      property.availabilityStatus !== normalized.availabilityStatus
    ) {
      return false;
    }
    if (normalized.projectPublicId && property.project?.publicId !== normalized.projectPublicId) {
      return false;
    }
    if (normalized.q) {
      const haystack = `${property.title} ${property.description ?? ''}`.toLowerCase();
      if (!haystack.includes(normalized.q.toLowerCase())) {
        return false;
      }
    }
    return true;
  }

  normalizeCriteria(input: {
    city?: string;
    locality?: string;
    state?: string;
    propertyType?: DiscoveryCriteria['propertyType'];
    listingType?: DiscoveryCriteria['listingType'];
    configuration?: DiscoveryCriteria['configuration'];
    bedrooms?: number;
    minBedrooms?: number;
    minPriceMinor?: string | bigint;
    maxPriceMinor?: string | bigint;
    availabilityStatus?: DiscoveryCriteria['availabilityStatus'];
    projectPublicId?: string;
    q?: string;
  }): DiscoveryCriteria {
    const criteria: DiscoveryCriteria = {};
    if (input.city) criteria.city = input.city;
    if (input.locality) criteria.locality = input.locality;
    if (input.state) criteria.state = input.state;
    if (input.propertyType) criteria.propertyType = input.propertyType;
    if (input.listingType) criteria.listingType = input.listingType;
    if (input.configuration) criteria.configuration = input.configuration;
    if (input.bedrooms !== undefined) criteria.bedrooms = input.bedrooms;
    if (input.minBedrooms !== undefined) criteria.minBedrooms = input.minBedrooms;
    if (input.minPriceMinor !== undefined) {
      criteria.minPriceMinor = coerceMinor(input.minPriceMinor)?.toString();
    }
    if (input.maxPriceMinor !== undefined) {
      criteria.maxPriceMinor = coerceMinor(input.maxPriceMinor)?.toString();
    }
    if (input.availabilityStatus) criteria.availabilityStatus = input.availabilityStatus;
    if (input.projectPublicId) criteria.projectPublicId = input.projectPublicId;
    if (input.q) criteria.q = input.q;
    return criteria;
  }

  private async buildPublishedWhere(
    criteria: DiscoveryCriteria,
    cursor?: string,
  ): Promise<Prisma.PropertyWhereInput> {
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
    };

    if (criteria.city) where.city = { equals: criteria.city, mode: 'insensitive' };
    if (criteria.locality) where.locality = { equals: criteria.locality, mode: 'insensitive' };
    if (criteria.state) where.state = { equals: criteria.state, mode: 'insensitive' };
    if (criteria.propertyType) where.propertyType = criteria.propertyType;
    if (criteria.listingType) where.listingType = criteria.listingType;
    if (criteria.configuration) where.configuration = criteria.configuration;
    if (criteria.bedrooms !== undefined) where.bedrooms = criteria.bedrooms;
    if (criteria.minBedrooms !== undefined) where.bedrooms = { gte: criteria.minBedrooms };
    if (criteria.availabilityStatus) where.availabilityStatus = criteria.availabilityStatus;

    const minPrice = coerceMinor(criteria.minPriceMinor);
    const maxPrice = coerceMinor(criteria.maxPriceMinor);
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.priceMinor = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    if (criteria.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: { publicId: criteria.projectPublicId, deletedAt: null },
        select: { id: true },
      });
      if (!project) {
        where.id = '00000000-0000-0000-0000-000000000000';
      } else {
        where.projectId = project.id;
      }
    }

    if (criteria.q) {
      where.OR = [
        { title: { contains: criteria.q, mode: 'insensitive' } },
        { description: { contains: criteria.q, mode: 'insensitive' } },
        { locality: { contains: criteria.q, mode: 'insensitive' } },
        { city: { contains: criteria.q, mode: 'insensitive' } },
      ];
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      const cursorClause: Prisma.PropertyWhereInput = {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { lt: decoded.id } },
        ],
      };
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        cursorClause,
      ];
    }

    return where;
  }

  private resolveOrderBy(
    sort: DiscoveryPropertyListQuery['sort'],
  ): Prisma.PropertyOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ priceMinor: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ priceMinor: 'desc' }, { id: 'desc' }];
      case 'bedrooms_desc':
        return [{ bedrooms: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  private async buildFacets(criteria: DiscoveryCriteria) {
    const omit = async (key: keyof DiscoveryCriteria) => {
      const next = { ...criteria };
      delete next[key];
      return this.buildPublishedWhere(next);
    };
    const [propertyTypes, cities, configurations, listingTypes] = await Promise.all([
      this.groupFacet(await omit('propertyType'), 'propertyType'),
      this.groupFacet(await omit('city'), 'city'),
      this.groupFacet(await omit('configuration'), 'configuration'),
      this.groupFacet(await omit('listingType'), 'listingType'),
    ]);

    return {
      propertyTypes,
      cities: cities.filter((b) => b.value.length > 0).slice(0, 20),
      configurations: configurations.filter((b) => b.value.length > 0),
      listingTypes,
    };
  }

  private async groupFacet(
    where: Prisma.PropertyWhereInput,
    field: 'propertyType' | 'city' | 'configuration' | 'listingType',
  ) {
    const grouped = await this.prisma.property.groupBy({
      by: [field],
      where,
      _count: { _all: true },
      orderBy: { _count: { [field]: 'desc' } },
      take: 30,
    });
    return grouped.map((row) => ({
      value: String(row[field] ?? ''),
      count: row._count._all,
    }));
  }

  private toPublicSummary(row: PropertyRow): PublicPropertySummary {
    return {
      publicId: row.publicId,
      projectPublicId: row.project?.publicId ?? null,
      developerPublicId: row.organization.developerProfile?.publicId ?? null,
      developerDisplayName: row.organization.developerProfile?.displayName ?? null,
      title: row.title,
      propertyType: row.propertyType,
      listingType: row.listingType,
      configuration: row.configuration,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      priceMinor: bigintToString(row.priceMinor) ?? '0',
      currency: row.currency,
      availabilityStatus: row.availabilityStatus,
      city: row.city,
      locality: row.locality,
      publishedAt: toIso(row.publishedAt),
    };
  }

  assertOwned(resourceUserId: string, actorUserId: string): void {
    if (resourceUserId !== actorUserId) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
  }
}
