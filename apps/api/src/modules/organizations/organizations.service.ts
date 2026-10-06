import { Injectable } from '@nestjs/common';
import {
  type AddOrganizationMemberRequest,
  type AgencyProfile,
  type CreateOrganizationRequest,
  type DeveloperProfile,
  type OnboardOrganizationRequest,
  type OnboardOrganizationResponse,
  type OrganizationDetail,
  type OrganizationMembersResponse,
  type OrganizationSummary,
  type PublicAgencyProfile,
  type PublicDeveloperProfile,
  type UpdateAgencyProfileRequest,
  type UpdateDeveloperProfileRequest,
  type UpdateOrganizationMemberRequest,
  type UpdateOrganizationRequest,
} from '@property-studio/contracts';
import {
  ORGANIZATION_TYPE_ROLES,
  organizationRoleHasPermission,
  type OrganizationRole,
  type OrganizationType,
} from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { SessionService } from '../../common/auth/session.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { type AuthActor } from '../../common/tenancy/access-scope';

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly storage: ObjectStorageService,
  ) {}

  async create(
    actor: AuthActor,
    input: CreateOrganizationRequest,
    request: AuthenticatedRequest,
  ): Promise<OrganizationSummary> {
    // Legacy create without profile — prefer onboard() for Phase 4+.
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

  async onboard(
    actor: AuthActor,
    input: OnboardOrganizationRequest,
    request: AuthenticatedRequest,
  ): Promise<OnboardOrganizationResponse> {
    const ownerRole = this.ownerRoleForType(input.type);
    const organizationId = newUuid();
    const organizationPublicId = await this.publicIds.nextOrganizationPublicId();
    const profileId = newUuid();

    let developerProfile: DeveloperProfile | undefined;
    let agencyProfile: AgencyProfile | undefined;

    if (input.type === 'DEVELOPER') {
      const profilePublicId = await this.publicIds.nextDeveloperPublicId();
      const logoObjectKey = this.storage.organizationLogoKey(organizationPublicId);

      await this.prisma.$transaction(async (tx) => {
        await tx.organization.create({
          data: {
            id: organizationId,
            publicId: organizationPublicId,
            name: input.name,
            type: 'DEVELOPER',
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
        const created = await tx.developerProfile.create({
          data: {
            id: profileId,
            organizationId,
            publicId: profilePublicId,
            legalName: input.profile.legalName,
            displayName: input.profile.displayName,
            description: emptyToNull(input.profile.description),
            logoObjectKey: null,
            website: emptyToNull(input.profile.website),
            contactEmail: emptyToNull(input.profile.contactEmail),
            contactPhone: emptyToNull(input.profile.contactPhone),
            headquartersCity: emptyToNull(input.profile.headquartersCity),
            headquartersState: emptyToNull(input.profile.headquartersState),
            operatingZones: input.profile.operatingZones ?? [],
            status: 'ACTIVE',
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        });
        developerProfile = this.toDeveloperProfile(created, organizationPublicId);
        void logoObjectKey;
      });
    } else {
      const profilePublicId = await this.publicIds.nextAgencyPublicId();

      await this.prisma.$transaction(async (tx) => {
        await tx.organization.create({
          data: {
            id: organizationId,
            publicId: organizationPublicId,
            name: input.name,
            type: 'AGENCY',
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
        const created = await tx.agencyProfile.create({
          data: {
            id: profileId,
            organizationId,
            publicId: profilePublicId,
            legalName: input.profile.legalName,
            displayName: input.profile.displayName,
            description: emptyToNull(input.profile.description),
            logoObjectKey: null,
            website: emptyToNull(input.profile.website),
            contactEmail: emptyToNull(input.profile.contactEmail),
            contactPhone: emptyToNull(input.profile.contactPhone),
            headquartersCity: emptyToNull(input.profile.headquartersCity),
            headquartersState: emptyToNull(input.profile.headquartersState),
            operatingZones: input.profile.operatingZones ?? [],
            specialization: emptyToNull(input.profile.specialization),
            verificationStatus: 'UNVERIFIED',
            status: 'ACTIVE',
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        });
        agencyProfile = this.toAgencyProfile(created, organizationPublicId);
      });
    }

    await this.sessions.setActiveOrganization(actor.sessionId, organizationId);

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: organizationPublicId,
      requestId: request.requestId,
      after: { name: input.name, type: input.type, role: ownerRole },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: input.type === 'DEVELOPER' ? 'developer_profile.created' : 'agency_profile.created',
      resourceType: input.type === 'DEVELOPER' ? 'developer_profile' : 'agency_profile',
      resourceId: input.type === 'DEVELOPER' ? developerProfile!.publicId : agencyProfile!.publicId,
      requestId: request.requestId,
      after: {
        displayName: input.profile.displayName,
        legalName: input.profile.legalName,
      },
    });

    const now = new Date().toISOString();
    return {
      organization: {
        publicId: organizationPublicId,
        name: input.name,
        type: input.type,
        status: 'ACTIVE',
        role: ownerRole,
        profilePublicId:
          input.type === 'DEVELOPER' ? developerProfile!.publicId : agencyProfile!.publicId,
        createdAt: now,
        updatedAt: now,
      },
      developerProfile,
      agencyProfile,
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

  async getOne(actor: AuthActor, organizationPublicId: string): Promise<OrganizationDetail> {
    const organization = await this.requireMembership(actor, organizationPublicId);
    const profilePublicId = await this.resolveProfilePublicId(organization.id, organization.type);
    const row = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });

    return {
      publicId: organization.publicId,
      name: organization.name,
      type: organization.type,
      status: organization.status,
      role: organization.membershipRole,
      profilePublicId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateOrganization(
    actor: AuthActor,
    organizationPublicId: string,
    input: UpdateOrganizationRequest,
    request: AuthenticatedRequest,
  ): Promise<OrganizationDetail> {
    const organization = await this.requireMembership(actor, organizationPublicId, [
      'organization:manage',
    ]);

    const updated = await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'organization.updated',
      resourceType: 'organization',
      resourceId: organization.publicId,
      requestId: request.requestId,
      after: { name: updated.name },
    });

    return this.getOne(actor, organizationPublicId);
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

  async getDeveloperProfile(
    actor: AuthActor,
    organizationPublicId: string,
  ): Promise<DeveloperProfile> {
    const organization = await this.requireMembership(actor, organizationPublicId);
    if (organization.type !== 'DEVELOPER') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    const profile = await this.prisma.developerProfile.findUnique({
      where: { organizationId: organization.id },
    });
    if (!profile || profile.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return this.toDeveloperProfile(profile, organization.publicId);
  }

  async updateDeveloperProfile(
    actor: AuthActor,
    organizationPublicId: string,
    input: UpdateDeveloperProfileRequest,
    request: AuthenticatedRequest,
  ): Promise<DeveloperProfile> {
    const organization = await this.requireMembership(actor, organizationPublicId, [
      'organization:manage',
    ]);
    if (organization.type !== 'DEVELOPER') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const existing = await this.prisma.developerProfile.findUnique({
      where: { organizationId: organization.id },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const updated = await this.prisma.developerProfile.update({
      where: { id: existing.id },
      data: {
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {}),
        ...(input.website !== undefined ? { website: emptyToNull(input.website) } : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmail: emptyToNull(input.contactEmail) }
          : {}),
        ...(input.contactPhone !== undefined
          ? { contactPhone: emptyToNull(input.contactPhone) }
          : {}),
        ...(input.headquartersCity !== undefined
          ? { headquartersCity: emptyToNull(input.headquartersCity) }
          : {}),
        ...(input.headquartersState !== undefined
          ? { headquartersState: emptyToNull(input.headquartersState) }
          : {}),
        ...(input.operatingZones !== undefined ? { operatingZones: input.operatingZones } : {}),
        ...(input.logoObjectKey !== undefined
          ? { logoObjectKey: emptyToNull(input.logoObjectKey) }
          : {}),
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'developer_profile.updated',
      resourceType: 'developer_profile',
      resourceId: updated.publicId,
      requestId: request.requestId,
      after: { displayName: updated.displayName, legalName: updated.legalName },
    });

    return this.toDeveloperProfile(updated, organization.publicId);
  }

  async getAgencyProfile(actor: AuthActor, organizationPublicId: string): Promise<AgencyProfile> {
    const organization = await this.requireMembership(actor, organizationPublicId);
    if (organization.type !== 'AGENCY') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    const profile = await this.prisma.agencyProfile.findUnique({
      where: { organizationId: organization.id },
    });
    if (!profile || profile.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    return this.toAgencyProfile(profile, organization.publicId);
  }

  async updateAgencyProfile(
    actor: AuthActor,
    organizationPublicId: string,
    input: UpdateAgencyProfileRequest,
    request: AuthenticatedRequest,
  ): Promise<AgencyProfile> {
    const organization = await this.requireMembership(actor, organizationPublicId, [
      'organization:manage',
    ]);
    if (organization.type !== 'AGENCY') {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const existing = await this.prisma.agencyProfile.findUnique({
      where: { organizationId: organization.id },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const updated = await this.prisma.agencyProfile.update({
      where: { id: existing.id },
      data: {
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {}),
        ...(input.website !== undefined ? { website: emptyToNull(input.website) } : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmail: emptyToNull(input.contactEmail) }
          : {}),
        ...(input.contactPhone !== undefined
          ? { contactPhone: emptyToNull(input.contactPhone) }
          : {}),
        ...(input.headquartersCity !== undefined
          ? { headquartersCity: emptyToNull(input.headquartersCity) }
          : {}),
        ...(input.headquartersState !== undefined
          ? { headquartersState: emptyToNull(input.headquartersState) }
          : {}),
        ...(input.operatingZones !== undefined ? { operatingZones: input.operatingZones } : {}),
        ...(input.specialization !== undefined
          ? { specialization: emptyToNull(input.specialization) }
          : {}),
        ...(input.logoObjectKey !== undefined
          ? { logoObjectKey: emptyToNull(input.logoObjectKey) }
          : {}),
        updatedBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'agency_profile.updated',
      resourceType: 'agency_profile',
      resourceId: updated.publicId,
      requestId: request.requestId,
      after: { displayName: updated.displayName, legalName: updated.legalName },
    });

    return this.toAgencyProfile(updated, organization.publicId);
  }

  async getPublicDeveloperProfile(publicId: string): Promise<PublicDeveloperProfile> {
    const profile = await this.prisma.developerProfile.findUnique({
      where: { publicId },
      include: { organization: true },
    });
    if (
      !profile ||
      profile.status !== 'ACTIVE' ||
      profile.organization.status !== 'ACTIVE' ||
      profile.organization.type !== 'DEVELOPER'
    ) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    return {
      publicId: profile.publicId,
      organizationPublicId: profile.organization.publicId,
      displayName: profile.displayName,
      description: profile.description,
      website: profile.website,
      headquartersCity: profile.headquartersCity,
      headquartersState: profile.headquartersState,
      operatingZones: profile.operatingZones,
      verificationStatus: profile.verificationStatus,
      verifiedBadge: profile.verificationStatus === 'VERIFIED',
    };
  }

  async getPublicAgencyProfile(publicId: string): Promise<PublicAgencyProfile> {
    const profile = await this.prisma.agencyProfile.findUnique({
      where: { publicId },
      include: { organization: true },
    });
    if (
      !profile ||
      profile.status !== 'ACTIVE' ||
      profile.organization.status !== 'ACTIVE' ||
      profile.organization.type !== 'AGENCY'
    ) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    return {
      publicId: profile.publicId,
      organizationPublicId: profile.organization.publicId,
      displayName: profile.displayName,
      description: profile.description,
      website: profile.website,
      headquartersCity: profile.headquartersCity,
      headquartersState: profile.headquartersState,
      operatingZones: profile.operatingZones,
      specialization: profile.specialization,
      verificationStatus: profile.verificationStatus,
      verifiedBadge: profile.verificationStatus === 'VERIFIED',
    };
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
      action: 'organization.member_invited',
      resourceType: 'organization',
      resourceId: organization.publicId,
      requestId: request.requestId,
      after: { userPublicId: user.publicId, role: input.role },
    });

    return { ok: true };
  }

  async updateMember(
    actor: AuthActor,
    organizationPublicId: string,
    memberUserPublicId: string,
    input: UpdateOrganizationMemberRequest,
    request: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    const organization = await this.requireMembership(actor, organizationPublicId, [
      'organization:members:manage',
      'organization:manage',
    ]);

    if (input.role) {
      const allowedRoles = ORGANIZATION_TYPE_ROLES[organization.type as OrganizationType];
      if (!allowedRoles.includes(input.role)) {
        throw new AppError('VALIDATION_ERROR', 'Role is not valid for this organization type.');
      }
    }

    const user = await this.prisma.user.findUnique({ where: { publicId: memberUserPublicId } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
    });
    if (!membership) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    // Prevent owners from disabling their own last active owner membership casually.
    if (user.id === actor.userId && input.status === 'DISABLED') {
      throw new AppError('VALIDATION_ERROR', 'You cannot deactivate your own membership.');
    }

    const before = { role: membership.role, status: membership.status };
    const updated = await this.prisma.organizationMembership.update({
      where: { id: membership.id },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedBy: actor.userId,
      },
    });

    if (updated.status === 'DISABLED') {
      await this.prisma.session.updateMany({
        where: {
          userId: user.id,
          activeOrganizationId: organization.id,
          revokedAt: null,
        },
        data: { activeOrganizationId: null },
      });
    }

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action:
        input.status === 'DISABLED'
          ? 'organization.member_deactivated'
          : 'organization.member_updated',
      resourceType: 'organization_membership',
      resourceId: memberUserPublicId,
      requestId: request.requestId,
      before,
      after: { role: updated.role, status: updated.status },
    });

    return { ok: true };
  }

  async deactivateMember(
    actor: AuthActor,
    organizationPublicId: string,
    memberUserPublicId: string,
    request: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    return this.updateMember(
      actor,
      organizationPublicId,
      memberUserPublicId,
      { status: 'DISABLED' },
      request,
    );
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

  private async resolveProfilePublicId(
    organizationId: string,
    type: OrganizationType,
  ): Promise<string | null> {
    if (type === 'DEVELOPER') {
      const profile = await this.prisma.developerProfile.findUnique({
        where: { organizationId },
        select: { publicId: true },
      });
      return profile?.publicId ?? null;
    }
    const profile = await this.prisma.agencyProfile.findUnique({
      where: { organizationId },
      select: { publicId: true },
    });
    return profile?.publicId ?? null;
  }

  private toDeveloperProfile(
    profile: {
      publicId: string;
      legalName: string;
      displayName: string;
      description: string | null;
      logoObjectKey: string | null;
      website: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      headquartersCity: string | null;
      headquartersState: string | null;
      operatingZones: string[];
      status: 'ACTIVE' | 'DISABLED';
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
  ): DeveloperProfile {
    return {
      publicId: profile.publicId,
      organizationPublicId,
      legalName: profile.legalName,
      displayName: profile.displayName,
      description: profile.description,
      logoObjectKey: profile.logoObjectKey,
      website: profile.website,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      headquartersCity: profile.headquartersCity,
      headquartersState: profile.headquartersState,
      operatingZones: profile.operatingZones,
      status: profile.status,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private toAgencyProfile(
    profile: {
      publicId: string;
      legalName: string;
      displayName: string;
      description: string | null;
      logoObjectKey: string | null;
      website: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      headquartersCity: string | null;
      headquartersState: string | null;
      operatingZones: string[];
      specialization: string | null;
      verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED';
      status: 'ACTIVE' | 'DISABLED';
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
  ): AgencyProfile {
    return {
      ...this.toDeveloperProfile(profile, organizationPublicId),
      specialization: profile.specialization,
      verificationStatus: profile.verificationStatus,
    };
  }

  private ownerRoleForType(type: OrganizationType): OrganizationRole {
    return type === 'DEVELOPER' ? 'DEVELOPER' : 'AGENT';
  }
}
