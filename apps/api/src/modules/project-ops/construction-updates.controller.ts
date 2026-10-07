import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  constructionUpdateListQuerySchema,
  createConstructionUpdateRequestSchema,
  updateConstructionUpdateRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { ConstructionUpdatesService } from './construction-updates.service';

@Controller()
export class ConstructionUpdatesController {
  constructor(private readonly updates: ConstructionUpdatesService) {}

  @Get('public/projects/:projectPublicId/construction-updates')
  listPublic(
    @Param('projectPublicId') projectPublicId: string,
    @Query(new ZodValidationPipe(constructionUpdateListQuerySchema)) query: unknown,
  ) {
    return this.updates.listPublic(
      projectPublicId,
      query as Parameters<ConstructionUpdatesService['listPublic']>[1],
    );
  }

  @Post('projects/:projectPublicId/construction-updates')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('construction-update:create')
  create(
    @CurrentActor() actor: AuthActor,
    @Param('projectPublicId') projectPublicId: string,
    @Body(new ZodValidationPipe(createConstructionUpdateRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updates.create(
      actor,
      projectPublicId,
      body as Parameters<ConstructionUpdatesService['create']>[2],
      request,
    );
  }

  @Get('projects/:projectPublicId/construction-updates')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('construction-update:read')
  listForProject(
    @CurrentActor() actor: AuthActor,
    @Param('projectPublicId') projectPublicId: string,
    @Query(new ZodValidationPipe(constructionUpdateListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updates.listForProject(
      actor,
      projectPublicId,
      query as Parameters<ConstructionUpdatesService['listForProject']>[2],
      request,
    );
  }

  @Patch('construction-updates/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('construction-update:update')
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateConstructionUpdateRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updates.update(
      actor,
      publicId,
      body as Parameters<ConstructionUpdatesService['update']>[2],
      request,
    );
  }

  @Post('construction-updates/:publicId/publish')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('construction-update:publish')
  publish(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.updates.publish(actor, publicId, request);
  }
}
