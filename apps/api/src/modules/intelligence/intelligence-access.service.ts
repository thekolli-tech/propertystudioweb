import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class IntelligenceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  isPlatformAdmin(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:intelligence:read') ||
      actorHasPermission(actor, 'admin:intelligence:manage')
    );
  }

  canReadIntelligence(actor: AuthActor): boolean {
    return (
      this.isPlatformAdmin(actor) ||
      actorHasPermission(actor, 'intelligence:read') ||
      actorHasPermission(actor, 'admin:intelligence:read')
    );
  }

  canCompare(actor: AuthActor): boolean {
    return (
      this.isPlatformAdmin(actor) ||
      actorHasPermission(actor, 'intelligence:compare') ||
      actorHasPermission(actor, 'admin:intelligence:read')
    );
  }

  canMatch(actor: AuthActor): boolean {
    return (
      this.isPlatformAdmin(actor) ||
      actorHasPermission(actor, 'intelligence:match') ||
      actorHasPermission(actor, 'admin:intelligence:read')
    );
  }

  canAdminRead(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:intelligence:read') ||
      actorHasPermission(actor, 'admin:intelligence:manage')
    );
  }

  async isOrgMember(actor: AuthActor, organizationId: string): Promise<boolean> {
    if (this.isPlatformAdmin(actor)) {
      return true;
    }
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        userId: actor.userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  /**
   * Published catalog is readable with intelligence:read.
   * Unpublished resources require org membership (or admin).
   */
  async requirePropertyIntelligenceAccess(
    actor: AuthActor,
    property: {
      id: string;
      publicId: string;
      organizationId: string;
      publicationStatus: string;
    },
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (!this.canReadIntelligence(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    if (property.publicationStatus === 'PUBLISHED') {
      return;
    }
    if (await this.isOrgMember(actor, property.organizationId)) {
      return;
    }
    return await this.deny(actor, property.publicId, 'property', request);
  }

  async requireProjectIntelligenceAccess(
    actor: AuthActor,
    project: {
      id: string;
      publicId: string;
      organizationId: string;
      lifecycleStatus: string;
    },
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (!this.canReadIntelligence(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    if (project.lifecycleStatus === 'PUBLISHED') {
      return;
    }
    if (await this.isOrgMember(actor, project.organizationId)) {
      return;
    }
    return await this.deny(actor, project.publicId, 'project', request);
  }

  async deny(
    actor: AuthActor,
    resourcePublicId: string,
    resourceType = 'intelligence',
    request?: AuthenticatedRequest,
  ): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: actor.activeOrganizationId,
      action: 'authorization.denied',
      resourceType,
      resourceId: resourcePublicId,
      requestId: request?.requestId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent']?.toString(),
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
