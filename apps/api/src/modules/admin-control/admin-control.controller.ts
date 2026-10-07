import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { adminAnalyticsQuerySchema, adminAuditListQuerySchema } from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminSystemHealthService } from './admin-system-health.service';

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminControlController {
  constructor(
    private readonly analytics: AdminAnalyticsService,
    private readonly systemHealth: AdminSystemHealthService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('platform:admin')
  getDashboard(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminAnalyticsQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.analytics.getControlCenter(
      actor,
      query as Parameters<AdminAnalyticsService['getControlCenter']>[1],
      request,
    );
  }

  @Get('system/health')
  @RequirePermissions('platform:admin')
  getSystemHealth(@CurrentActor() actor: AuthActor) {
    return this.systemHealth.getHealth(actor);
  }

  @Get('audit')
  @RequirePermissions('audit:read')
  listAudit(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminAuditListQuerySchema)) query: unknown,
  ) {
    return this.audit.listEvents(actor, query as Parameters<AdminAuditService['listEvents']>[1]);
  }

  @Get('ai/governance')
  @RequirePermissions('admin:ai:read')
  getAiGovernance(@CurrentActor() actor: AuthActor) {
    return this.audit.getAiGovernance(actor);
  }
}
