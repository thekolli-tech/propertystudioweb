import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  createDocumentAssetRequestSchema,
  createMediaAssetRequestSchema,
  createProjectRequestSchema,
  projectListQuerySchema,
  publicProjectListQuerySchema,
  updateProjectRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { ProjectsService } from './projects.service';

@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('public/projects')
  listPublic(@Query(new ZodValidationPipe(publicProjectListQuerySchema)) query: unknown) {
    return this.projects.listPublic(query as Parameters<ProjectsService['listPublic']>[0]);
  }

  @Get('public/projects/:publicId')
  getPublic(@Param('publicId') publicId: string) {
    return this.projects.getPublic(publicId);
  }

  @Post('projects')
  @UseGuards(AuthGuard, PermissionsGuard)
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createProjectRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.create(actor, body as Parameters<ProjectsService['create']>[1], request);
  }

  @Get('projects')
  @UseGuards(AuthGuard, PermissionsGuard)
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(projectListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.list(actor, query as Parameters<ProjectsService['list']>[1], request);
  }

  @Post('projects/media')
  @UseGuards(AuthGuard, PermissionsGuard)
  attachMedia(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createMediaAssetRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.attachMedia(
      actor,
      body as Parameters<ProjectsService['attachMedia']>[1],
      request,
    );
  }

  @Post('projects/documents')
  @UseGuards(AuthGuard, PermissionsGuard)
  attachDocument(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createDocumentAssetRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.attachDocument(
      actor,
      body as Parameters<ProjectsService['attachDocument']>[1],
      request,
    );
  }

  @Get('projects/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.getOne(actor, publicId, request);
  }

  @Patch('projects/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateProjectRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.update(
      actor,
      publicId,
      body as Parameters<ProjectsService['update']>[2],
      request,
    );
  }

  @Delete('projects/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  remove(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.projects.softDelete(actor, publicId, request);
  }
}
