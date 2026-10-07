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
  createSavedPropertyRequestSchema,
  createSavedSearchRequestSchema,
  discoveryPropertyListQuerySchema,
  savedPropertyListQuerySchema,
  savedSearchListQuerySchema,
  savedSearchMatchListQuerySchema,
  updateSavedSearchRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { DiscoveryService } from './discovery.service';
import { SavedPropertiesService } from './saved-properties.service';
import { SavedSearchesService } from './saved-searches.service';

@Controller()
export class DiscoveryController {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly savedSearches: SavedSearchesService,
    private readonly savedProperties: SavedPropertiesService,
  ) {}

  /** Public advanced discovery — sort, richer filters, optional facets. */
  @Get('public/discovery/properties')
  searchPublic(@Query(new ZodValidationPipe(discoveryPropertyListQuerySchema)) query: unknown) {
    return this.discovery.searchPublic(query as Parameters<DiscoveryService['searchPublic']>[0]);
  }

  @Get('discovery/properties')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('discovery:read')
  searchAuthenticated(
    @Query(new ZodValidationPipe(discoveryPropertyListQuerySchema)) query: unknown,
  ) {
    return this.discovery.searchPublic(query as Parameters<DiscoveryService['searchPublic']>[0]);
  }

  @Post('saved-searches')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:create')
  createSavedSearch(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createSavedSearchRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.create(
      actor,
      body as Parameters<SavedSearchesService['create']>[1],
      request,
    );
  }

  @Get('saved-searches')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:read')
  listSavedSearches(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(savedSearchListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.list(
      actor,
      query as Parameters<SavedSearchesService['list']>[1],
      request,
    );
  }

  @Get('saved-searches/matches')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:read')
  listMatches(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(savedSearchMatchListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.listMatches(
      actor,
      query as Parameters<SavedSearchesService['listMatches']>[1],
      request,
    );
  }

  @Get('saved-searches/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:read')
  getSavedSearch(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.get(actor, publicId, request);
  }

  @Patch('saved-searches/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:update')
  updateSavedSearch(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateSavedSearchRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.update(
      actor,
      publicId,
      body as Parameters<SavedSearchesService['update']>[2],
      request,
    );
  }

  @Delete('saved-searches/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:delete')
  deleteSavedSearch(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.softDelete(actor, publicId, request);
  }

  @Post('saved-searches/:publicId/run')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-search:read')
  runSavedSearch(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedSearches.run(actor, publicId, request);
  }

  @Post('saved-properties')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-property:create')
  createSavedProperty(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createSavedPropertyRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedProperties.create(
      actor,
      body as Parameters<SavedPropertiesService['create']>[1],
      request,
    );
  }

  @Get('saved-properties')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-property:read')
  listSavedProperties(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(savedPropertyListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedProperties.list(
      actor,
      query as Parameters<SavedPropertiesService['list']>[1],
      request,
    );
  }

  @Delete('saved-properties/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('saved-property:delete')
  deleteSavedProperty(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.savedProperties.softDelete(actor, publicId, request);
  }
}
