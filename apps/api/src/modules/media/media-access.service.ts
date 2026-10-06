import { Injectable } from '@nestjs/common';
import { type Permission } from '@property-studio/permissions';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

type MediaLike = {
  id: string;
  publicId: string;
  organizationId: string | null;
  entityType: string | null;
  entityId: string | null;
  visibility: string;
  lifecycleStatus: string;
  moderationStatus: string;
  deletedAt: Date | null;
};

type EditorialLike = {
  id: string;
  publicId: string;
  organizationId: string | null;
  status: string;
  moderationStatus: string;
  deletedAt: Date | null;
};

type CollectionLike = {
  id: string;
  publicId: string;
  organizationId: string | null;
  ownerUserId: string | null;
  visibility: string;
  status: string;
  deletedAt: Date | null;
};

@Injectable()
export class MediaAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  isPlatformAdmin(actor: AuthActor): boolean {
    return (
      actorHasPermission(actor, 'platform:admin') ||
      actorHasPermission(actor, 'admin:media:manage') ||
      actorHasPermission(actor, 'admin:content:manage')
    );
  }

  isPubliclyReadable(media: MediaLike): boolean {
    return this.isPubliclyReadableMedia(media);
  }

  isPubliclyReadableMedia(media: MediaLike): boolean {
    return (
      media.deletedAt === null &&
      media.visibility === 'PUBLIC' &&
      media.lifecycleStatus === 'PUBLISHED' &&
      media.moderationStatus === 'APPROVED'
    );
  }

  async requirePermission(
    actor: AuthActor,
    permission: Permission,
    resourcePublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (!actorHasPermission(actor, permission) && !this.isPlatformAdmin(actor)) {
      return await this.deny(actor, resourcePublicId, request);
    }
  }

  isPubliclyReadableEditorial(editorial: EditorialLike): boolean {
    return (
      editorial.deletedAt === null &&
      editorial.status === 'PUBLISHED' &&
      editorial.moderationStatus === 'APPROVED'
    );
  }

  isPubliclyReadableCollection(collection: CollectionLike): boolean {
    return (
      collection.deletedAt === null &&
      collection.visibility === 'PUBLIC' &&
      collection.status === 'PUBLISHED'
    );
  }

  async deny(
    actor: AuthActor | null,
    resourcePublicId: string,
    request?: AuthenticatedRequest,
    resourceType = 'media',
  ): Promise<never> {
    if (actor) {
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
    }
    throw new AppError('NOT_FOUND', 'Resource not found.');
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

  async canManageOrganizationMedia(
    actor: AuthActor,
    organizationId: string | null,
    permission: Permission,
  ): Promise<boolean> {
    if (this.isPlatformAdmin(actor)) {
      return true;
    }
    if (!actorHasPermission(actor, permission)) {
      return false;
    }
    if (!organizationId) {
      return (
        actor.platformRoles.includes('CONTENT_EDITOR') ||
        actor.platformRoles.includes('ADMIN') ||
        actor.platformRoles.includes('SUPER_ADMIN') ||
        actor.platformRoles.includes('MODERATOR')
      );
    }
    if (actor.activeOrganizationId === organizationId) {
      return true;
    }
    return this.isOrgMember(actor, organizationId);
  }

  /**
   * PROPERTY_ADMIN may touch property/project-scoped media only via ResourceAssignment.
   * They never receive media:publish globally and cannot publish even when assigned.
   */
  async requireMediaManage(
    actor: AuthActor,
    media: MediaLike,
    permission: Permission,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPlatformAdmin(actor)) {
      return;
    }

    if (actor.platformRoles.includes('PROPERTY_ADMIN') && media.entityType && media.entityId) {
      if (permission === 'media:publish' || permission === 'content:publish') {
        return await this.deny(actor, media.publicId, request);
      }
      const assignment = await this.prisma.resourceAssignment.findFirst({
        where: {
          userId: actor.userId,
          resourceType: media.entityType === 'PROPERTY' ? 'PROPERTY' : 'PROJECT',
          resourceId: media.entityId,
        },
      });
      if (!assignment || !actorHasPermission(actor, permission)) {
        return await this.deny(actor, media.publicId, request);
      }
      return;
    }

    const allowed = await this.canManageOrganizationMedia(actor, media.organizationId, permission);
    if (!allowed) {
      return await this.deny(actor, media.publicId, request);
    }
  }

  async requireMediaRead(
    actor: AuthActor | null,
    media: MediaLike,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPubliclyReadableMedia(media)) {
      return;
    }
    if (!actor) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    await this.requireMediaManage(actor, media, 'media:read', request);
  }

  async requireEditorialManage(
    actor: AuthActor,
    editorial: EditorialLike,
    permission: Permission,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPlatformAdmin(actor)) {
      return;
    }
    const allowed = await this.canManageOrganizationMedia(
      actor,
      editorial.organizationId,
      permission,
    );
    if (!allowed) {
      return await this.deny(actor, editorial.publicId, request, 'editorial');
    }
  }

  async requireEditorialRead(
    actor: AuthActor | null,
    editorial: EditorialLike,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPubliclyReadableEditorial(editorial)) {
      return;
    }
    if (!actor) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    await this.requireEditorialManage(actor, editorial, 'content:read', request);
  }

  async requireCollectionManage(
    actor: AuthActor,
    collection: CollectionLike,
    permission: Permission,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPlatformAdmin(actor)) {
      return;
    }
    if (collection.ownerUserId === actor.userId && actorHasPermission(actor, permission)) {
      return;
    }
    const allowed = await this.canManageOrganizationMedia(
      actor,
      collection.organizationId,
      permission,
    );
    if (!allowed) {
      return await this.deny(actor, collection.publicId, request, 'collection');
    }
  }

  async requireCollectionRead(
    actor: AuthActor | null,
    collection: CollectionLike,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (this.isPubliclyReadableCollection(collection)) {
      return;
    }
    if (!actor) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }
    await this.requireCollectionManage(actor, collection, 'collections:read', request);
  }

  async requireAdminRead(
    actor: AuthActor,
    permission: Permission,
    request?: AuthenticatedRequest,
  ): Promise<void> {
    if (
      this.isPlatformAdmin(actor) ||
      actorHasPermission(actor, permission) ||
      actorHasPermission(actor, 'platform:admin')
    ) {
      return;
    }
    throw new AppError('FORBIDDEN', 'Insufficient permissions.');
  }

  async resolveOrganizationId(
    actor: AuthActor,
    organizationPublicId: string | null | undefined,
    request?: AuthenticatedRequest,
  ): Promise<string | null> {
    if (!organizationPublicId) {
      return actor.activeOrganizationId;
    }
    const organization = await this.prisma.organization.findFirst({
      where: { publicId: organizationPublicId, status: 'ACTIVE' },
    });
    if (!organization) {
      return await this.deny(actor, organizationPublicId, request, 'organization');
    }
    if (this.isPlatformAdmin(actor)) {
      return organization.id;
    }
    if (!(await this.isOrgMember(actor, organization.id))) {
      return await this.deny(actor, organizationPublicId, request, 'organization');
    }
    return organization.id;
  }
}
