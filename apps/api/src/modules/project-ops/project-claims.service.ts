import { Injectable } from '@nestjs/common';
import {
  type CreateProjectClaimRequest,
  type ProjectClaimListQuery,
  type ProjectClaimSummary,
  type ReviewProjectClaimRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { EntitlementService } from '../billing/entitlement.service';
import { CatalogAccessService } from '../catalog/catalog-access.service';
import { decodeCursor, encodeCursor, toIso } from '../catalog/catalog.util';
import { DomainEventBus } from '../integrations/domain-event-bus.service';

const OPEN_CLAIM_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] as const;

@Injectable()
export class ProjectClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: CatalogAccessService,
    private readonly entitlements: EntitlementService,
    private readonly domainEvents: DomainEventBus,
  ) {}

  async create(
    actor: AuthActor,
    projectPublicId: string,
    body: CreateProjectClaimRequest,
    request?: AuthenticatedRequest,
  ): Promise<ProjectClaimSummary> {
    const claimingOrg = await this.access.requireDeveloperOrganization(
      actor,
      body.organizationPublicId,
      'project:claim:create',
      request,
    );

    const project = await this.prisma.project.findFirst({
      where: { publicId: projectPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!project) {
      return await this.access.deny(actor, projectPublicId, request);
    }

    if (project.lifecycleStatus !== 'PUBLISHED') {
      throw new AppError('VALIDATION_ERROR', 'Only published projects can be claimed.');
    }

    if (project.organizationId === claimingOrg.id) {
      throw new AppError('VALIDATION_ERROR', 'Organization already owns this project.');
    }

    const existingOpen = await this.prisma.projectClaim.findFirst({
      where: {
        projectId: project.id,
        claimingOrganizationId: claimingOrg.id,
        status: { in: [...OPEN_CLAIM_STATUSES] },
      },
    });
    if (existingOpen) {
      throw new AppError('CONFLICT', 'An open claim already exists for this organization and project.');
    }

    let verificationCaseId: string | null = null;
    let verificationCasePublicId: string | null = null;
    if (body.verificationCasePublicId) {
      const verificationCase = await this.prisma.verificationCase.findFirst({
        where: { publicId: body.verificationCasePublicId },
      });
      if (
        !verificationCase ||
        verificationCase.organizationId !== claimingOrg.id ||
        (verificationCase.subjectType !== 'DEVELOPER' && verificationCase.subjectType !== 'PROJECT')
      ) {
        throw new AppError('NOT_FOUND', 'Resource not found.');
      }
      verificationCaseId = verificationCase.id;
      verificationCasePublicId = verificationCase.publicId;
    }

    const submit = body.submit === true;
    let entitlementCheckedAt: Date | null = null;
    let entitlementMissing = false;
    if (submit) {
      const hasEntitlement = await this.entitlements.has(claimingOrg.id, 'PROJECT_CLAIM');
      if (hasEntitlement) {
        entitlementCheckedAt = new Date();
      } else {
        entitlementMissing = true;
      }
    }

    const publicId = await this.publicIds.nextProjectClaimPublicId();
    const now = new Date();
    const created = await this.prisma.projectClaim.create({
      data: {
        id: newUuid(),
        publicId,
        projectId: project.id,
        claimingOrganizationId: claimingOrg.id,
        submittedByUserId: actor.userId,
        verificationCaseId,
        status: submit ? 'SUBMITTED' : 'DRAFT',
        justification: body.justification,
        authorizationNotes: body.authorizationNotes ?? null,
        submittedAt: submit ? now : null,
        entitlementCheckedAt,
      },
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: claimingOrg.id,
      action: submit ? 'project.claim.submitted' : 'project.claim.created',
      resourceType: 'project_claim',
      resourceId: publicId,
      requestId: request?.requestId,
      after: {
        projectPublicId: project.publicId,
        status: created.status,
        entitlementMissing: submit ? entitlementMissing : undefined,
      },
      metadata: entitlementMissing
        ? { note: 'Submitted without PROJECT_CLAIM entitlement; approval will require entitlement.' }
        : undefined,
    });

    if (submit) {
      await this.domainEvents.emit({
        eventType: 'project.claim.submitted',
        resourceType: 'project_claim',
        resourcePublicId: created.publicId,
        organizationId: claimingOrg.id,
        payload: {
          claimPublicId: created.publicId,
          projectPublicId: project.publicId,
          claimingOrganizationPublicId: claimingOrg.publicId,
          status: created.status,
        },
      });
    }

    return this.toSummary(created, verificationCasePublicId);
  }

  async listForOrganization(
    actor: AuthActor,
    orgPublicId: string,
    query: ProjectClaimListQuery,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.access.requireDeveloperOrganization(
      actor,
      orgPublicId,
      'project:claim:read',
      request,
    );

    const where: Record<string, unknown> = {
      claimingOrganizationId: organization.id,
    };
    if (query.status) where.status = query.status;
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

    const rows = await this.prisma.projectClaim.findMany({
      where,
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
        : null;

    return {
      claims: page.map((row) => this.toSummary(row, row.verificationCase?.publicId ?? null)),
      nextCursor: next,
    };
  }

  async getOne(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ProjectClaimSummary> {
    const claim = await this.prisma.projectClaim.findFirst({
      where: { publicId },
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
    });
    if (!claim) {
      return await this.access.deny(actor, publicId, request);
    }

    const canReview =
      this.access.isPlatformAdmin(actor) || actorHasPermission(actor, 'project:claim:review');
    if (!canReview) {
      await this.access.requireDeveloperOrganization(
        actor,
        claim.claimingOrganization.publicId,
        'project:claim:read',
        request,
      );
    }

    return this.toSummary(claim, claim.verificationCase?.publicId ?? null);
  }

  async submit(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ProjectClaimSummary> {
    const claim = await this.prisma.projectClaim.findFirst({
      where: { publicId },
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
    });
    if (!claim) {
      return await this.access.deny(actor, publicId, request);
    }

    await this.access.requireDeveloperOrganization(
      actor,
      claim.claimingOrganization.publicId,
      'project:claim:create',
      request,
    );

    if (claim.status !== 'DRAFT') {
      throw new AppError('VALIDATION_ERROR', 'Only draft claims can be submitted.');
    }

    const hasEntitlement = await this.entitlements.has(
      claim.claimingOrganizationId,
      'PROJECT_CLAIM',
    );
    const entitlementCheckedAt = hasEntitlement ? new Date() : null;

    const updated = await this.prisma.projectClaim.update({
      where: { id: claim.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        entitlementCheckedAt,
        version: { increment: 1 },
      },
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: claim.claimingOrganizationId,
      action: 'project.claim.submitted',
      resourceType: 'project_claim',
      resourceId: publicId,
      requestId: request?.requestId,
      after: {
        status: updated.status,
        entitlementMissing: !hasEntitlement,
      },
      metadata: !hasEntitlement
        ? { note: 'Submitted without PROJECT_CLAIM entitlement; approval will require entitlement.' }
        : undefined,
    });

    await this.domainEvents.emit({
      eventType: 'project.claim.submitted',
      resourceType: 'project_claim',
      resourcePublicId: updated.publicId,
      organizationId: claim.claimingOrganizationId,
      payload: {
        claimPublicId: updated.publicId,
        projectPublicId: claim.project.publicId,
        claimingOrganizationPublicId: claim.claimingOrganization.publicId,
        status: updated.status,
      },
    });

    return this.toSummary(updated, updated.verificationCase?.publicId ?? null);
  }

  async approve(
    actor: AuthActor,
    publicId: string,
    body: ReviewProjectClaimRequest,
    request?: AuthenticatedRequest,
  ): Promise<ProjectClaimSummary> {
    this.requireReviewer(actor);

    const claim = await this.prisma.projectClaim.findFirst({
      where: { publicId },
      include: {
        project: { include: { organization: true } },
        claimingOrganization: true,
        verificationCase: true,
      },
    });
    if (!claim) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    if (claim.status !== 'SUBMITTED' && claim.status !== 'UNDER_REVIEW') {
      throw new AppError('VALIDATION_ERROR', 'Only submitted or under-review claims can be approved.');
    }

    if (claim.verificationCase) {
      if (claim.verificationCase.status !== 'APPROVED') {
        throw new AppError(
          'VALIDATION_ERROR',
          'Linked verification case must be approved before claim approval.',
        );
      }
    } else if (!body.reviewNotes?.trim()) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Review notes are required when approving a claim without a linked verification case.',
      );
    }

    const hasEntitlement = await this.entitlements.has(
      claim.claimingOrganizationId,
      'PROJECT_CLAIM',
    );
    if (!hasEntitlement) {
      throw new AppError('FORBIDDEN', 'PROJECT_CLAIM entitlement is required to approve claims.');
    }

    if (claim.project.organizationId === claim.claimingOrganizationId) {
      throw new AppError('VALIDATION_ERROR', 'Organization already owns this project.');
    }

    if (claim.project.deletedAt) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: claim.projectId },
        data: {
          organizationId: claim.claimingOrganizationId,
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
      });

      return tx.projectClaim.update({
        where: { id: claim.id },
        data: {
          status: 'APPROVED',
          reviewNotes: body.reviewNotes ?? null,
          reviewedByUserId: actor.userId,
          reviewedAt: now,
          approvedAt: now,
          entitlementCheckedAt: now,
          version: { increment: 1 },
        },
        include: {
          project: true,
          claimingOrganization: true,
          verificationCase: true,
        },
      });
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: claim.claimingOrganizationId,
      action: 'project.claim.approved',
      resourceType: 'project_claim',
      resourceId: publicId,
      requestId: request?.requestId,
      before: {
        projectOrganizationId: claim.project.organizationId,
        status: claim.status,
      },
      after: {
        projectOrganizationId: claim.claimingOrganizationId,
        status: updated.status,
      },
    });

    await this.domainEvents.emit({
      eventType: 'project.claim.approved',
      resourceType: 'project_claim',
      resourcePublicId: updated.publicId,
      organizationId: claim.claimingOrganizationId,
      payload: {
        claimPublicId: updated.publicId,
        projectPublicId: claim.project.publicId,
        claimingOrganizationPublicId: claim.claimingOrganization.publicId,
        previousOrganizationPublicId: claim.project.organization.publicId,
        status: updated.status,
      },
    });

    return this.toSummary(updated, updated.verificationCase?.publicId ?? null);
  }

  async reject(
    actor: AuthActor,
    publicId: string,
    body: ReviewProjectClaimRequest,
    request?: AuthenticatedRequest,
  ): Promise<ProjectClaimSummary> {
    this.requireReviewer(actor);

    const claim = await this.prisma.projectClaim.findFirst({
      where: { publicId },
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
    });
    if (!claim) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    if (claim.status !== 'SUBMITTED' && claim.status !== 'UNDER_REVIEW' && claim.status !== 'DRAFT') {
      throw new AppError('VALIDATION_ERROR', 'Claim cannot be rejected in its current status.');
    }

    const updated = await this.prisma.projectClaim.update({
      where: { id: claim.id },
      data: {
        status: 'REJECTED',
        reviewNotes: body.reviewNotes ?? null,
        reviewedByUserId: actor.userId,
        reviewedAt: new Date(),
        version: { increment: 1 },
      },
      include: {
        project: true,
        claimingOrganization: true,
        verificationCase: true,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: claim.claimingOrganizationId,
      action: 'project.claim.rejected',
      resourceType: 'project_claim',
      resourceId: publicId,
      requestId: request?.requestId,
      after: { status: updated.status },
    });

    await this.domainEvents.emit({
      eventType: 'project.claim.rejected',
      resourceType: 'project_claim',
      resourcePublicId: updated.publicId,
      organizationId: claim.claimingOrganizationId,
      payload: {
        claimPublicId: updated.publicId,
        projectPublicId: claim.project.publicId,
        claimingOrganizationPublicId: claim.claimingOrganization.publicId,
        status: updated.status,
      },
    });

    return this.toSummary(updated, updated.verificationCase?.publicId ?? null);
  }

  private requireReviewer(actor: AuthActor): void {
    if (
      this.access.isPlatformAdmin(actor) ||
      actorHasPermission(actor, 'project:claim:review') ||
      actorHasPermission(actor, 'platform:admin')
    ) {
      return;
    }
    throw new AppError('FORBIDDEN', 'Insufficient permissions.');
  }

  private toSummary(
    row: {
      publicId: string;
      status: ProjectClaimSummary['status'];
      justification: string;
      authorizationNotes: string | null;
      reviewNotes: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      approvedAt: Date | null;
      entitlementCheckedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
      project: { publicId: string };
      claimingOrganization: { publicId: string };
    },
    verificationCasePublicId: string | null,
  ): ProjectClaimSummary {
    return {
      publicId: row.publicId,
      projectPublicId: row.project.publicId,
      claimingOrganizationPublicId: row.claimingOrganization.publicId,
      status: row.status,
      justification: row.justification,
      authorizationNotes: row.authorizationNotes,
      verificationCasePublicId,
      reviewNotes: row.reviewNotes,
      submittedAt: toIso(row.submittedAt),
      reviewedAt: toIso(row.reviewedAt),
      approvedAt: toIso(row.approvedAt),
      entitlementCheckedAt: toIso(row.entitlementCheckedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
    };
  }
}
