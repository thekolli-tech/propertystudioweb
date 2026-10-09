import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { AgentProfessionalAccessService } from '../agent-ops/agent-professional-access.service';

/**
 * Eligibility gate for marketplace lead receipt.
 *
 * Phase 7: role + verification.
 * Phase 15B: agencies also require non-expired verification + LEAD_MARKETPLACE_ACCESS entitlement.
 */
@Injectable()
export class LeadEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly agentAccess: AgentProfessionalAccessService,
  ) {}

  /**
   * Returns whether the organization may receive marketplace requirements/leads.
   * Developers are eligible when the org is ACTIVE.
   * Agencies require Verified Expert professional access + marketplace entitlement.
   */
  async canReceiveMarketplaceLeads(organizationId: string): Promise<{
    eligible: boolean;
    reason: string | null;
  }> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, status: 'ACTIVE' },
      include: { agencyProfile: true, developerProfile: true },
    });

    if (!organization) {
      return { eligible: false, reason: 'Organization not found or inactive.' };
    }

    if (organization.type === 'DEVELOPER') {
      if (!organization.developerProfile || organization.developerProfile.status !== 'ACTIVE') {
        return { eligible: false, reason: 'Developer profile is not active.' };
      }
      return { eligible: true, reason: null };
    }

    if (organization.type === 'AGENCY') {
      return this.agentAccess.requireMarketplaceAccess(organizationId);
    }

    return { eligible: false, reason: 'Organization type is not eligible.' };
  }

  async requireEligibleOrganization(
    actor: AuthActor,
    organizationPublicId: string,
    permission: 'requirement:read:marketplace' | 'lead:read' | 'lead:update' | 'lead:assign',
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.prisma.organization.findFirst({
      where: { publicId: organizationPublicId, status: 'ACTIVE' },
      include: { agencyProfile: true, developerProfile: true },
    });

    if (!organization) {
      return await this.deny(actor, organizationPublicId, request);
    }

    if (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:leads:read')
    ) {
      const eligibility = await this.canReceiveMarketplaceLeads(organization.id);
      return { organization, eligibility };
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: organization.id,
        userId: actor.userId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      return await this.deny(actor, organizationPublicId, request);
    }

    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const eligibility = await this.canReceiveMarketplaceLeads(organization.id);
    return { organization, eligibility };
  }

  private async deny(
    actor: AuthActor,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'marketplace',
      resourceId: organizationPublicId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
