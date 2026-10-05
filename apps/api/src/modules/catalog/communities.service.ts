import { Injectable } from '@nestjs/common';
import {
  type CommunityListQuery,
  type CreateCommunityRequest,
  type UpdateCommunityRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { CatalogAccessService } from './catalog-access.service';
import { decodeCursor, encodeCursor } from './catalog.util';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CatalogAccessService,
  ) {}

  async create(actor: AuthActor, body: CreateCommunityRequest, request?: AuthenticatedRequest) {
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      body.organizationPublicId,
      'community:create',
      request,
    );

    let projectId: string | null = null;
    if (body.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: {
          publicId: body.projectPublicId,
          organizationId: organization.id,
          deletedAt: null,
        },
      });
      if (!project) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      projectId = project.id;
    }

    const publicId = await this.publicIds.nextCommunityPublicId();
    const community = await this.prisma.community.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: organization.id,
        projectId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        name: body.name,
        description: body.description ?? null,
        visibility: body.visibility,
      },
      include: { project: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'community.created',
      resourceType: 'community',
      resourceId: publicId,
      requestId: request?.requestId,
    });

    return this.toSummary(community, organization.publicId, community.project?.publicId ?? null);
  }

  async list(actor: AuthActor, query: CommunityListQuery, request?: AuthenticatedRequest) {
    if (!query.organizationPublicId) {
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      query.organizationPublicId,
      'community:read',
      request,
    );

    const where: Record<string, unknown> = {
      organizationId: organization.id,
      deletedAt: null,
    };
    if (query.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: {
          publicId: query.projectPublicId,
          organizationId: organization.id,
          deletedAt: null,
        },
      });
      where.projectId = project?.id ?? '00000000-0000-0000-0000-000000000000';
    }
    if (query.cursor) {
      try {
        const cursor = decodeCursor(query.cursor);
        where.OR = [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ];
      } catch {
        throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
      }
    }

    const rows = await this.prisma.community.findMany({
      where,
      include: { project: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      communities: page.map((row) =>
        this.toSummary(row, organization.publicId, row.project?.publicId ?? null),
      ),
      nextCursor: next,
    };
  }

  async getOne(actor: AuthActor, publicId: string, request?: AuthenticatedRequest) {
    const community = await this.prisma.community.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true, project: true },
    });
    if (!community) {
      return await this.access.deny(actor, publicId, request);
    }
    await this.access.requireDeveloperOrganization(
      actor,
      community.organization.publicId,
      'community:read',
      request,
    );
    return this.toSummary(
      community,
      community.organization.publicId,
      community.project?.publicId ?? null,
    );
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateCommunityRequest,
    request?: AuthenticatedRequest,
  ) {
    const community = await this.prisma.community.findFirst({
      where: { publicId, deletedAt: null },
      include: { organization: true, project: true },
    });
    if (!community) {
      return await this.access.deny(actor, publicId, request);
    }
    await this.access.requireDeveloperOrganization(
      actor,
      community.organization.publicId,
      'community:update',
      request,
    );

    if (body.expectedVersion !== undefined && body.expectedVersion !== community.version) {
      throw new AppError('CONFLICT', 'Community was modified by another request.');
    }

    let projectId = community.projectId;
    if (body.projectPublicId !== undefined) {
      if (body.projectPublicId === null) {
        projectId = null;
      } else {
        const project = await this.prisma.project.findFirst({
          where: {
            publicId: body.projectPublicId,
            organizationId: community.organizationId,
            deletedAt: null,
          },
        });
        if (!project) {
          throw new AppError('NOT_FOUND', 'Resource not found.');
        }
        projectId = project.id;
      }
    }

    const updated = await this.prisma.community.update({
      where: { id: community.id },
      data: {
        name: body.name ?? undefined,
        description: body.description === undefined ? undefined : body.description,
        status: body.status ?? undefined,
        visibility: body.visibility ?? undefined,
        projectId,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
      include: { organization: true, project: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: community.organizationId,
      action: 'community.updated',
      resourceType: 'community',
      resourceId: publicId,
      requestId: request?.requestId,
    });

    return this.toSummary(
      updated,
      updated.organization.publicId,
      updated.project?.publicId ?? null,
    );
  }

  private toSummary(
    row: {
      publicId: string;
      name: string;
      description: string | null;
      status: 'ACTIVE' | 'DISABLED';
      visibility: 'PRIVATE' | 'PUBLIC';
      createdAt: Date;
      updatedAt: Date;
      version: number;
    },
    organizationPublicId: string,
    projectPublicId: string | null,
  ) {
    return {
      publicId: row.publicId,
      organizationPublicId,
      projectPublicId,
      name: row.name,
      description: row.description,
      status: row.status,
      visibility: row.visibility,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
    };
  }
}
