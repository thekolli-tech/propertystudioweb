import { Injectable } from '@nestjs/common';
import { type Permission } from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class VerificationAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  isPlatformAdmin(actor: AuthActor): boolean {
    return actorHasPermission(actor, 'platform:admin');
  }

  canManageAdmin(actor: AuthActor): boolean {
    return (
      this.isPlatformAdmin(actor) ||
      actorHasPermission(actor, 'admin:verification:manage') ||
      actorHasPermission(actor, 'verification:approve')
    );
  }

  canReadAdmin(actor: AuthActor): boolean {
    return (
      this.isPlatformAdmin(actor) ||
      actorHasPermission(actor, 'admin:verification:read') ||
      actorHasPermission(actor, 'admin:verification:manage') ||
      actorHasPermission(actor, 'verification:review')
    );
  }

  async requireOrganization(
    actor: AuthActor,
    organizationPublicId: string,
    permission: Permission,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.prisma.organization.findFirst({
      where: { publicId: organizationPublicId, status: 'ACTIVE' },
    });
    if (!organization) {
      return await this.deny(actor, organizationPublicId, request);
    }

    if (this.isPlatformAdmin(actor) || this.canManageAdmin(actor)) {
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
      return await this.deny(actor, organizationPublicId, request);
    }

    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    return organization;
  }

  async requireCaseAccess(
    actor: AuthActor,
    publicId: string,
    permission: Permission,
    request?: AuthenticatedRequest,
  ) {
    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: { publicId },
      include: {
        organization: true,
        documents: { include: { documentAsset: true } },
      },
    });
    if (!verificationCase) {
      return await this.deny(actor, publicId, request);
    }

    if (this.canReadAdmin(actor) || this.canManageAdmin(actor)) {
      return verificationCase;
    }

    if (!verificationCase.organizationId || !verificationCase.organization) {
      return await this.deny(actor, publicId, request);
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: verificationCase.organizationId,
        userId: actor.userId,
        status: 'ACTIVE',
      },
    });
    if (!membership) {
      return await this.deny(actor, publicId, request);
    }

    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    return verificationCase;
  }

  async deny(
    actor: AuthActor,
    resourceId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'verification',
      resourceId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
