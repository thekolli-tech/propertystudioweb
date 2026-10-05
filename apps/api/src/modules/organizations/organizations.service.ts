import { Injectable } from '@nestjs/common';
import {
  type AddOrganizationMemberRequest,
  type CreateOrganizationRequest,
  type OrganizationMembersResponse,
  type OrganizationSummary,
} from '@property-studio/contracts';
import {
  ORGANIZATION_TYPE_ROLES,
  organizationRoleHasPermission,
  type OrganizationRole,
  type OrganizationType,
} from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { SessionService } from '../../common/auth/session.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actor: AuthActor,
    input: CreateOrganizationRequest,
    request: AuthenticatedRequest,
  ): Promise<OrganizationSummary> {
    const ownerRole = this.ownerRoleForType(input.type);
    const organizationId = newUuid();
    const publicId = await this.publicIds.nextOrganizationPublicId();

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.create({
        data: {
          id: organizationId,
          publicId,
          name: input.name,
          type: input.type,
          status: 'ACTIVE',
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });
      await tx.organizationMembership.create({
        data: {
          id: newUuid(),
          organizationId,
          userId: actor.userId,
          role: ownerRole,
          status: 'ACTIVE',
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });
    });

    await this.sessions.setActiveOrganization(actor.sessionId, organizationId);

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: publicId,
      requestId: request.requestId,
      after: { name: input.name, type: input.type, role: ownerRole },
    });

    return {
      publicId,
      name: input.name,
      type: input.type,
      status: 'ACTIVE',
      role: ownerRole,
    };
  }

  async listMine(actor: AuthActor): Promise<{ organizations: OrganizationSummary[] }> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        userId: actor.userId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      organizations: memberships.map((membership) => ({
        publicId: membership.organization.publicId,
        name: membership.organization.name,
        type: membership.organization.type,
        status: membership.organization.status,
        role: membership.role,
      })),
    };
  }

  async getOne(actor: AuthActor, organizationPublicId: string): Promise<OrganizationSummary> {
    const organization = await this.requireMembership(actor, organizationPublicId);
    return {
      publicId: organization.publicId,
      name: organization.name,
      type: organization.type,
      status: organization.status,
      role: organization.membershipRole,
    };
  }

  async switchActive(
    actor: AuthActor,
    organizationPublicId: string,
    request: AuthenticatedRequest,
  ): Promise<{ activeOrganizationPublicId: string }> {
    const organization = await this.requireMembership(actor, organizationPublicId);
    await this.sessions.setActiveOrganization(actor.sessionId, organization.id);

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'organization.switched',
      resourceType: 'organization',
      resourceId: organization.publicId,
      requestId: request.requestId,
      before: { activeOrganizationPublicId: actor.activeOrganizationPublicId },
      after: { activeOrganizationPublicId: organization.publicId },
    });

    return { activeOrganizationPublicId: organization.publicId };
  }

  async addMember(
    actor: AuthActor,
    organizationPublicId: string,
    input: AddOrganizationMemberRequest,
    request: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    const organization = await this.requireMembership(actor, organizationPublicId, [
      'organization:members:manage',
      'organization:manage',
    ]);

    const allowedRoles = ORGANIZATION_TYPE_ROLES[organization.type as OrganizationType];
    if (!allowedRoles.includes(input.role)) {
      throw new AppError('VALIDATION_ERROR', 'Role is not valid for this organization type.');
    }

    const user = await this.prisma.user.findUnique({ where: { publicId: input.userPublicId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    await this.prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      create: {
        id: newUuid(),
        organizationId: organization.id,
        userId: user.id,
        role: input.role,
        status: 'ACTIVE',
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      update: {
        role: input.role,
        status: 'ACTIVE',
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'organization.member_added',
      resourceType: 'organization',
      resourceId: organization.publicId,
      requestId: request.requestId,
      after: { userPublicId: user.publicId, role: input.role },
    });

    return { ok: true };
  }

  async listMembers(
    actor: AuthActor,
    organizationPublicId: string,
  ): Promise<OrganizationMembersResponse> {
    const organization = await this.requireMembership(actor, organizationPublicId);

    const members = await this.prisma.organizationMembership.findMany({
      where: { organizationId: organization.id },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      members: members.map((member) => ({
        userPublicId: member.user.publicId,
        email: member.user.email,
        role: member.role,
        status: member.status,
      })),
    };
  }

  /**
   * Tenant isolation helper used by security tests and future domain modules.
   * Outside membership + missing org both resolve to NOT_FOUND.
   */
  async requireMembership(
    actor: AuthActor,
    organizationPublicId: string,
    requiredPermissions: Array<
      'organization:read' | 'organization:manage' | 'organization:members:manage'
    > = ['organization:read'],
  ): Promise<{
    id: string;
    publicId: string;
    name: string;
    type: OrganizationType;
    status: 'ACTIVE' | 'DISABLED';
    membershipRole: OrganizationRole;
  }> {
    const organization = await this.prisma.organization.findUnique({
      where: { publicId: organizationPublicId },
      include: {
        memberships: {
          where: { userId: actor.userId, status: 'ACTIVE' },
        },
      },
    });

    const membership = organization?.memberships[0];
    const isPlatform =
      actor.permissions.has('platform:admin') || actor.platformRoles.includes('SUPER_ADMIN');

    if (!organization || organization.status !== 'ACTIVE' || (!membership && !isPlatform)) {
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        action: 'authorization.denied',
        resourceType: 'organization',
        resourceId: organizationPublicId,
        metadata: { reason: 'not_found_or_out_of_scope' },
      });
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    if (!isPlatform) {
      const role = membership!.role as OrganizationRole;
      const allowed = requiredPermissions.some((permission) =>
        organizationRoleHasPermission(role, permission),
      );
      // Platform permissions already collected on actor may also satisfy.
      const actorAllowed = requiredPermissions.some((permission) =>
        actor.permissions.has(permission),
      );
      if (!allowed && !actorAllowed) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions.');
      }
      return {
        id: organization.id,
        publicId: organization.publicId,
        name: organization.name,
        type: organization.type,
        status: organization.status,
        membershipRole: role,
      };
    }

    return {
      id: organization.id,
      publicId: organization.publicId,
      name: organization.name,
      type: organization.type,
      status: organization.status,
      membershipRole: (membership?.role as OrganizationRole) ?? 'DEVELOPER',
    };
  }

  private ownerRoleForType(type: OrganizationType): OrganizationRole {
    return type === 'DEVELOPER' ? 'DEVELOPER' : 'AGENT';
  }
}
