import { Injectable } from '@nestjs/common';
import { type ReviewEligibilityBasis, type ReviewSubjectType } from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

export type ReviewableSubject = {
  id: string;
  organizationId: string;
  subjectType: ReviewSubjectType;
  projectId?: string | null;
};

/**
 * Backend-authoritative review eligibility.
 * A generic authenticated account is never sufficient — a CRM relationship is required.
 */
@Injectable()
export class ReviewsAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  canModerate(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'reviews:moderate') ||
      actorHasPermission(actor, 'admin:reviews:manage')
    );
  }

  canReadAdmin(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:reviews:read') ||
      actorHasPermission(actor, 'admin:reviews:manage') ||
      actorHasPermission(actor, 'reviews:moderate')
    );
  }

  /**
   * Resolves eligibility for the actor against the subject.
   * Returns VERIFIED_CLIENT (BOOKED/CLOSED deal) or SITE_VISITOR (non-cancelled site visit).
   * Throws FORBIDDEN when no relationship exists.
   */
  async requireEligibility(
    actor: AuthActor,
    subject: ReviewableSubject,
    request?: AuthenticatedRequest,
  ): Promise<ReviewEligibilityBasis> {
    const buyerLead = { requirement: { ownerUserId: actor.userId } };

    const subjectScope =
      subject.subjectType === 'PROPERTY'
        ? { propertyId: subject.id }
        : subject.subjectType === 'PROJECT'
          ? {
              OR: [{ projectId: subject.id }, { property: { projectId: subject.id } }],
            }
          : {};

    const verifiedDeal = await this.prisma.crmDeal.findFirst({
      where: {
        organizationId: subject.organizationId,
        status: { in: ['BOOKED', 'CLOSED'] },
        lead: buyerLead,
        ...subjectScope,
      },
      select: { id: true },
    });
    if (verifiedDeal) {
      return 'VERIFIED_CLIENT';
    }

    const siteVisit = await this.prisma.crmSiteVisit.findFirst({
      where: {
        organizationId: subject.organizationId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
        lead: buyerLead,
        ...subjectScope,
      },
      select: { id: true },
    });
    if (siteVisit) {
      return 'SITE_VISITOR';
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: subject.organizationId,
      action: 'authorization.denied',
      resourceType: 'review',
      resourceId: subject.id,
      requestId: request?.requestId,
      metadata: {
        reason: 'review_eligibility_missing',
        subjectType: subject.subjectType,
      },
    });
    throw new AppError(
      'FORBIDDEN',
      'A verified client or site-visit relationship is required to review this subject.',
    );
  }

  async deny(actor: AuthActor, resourceId: string, request?: AuthenticatedRequest): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'review',
      resourceId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
