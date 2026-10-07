import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  createProjectClaimRequestSchema,
  projectClaimListQuerySchema,
  reviewProjectClaimRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { ProjectClaimsService } from './project-claims.service';

@Controller()
export class ProjectClaimsController {
  constructor(private readonly claims: ProjectClaimsService) {}

  @Post('projects/:projectPublicId/claims')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('project:claim:create')
  create(
    @CurrentActor() actor: AuthActor,
    @Param('projectPublicId') projectPublicId: string,
    @Body(new ZodValidationPipe(createProjectClaimRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.claims.create(
      actor,
      projectPublicId,
      body as Parameters<ProjectClaimsService['create']>[2],
      request,
    );
  }

  @Get('org/:orgPublicId/project-claims')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('project:claim:read')
  listForOrganization(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Query(new ZodValidationPipe(projectClaimListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.claims.listForOrganization(
      actor,
      orgPublicId,
      query as Parameters<ProjectClaimsService['listForOrganization']>[2],
      request,
    );
  }

  @Get('project-claims/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.claims.getOne(actor, publicId, request);
  }

  @Post('project-claims/:publicId/submit')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('project:claim:create')
  submit(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.claims.submit(actor, publicId, request);
  }

  @Post('admin/project-claims/:publicId/approve')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('project:claim:review')
  approve(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reviewProjectClaimRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.claims.approve(
      actor,
      publicId,
      body as Parameters<ProjectClaimsService['approve']>[2],
      request,
    );
  }

  @Post('admin/project-claims/:publicId/reject')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('project:claim:review')
  reject(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reviewProjectClaimRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.claims.reject(
      actor,
      publicId,
      body as Parameters<ProjectClaimsService['reject']>[2],
      request,
    );
  }
}
