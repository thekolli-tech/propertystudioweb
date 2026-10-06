import { Injectable } from '@nestjs/common';
import {
  type IntelligenceDataState,
  type MarketQuery,
  type MarketSnapshotListResponse,
  type MarketSnapshotSummary,
  type MarketTrendResponse,
} from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import {
  applyCreatedCursor,
  bigintToString,
  encodeCursor,
  toIso,
} from './intelligence.util';

@Injectable()
export class MarketIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MarketQuery): Promise<MarketSnapshotListResponse> {
    const where = await this.buildWhere(query);
    let cursorFilter: Record<string, unknown> = {};
    try {
      cursorFilter = applyCreatedCursor(query.cursor) as Record<string, unknown>;
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
    }

    const rows = await this.prisma.marketSnapshot.findMany({
      where: { ...where, ...cursorFilter },
      orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    const snapshots = await Promise.all(page.map((row) => this.toSummary(row)));
    const coverageState: IntelligenceDataState =
      snapshots.length > 0 ? 'READY' : 'INSUFFICIENT_DATA';

    return { snapshots, coverageState, nextCursor: next };
  }

  async trend(query: MarketQuery): Promise<MarketTrendResponse> {
    const where = await this.buildWhere(query);
    const rows = await this.prisma.marketSnapshot.findMany({
      where,
      orderBy: [{ observedAt: 'asc' }],
      take: 100,
    });

    if (rows.length === 0) {
      return {
        points: [],
        coverageState: 'INSUFFICIENT_DATA',
        city: query.city ?? null,
        locality: query.locality ?? null,
        microMarket: query.microMarket ?? null,
      };
    }

    return {
      points: rows.map((row) => ({
        observedAt: toIso(row.observedAt)!,
        medianPriceMinor: bigintToString(row.medianPriceMinor),
        medianPricePerSqftMinor: bigintToString(row.medianPricePerSqftMinor),
        coverageState: row.coverageState,
      })),
      coverageState: 'READY',
      city: query.city ?? rows[0]?.city ?? null,
      locality: query.locality ?? rows[0]?.locality ?? null,
      microMarket: query.microMarket ?? rows[0]?.microMarket ?? null,
    };
  }

  /**
   * Prefer property/project snapshot, then locality, then city.
   * Returns null when no historical rows exist (caller sets INSUFFICIENT_DATA).
   */
  async lookupForLocation(input: {
    city: string | null;
    locality: string | null;
    propertyId?: string | null;
    projectId?: string | null;
    microMarket?: string | null;
  }): Promise<MarketSnapshotSummary | null> {
    if (input.propertyId) {
      const byProperty = await this.prisma.marketSnapshot.findFirst({
        where: { propertyId: input.propertyId },
        orderBy: [{ observedAt: 'desc' }],
      });
      if (byProperty) return this.toSummary(byProperty);
    }

    if (input.projectId) {
      const byProject = await this.prisma.marketSnapshot.findFirst({
        where: { projectId: input.projectId },
        orderBy: [{ observedAt: 'desc' }],
      });
      if (byProject) return this.toSummary(byProject);
    }

    if (input.locality && input.city) {
      const byLocality = await this.prisma.marketSnapshot.findFirst({
        where: {
          city: { equals: input.city, mode: 'insensitive' },
          locality: { equals: input.locality, mode: 'insensitive' },
        },
        orderBy: [{ observedAt: 'desc' }],
      });
      if (byLocality) return this.toSummary(byLocality);
    }

    if (input.microMarket) {
      const byMicro = await this.prisma.marketSnapshot.findFirst({
        where: { microMarket: { equals: input.microMarket, mode: 'insensitive' } },
        orderBy: [{ observedAt: 'desc' }],
      });
      if (byMicro) return this.toSummary(byMicro);
    }

    if (input.city) {
      const byCity = await this.prisma.marketSnapshot.findFirst({
        where: { city: { equals: input.city, mode: 'insensitive' } },
        orderBy: [{ observedAt: 'desc' }],
      });
      if (byCity) return this.toSummary(byCity);
    }

    return null;
  }

  async listSnapshotsForValuation(input: {
    city: string | null;
    locality: string | null;
    limit?: number;
  }) {
    if (!input.city && !input.locality) {
      return [];
    }
    const where: Record<string, unknown> = {};
    if (input.city) where.city = { equals: input.city, mode: 'insensitive' };
    if (input.locality) where.locality = { equals: input.locality, mode: 'insensitive' };

    return this.prisma.marketSnapshot.findMany({
      where,
      orderBy: [{ observedAt: 'desc' }],
      take: input.limit ?? 20,
    });
  }

  private async buildWhere(query: MarketQuery): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = {};
    if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
    if (query.locality) where.locality = { equals: query.locality, mode: 'insensitive' };
    if (query.microMarket) {
      where.microMarket = { equals: query.microMarket, mode: 'insensitive' };
    }
    if (query.subjectType) where.subjectType = query.subjectType;
    if (query.subjectKey) where.subjectKey = query.subjectKey;

    if (query.propertyPublicId) {
      const property = await this.prisma.property.findFirst({
        where: { publicId: query.propertyPublicId, deletedAt: null },
        select: { id: true },
      });
      where.propertyId = property?.id ?? '00000000-0000-0000-0000-000000000000';
    }
    if (query.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: { publicId: query.projectPublicId, deletedAt: null },
        select: { id: true },
      });
      where.projectId = project?.id ?? '00000000-0000-0000-0000-000000000000';
    }
    return where;
  }

  async toSummary(row: {
    publicId: string;
    subjectType: MarketSnapshotSummary['subjectType'];
    subjectKey: string;
    propertyId: string | null;
    projectId: string | null;
    city: string | null;
    locality: string | null;
    microMarket: string | null;
    medianPriceMinor: bigint | null;
    medianPricePerSqftMinor: bigint | null;
    currency: string;
    inventorySignal: string | null;
    demandSignal: string | null;
    rentalYieldBps: number | null;
    appreciationBps: number | null;
    coverageState: MarketSnapshotSummary['coverageState'];
    sourceType: MarketSnapshotSummary['sourceType'];
    observedAt: Date;
    effectiveAt: Date | null;
    confidenceBps: number | null;
    createdAt: Date;
  }): Promise<MarketSnapshotSummary> {
    let propertyPublicId: string | null = null;
    let projectPublicId: string | null = null;
    if (row.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: row.propertyId },
        select: { publicId: true },
      });
      propertyPublicId = property?.publicId ?? null;
    }
    if (row.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: row.projectId },
        select: { publicId: true },
      });
      projectPublicId = project?.publicId ?? null;
    }

    return {
      publicId: row.publicId,
      subjectType: row.subjectType,
      subjectKey: row.subjectKey,
      propertyPublicId,
      projectPublicId,
      city: row.city,
      locality: row.locality,
      microMarket: row.microMarket,
      medianPriceMinor: bigintToString(row.medianPriceMinor),
      medianPricePerSqftMinor: bigintToString(row.medianPricePerSqftMinor),
      currency: row.currency,
      inventorySignal: row.inventorySignal,
      demandSignal: row.demandSignal,
      rentalYieldBps: row.rentalYieldBps,
      appreciationBps: row.appreciationBps,
      coverageState: row.coverageState,
      sourceType: row.sourceType,
      observedAt: toIso(row.observedAt)!,
      effectiveAt: toIso(row.effectiveAt),
      confidenceBps: row.confidenceBps,
      createdAt: toIso(row.createdAt)!,
    };
  }
}
