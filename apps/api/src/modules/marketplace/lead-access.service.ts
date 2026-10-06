import { Injectable } from '@nestjs/common';
import {
  type LeadAccessStatus,
  type LeadContactRevealResponse,
} from '@property-studio/contracts';
import { type Prisma } from '../../generated/prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class LeadAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
  ) {}

  canRevealBuyerContact(_input: { leadId: string; organizationId: string; actorUserId: string }): {
    allowed: boolean;
    reason: string;
  } {
    return {
      allowed: false,
      reason: 'Use revealContact with an authenticated actor and organization scope.',
    };
  }

  async getAccess(
    actor: AuthActor,
    leadPublicId: string,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<LeadAccessStatus> {
    if (!actorHasPermission(actor, 'leads:access') && !actorHasPermission(actor, 'platform:admin')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const { organization, lead, grant } = await this.loadGrantContext(
      actor,
      leadPublicId,
      organizationPublicId,
      request,
    );

    const accessState = grant?.accessState ?? null;
    const canReveal =
      Boolean(grant) &&
      ['PURCHASED', 'ACTIVE'].includes(grant!.accessState) &&
      !grant!.revokedAt &&
      (!grant!.expiresAt || grant!.expiresAt > new Date()) &&
      (actorHasPermission(actor, 'leads:contact:reveal') ||
        actorHasPermission(actor, 'platform:admin'));

    return {
      leadPublicId: lead.publicId,
      organizationPublicId: organization.publicId,
      accessState,
      grantPublicId: grant?.publicId ?? null,
      grantedAt: grant ? grant.grantedAt.toISOString() : null,
      expiresAt: grant?.expiresAt ? grant.expiresAt.toISOString() : null,
      lastRevealedAt: grant?.lastRevealedAt ? grant.lastRevealedAt.toISOString() : null,
      canReveal,
    };
  }

  async revealContact(
    actor: AuthActor,
    leadPublicId: string,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<LeadContactRevealResponse> {
    if (
      !actorHasPermission(actor, 'leads:contact:reveal') &&
      !actorHasPermission(actor, 'platform:admin')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const { organization, lead, grant } = await this.loadGrantContext(
      actor,
      leadPublicId,
      organizationPublicId,
      request,
    );

    if (
      !grant ||
      !['PURCHASED', 'ACTIVE'].includes(grant.accessState) ||
      grant.revokedAt ||
      (grant.expiresAt && grant.expiresAt <= new Date())
    ) {
      await this.deny(actor, leadPublicId, request);
    }

    const owner = await this.prisma.user.findFirst({
      where: { id: lead.requirement.ownerUserId },
      select: { email: true },
    });
    if (!owner?.email) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const revealedAt = new Date();
    const updated = await this.prisma.leadAccessGrant.update({
      where: { id: grant!.id },
      data: {
        accessState: 'ACTIVE',
        lastRevealedAt: revealedAt,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'lead.contact.revealed',
      resourceType: 'lead_access_grant',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      metadata: {
        leadPublicId: lead.publicId,
        grantPublicId: updated.publicId,
      },
    });

    const localPart = owner.email.split('@')[0] || 'Buyer';

    return {
      leadPublicId: lead.publicId,
      accessState: updated.accessState,
      revealedAt: revealedAt.toISOString(),
      contact: {
        email: owner.email,
        displayHint: localPart,
      },
    };
  }

  async grantFromPurchase(input: {
    organizationId: string;
    leadId: string;
    leadPurchaseId: string;
    requestingUserId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<{ id: string; publicId: string }> {
    const db = input.tx ?? this.prisma;
    const existing = await db.leadAccessGrant.findUnique({
      where: {
        organizationId_leadId: {
          organizationId: input.organizationId,
          leadId: input.leadId,
        },
      },
    });
    if (existing) {
      const updated = await db.leadAccessGrant.update({
        where: { id: existing.id },
        data: {
          leadPurchaseId: input.leadPurchaseId,
          accessState: 'ACTIVE',
          revokedAt: null,
          grantedAt: existing.grantedAt ?? new Date(),
        },
      });
      return { id: updated.id, publicId: updated.publicId };
    }

    const created = await db.leadAccessGrant.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextLeadAccessPublicId(),
        organizationId: input.organizationId,
        leadId: input.leadId,
        leadPurchaseId: input.leadPurchaseId,
        requestingUserId: input.requestingUserId,
        accessState: 'ACTIVE',
      },
    });
    return { id: created.id, publicId: created.publicId };
  }

  private async loadGrantContext(
    actor: AuthActor,
    leadPublicId: string,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.prisma.organization.findFirst({
      where: { publicId: organizationPublicId, status: 'ACTIVE' },
    });
    if (!organization) {
      return await this.deny(actor, organizationPublicId, request);
    }

    if (!actorHasPermission(actor, 'platform:admin')) {
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
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        publicId: leadPublicId,
        recipientOrganizationId: organization.id,
      },
      include: {
        requirement: { select: { ownerUserId: true } },
      },
    });
    if (!lead) {
      return await this.deny(actor, leadPublicId, request);
    }

    const grant = await this.prisma.leadAccessGrant.findUnique({
      where: {
        organizationId_leadId: {
          organizationId: organization.id,
          leadId: lead.id,
        },
      },
    });

    return { organization, lead, grant };
  }

  private async deny(
    actor: AuthActor,
    resourceId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'lead_access',
      resourceId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
