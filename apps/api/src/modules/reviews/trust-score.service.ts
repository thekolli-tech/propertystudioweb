import { Injectable } from '@nestjs/common';
import {
  type ReviewSubjectType,
  type TrustScoreResponse,
} from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';

/**
 * Trust score formula (0–100 scale):
 * - Only PUBLISHED reviews are considered.
 * - If reviewCount < 3 → state INSUFFICIENT_DATA, score null.
 * - Else:
 *   score = round(((0.6 * overallAvg) + (0.25 * structuredAvg) + (0.15 * verificationComponent)) / 5 * 100)
 *   where verificationComponent is 5 if subject is VERIFIED, else 1.
 *   structuredAvg is the mean of all dimension ratings across published reviews.
 */
@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(subjectType: ReviewSubjectType, subjectPublicId: string): Promise<TrustScoreResponse> {
    const subject = await this.resolveSubject(subjectType, subjectPublicId);
    const reviews = await this.prisma.review.findMany({
      where: {
        subjectType,
        subjectId: subject.id,
        status: 'PUBLISHED',
      },
      include: { ratings: true },
    });

    const reviewCount = reviews.length;
    const overallAverage =
      reviewCount === 0
        ? null
        : reviews.reduce((sum, review) => sum + review.overallRating, 0) / reviewCount;

    const allRatings = reviews.flatMap((review) => review.ratings.map((rating) => rating.rating));
    const structuredAverage =
      allRatings.length === 0
        ? overallAverage
        : allRatings.reduce((sum, value) => sum + value, 0) / allRatings.length;

    const verified = subject.verified;
    const verificationComponent = verified ? 5 : 1;

    if (reviewCount < 3) {
      return {
        subjectType,
        subjectPublicId,
        state: 'INSUFFICIENT_DATA',
        score: null,
        reviewCount,
        overallAverage,
        structuredAverage,
        verificationComponent,
        verified,
        formula:
          'score = round(((0.6 * overallAvg) + (0.25 * structuredAvg) + (0.15 * verificationComponent)) / 5 * 100); insufficient if reviewCount < 3',
      };
    }

    const raw =
      ((0.6 * (overallAverage ?? 0)) +
        (0.25 * (structuredAverage ?? 0)) +
        0.15 * verificationComponent) /
      5;
    const score = Math.round(Math.min(5, Math.max(0, raw)) * 100);

    return {
      subjectType,
      subjectPublicId,
      state: 'READY',
      score,
      reviewCount,
      overallAverage,
      structuredAverage,
      verificationComponent,
      verified,
      formula:
        'score = round(((0.6 * overallAvg) + (0.25 * structuredAvg) + (0.15 * verificationComponent)) / 5 * 100); insufficient if reviewCount < 3',
    };
  }

  private async resolveSubject(
    subjectType: ReviewSubjectType,
    subjectPublicId: string,
  ): Promise<{ id: string; organizationId: string | null; verified: boolean }> {
    if (subjectType === 'DEVELOPER') {
      const row = await this.prisma.developerProfile.findFirst({
        where: { publicId: subjectPublicId, status: 'ACTIVE' },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
      return {
        id: row.id,
        organizationId: row.organizationId,
        verified: row.verificationStatus === 'VERIFIED',
      };
    }
    if (subjectType === 'AGENT') {
      const row = await this.prisma.agencyProfile.findFirst({
        where: { publicId: subjectPublicId, status: 'ACTIVE' },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
      return {
        id: row.id,
        organizationId: row.organizationId,
        verified: row.verificationStatus === 'VERIFIED',
      };
    }
    if (subjectType === 'PROJECT') {
      const row = await this.prisma.project.findFirst({
        where: { publicId: subjectPublicId, deletedAt: null, lifecycleStatus: 'PUBLISHED' },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
      return {
        id: row.id,
        organizationId: row.organizationId,
        verified: row.trustStatus === 'VERIFIED',
      };
    }
    const row = await this.prisma.property.findFirst({
      where: { publicId: subjectPublicId, deletedAt: null, publicationStatus: 'PUBLISHED' },
    });
    if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
    return {
      id: row.id,
      organizationId: row.organizationId,
      verified: row.trustStatus === 'VERIFIED',
    };
  }
}
