import { Injectable } from '@nestjs/common';
import { type Permission } from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class CatalogAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  isPlatformAdmin(actor: AuthActor): boolean {
    return actorHasPermission(actor, 'platform:admin');
  }

  async requireDeveloperOrganization(
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

    if (organization.type !== 'DEVELOPER') {
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
      // Membership exists but permission missing — do not leak resource existence for strangers,
      // but for members a FORBIDDEN is clearer for UX.
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    return organization;
  }

  async canAccessProperty(
    actor: AuthActor,
    property: { id: string; organizationId: string },
  ): Promise<boolean> {
    if (this.isPlatformAdmin(actor)) {
      return true;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: property.organizationId,
        userId: actor.userId,
        status: 'ACTIVE',
      },
    });
    if (membership && actorHasPermission(actor, 'property:read')) {
      return true;
    }

    if (actor.platformRoles.includes('PROPERTY_ADMIN')) {
      const assignment = await this.prisma.resourceAssignment.findFirst({
        where: {
          userId: actor.userId,
          resourceType: 'PROPERTY',
          resourceId: property.id,
        },
      });
      return Boolean(assignment);
    }

    return false;
  }

  async requirePropertyAccess(
    actor: AuthActor,
    property: { id: string; organizationId: string; publicId: string },
    permission: Permission,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPlatformAdmin(actor)) {
      return;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: property.organizationId,
        userId: actor.userId,
        status: 'ACTIVE',
      },
    });

    if (membership) {
      if (!actorHasPermission(actor, permission)) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions.');
      }
      return;
    }

    if (
      actor.platformRoles.includes('PROPERTY_ADMIN') &&
      (permission === 'property:read' ||
        permission === 'property:update' ||
        permission === 'property:publish')
    ) {
      const assignment = await this.prisma.resourceAssignment.findFirst({
        where: {
          userId: actor.userId,
          resourceType: 'PROPERTY',
          resourceId: property.id,
        },
      });
      if (assignment && actorHasPermission(actor, permission)) {
        return;
      }
    }

    return await this.deny(actor, property.publicId, request);
  }

  async deny(
    actor: AuthActor,
    resourcePublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: actor.activeOrganizationId,
      action: 'authorization.denied',
      resourceType: 'catalog',
      resourceId: resourcePublicId,
      requestId: request?.requestId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent']?.toString(),
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
