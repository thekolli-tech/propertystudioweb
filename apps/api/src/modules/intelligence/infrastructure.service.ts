import { Injectable } from '@nestjs/common';
import {
  type InfrastructureAssetSummary,
  type InfrastructureListResponse,
  type InfrastructureQuery,
  type IntelligenceDataState,
} from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import {
  applyCreatedCursor,
  decimalToNumber,
  encodeCursor,
  toDateOnly,
  toIso,
} from './intelligence.util';

@Injectable()
export class InfrastructureService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: InfrastructureQuery): Promise<InfrastructureListResponse> {
    const where: Record<string, unknown> = {};
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.locality) where.locality = { equals: query.locality, mode: 'insensitive' };
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    let cursorFilter: Record<string, unknown> = {};
    try {
      cursorFilter = applyCreatedCursor(query.cursor) as Record<string, unknown>;
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
    }

    const rows = await this.prisma.infrastructureAsset.findMany({
      where: { ...where, ...cursorFilter },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    const assets = page.map((row) => this.toSummary(row));
    const coverageState: IntelligenceDataState = assets.length > 0 ? 'READY' : 'INSUFFICIENT_DATA';

    return { assets, coverageState, nextCursor: next };
  }

  async listNearby(input: {
    city: string | null;
    locality: string | null;
    limit?: number;
  }): Promise<InfrastructureAssetSummary[]> {
    if (!input.city && !input.locality) {
      return [];
    }

    const or: Array<Record<string, unknown>> = [];
    if (input.city && input.locality) {
      or.push({
        city: { equals: input.city, mode: 'insensitive' },
        locality: { equals: input.locality, mode: 'insensitive' },
      });
    }
    if (input.city) {
      or.push({ city: { equals: input.city, mode: 'insensitive' } });
    }

    const rows = await this.prisma.infrastructureAsset.findMany({
      where: { OR: or },
      orderBy: [{ createdAt: 'desc' }],
      take: input.limit ?? 20,
    });
    return rows.map((row) => this.toSummary(row));
  }

  toSummary(row: {
    publicId: string;
    name: string;
    category: InfrastructureAssetSummary['category'];
    status: InfrastructureAssetSummary['status'];
    city: string | null;
    locality: string | null;
    addressLine: string | null;
    latitude: { toString(): string } | null;
    longitude: { toString(): string } | null;
    expectedAt: Date | null;
    actualAt: Date | null;
    sourceType: InfrastructureAssetSummary['sourceType'];
    confidenceBps: number | null;
    createdAt: Date;
  }): InfrastructureAssetSummary {
    return {
      publicId: row.publicId,
      name: row.name,
      category: row.category,
      status: row.status,
      city: row.city,
      locality: row.locality,
      addressLine: row.addressLine,
      latitude: decimalToNumber(row.latitude),
      longitude: decimalToNumber(row.longitude),
      expectedAt: toDateOnly(row.expectedAt),
      actualAt: toDateOnly(row.actualAt),
      sourceType: row.sourceType,
      confidenceBps: row.confidenceBps,
      createdAt: toIso(row.createdAt)!,
    };
  }
}
