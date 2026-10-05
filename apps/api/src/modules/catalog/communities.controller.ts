import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  communityListQuerySchema,
  createCommunityRequestSchema,
  updateCommunityRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { CommunitiesService } from './communities.service';

@Controller('communities')
@UseGuards(AuthGuard, PermissionsGuard)
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  @Post()
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCommunityRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communities.create(
      actor,
      body as Parameters<CommunitiesService['create']>[1],
      request,
    );
  }

  @Get()
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(communityListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communities.list(
      actor,
      query as Parameters<CommunitiesService['list']>[1],
      request,
    );
  }

  @Get(':publicId')
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communities.getOne(actor, publicId, request);
  }

  @Patch(':publicId')
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateCommunityRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communities.update(
      actor,
      publicId,
      body as Parameters<CommunitiesService['update']>[2],
      request,
    );
  }
}
