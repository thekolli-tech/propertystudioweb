import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  addMediaCollectionItemRequestSchema,
  createCreatorProfileRequestSchema,
  createEditorialContentRequestSchema,
  createExternalMediaMappingRequestSchema,
  createMediaAnalyticsEventRequestSchema,
  createMediaCmsRequestSchema,
  createMediaCollectionRequestSchema,
  editorialListQuerySchema,
  mediaCmsListQuerySchema,
  moderateMediaRequestSchema,
  updateBroadcastStudioConfigRequestSchema,
  updateEditorialContentRequestSchema,
  updateMediaCmsRequestSchema,
  updateMediaCollectionRequestSchema,
  cursorPaginationQuerySchema,
} from '@property-studio/contracts';
import { z } from 'zod';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { BroadcastService } from './broadcast.service';
import { CollectionsService } from './collections.service';
import { CreatorsService } from './creators.service';
import { EditorialService } from './editorial.service';
import { ExternalMediaService } from './external-media.service';
import { MediaAnalyticsService } from './media-analytics.service';
import { MediaCmsService } from './media-cms.service';

const collectionListQuerySchema = cursorPaginationQuerySchema.extend({
  category: z.string().trim().max(80).optional(),
});

const adminAnalyticsQuerySchema = cursorPaginationQuerySchema.extend({
  organizationPublicId: z
    .string()
    .regex(/^PS-ORG-\d+$/)
    .optional(),
});

@Controller()
export class MediaController {
  constructor(
    private readonly media: MediaCmsService,
    private readonly editorial: EditorialService,
    private readonly collections: CollectionsService,
    private readonly analytics: MediaAnalyticsService,
    private readonly external: ExternalMediaService,
    private readonly broadcast: BroadcastService,
    private readonly creators: CreatorsService,
  ) {}

  @Get('public/media')
  listPublicMedia(@Query(new ZodValidationPipe(mediaCmsListQuerySchema)) query: unknown) {
    return this.media.listPublic(query as Parameters<MediaCmsService['listPublic']>[0]);
  }

  @Get('public/media/sitemap')
  mediaSitemap() {
    return this.media.sitemap();
  }

  @Get('public/media/:slugOrPublicId')
  getPublicMedia(@Param('slugOrPublicId') slugOrPublicId: string) {
    return this.media.getPublic(slugOrPublicId);
  }

  @Get('public/editorial')
  listPublicEditorial(@Query(new ZodValidationPipe(editorialListQuerySchema)) query: unknown) {
    return this.editorial.listPublic(query as Parameters<EditorialService['listPublic']>[0]);
  }

  @Get('public/editorial/:slug')
  getPublicEditorial(@Param('slug') slug: string) {
    return this.editorial.getPublic(slug);
  }

  @Get('public/collections')
  listPublicCollections(
    @Query(new ZodValidationPipe(collectionListQuerySchema)) query: unknown,
  ) {
    return this.collections.listPublic(
      query as Parameters<CollectionsService['listPublic']>[0],
    );
  }

  @Get('public/collections/:slug')
  getPublicCollection(@Param('slug') slug: string) {
    return this.collections.getPublic(slug);
  }

  @Post('media/cms')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:create')
  createMedia(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createMediaCmsRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.create(actor, body as Parameters<MediaCmsService['create']>[1], request);
  }

  @Patch('media/cms/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:update')
  updateMedia(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateMediaCmsRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.update(
      actor,
      publicId,
      body as Parameters<MediaCmsService['update']>[2],
      request,
    );
  }

  @Post('media/cms/:publicId/publish')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:publish')
  publishMedia(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.publish(actor, publicId, request);
  }

  @Post('media/cms/:publicId/archive')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:archive')
  archiveMedia(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.archive(actor, publicId, request);
  }

  @Post('media/cms/:publicId/moderate')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:moderate')
  moderateMedia(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(moderateMediaRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.moderate(
      actor,
      publicId,
      body as Parameters<MediaCmsService['moderate']>[2],
      request,
    );
  }

  @Get('media/cms/:publicId/access-url')
  @UseGuards(AuthGuard, PermissionsGuard)
  mediaAccessUrl(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.getAccessUrl(actor, publicId, request);
  }

  @Get('public/media/:publicId/access-url')
  publicMediaAccessUrl(@Param('publicId') publicId: string) {
    return this.media.getAccessUrl(null, publicId);
  }

  @Post('editorial')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('content:create')
  createEditorial(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createEditorialContentRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.create(
      actor,
      body as Parameters<EditorialService['create']>[1],
      request,
    );
  }

  @Patch('editorial/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('content:update')
  updateEditorial(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateEditorialContentRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.update(
      actor,
      publicId,
      body as Parameters<EditorialService['update']>[2],
      request,
    );
  }

  @Post('editorial/:publicId/submit-review')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('content:update')
  submitEditorial(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.submitReview(actor, publicId, request);
  }

  @Post('editorial/:publicId/approve')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('content:update')
  approveEditorial(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.approve(actor, publicId, request);
  }

  @Post('editorial/:publicId/publish')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('content:publish')
  publishEditorial(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.publish(actor, publicId, request);
  }

  @Post('editorial/:publicId/archive')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('content:archive')
  archiveEditorial(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.archive(actor, publicId, request);
  }

  @Post('collections')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('collections:create')
  createCollection(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createMediaCollectionRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.collections.create(
      actor,
      body as Parameters<CollectionsService['create']>[1],
      request,
    );
  }

  @Patch('collections/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('collections:update')
  updateCollection(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateMediaCollectionRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.collections.update(
      actor,
      publicId,
      body as Parameters<CollectionsService['update']>[2],
      request,
    );
  }

  @Post('collections/:publicId/items')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('collections:update')
  addCollectionItem(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(addMediaCollectionItemRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.collections.addItem(
      actor,
      publicId,
      body as Parameters<CollectionsService['addItem']>[2],
      request,
    );
  }

  @Post('collections/:publicId/publish')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('collections:publish')
  publishCollection(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.collections.publish(actor, publicId, request);
  }

  @Post('media/analytics/events')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:analytics:write')
  trackAnalytics(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createMediaAnalyticsEventRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.analytics.writeEvent(
      actor,
      body as Parameters<MediaAnalyticsService['writeEvent']>[1],
      request,
    );
  }

  @Post('public/media/analytics/events')
  trackPublicAnalytics(
    @Body(new ZodValidationPipe(createMediaAnalyticsEventRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.analytics.writeEvent(
      null,
      body as Parameters<MediaAnalyticsService['writeEvent']>[1],
      request,
    );
  }

  @Get('admin/media')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:media:read')
  adminMedia(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(mediaCmsListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.media.listAdmin(
      actor,
      query as Parameters<MediaCmsService['listAdmin']>[1],
      request,
    );
  }

  @Get('admin/editorial')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:content:read')
  adminEditorial(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(editorialListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.editorial.listAdmin(
      actor,
      query as Parameters<EditorialService['listAdmin']>[1],
      request,
    );
  }

  @Get('admin/collections')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:media:read')
  adminCollections(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(collectionListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.collections.listAdmin(
      actor,
      query as Parameters<CollectionsService['listAdmin']>[1],
      request,
    );
  }

  @Get('admin/media/analytics')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('media:analytics:read')
  adminAnalytics(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminAnalyticsQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.analytics.listAdmin(
      actor,
      query as Parameters<MediaAnalyticsService['listAdmin']>[1],
      request,
    );
  }

  @Get('admin/external-media/providers')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('external-media:read')
  externalProviders() {
    return this.external.listProviders();
  }

  @Post('admin/external-media/mappings')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('external-media:manage')
  createExternalMapping(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createExternalMediaMappingRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.external.createMapping(
      actor,
      body as Parameters<ExternalMediaService['createMapping']>[1],
      request,
    );
  }

  @Get('admin/external-media/mappings/:publicId/metrics')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('external-media:read')
  externalMetrics(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.external.getMetrics(actor, publicId, request);
  }

  @Get('admin/broadcast/config')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:broadcast:read')
  getBroadcastConfig(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.broadcast.getConfig(actor, request);
  }

  @Patch('admin/broadcast/config')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:broadcast:manage')
  updateBroadcastConfig(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(updateBroadcastStudioConfigRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.broadcast.updateConfig(
      actor,
      body as Parameters<BroadcastService['updateConfig']>[1],
      request,
    );
  }

  @Get('studio/presentation/property/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  studioProperty(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.broadcast.presentationForProperty(actor, publicId, request);
  }

  @Get('studio/presentation/project/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('intelligence:read')
  studioProject(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.broadcast.presentationForProject(actor, publicId, request);
  }

  @Get('creators/me')
  @UseGuards(AuthGuard, PermissionsGuard)
  creatorMe(@CurrentActor() actor: AuthActor) {
    return this.creators.getMe(actor);
  }

  @Post('creators')
  @UseGuards(AuthGuard, PermissionsGuard)
  createCreator(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCreatorProfileRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.creators.create(actor, body as Parameters<CreatorsService['create']>[1], request);
  }
}
