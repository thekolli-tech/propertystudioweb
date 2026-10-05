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
  assignResourceRequestSchema,
  createDocumentAssetRequestSchema,
  createMediaAssetRequestSchema,
  createPropertyRequestSchema,
  propertyListQuerySchema,
  publicPropertyListQuerySchema,
  updatePropertyRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { PropertiesService } from './properties.service';

@Controller()
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get('public/properties')
  listPublic(@Query(new ZodValidationPipe(publicPropertyListQuerySchema)) query: unknown) {
    return this.properties.listPublic(query as Parameters<PropertiesService['listPublic']>[0]);
  }

  @Get('public/properties/:publicId')
  getPublic(@Param('publicId') publicId: string) {
    return this.properties.getPublic(publicId);
  }

  @Post('admin/resource-assignments')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('platform:admin')
  assign(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(assignResourceRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.assignResource(
      actor,
      body as Parameters<PropertiesService['assignResource']>[1],
      request,
    );
  }

  @Post('properties')
  @UseGuards(AuthGuard, PermissionsGuard)
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createPropertyRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.create(
      actor,
      body as Parameters<PropertiesService['create']>[1],
      request,
    );
  }

  @Get('properties')
  @UseGuards(AuthGuard, PermissionsGuard)
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(propertyListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.list(actor, query as Parameters<PropertiesService['list']>[1], request);
  }

  @Post('properties/media')
  @UseGuards(AuthGuard, PermissionsGuard)
  attachMedia(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createMediaAssetRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.attachMedia(
      actor,
      body as Parameters<PropertiesService['attachMedia']>[1],
      request,
    );
  }

  @Post('properties/documents')
  @UseGuards(AuthGuard, PermissionsGuard)
  attachDocument(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createDocumentAssetRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.attachDocument(
      actor,
      body as Parameters<PropertiesService['attachDocument']>[1],
      request,
    );
  }

  @Get('media/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getMedia(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.getMedia(actor, publicId, request);
  }

  @Get('documents/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getDocument(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.getDocument(actor, publicId, request);
  }

  @Get('properties/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.getOne(actor, publicId, request);
  }

  @Patch('properties/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updatePropertyRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.update(
      actor,
      publicId,
      body as Parameters<PropertiesService['update']>[2],
      request,
    );
  }

  @Delete('properties/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  remove(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.properties.softDelete(actor, publicId, request);
  }
}
