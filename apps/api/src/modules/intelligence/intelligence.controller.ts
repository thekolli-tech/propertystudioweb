import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  infrastructureQuerySchema,
  intelligenceCompareRequestSchema,
  intelligenceMatchRequestSchema,
  intelligenceObservationListQuerySchema,
  marketQuerySchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { CompareService } from './compare.service';
import { InfrastructureService } from './infrastructure.service';
import { IntelligenceAdminService } from './intelligence-admin.service';
import { IntelligenceMatchService } from './intelligence-match.service';
import { MarketIntelligenceService } from './market-intelligence.service';
import { ProjectIntelligenceService } from './project-intelligence.service';
import { PropertyIntelligenceService } from './property-intelligence.service';

@Controller()
export class IntelligenceController {
  constructor(
    private readonly properties: PropertyIntelligenceService,
    private readonly projects: ProjectIntelligenceService,
    private readonly market: MarketIntelligenceService,
    private readonly infrastructure: InfrastructureService,
    private readonly compareService: CompareService,
    private readonly matchService: IntelligenceMatchService,
    private readonly admin: IntelligenceAdminService,
  ) {}

  @Get('intelligence/properties/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  getProperty(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.getProperty(actor, publicId, request);
  }

  @Get('intelligence/projects/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  getProject(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.getProject(actor, publicId, request);
  }

  @Get('intelligence/market')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  listMarket(@Query(new ZodValidationPipe(marketQuerySchema)) query: unknown) {
    return this.market.list(query as Parameters<MarketIntelligenceService['list']>[0]);
  }

  @Get('intelligence/market/trend')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  marketTrend(@Query(new ZodValidationPipe(marketQuerySchema)) query: unknown) {
    return this.market.trend(query as Parameters<MarketIntelligenceService['trend']>[0]);
  }

  @Get('intelligence/infrastructure')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  listInfrastructure(@Query(new ZodValidationPipe(infrastructureQuerySchema)) query: unknown) {
    return this.infrastructure.list(query as Parameters<InfrastructureService['list']>[0]);
  }

  @Post('intelligence/compare')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:compare')
  compare(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(intelligenceCompareRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.compareService.compare(
      actor,
      body as Parameters<CompareService['compare']>[1],
      request,
    );
  }

  @Post('intelligence/match')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:match')
  match(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(intelligenceMatchRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchService.match(
      actor,
      body as Parameters<IntelligenceMatchService['match']>[1],
      request,
    );
  }

  @Get('admin/intelligence/market')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:intelligence:read')
  adminMarket(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(marketQuerySchema)) query: unknown,
  ) {
    return this.admin.listMarketSnapshots(
      actor,
      query as Parameters<IntelligenceAdminService['listMarketSnapshots']>[1],
    );
  }

  @Get('admin/intelligence/infrastructure')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:intelligence:read')
  adminInfrastructure(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(infrastructureQuerySchema)) query: unknown,
  ) {
    return this.admin.listInfrastructure(
      actor,
      query as Parameters<IntelligenceAdminService['listInfrastructure']>[1],
    );
  }

  @Get('admin/intelligence/observations')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:intelligence:read')
  adminObservations(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(intelligenceObservationListQuerySchema)) query: unknown,
  ) {
    return this.admin.listObservations(
      actor,
      query as Parameters<IntelligenceAdminService['listObservations']>[1],
    );
  }
}
