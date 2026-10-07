import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { payAgentVerificationFeeRequestSchema } from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AgentOpsService } from './agent-ops.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class AgentOpsController {
  constructor(private readonly agentOps: AgentOpsService) {}

  @Get('org/:orgPublicId/agent/status')
  @RequirePermissions('organization:read')
  getStatus(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agentOps.getProfessionalStatus(actor, orgPublicId, request);
  }

  @Get('org/:orgPublicId/agent/workspace')
  @RequirePermissions('organization:read')
  getWorkspace(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agentOps.getWorkspace(actor, orgPublicId, request);
  }

  @Post('agent/verification/processing-fee')
  @RequirePermissions('payments:manage')
  payFee(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(payAgentVerificationFeeRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.agentOps.payProcessingFee(
      actor,
      body as Parameters<AgentOpsService['payProcessingFee']>[1],
      request,
    );
  }
}
