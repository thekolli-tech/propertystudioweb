import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  aiAssistantRequestSchema,
  aiDocumentAnalysisRequestSchema,
  aiFloorPlanAnalysisRequestSchema,
  aiPropertyMatchRequestSchema,
  aiPropertySearchRequestSchema,
  aiValuationRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AiOrchestrationService } from './ai-orchestration.service';

@Controller()
export class AiController {
  constructor(private readonly ai: AiOrchestrationService) {}

  @Post('ai/assistant')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ai:assistant')
  assistant(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(aiAssistantRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.assistant(
      actor,
      body as Parameters<AiOrchestrationService['assistant']>[1],
      request,
    );
  }

  @Post('ai/property-match')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ai:match')
  propertyMatch(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(aiPropertyMatchRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.propertyMatch(
      actor,
      body as Parameters<AiOrchestrationService['propertyMatch']>[1],
      request,
    );
  }

  @Post('ai/document-analysis')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ai:document:analyze')
  documentAnalysis(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(aiDocumentAnalysisRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.documentAnalysis(
      actor,
      body as Parameters<AiOrchestrationService['documentAnalysis']>[1],
      request,
    );
  }

  @Post('ai/floorplan-analysis')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ai:floorplan:analyze')
  floorPlanAnalysis(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(aiFloorPlanAnalysisRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.floorPlanAnalysis(
      actor,
      body as Parameters<AiOrchestrationService['floorPlanAnalysis']>[1],
      request,
    );
  }

  @Post('ai/valuation')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ai:valuation')
  valuation(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(aiValuationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.valuation(
      actor,
      body as Parameters<AiOrchestrationService['valuation']>[1],
      request,
    );
  }

  @Post('ai/property-search')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('ai:search')
  propertySearch(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(aiPropertySearchRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.propertySearch(
      actor,
      body as Parameters<AiOrchestrationService['propertySearch']>[1],
      request,
    );
  }

  @Get('ai/jobs/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getJob(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ai.getJob(actor, publicId, request);
  }
}
