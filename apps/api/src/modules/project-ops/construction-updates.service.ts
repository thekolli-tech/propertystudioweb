import { Injectable } from '@nestjs/common';
import {
  type ConstructionUpdateListQuery,
  type ConstructionUpdateSummary,
  type CreateConstructionUpdateRequest,
  type UpdateConstructionUpdateRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { CatalogAccessService } from '../catalog/catalog-access.service';
import { decodeCursor, encodeCursor, toDateOnly, toIso } from '../catalog/catalog.util';
import { DomainEventBus } from '../integrations/domain-event-bus.service';

@Injectable()
export class ConstructionUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CatalogAccessService,
    private readonly domainEvents: DomainEventBus,
  ) {}

  async create(
    actor: AuthActor,
    projectPublicId: string,
    body: CreateConstructionUpdateRequest,
    request?: AuthenticatedRequest,
  ): Promise<ConstructionUpdateSummary> {
    const project = await this.requireOwnedProject(
      actor,
      projectPublicId,
      'construction-update:create',
      request,
    );

    const publicId = await this.publicIds.nextConstructionUpdatePublicId();
    const created = await this.prisma.constructionUpdate.create({
      data: {
        id: newUuid(),
        publicId,
        projectId: project.id,
        organizationId: project.organizationId,
        authorUserId: actor.userId,
        title: body.title,
        description: body.description ?? null,
        milestone: body.milestone,
        percentComplete: body.percentComplete ?? null,
        updateDate: new Date(body.updateDate),
        publicationStatus: 'DRAFT',
        mediaPublicIds: body.mediaPublicIds ?? [],
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
      include: {
        organization: true,
        project: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: project.organizationId,
      action: 'construction.update.created',
      resourceType: 'construction_update',
      resourceId: publicId,
      requestId: request?.requestId,
      after: {
        projectPublicId: project.publicId,
        publicationStatus: created.publicationStatus,
        milestone: created.milestone,
      },
    });

    return this.toSummary(created);
  }

  async listForProject(
    actor: AuthActor,
    projectPublicId: string,
    query: ConstructionUpdateListQuery,
    request?: AuthenticatedRequest,
  ) {
    const project = await this.requireOwnedProject(
      actor,
      projectPublicId,
      'construction-update:read',
      request,
    );

    const where: Record<string, unknown> = { projectId: project.id };
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

    const rows = await this.prisma.constructionUpdate.findMany({
      where,
      include: { organization: true, project: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      updates: page.map((row) => this.toSummary(row)),
      nextCursor: next,
    };
  }

  async listPublic(projectPublicId: string, query: ConstructionUpdateListQuery) {
    const project = await this.prisma.project.findFirst({
      where: {
        publicId: projectPublicId,
        deletedAt: null,
        lifecycleStatus: 'PUBLISHED',
      },
    });
    if (!project) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const where: Record<string, unknown> = {
      projectId: project.id,
      publicationStatus: 'PUBLISHED',
    };
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

    const rows = await this.prisma.constructionUpdate.findMany({
      where,
      include: { organization: true, project: true },
      orderBy: [{ updateDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      updates: page.map((row) => this.toSummary(row)),
      nextCursor: next,
    };
  }

  async update(
    actor: AuthActor,
    publicId: string,
    body: UpdateConstructionUpdateRequest,
    request?: AuthenticatedRequest,
  ): Promise<ConstructionUpdateSummary> {
    const update = await this.prisma.constructionUpdate.findFirst({
      where: { publicId },
      include: { organization: true, project: true },
    });
    if (!update || update.project.deletedAt) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requireDeveloperOrganization(
      actor,
      update.organization.publicId,
      'construction-update:update',
      request,
    );

    if (body.expectedVersion !== undefined && body.expectedVersion !== update.version) {
      throw new AppError('CONFLICT', 'Construction update was modified by another request.');
    }

    if (update.publicationStatus === 'PUBLISHED' && body.mediaPublicIds === undefined) {
      // Published updates may still be edited for content corrections by owners.
    }

    const updated = await this.prisma.constructionUpdate.update({
      where: { id: update.id },
      data: {
        title: body.title ?? undefined,
        description: body.description === undefined ? undefined : body.description,
        milestone: body.milestone ?? undefined,
        percentComplete: body.percentComplete === undefined ? undefined : body.percentComplete,
        updateDate: body.updateDate ? new Date(body.updateDate) : undefined,
        mediaPublicIds: body.mediaPublicIds ?? undefined,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
      include: { organization: true, project: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: update.organizationId,
      action: 'construction.update.updated',
      resourceType: 'construction_update',
      resourceId: publicId,
      requestId: request?.requestId,
      before: { version: update.version, publicationStatus: update.publicationStatus },
      after: { version: updated.version, publicationStatus: updated.publicationStatus },
    });

    return this.toSummary(updated);
  }

  async publish(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ConstructionUpdateSummary> {
    const update = await this.prisma.constructionUpdate.findFirst({
      where: { publicId },
      include: { organization: true, project: true },
    });
    if (!update || update.project.deletedAt) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requireDeveloperOrganization(
      actor,
      update.organization.publicId,
      'construction-update:publish',
      request,
    );

    if (update.publicationStatus === 'PUBLISHED') {
      return this.toSummary(update);
    }

    const publishedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.constructionUpdate.update({
        where: { id: update.id },
        data: {
          publicationStatus: 'PUBLISHED',
          publishedAt,
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
        include: { organization: true, project: true },
      });

      const projectData: {
        constructionPhase?: typeof update.milestone;
        constructionPercent?: number | null;
        updatedBy: string;
        version: { increment: number };
      } = {
        updatedBy: actor.userId,
        version: { increment: 1 },
      };
      if (update.milestone && update.milestone !== 'OTHER') {
        projectData.constructionPhase = update.milestone;
      }
      if (update.percentComplete !== null && update.percentComplete !== undefined) {
        projectData.constructionPercent = update.percentComplete;
      }
      if (projectData.constructionPhase || projectData.constructionPercent !== undefined) {
        await tx.project.update({
          where: { id: update.projectId },
          data: projectData,
        });
      }

      return row;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: update.organizationId,
      action: 'construction.update.published',
      resourceType: 'construction_update',
      resourceId: publicId,
      requestId: request?.requestId,
      after: {
        publicationStatus: updated.publicationStatus,
        milestone: updated.milestone,
        percentComplete: updated.percentComplete,
      },
    });

    await this.domainEvents.emit({
      eventType: 'project.construction.updated',
      resourceType: 'construction_update',
      resourcePublicId: updated.publicId,
      organizationId: updated.organizationId,
      payload: {
        constructionUpdatePublicId: updated.publicId,
        projectPublicId: updated.project.publicId,
        milestone: updated.milestone,
        percentComplete: updated.percentComplete,
        publicationStatus: updated.publicationStatus,
      },
    });

    return this.toSummary(updated);
  }

  private async requireOwnedProject(
    actor: AuthActor,
    projectPublicId: string,
    permission: 'construction-update:create' | 'construction-update:read',
    request?: AuthenticatedRequest,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { publicId: projectPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, projectPublicId, request);
    }

    await this.access.requireDeveloperOrganization(
      actor,
      project.organization.publicId,
      permission,
      request,
    );

    return project;
  }

  private toSummary(row: {
    publicId: string;
    title: string;
    description: string | null;
    milestone: ConstructionUpdateSummary['milestone'];
    percentComplete: number | null;
    updateDate: Date;
    publicationStatus: ConstructionUpdateSummary['publicationStatus'];
    mediaPublicIds: string[];
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    project: { publicId: string };
    organization: { publicId: string };
  }): ConstructionUpdateSummary {
    return {
      publicId: row.publicId,
      projectPublicId: row.project.publicId,
      organizationPublicId: row.organization.publicId,
      title: row.title,
      description: row.description,
      milestone: row.milestone,
      percentComplete: row.percentComplete,
      updateDate: toDateOnly(row.updateDate)!,
      publicationStatus: row.publicationStatus,
      mediaPublicIds: row.mediaPublicIds,
      publishedAt: toIso(row.publishedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
    };
  }
}
