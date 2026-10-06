import { Injectable } from '@nestjs/common';
import {
  type CreateCreatorProfileRequest,
  type CreatorProfileSummary,
} from '@property-studio/contracts';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { MediaAccessService } from './media-access.service';

@Injectable()
export class CreatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: MediaAccessService,
  ) {}

  async getMe(actor: AuthActor): Promise<CreatorProfileSummary> {
    const profile = await this.prisma.creatorProfile.findFirst({
      where: { userId: actor.userId },
      include: { organization: true, user: true },
    });
    if (!profile) {
      throw new AppError('NOT_FOUND', 'Creator profile not found.');
    }
    return this.toSummary(profile);
  }

  async create(
    actor: AuthActor,
    body: CreateCreatorProfileRequest,
    request?: AuthenticatedRequest,
  ): Promise<CreatorProfileSummary> {
    const canManage =
      actorHasPermission(actor, 'creators:manage') ||
      actor.platformRoles.includes('CONTENT_EDITOR') ||
      actorHasPermission(actor, 'content:create');
    if (!canManage) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const existing = await this.prisma.creatorProfile.findFirst({
      where: { userId: actor.userId },
    });
    if (existing) {
      throw new AppError('CONFLICT', 'Creator profile already exists.');
    }

    const organizationId = await this.access.resolveOrganizationId(
      actor,
      body.organizationPublicId,
      request,
    );

    const created = await this.prisma.creatorProfile.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextCreatorProfilePublicId(),
        userId: actor.userId,
        organizationId,
        displayName: body.displayName,
        bio: body.bio ?? null,
        headline: body.headline ?? null,
        createdBy: actor.userId,
      },
      include: { organization: true, user: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'creator.created',
      resourceType: 'creator',
      resourceId: created.publicId,
      requestId: request?.requestId,
    });

    return this.toSummary(created);
  }

  async listAdmin(actor: AuthActor, request?: AuthenticatedRequest) {
    await this.access.requirePermission(actor, 'creators:read', 'creator', request);
    const rows = await this.prisma.creatorProfile.findMany({
      include: { organization: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      creators: rows.map((profile) => this.toSummary(profile)),
    };
  }

  private toSummary(row: {
    publicId: string;
    displayName: string;
    bio: string | null;
    headline: string | null;
    isActive: boolean;
    user: { publicId: string };
    organization?: { publicId: string } | null;
  }): CreatorProfileSummary {
    return {
      publicId: row.publicId,
      userPublicId: row.user.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      displayName: row.displayName,
      bio: row.bio,
      headline: row.headline,
      isActive: row.isActive,
    };
  }
}
