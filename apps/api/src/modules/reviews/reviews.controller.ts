import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminReportListQuerySchema,
  createReviewRequestSchema,
  moderateReviewRequestSchema,
  reportReviewRequestSchema,
  reviewListQuerySchema,
  reviewSubjectTypeSchema,
  updateOwnReviewRequestSchema,
} from '@property-studio/contracts';
import { z } from 'zod';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { ReviewsService } from './reviews.service';

const trustScoreQuerySchema = z.object({
  subjectType: reviewSubjectTypeSchema,
  subjectPublicId: z.string().regex(/^PS-(DEV|AGT|PROJ|PROP)-\d+$/),
});

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('admin/reviews')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:reviews:read')
  listAdmin(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(reviewListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.list(actor, query as Parameters<ReviewsService['list']>[1], request);
  }

  @Get('admin/reports')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:reviews:read')
  listAdminReports(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminReportListQuerySchema)) query: unknown,
  ) {
    return this.reviews.listAdminReports(
      actor,
      query as Parameters<ReviewsService['listAdminReports']>[1],
    );
  }

  @Post('reviews')
  @UseGuards(AuthGuard, PermissionsGuard)
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createReviewRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.create(actor, body as Parameters<ReviewsService['create']>[1], request);
  }

  @Get('reviews')
  @UseGuards(AuthGuard, PermissionsGuard)
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(reviewListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.list(actor, query as Parameters<ReviewsService['list']>[1], request);
  }

  @Get('reviews/trust-score')
  trustScore(@Query(new ZodValidationPipe(trustScoreQuerySchema)) query: unknown) {
    const parsed = query as z.infer<typeof trustScoreQuerySchema>;
    return this.reviews.trustScore(parsed.subjectType, parsed.subjectPublicId);
  }

  @Get('reviews/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.getOne(actor, publicId, request);
  }

  @Patch('reviews/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  updateOwn(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateOwnReviewRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.updateOwn(
      actor,
      publicId,
      body as Parameters<ReviewsService['updateOwn']>[2],
      request,
    );
  }

  @Post('reviews/:publicId/report')
  @UseGuards(AuthGuard, PermissionsGuard)
  report(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reportReviewRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.report(
      actor,
      publicId,
      body as Parameters<ReviewsService['report']>[2],
      request,
    );
  }

  @Post('admin/reviews/:publicId/moderate')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('reviews:moderate')
  moderate(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(moderateReviewRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviews.moderate(
      actor,
      publicId,
      body as Parameters<ReviewsService['moderate']>[2],
      request,
    );
  }
}
