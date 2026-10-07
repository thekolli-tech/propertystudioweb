import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ensureCrmContactFromLeadRequestSchema } from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { WorkflowOrchestrationService } from './workflow-orchestration.service';

@Controller('workflows')
@UseGuards(AuthGuard, PermissionsGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowOrchestrationService) {}

  @Post('crm-contact-from-lead')
  @RequirePermissions('crm:contacts:create')
  ensureCrmContactFromLead(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(ensureCrmContactFromLeadRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workflows.ensureCrmContactFromLead(
      actor,
      body as Parameters<WorkflowOrchestrationService['ensureCrmContactFromLead']>[1],
      request,
    );
  }
}
