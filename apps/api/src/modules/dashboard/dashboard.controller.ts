import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('developer')
  getDeveloper(
    @CurrentActor() actor: AuthActor,
    @Query('organizationPublicId') organizationPublicId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboard.getDeveloper(actor, organizationPublicId, request);
  }

  @Get('agent')
  getAgent(
    @CurrentActor() actor: AuthActor,
    @Query('organizationPublicId') organizationPublicId: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboard.getAgent(actor, organizationPublicId, request);
  }

  @Get('seeker')
  getSeeker(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.dashboard.getSeeker(actor, request);
  }

  @Get('property-admin')
  getPropertyAdmin(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.dashboard.getPropertyAdmin(actor, request);
  }

  @Get('admin')
  getAdmin(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.dashboard.getAdmin(actor, request);
  }
}
