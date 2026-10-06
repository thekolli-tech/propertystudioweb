import { Injectable } from '@nestjs/common';
import { type Permission } from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class CrmAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  isPlatformAdmin(actor: AuthActor): boolean {
    return actorHasPermission(actor, 'platform:admin');
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

    if (this.isPlatformAdmin(actor)) {
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

  async requireOrgMemberUser(
    organizationId: string,
    userPublicId: string,
  ): Promise<{ id: string; publicId: string }> {
    const user = await this.prisma.user.findFirst({
      where: { publicId: userPublicId },
      select: { id: true, publicId: true },
    });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });
    if (!membership) {
      throw new AppError('VALIDATION_ERROR', 'Assignee must belong to the organization.');
    }
    return user;
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
      resourceType: 'crm',
      resourceId: organizationPublicId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
