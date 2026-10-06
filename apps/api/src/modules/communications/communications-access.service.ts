import { Injectable } from '@nestjs/common';
import { type Permission } from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

@Injectable()
export class CommunicationsAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  canModerate(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'communications:moderate') ||
      actorHasPermission(actor, 'admin:communications:moderate')
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
      return await this.deny(actor, organizationPublicId, request);
    }

    if (!actorHasPermission(actor, permission)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    return organization;
  }

  async requireParticipant(
    actor: AuthActor,
    conversationPublicId: string,
    request?: AuthenticatedRequest,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { publicId: conversationPublicId },
      include: {
        organization: true,
        lead: true,
        participants: { include: { user: { select: { id: true, publicId: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { publicId: true } } },
        },
      },
    });
    if (!conversation) {
      return await this.deny(actor, conversationPublicId, request);
    }

    if (this.canModerate(actor)) {
      return conversation;
    }

    const participant = conversation.participants.find((row) => row.userId === actor.userId);
    if (!participant) {
      return await this.deny(actor, conversationPublicId, request);
    }

    return conversation;
  }

  async deny(actor: AuthActor, resourceId: string, request?: AuthenticatedRequest): Promise<never> {
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'authorization.denied',
      resourceType: 'conversation',
      resourceId,
      requestId: request?.requestId,
      metadata: { reason: 'out_of_scope_or_missing' },
    });
    throw new AppError('NOT_FOUND', 'Resource not found.');
  }
}
