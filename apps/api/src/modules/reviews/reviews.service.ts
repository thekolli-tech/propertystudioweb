import { Injectable } from '@nestjs/common';
import {
  type CreateReviewRequest,
  type ModerateReviewRequest,
  type ReportReviewRequest,
  type ReviewEligibilityBasis,
  type ReviewListQuery,
  type ReviewListResponse,
  type ReviewReportSummary,
  type ReviewSubjectType,
  type ReviewSummary,
  type UpdateOwnReviewRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { ReviewsAccessService } from './reviews-access.service';
import { applyCreatedCursor, encodeCursor, isPrismaUniqueViolation, toIso } from './reviews.util';
import { TrustScoreService } from './trust-score.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: ReviewsAccessService,
    private readonly trustScores: TrustScoreService,
  ) {}

  async create(
    actor: AuthActor,
    body: CreateReviewRequest,
    request?: AuthenticatedRequest,
  ): Promise<ReviewSummary> {
    if (!actorHasPermission(actor, 'reviews:create')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const subject = await this.resolveReviewableSubject(body.subjectType, body.subjectPublicId);
    if (!subject.organizationId) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    const eligibilityBasis = await this.access.requireEligibility(
      actor,
      {
        id: subject.id,
        organizationId: subject.organizationId,
        subjectType: body.subjectType,
        projectId: subject.projectId,
      },
      request,
    );

    try {
      const created = await this.prisma.review.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextReviewPublicId(),
          authorUserId: actor.userId,
          organizationId: subject.organizationId,
          subjectType: body.subjectType,
          subjectId: subject.id,
          title: body.title ?? null,
          body: body.body,
          status: 'PUBLISHED',
          overallRating: body.overallRating,
          eligibilityBasis,
          publishedAt: new Date(),
          ratings: {
            create: body.ratings.map((rating) => ({
              id: newUuid(),
              dimension: rating.dimension,
              rating: rating.rating,
            })),
          },
        },
        include: {
          author: { select: { publicId: true } },
          organization: { select: { publicId: true } },
          ratings: true,
        },
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: subject.organizationId,
        action: 'review.created',
        resourceType: 'review',
        resourceId: created.publicId,
        requestId: request?.requestId,
        after: {
          subjectType: body.subjectType,
          subjectPublicId: body.subjectPublicId,
          status: created.status,
          eligibilityBasis,
        },
      });

      return this.toSummary(created, body.subjectPublicId);
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new AppError('CONFLICT', 'You have already reviewed this subject.');
      }
      throw error;
    }
  }

  async list(
    actor: AuthActor,
    query: ReviewListQuery,
    _request?: AuthenticatedRequest,
  ): Promise<ReviewListResponse> {
    if (!actorHasPermission(actor, 'reviews:read') && !this.access.canReadAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.subjectType) where.subjectType = query.subjectType;
    if (query.status) {
      where.status = query.status;
    } else if (!this.access.canReadAdmin(actor)) {
      where.status = 'PUBLISHED';
    }
    if (query.organizationPublicId) {
      const organization = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!organization) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      where.organizationId = organization.id;
    }
    if (query.subjectPublicId && query.subjectType) {
      const subject = await this.resolveReviewableSubject(query.subjectType, query.subjectPublicId);
      where.subjectId = subject.id;
    }
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        author: { select: { publicId: true } },
        organization: { select: { publicId: true } },
        ratings: true,
      },
    });
    const page = rows.slice(0, query.limit);
    const summaries = await Promise.all(
      page.map(async (row) =>
        this.toSummary(row, await this.resolveSubjectPublicId(row.subjectType, row.subjectId)),
      ),
    );

    return {
      reviews: summaries,
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getOne(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ReviewSummary> {
    if (!actorHasPermission(actor, 'reviews:read') && !this.access.canReadAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const row = await this.prisma.review.findFirst({
      where: { publicId },
      include: {
        author: { select: { publicId: true } },
        organization: { select: { publicId: true } },
        ratings: true,
      },
    });
    if (!row) {
      return await this.access.deny(actor, publicId, request);
    }
    if (
      row.status !== 'PUBLISHED' &&
      row.authorUserId !== actor.userId &&
      !this.access.canReadAdmin(actor)
    ) {
      return await this.access.deny(actor, publicId, request);
    }
    const subjectPublicId = await this.resolveSubjectPublicId(row.subjectType, row.subjectId);
    return this.toSummary(row, subjectPublicId);
  }

  async updateOwn(
    actor: AuthActor,
    publicId: string,
    body: UpdateOwnReviewRequest,
    request?: AuthenticatedRequest,
  ): Promise<ReviewSummary> {
    if (!actorHasPermission(actor, 'reviews:update:own')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const row = await this.prisma.review.findFirst({
      where: { publicId, authorUserId: actor.userId },
      include: { ratings: true },
    });
    if (!row) {
      return await this.access.deny(actor, publicId, request);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.ratings) {
        await tx.reviewRating.deleteMany({ where: { reviewId: row.id } });
        await tx.reviewRating.createMany({
          data: body.ratings.map((rating) => ({
            id: newUuid(),
            reviewId: row.id,
            dimension: rating.dimension,
            rating: rating.rating,
          })),
        });
      }
      return tx.review.update({
        where: { id: row.id },
        data: {
          title: body.title === undefined ? undefined : body.title,
          body: body.body === undefined ? undefined : body.body,
          overallRating: body.overallRating === undefined ? undefined : body.overallRating,
          version: { increment: 1 },
        },
        include: {
          author: { select: { publicId: true } },
          organization: { select: { publicId: true } },
          ratings: true,
        },
      });
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'review.updated',
      resourceType: 'review',
      resourceId: updated.publicId,
      requestId: request?.requestId,
    });

    const subjectPublicId = await this.resolveSubjectPublicId(
      updated.subjectType,
      updated.subjectId,
    );
    return this.toSummary(updated, subjectPublicId);
  }

  async report(
    actor: AuthActor,
    publicId: string,
    body: ReportReviewRequest,
    request?: AuthenticatedRequest,
  ): Promise<ReviewReportSummary> {
    if (!actorHasPermission(actor, 'reviews:report')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const review = await this.prisma.review.findFirst({ where: { publicId } });
    if (!review) {
      return await this.access.deny(actor, publicId, request);
    }

    try {
      const report = await this.prisma.$transaction(async (tx) => {
        const created = await tx.reviewReport.create({
          data: {
            id: newUuid(),
            publicId: await this.publicIds.nextReviewReportPublicId(),
            reviewId: review.id,
            reporterUserId: actor.userId,
            reason: body.reason,
            details: body.details ?? null,
            status: 'OPEN',
          },
        });
        if (review.status === 'PUBLISHED' || review.status === 'PENDING') {
          await tx.review.update({
            where: { id: review.id },
            data: { status: 'FLAGGED' },
          });
        }
        return created;
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        action: 'review.reported',
        resourceType: 'review_report',
        resourceId: report.publicId,
        requestId: request?.requestId,
        metadata: { reviewPublicId: review.publicId, reason: body.reason },
      });

      return {
        publicId: report.publicId,
        reviewPublicId: review.publicId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: toIso(report.createdAt)!,
      };
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new AppError('CONFLICT', 'You have already reported this review.');
      }
      throw error;
    }
  }

  async listAdminReports(
    actor: AuthActor,
    query: {
      limit: number;
      cursor?: string;
      status?: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
      entityType?: string;
    },
  ): Promise<{
    reports: Array<{
      publicId: string;
      kind: 'REVIEW_REPORT' | 'CONTENT_REPORT';
      entityType: string;
      entityPublicId: string;
      reason: ReviewReportSummary['reason'];
      details: string | null;
      status: ReviewReportSummary['status'];
      createdAt: string;
    }>;
    nextCursor: string | null;
  }> {
    if (!this.access.canReadAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const reviewWhere: Record<string, unknown> = {};
    if (query.status) reviewWhere.status = query.status;
    applyCreatedCursor(reviewWhere, query.cursor);

    const contentWhere: Record<string, unknown> = {};
    if (query.status) contentWhere.status = query.status;
    if (query.entityType) contentWhere.entityType = query.entityType;
    applyCreatedCursor(contentWhere, query.cursor);

    const [reviewReports, contentReports] = await Promise.all([
      !query.entityType || query.entityType === 'REVIEW'
        ? this.prisma.reviewReport.findMany({
            where: reviewWhere,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: query.limit + 1,
            include: { review: { select: { publicId: true } } },
          })
        : Promise.resolve([]),
      query.entityType === 'REVIEW'
        ? Promise.resolve([])
        : this.prisma.contentReport.findMany({
            where: contentWhere,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: query.limit + 1,
          }),
    ]);

    const reviewItems = await Promise.all(
      reviewReports.map(async (row) => ({
        publicId: row.publicId,
        kind: 'REVIEW_REPORT' as const,
        entityType: 'REVIEW',
        entityPublicId: row.review.publicId,
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: toIso(row.createdAt)!,
        sortAt: row.createdAt,
        sortId: row.id,
      })),
    );

    const contentItems = await Promise.all(
      contentReports.map(async (row) => {
        let entityPublicId = row.entityId;
        if (row.entityType === 'MESSAGE') {
          const message = await this.prisma.message.findFirst({
            where: { id: row.entityId },
            select: { publicId: true },
          });
          entityPublicId = message?.publicId ?? row.entityId;
        }
        return {
          publicId: row.publicId,
          kind: 'CONTENT_REPORT' as const,
          entityType: row.entityType,
          entityPublicId,
          reason: row.reason,
          details: row.details,
          status: row.status,
          createdAt: toIso(row.createdAt)!,
          sortAt: row.createdAt,
          sortId: row.id,
        };
      }),
    );

    const merged = [...reviewItems, ...contentItems].sort((a, b) => {
      const byTime = b.sortAt.getTime() - a.sortAt.getTime();
      if (byTime !== 0) return byTime;
      return b.sortId.localeCompare(a.sortId);
    });
    const page = merged.slice(0, query.limit);
    const last = page[page.length - 1];

    return {
      reports: page.map(({ sortAt: _s, sortId: _i, ...item }) => item),
      nextCursor:
        merged.length > query.limit && last ? encodeCursor(last.sortAt, last.sortId) : null,
    };
  }

  async moderate(
    actor: AuthActor,
    publicId: string,
    body: ModerateReviewRequest,
    request?: AuthenticatedRequest,
  ): Promise<ReviewSummary> {
    if (!this.access.canModerate(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const review = await this.prisma.review.findFirst({
      where: { publicId },
      include: {
        author: { select: { publicId: true } },
        organization: { select: { publicId: true } },
        ratings: true,
      },
    });
    if (!review) {
      return await this.access.deny(actor, publicId, request);
    }

    const statusMap = {
      HIDE: 'HIDDEN',
      REJECT: 'REJECTED',
      RESTORE: 'PUBLISHED',
      FLAG: 'FLAGGED',
    } as const;

    const updated = await this.prisma.review.update({
      where: { id: review.id },
      data: {
        status: statusMap[body.action],
        moderatedAt: new Date(),
        moderatedByUserId: actor.userId,
        moderatorNotes: body.moderatorNotes ?? null,
        publishedAt:
          body.action === 'RESTORE' ? (review.publishedAt ?? new Date()) : review.publishedAt,
        version: { increment: 1 },
      },
      include: {
        author: { select: { publicId: true } },
        organization: { select: { publicId: true } },
        ratings: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'review.moderated',
      resourceType: 'review',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { action: body.action, status: updated.status },
    });

    const subjectPublicId = await this.resolveSubjectPublicId(
      updated.subjectType,
      updated.subjectId,
    );
    return this.toSummary(updated, subjectPublicId);
  }

  async trustScore(subjectType: ReviewSubjectType, subjectPublicId: string) {
    return this.trustScores.compute(subjectType, subjectPublicId);
  }

  private async resolveReviewableSubject(
    subjectType: ReviewSubjectType,
    subjectPublicId: string,
  ): Promise<{ id: string; organizationId: string | null; projectId?: string | null }> {
    if (subjectType === 'DEVELOPER') {
      const row = await this.prisma.developerProfile.findFirst({
        where: { publicId: subjectPublicId, status: 'ACTIVE' },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
      return { id: row.id, organizationId: row.organizationId };
    }
    if (subjectType === 'AGENT') {
      const row = await this.prisma.agencyProfile.findFirst({
        where: { publicId: subjectPublicId, status: 'ACTIVE' },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
      return { id: row.id, organizationId: row.organizationId };
    }
    if (subjectType === 'PROJECT') {
      const row = await this.prisma.project.findFirst({
        where: { publicId: subjectPublicId, deletedAt: null, lifecycleStatus: 'PUBLISHED' },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
      return { id: row.id, organizationId: row.organizationId, projectId: row.id };
    }
    const row = await this.prisma.property.findFirst({
      where: { publicId: subjectPublicId, deletedAt: null, publicationStatus: 'PUBLISHED' },
    });
    if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
    return { id: row.id, organizationId: row.organizationId, projectId: row.projectId };
  }

  private async resolveSubjectPublicId(
    subjectType: ReviewSubjectType,
    subjectId: string,
  ): Promise<string> {
    if (subjectType === 'DEVELOPER') {
      return (
        (
          await this.prisma.developerProfile.findFirst({
            where: { id: subjectId },
            select: { publicId: true },
          })
        )?.publicId ?? subjectId
      );
    }
    if (subjectType === 'AGENT') {
      return (
        (
          await this.prisma.agencyProfile.findFirst({
            where: { id: subjectId },
            select: { publicId: true },
          })
        )?.publicId ?? subjectId
      );
    }
    if (subjectType === 'PROJECT') {
      return (
        (
          await this.prisma.project.findFirst({
            where: { id: subjectId },
            select: { publicId: true },
          })
        )?.publicId ?? subjectId
      );
    }
    return (
      (
        await this.prisma.property.findFirst({
          where: { id: subjectId },
          select: { publicId: true },
        })
      )?.publicId ?? subjectId
    );
  }

  private toSummary(
    row: {
      publicId: string;
      author: { publicId: string };
      organization: { publicId: string } | null;
      subjectType: ReviewSubjectType;
      title: string | null;
      body: string;
      status: ReviewSummary['status'];
      overallRating: number;
      eligibilityBasis: string;
      publishedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      ratings: Array<{ dimension: ReviewSummary['ratings'][number]['dimension']; rating: number }>;
    },
    subjectPublicId: string,
  ): ReviewSummary {
    return {
      publicId: row.publicId,
      authorUserPublicId: row.author.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      subjectType: row.subjectType,
      subjectPublicId,
      title: row.title,
      body: row.body,
      status: row.status,
      overallRating: row.overallRating,
      eligibilityBasis: row.eligibilityBasis as ReviewEligibilityBasis,
      ratings: row.ratings.map((rating) => ({
        dimension: rating.dimension,
        rating: rating.rating,
      })),
      publishedAt: toIso(row.publishedAt),
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
