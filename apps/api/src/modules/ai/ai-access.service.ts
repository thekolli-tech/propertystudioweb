import { Injectable } from '@nestjs/common';
import { type Permission } from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class AiAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  canUse(actor: AuthActor, permission: Permission): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:ai:manage') ||
      actorHasPermission(actor, permission)
    );
  }

  canAdminRead(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:ai:read') ||
      actorHasPermission(actor, 'admin:ai:manage')
    );
  }

  requirePermission(actor: AuthActor, permission: Permission): void {
    if (!this.canUse(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  async isOrgMember(actor: AuthActor, organizationId: string): Promise<boolean> {
    if (actorHasPermission(actor, 'platform:admin')) {
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

  async deny(
    actor: AuthActor,
    resourcePublicId: string,
    resourceType = 'ai',
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
