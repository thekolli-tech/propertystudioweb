import { Injectable } from '@nestjs/common';
import {
  type IntelligenceObservationListQuery,
  type IntelligenceObservationListResponse,
  type MarketQuery,
} from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { IntelligenceAccessService } from './intelligence-access.service';
import { applyCreatedCursor, encodeCursor, toIso } from './intelligence.util';
import { InfrastructureService } from './infrastructure.service';
import { MarketIntelligenceService } from './market-intelligence.service';

@Injectable()
export class IntelligenceAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IntelligenceAccessService,
    private readonly market: MarketIntelligenceService,
    private readonly infrastructure: InfrastructureService,
  ) {}

  async listMarketSnapshots(actor: AuthActor, query: MarketQuery) {
    if (!this.access.canAdminRead(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    return this.market.list(query);
  }

  async listInfrastructure(actor: AuthActor, query: Parameters<InfrastructureService['list']>[0]) {
    if (!this.access.canAdminRead(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    return this.infrastructure.list(query);
  }

  async listObservations(
    actor: AuthActor,
    query: IntelligenceObservationListQuery,
  ): Promise<IntelligenceObservationListResponse> {
    if (!this.access.canAdminRead(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.subjectType) where.subjectType = query.subjectType;
    if (query.subjectKey) where.subjectKey = query.subjectKey;
    if (query.observationKey) where.observationKey = query.observationKey;

    let cursorFilter: Record<string, unknown> = {};
    try {
      cursorFilter = applyCreatedCursor(query.cursor) as Record<string, unknown>;
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
    }

    const rows = await this.prisma.intelligenceObservation.findMany({
      where: { ...where, ...cursorFilter },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      observations: page.map((row) => ({
        publicId: row.publicId,
        subjectType: row.subjectType,
        subjectKey: row.subjectKey,
        observationKey: row.observationKey,
        valueJson: row.valueJson,
        coverageState: row.coverageState,
        sourceType: row.sourceType,
        observedAt: toIso(row.observedAt)!,
        confidenceBps: row.confidenceBps,
        createdAt: toIso(row.createdAt)!,
      })),
      coverageState: page.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      nextCursor: next,
    };
  }
}
