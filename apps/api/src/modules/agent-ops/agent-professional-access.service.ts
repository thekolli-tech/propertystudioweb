import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000;
const ACTIVE_SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE'] as const;

@Injectable()
export class AgentProfessionalAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Local entitlement read — avoids importing BillingModule (circular with Marketplace). */
  private async hasLeadMarketplaceEntitlement(organizationId: string): Promise<boolean> {
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: {
        organizationId,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
        currentPeriodEnd: { gt: new Date() },
      },
      include: {
        plan: {
          include: {
            entitlements: { where: { enabled: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Boolean(
      subscription?.plan.entitlements.some((row) => row.key === 'LEAD_MARKETPLACE_ACCESS'),
    );
  }

  /**
   * Authoritative professional access for agency organizations.
   * VERIFIED + not expired + not suspended. Payment alone never grants this.
   */
  async evaluateAgency(organizationId: string): Promise<{
    eligible: boolean;
    reason: string | null;
    verificationStatus: string | null;
    expiresAt: Date | null;
    renewalStatus: 'NOT_APPLICABLE' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED';
    verifiedBadge: boolean;
  }> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, status: 'ACTIVE' },
      include: { agencyProfile: true },
    });

    if (!organization || organization.type !== 'AGENCY' || !organization.agencyProfile) {
      return {
        eligible: false,
        reason: 'Not an active agency organization.',
        verificationStatus: null,
        expiresAt: null,
        renewalStatus: 'NOT_APPLICABLE',
        verifiedBadge: false,
      };
    }

    const profile = organization.agencyProfile;
    if (profile.status !== 'ACTIVE') {
      return {
        eligible: false,
        reason: 'Agency profile is not active.',
        verificationStatus: profile.verificationStatus,
        expiresAt: profile.verificationExpiresAt,
        renewalStatus: 'NOT_APPLICABLE',
        verifiedBadge: false,
      };
    }

    if (profile.verificationStatus === 'SUSPENDED') {
      return {
        eligible: false,
        reason: 'Agency verification is suspended.',
        verificationStatus: 'SUSPENDED',
        expiresAt: profile.verificationExpiresAt,
        renewalStatus: 'SUSPENDED',
        verifiedBadge: false,
      };
    }

    if (profile.verificationStatus !== 'VERIFIED') {
      return {
        eligible: false,
        reason: `Agency verification status is ${profile.verificationStatus}.`,
        verificationStatus: profile.verificationStatus,
        expiresAt: profile.verificationExpiresAt,
        renewalStatus: 'NOT_APPLICABLE',
        verifiedBadge: false,
      };
    }

    const expiresAt = profile.verificationExpiresAt;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      return {
        eligible: false,
        reason: 'Agency verification has expired.',
        verificationStatus: 'VERIFIED',
        expiresAt,
        renewalStatus: 'EXPIRED',
        verifiedBadge: false,
      };
    }

    let renewalStatus: 'ACTIVE' | 'EXPIRING_SOON' = 'ACTIVE';
    if (expiresAt && expiresAt.getTime() - Date.now() <= EXPIRING_SOON_MS) {
      renewalStatus = 'EXPIRING_SOON';
    }

    return {
      eligible: true,
      reason: null,
      verificationStatus: 'VERIFIED',
      expiresAt,
      renewalStatus,
      verifiedBadge: true,
    };
  }

  async requireListingOrganization(
    actor: AuthActor,
    organizationPublicId: string,
    permission: 'property:create' | 'property:update' | 'property:publish' | 'property:read',
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.prisma.organization.findFirst({
      where: { publicId: organizationPublicId, status: 'ACTIVE' },
      include: { agencyProfile: true, developerProfile: true },
    });

    if (!organization) {
      return await this.deny(actor, organizationPublicId, request, 'listing_org_missing');
    }

    if (actorHasPermission(actor, 'platform:admin')) {
      return organization;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: organization.id,
        userId: actor.userId,
        status: 'ACTIVE',
      },
    });
    if (!membership) {
      return await this.deny(actor, organizationPublicId, request, 'listing_not_member');
    }
    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    if (organization.type === 'DEVELOPER') {
      return organization;
    }

    if (organization.type === 'AGENCY') {
      const evaluation = await this.evaluateAgency(organization.id);
      if (!evaluation.eligible) {
        await this.audit.write({
          actorUserId: actor.userId,
          sessionId: actor.sessionId,
          organizationId: organization.id,
          action: 'agent.listing.denied',
          resourceType: 'organization',
          resourceId: organization.publicId,
          requestId: request?.requestId,
          metadata: { reason: evaluation.reason, permission },
        });
        throw new AppError(
          'FORBIDDEN',
          evaluation.reason ?? 'Verified Expert status required for professional listings.',
        );
      }
      return organization;
    }

    return await this.deny(actor, organizationPublicId, request, 'listing_org_type');
  }

  async requireMarketplaceAccess(
    organizationId: string,
  ): Promise<{ eligible: boolean; reason: string | null }> {
    const evaluation = await this.evaluateAgency(organizationId);
    if (!evaluation.eligible) {
      return { eligible: false, reason: evaluation.reason };
    }
    const hasEntitlement = await this.hasLeadMarketplaceEntitlement(organizationId);
    if (!hasEntitlement) {
      return {
        eligible: false,
        reason: 'LEAD_MARKETPLACE_ACCESS entitlement required.',
      };
    }
    return { eligible: true, reason: null };
  }

  /**
   * Gate agency-member listing mutations (update/publish/media/docs/delete).
   * Developers and platform admins are unaffected.
   * PROPERTY_ADMIN assignment-scoped actors (no org membership) remain assignment-gated only.
   */
  async assertAgencyMemberListingMutation(
    actor: AuthActor,
    organization: { id: string; type: string; publicId: string },
    permission: 'property:create' | 'property:update' | 'property:publish' | 'property:read',
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (organization.type !== 'AGENCY') {
      return;
    }
    if (actorHasPermission(actor, 'platform:admin')) {
      return;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: organization.id,
        userId: actor.userId,
        status: 'ACTIVE',
      },
    });
    if (!membership) {
      // PROPERTY_ADMIN (or other assignment-scoped actor) — no professional gate here.
      return;
    }

    const evaluation = await this.evaluateAgency(organization.id);
    if (evaluation.eligible) {
      return;
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'agent.listing.denied',
      resourceType: 'organization',
      resourceId: organization.publicId,
      requestId: request?.requestId,
      metadata: { reason: evaluation.reason, permission, path: 'mutation' },
    });
    throw new AppError(
      'FORBIDDEN',
      evaluation.reason ?? 'Verified Expert status required for professional listings.',
    );
  }

  /** Throws FORBIDDEN when an agency org lacks professional + marketplace eligibility. */
  async assertMarketplaceProfessionalAccess(
    organizationId: string,
    organizationPublicId: string,
    actor: AuthActor,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
    });
    if (!organization || organization.type !== 'AGENCY') {
      return;
    }
    if (actorHasPermission(actor, 'platform:admin')) {
      return;
    }

    const marketplace = await this.requireMarketplaceAccess(organizationId);
    if (marketplace.eligible) {
      return;
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'agent.marketplace.denied',
      resourceType: 'organization',
      resourceId: organizationPublicId,
      requestId: request?.requestId,
      metadata: { reason: marketplace.reason },
    });
    throw new AppError(
      'FORBIDDEN',
      marketplace.reason ?? 'Verified Expert and marketplace entitlement required.',
    );
  }

  private async deny(
    actor: AuthActor,
    resourcePublicId: string,
    request: AuthenticatedRequest | undefined,
    reason: string,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: actor.activeOrganizationId,
      action: 'authorization.denied',
      resourceType: 'agent_ops',
      resourceId: resourcePublicId,
      requestId: request?.requestId,
      metadata: { reason },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
