import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminRequirementListQuerySchema,
  createRequirementRequestSchema,
  publicRequirementListQuerySchema,
  requirementListQuerySchema,
  updateRequirementRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { RequirementsService } from './requirements.service';

@Controller()
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get('public/requirements')
  listPublic(@Query(new ZodValidationPipe(publicRequirementListQuerySchema)) query: unknown) {
    return this.requirements.listPublic(query as Parameters<RequirementsService['listPublic']>[0]);
  }

  @Get('public/requirements/:publicId')
  getPublic(@Param('publicId') publicId: string) {
    return this.requirements.getPublic(publicId);
  }

  @Post('requirements')
  @UseGuards(AuthGuard, PermissionsGuard)
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createRequirementRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.create(
      actor,
      body as Parameters<RequirementsService['create']>[1],
      request,
    );
  }

  @Get('requirements')
  @UseGuards(AuthGuard, PermissionsGuard)
  listMine(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(requirementListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.listMine(
      actor,
      query as Parameters<RequirementsService['listMine']>[1],
      request,
    );
  }

  @Get('requirements/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getMine(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.getMine(actor, publicId, request);
  }

  @Patch('requirements/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateRequirementRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.update(
      actor,
      publicId,
      body as Parameters<RequirementsService['update']>[2],
      request,
    );
  }

  @Post('requirements/:publicId/publish')
  @UseGuards(AuthGuard, PermissionsGuard)
  publish(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.publish(actor, publicId, request);
  }

  @Post('requirements/:publicId/pause')
  @UseGuards(AuthGuard, PermissionsGuard)
  pause(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.pause(actor, publicId, request);
  }

  @Post('requirements/:publicId/close')
  @UseGuards(AuthGuard, PermissionsGuard)
  close(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.close(actor, publicId, request);
  }

  @Get('admin/requirements')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:requirements:read')
  listAdmin(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminRequirementListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.requirements.listAdmin(
      actor,
      query as Parameters<RequirementsService['listAdmin']>[1],
      request,
    );
  }
}
