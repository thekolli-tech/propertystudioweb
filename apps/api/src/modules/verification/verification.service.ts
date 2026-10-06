import { Injectable } from '@nestjs/common';
import {
  type AdminVerificationCaseListQuery,
  type AttachVerificationDocumentRequest,
  type CreateVerificationCaseRequest,
  type ReviewVerificationCaseRequest,
  type SubmitVerificationCaseRequest,
  type UpdateVerificationCaseRequest,
  type UpdateVerificationDocumentRequest,
  type VerificationCaseDetail,
  type VerificationCaseListQuery,
  type VerificationCaseListResponse,
  type VerificationCaseSummary,
  type VerificationDocumentSummary,
  type VerificationSubjectType,
} from '@property-studio/contracts';
import { Prisma } from '../../generated/prisma/client';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { NotificationService } from '../notifications/notification.service';
import { VerificationAccessService } from './verification-access.service';
import {
  applyCreatedCursor,
  encodeCursor,
  isPrismaUniqueViolation,
  oneYearFromNow,
  toIso,
} from './verification.util';

type ResolvedSubject = {
  subjectId: string;
  subjectPublicId: string;
  organizationId: string;
};

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: VerificationAccessService,
    private readonly notifications: NotificationService,
  ) {}

  async create(
    actor: AuthActor,
    body: CreateVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'verification:create',
      request,
    );
    if (body.subjectType !== body.verificationType) {
      throw new AppError('VALIDATION_ERROR', 'subjectType and verificationType must match.');
    }

    const subject = await this.resolveSubject(body.subjectType, body.subjectPublicId, organization.id);

    try {
      const created = await this.prisma.verificationCase.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextVerificationCasePublicId(),
          organizationId: organization.id,
          subjectType: body.subjectType,
          subjectId: subject.subjectId,
          verificationType: body.verificationType,
          status: 'DRAFT',
          reraNumber: body.reraNumber ?? null,
          declarationAccepted: body.declarationAccepted ?? false,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        include: {
          organization: true,
          documents: { include: { documentAsset: true } },
        },
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: organization.id,
        action: 'verification.case.created',
        resourceType: 'verification_case',
        resourceId: created.publicId,
        requestId: request?.requestId,
        after: {
          subjectType: created.subjectType,
          subjectPublicId: subject.subjectPublicId,
          status: created.status,
        },
      });

      return this.toDetail(created, subject.subjectPublicId);
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new AppError('CONFLICT', 'An open verification case already exists for this subject.');
      }
      throw error;
    }
  }

  async listForOrganization(
    actor: AuthActor,
    query: VerificationCaseListQuery,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseListResponse> {
    if (!query.organizationPublicId) {
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }
    const organization = await this.access.requireOrganization(
      actor,
      query.organizationPublicId,
      'verification:read',
      request,
    );

    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.status) where.status = query.status;
    if (query.subjectType) where.subjectType = query.subjectType;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.verificationCase.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: { organization: true },
    });
    const page = rows.slice(0, query.limit);
    const summaries = await Promise.all(page.map((row) => this.toSummaryAsync(row)));

    return {
      cases: summaries,
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async listAdmin(
    actor: AuthActor,
    query: AdminVerificationCaseListQuery,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseListResponse> {
    if (!this.access.canReadAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.subjectType) where.subjectType = query.subjectType;
    if (query.organizationPublicId) {
      const organization = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!organization) {
        return await this.access.deny(actor, query.organizationPublicId, request);
      }
      where.organizationId = organization.id;
    }
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.verificationCase.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: { organization: true },
    });
    const page = rows.slice(0, query.limit);
    const summaries = await Promise.all(page.map((row) => this.toSummaryAsync(row)));

    return {
      cases: summaries,
      nextCursor:
        rows.length > query.limit
          ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
          : null,
    };
  }

  async getOne(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    const verificationCase = await this.access.requireCaseAccess(
      actor,
      publicId,
      'verification:read',
      request,
    );
    const subjectPublicId = await this.resolveSubjectPublicId(
      verificationCase.subjectType,
      verificationCase.subjectId,
    );
    return this.toDetail(verificationCase, subjectPublicId);
  }

  async updateDraft(
    actor: AuthActor,
    publicId: string,
    body: UpdateVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    const verificationCase = await this.access.requireCaseAccess(
      actor,
      publicId,
      'verification:update',
      request,
    );
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(verificationCase.status)) {
      throw new AppError('CONFLICT', 'Only draft or changes-requested cases can be updated.');
    }

    const updated = await this.prisma.verificationCase.update({
      where: { id: verificationCase.id },
      data: {
        reraNumber: body.reraNumber === undefined ? undefined : body.reraNumber,
        declarationAccepted:
          body.declarationAccepted === undefined ? undefined : body.declarationAccepted,
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
      include: {
        organization: true,
        documents: { include: { documentAsset: true } },
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action: 'verification.case.updated',
      resourceType: 'verification_case',
      resourceId: updated.publicId,
      requestId: request?.requestId,
    });

    const subjectPublicId = await this.resolveSubjectPublicId(updated.subjectType, updated.subjectId);
    return this.toDetail(updated, subjectPublicId);
  }

  async submit(
    actor: AuthActor,
    publicId: string,
    body: SubmitVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    const verificationCase = await this.access.requireCaseAccess(
      actor,
      publicId,
      'verification:submit',
      request,
    );
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(verificationCase.status)) {
      throw new AppError('CONFLICT', 'Only draft or changes-requested cases can be submitted.');
    }
    if (!body.declarationAccepted) {
      throw new AppError('VALIDATION_ERROR', 'Declaration must be accepted before submit.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.verificationCase.update({
        where: { id: verificationCase.id },
        data: {
          status: 'SUBMITTED',
          declarationAccepted: true,
          submittedByUserId: actor.userId,
          submittedAt: new Date(),
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
        include: {
          organization: true,
          documents: { include: { documentAsset: true } },
        },
      });
      await this.applySubjectPending(tx, row.subjectType, row.subjectId);
      return row;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action: 'verification.case.submitted',
      resourceType: 'verification_case',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status: updated.status },
    });

    if (updated.submittedByUserId) {
      await this.notifications.create({
        userId: updated.submittedByUserId,
        orgId: updated.organizationId,
        type: 'VERIFICATION_SUBMITTED',
        title: 'Verification submitted',
        body: 'Your verification case was submitted for review.',
        severity: 'INFO',
        entityType: 'VERIFICATION_CASE',
        entityId: updated.id,
      });
    }

    const subjectPublicId = await this.resolveSubjectPublicId(updated.subjectType, updated.subjectId);
    return this.toDetail(updated, subjectPublicId);
  }

  async approve(
    actor: AuthActor,
    publicId: string,
    body: ReviewVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    this.requireAdminManage(actor);
    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: { publicId },
      include: {
        organization: true,
        documents: { include: { documentAsset: true } },
      },
    });
    if (!verificationCase) {
      return await this.access.deny(actor, publicId, request);
    }
    if (!['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(verificationCase.status)) {
      throw new AppError('CONFLICT', 'Case cannot be approved in its current status.');
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : oneYearFromNow();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.verificationCase.update({
        where: { id: verificationCase.id },
        data: {
          status: 'APPROVED',
          reviewedByUserId: actor.userId,
          reviewedAt: new Date(),
          expiresAt,
          reviewerNotes: body.reviewerNotes ?? null,
          rejectionReason: null,
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
        include: {
          organization: true,
          documents: { include: { documentAsset: true } },
        },
      });
      await this.applySubjectVerified(tx, row.subjectType, row.subjectId);
      return row;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action: 'verification.case.approved',
      resourceType: 'verification_case',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status: 'APPROVED', expiresAt: toIso(expiresAt) },
    });

    if (updated.submittedByUserId) {
      await this.notifications.create({
        userId: updated.submittedByUserId,
        orgId: updated.organizationId,
        type: 'VERIFICATION_APPROVED',
        title: 'Verification approved',
        body: 'Your verification case was approved.',
        severity: 'SUCCESS',
        entityType: 'VERIFICATION_CASE',
        entityId: updated.id,
      });
    }

    const subjectPublicId = await this.resolveSubjectPublicId(updated.subjectType, updated.subjectId);
    return this.toDetail(updated, subjectPublicId);
  }

  async reject(
    actor: AuthActor,
    publicId: string,
    body: ReviewVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    return this.adminDecision(actor, publicId, 'REJECTED', body, request);
  }

  async requestChanges(
    actor: AuthActor,
    publicId: string,
    body: ReviewVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    return this.adminDecision(actor, publicId, 'CHANGES_REQUESTED', body, request);
  }

  async revoke(
    actor: AuthActor,
    publicId: string,
    body: ReviewVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    this.requireAdminManage(actor);
    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: { publicId },
      include: {
        organization: true,
        documents: { include: { documentAsset: true } },
      },
    });
    if (!verificationCase) {
      return await this.access.deny(actor, publicId, request);
    }
    if (verificationCase.status !== 'APPROVED') {
      throw new AppError('CONFLICT', 'Only approved cases can be revoked.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.verificationCase.update({
        where: { id: verificationCase.id },
        data: {
          status: 'REVOKED',
          reviewedByUserId: actor.userId,
          reviewedAt: new Date(),
          reviewerNotes: body.reviewerNotes ?? null,
          rejectionReason: body.rejectionReason ?? null,
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
        include: {
          organization: true,
          documents: { include: { documentAsset: true } },
        },
      });
      await this.applySubjectRevoked(tx, row.subjectType, row.subjectId);
      return row;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action: 'verification.case.revoked',
      resourceType: 'verification_case',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status: 'REVOKED' },
    });

    if (updated.submittedByUserId) {
      await this.notifications.create({
        userId: updated.submittedByUserId,
        orgId: updated.organizationId,
        type: 'VERIFICATION_REJECTED',
        title: 'Verification revoked',
        body: 'Your verification status was revoked.',
        severity: 'WARNING',
        entityType: 'VERIFICATION_CASE',
        entityId: updated.id,
      });
    }

    const subjectPublicId = await this.resolveSubjectPublicId(updated.subjectType, updated.subjectId);
    return this.toDetail(updated, subjectPublicId);
  }

  async attachDocument(
    actor: AuthActor,
    publicId: string,
    body: AttachVerificationDocumentRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationDocumentSummary> {
    const verificationCase = await this.access.requireCaseAccess(
      actor,
      publicId,
      'verification:documents:create',
      request,
    );
    if (!['DRAFT', 'CHANGES_REQUESTED', 'SUBMITTED'].includes(verificationCase.status)) {
      throw new AppError('CONFLICT', 'Documents cannot be attached in the current case status.');
    }
    if (!verificationCase.organizationId) {
      throw new AppError('VALIDATION_ERROR', 'Verification case has no organization.');
    }

    const documentAsset = await this.prisma.documentAsset.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextDocumentPublicId(),
        organizationId: verificationCase.organizationId,
        entityType: 'VERIFICATION_CASE',
        entityId: verificationCase.id,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        documentType: body.documentType,
        title: body.title,
        fileSizeBytes: body.fileSizeBytes,
        visibility: 'PRIVATE',
        createdBy: actor.userId,
      },
    });

    const document = await this.prisma.verificationDocument.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextVerificationDocumentPublicId(),
        verificationCaseId: verificationCase.id,
        documentAssetId: documentAsset.id,
        documentType: body.documentType,
        status: 'SUBMITTED',
        extractedReference: body.extractedReference ?? null,
        uploadedByUserId: actor.userId,
      },
      include: { documentAsset: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: verificationCase.organizationId,
      action: 'verification.document.attached',
      resourceType: 'verification_document',
      resourceId: document.publicId,
      requestId: request?.requestId,
      metadata: { casePublicId: verificationCase.publicId },
    });

    return this.toDocumentSummary(document);
  }

  async updateDocument(
    actor: AuthActor,
    casePublicId: string,
    documentPublicId: string,
    body: UpdateVerificationDocumentRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationDocumentSummary> {
    this.requireAdminManage(actor);
    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: { publicId: casePublicId },
    });
    if (!verificationCase) {
      return await this.access.deny(actor, casePublicId, request);
    }

    const document = await this.prisma.verificationDocument.findFirst({
      where: { publicId: documentPublicId, verificationCaseId: verificationCase.id },
      include: { documentAsset: true },
    });
    if (!document) {
      return await this.access.deny(actor, documentPublicId, request);
    }

    const updated = await this.prisma.verificationDocument.update({
      where: { id: document.id },
      data: {
        status: body.status,
        reviewerNotes: body.reviewerNotes === undefined ? undefined : body.reviewerNotes,
        extractedReference:
          body.extractedReference === undefined ? undefined : body.extractedReference,
        reviewedAt: new Date(),
      },
      include: { documentAsset: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: verificationCase.organizationId,
      action: 'verification.document.updated',
      resourceType: 'verification_document',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status: updated.status },
    });

    return this.toDocumentSummary(updated);
  }

  private async adminDecision(
    actor: AuthActor,
    publicId: string,
    status: 'REJECTED' | 'CHANGES_REQUESTED',
    body: ReviewVerificationCaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<VerificationCaseDetail> {
    this.requireAdminManage(actor);
    const verificationCase = await this.prisma.verificationCase.findFirst({
      where: { publicId },
      include: {
        organization: true,
        documents: { include: { documentAsset: true } },
      },
    });
    if (!verificationCase) {
      return await this.access.deny(actor, publicId, request);
    }
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(verificationCase.status)) {
      throw new AppError('CONFLICT', 'Case cannot be decided in its current status.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.verificationCase.update({
        where: { id: verificationCase.id },
        data: {
          status,
          reviewedByUserId: actor.userId,
          reviewedAt: new Date(),
          reviewerNotes: body.reviewerNotes ?? null,
          rejectionReason: body.rejectionReason ?? null,
          updatedBy: actor.userId,
          version: { increment: 1 },
        },
        include: {
          organization: true,
          documents: { include: { documentAsset: true } },
        },
      });
      if (status === 'REJECTED') {
        await this.applySubjectUnverified(tx, row.subjectType, row.subjectId);
      }
      return row;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action:
        status === 'REJECTED' ? 'verification.case.rejected' : 'verification.case.changes_requested',
      resourceType: 'verification_case',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status },
    });

    if (updated.submittedByUserId) {
      await this.notifications.create({
        userId: updated.submittedByUserId,
        orgId: updated.organizationId,
        type:
          status === 'REJECTED' ? 'VERIFICATION_REJECTED' : 'VERIFICATION_CHANGES_REQUESTED',
        title: status === 'REJECTED' ? 'Verification rejected' : 'Verification changes requested',
        body:
          status === 'REJECTED'
            ? 'Your verification case was rejected.'
            : 'Changes were requested for your verification case.',
        severity: 'WARNING',
        entityType: 'VERIFICATION_CASE',
        entityId: updated.id,
      });
    }

    const subjectPublicId = await this.resolveSubjectPublicId(updated.subjectType, updated.subjectId);
    return this.toDetail(updated, subjectPublicId);
  }

  private requireAdminManage(actor: AuthActor) {
    if (!this.access.canManageAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  private async resolveSubject(
    subjectType: VerificationSubjectType,
    subjectPublicId: string,
    organizationId: string,
  ): Promise<ResolvedSubject> {
    if (subjectType === 'DEVELOPER') {
      const profile = await this.prisma.developerProfile.findFirst({
        where: { publicId: subjectPublicId, organizationId, status: 'ACTIVE' },
      });
      if (!profile) throw new AppError('NOT_FOUND', 'Resource not found.');
      return {
        subjectId: profile.id,
        subjectPublicId: profile.publicId,
        organizationId: profile.organizationId,
      };
    }
    if (subjectType === 'AGENT') {
      const profile = await this.prisma.agencyProfile.findFirst({
        where: { publicId: subjectPublicId, organizationId, status: 'ACTIVE' },
      });
      if (!profile) throw new AppError('NOT_FOUND', 'Resource not found.');
      return {
        subjectId: profile.id,
        subjectPublicId: profile.publicId,
        organizationId: profile.organizationId,
      };
    }
    if (subjectType === 'PROJECT') {
      const project = await this.prisma.project.findFirst({
        where: { publicId: subjectPublicId, organizationId, deletedAt: null },
      });
      if (!project) throw new AppError('NOT_FOUND', 'Resource not found.');
      return {
        subjectId: project.id,
        subjectPublicId: project.publicId,
        organizationId: project.organizationId,
      };
    }
    const property = await this.prisma.property.findFirst({
      where: { publicId: subjectPublicId, organizationId, deletedAt: null },
    });
    if (!property) throw new AppError('NOT_FOUND', 'Resource not found.');
    return {
      subjectId: property.id,
      subjectPublicId: property.publicId,
      organizationId: property.organizationId,
    };
  }

  private async resolveSubjectPublicId(
    subjectType: VerificationSubjectType,
    subjectId: string,
  ): Promise<string> {
    if (subjectType === 'DEVELOPER') {
      const row = await this.prisma.developerProfile.findFirst({
        where: { id: subjectId },
        select: { publicId: true },
      });
      return row?.publicId ?? subjectId;
    }
    if (subjectType === 'AGENT') {
      const row = await this.prisma.agencyProfile.findFirst({
        where: { id: subjectId },
        select: { publicId: true },
      });
      return row?.publicId ?? subjectId;
    }
    if (subjectType === 'PROJECT') {
      const row = await this.prisma.project.findFirst({
        where: { id: subjectId },
        select: { publicId: true },
      });
      return row?.publicId ?? subjectId;
    }
    const row = await this.prisma.property.findFirst({
      where: { id: subjectId },
      select: { publicId: true },
    });
    return row?.publicId ?? subjectId;
  }

  private async applySubjectPending(
    tx: Prisma.TransactionClient,
    subjectType: VerificationSubjectType,
    subjectId: string,
  ) {
    if (subjectType === 'DEVELOPER') {
      await tx.developerProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'PENDING' },
      });
      return;
    }
    if (subjectType === 'AGENT') {
      await tx.agencyProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'PENDING' },
      });
      return;
    }
    if (subjectType === 'PROJECT') {
      await tx.project.update({
        where: { id: subjectId },
        data: { trustStatus: 'PENDING_VERIFICATION', version: { increment: 1 } },
      });
      return;
    }
    await tx.property.update({
      where: { id: subjectId },
      data: { trustStatus: 'PENDING_VERIFICATION', version: { increment: 1 } },
    });
  }

  private async applySubjectVerified(
    tx: Prisma.TransactionClient,
    subjectType: VerificationSubjectType,
    subjectId: string,
  ) {
    if (subjectType === 'DEVELOPER') {
      await tx.developerProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'VERIFIED' },
      });
      return;
    }
    if (subjectType === 'AGENT') {
      await tx.agencyProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'VERIFIED' },
      });
      return;
    }
    if (subjectType === 'PROJECT') {
      await tx.project.update({
        where: { id: subjectId },
        data: { trustStatus: 'VERIFIED', version: { increment: 1 } },
      });
      return;
    }
    await tx.property.update({
      where: { id: subjectId },
      data: { trustStatus: 'VERIFIED', version: { increment: 1 } },
    });
  }

  private async applySubjectUnverified(
    tx: Prisma.TransactionClient,
    subjectType: VerificationSubjectType,
    subjectId: string,
  ) {
    if (subjectType === 'DEVELOPER') {
      await tx.developerProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'UNVERIFIED' },
      });
      return;
    }
    if (subjectType === 'AGENT') {
      await tx.agencyProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'UNVERIFIED' },
      });
      return;
    }
    if (subjectType === 'PROJECT') {
      await tx.project.update({
        where: { id: subjectId },
        data: { trustStatus: 'UNVERIFIED', version: { increment: 1 } },
      });
      return;
    }
    await tx.property.update({
      where: { id: subjectId },
      data: { trustStatus: 'UNVERIFIED', version: { increment: 1 } },
    });
  }

  private async applySubjectRevoked(
    tx: Prisma.TransactionClient,
    subjectType: VerificationSubjectType,
    subjectId: string,
  ) {
    if (subjectType === 'DEVELOPER') {
      await tx.developerProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'UNVERIFIED' },
      });
      return;
    }
    if (subjectType === 'AGENT') {
      await tx.agencyProfile.update({
        where: { id: subjectId },
        data: { verificationStatus: 'UNVERIFIED' },
      });
      return;
    }
    if (subjectType === 'PROJECT') {
      await tx.project.update({
        where: { id: subjectId },
        data: { trustStatus: 'REVOKED', version: { increment: 1 } },
      });
      return;
    }
    await tx.property.update({
      where: { id: subjectId },
      data: { trustStatus: 'REVOKED', version: { increment: 1 } },
    });
  }

  private async toSummaryAsync(row: {
    publicId: string;
    organization?: { publicId: string } | null;
    organizationId: string | null;
    subjectType: VerificationSubjectType;
    subjectId: string;
    verificationType: VerificationSubjectType;
    status: VerificationCaseSummary['status'];
    reraNumber: string | null;
    declarationAccepted: boolean;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    expiresAt: Date | null;
    rejectionReason: string | null;
    reviewerNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<VerificationCaseSummary> {
    const subjectPublicId = await this.resolveSubjectPublicId(row.subjectType, row.subjectId);
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      subjectType: row.subjectType,
      subjectPublicId,
      verificationType: row.verificationType,
      status: row.status,
      reraNumber: row.reraNumber,
      declarationAccepted: row.declarationAccepted,
      submittedAt: toIso(row.submittedAt),
      reviewedAt: toIso(row.reviewedAt),
      expiresAt: toIso(row.expiresAt),
      rejectionReason: row.rejectionReason,
      reviewerNotes: row.reviewerNotes,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }

  private toDetail(
    row: {
      publicId: string;
      organization?: { publicId: string } | null;
      organizationId: string | null;
      subjectType: VerificationSubjectType;
      subjectId: string;
      verificationType: VerificationSubjectType;
      status: VerificationCaseSummary['status'];
      reraNumber: string | null;
      declarationAccepted: boolean;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      expiresAt: Date | null;
      rejectionReason: string | null;
      reviewerNotes: string | null;
      createdAt: Date;
      updatedAt: Date;
      documents?: Array<{
        publicId: string;
        documentType: VerificationDocumentSummary['documentType'];
        status: VerificationDocumentSummary['status'];
        extractedReference: string | null;
        reviewerNotes: string | null;
        createdAt: Date;
        updatedAt: Date;
        documentAsset: { publicId: string; storageKey: string };
      }>;
    },
    subjectPublicId: string,
  ): VerificationCaseDetail {
    return {
      publicId: row.publicId,
      organizationPublicId: row.organization?.publicId ?? null,
      subjectType: row.subjectType,
      subjectPublicId,
      verificationType: row.verificationType,
      status: row.status,
      reraNumber: row.reraNumber,
      declarationAccepted: row.declarationAccepted,
      submittedAt: toIso(row.submittedAt),
      reviewedAt: toIso(row.reviewedAt),
      expiresAt: toIso(row.expiresAt),
      rejectionReason: row.rejectionReason,
      reviewerNotes: row.reviewerNotes,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
      documents: (row.documents ?? []).map((doc) => this.toDocumentSummary(doc)),
    };
  }

  private toDocumentSummary(doc: {
    publicId: string;
    documentType: VerificationDocumentSummary['documentType'];
    status: VerificationDocumentSummary['status'];
    extractedReference: string | null;
    reviewerNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    documentAsset: { publicId: string; storageKey: string };
  }): VerificationDocumentSummary {
    return {
      publicId: doc.publicId,
      documentAssetPublicId: doc.documentAsset.publicId,
      documentType: doc.documentType,
      status: doc.status,
      storageKey: doc.documentAsset.storageKey,
      extractedReference: doc.extractedReference,
      reviewerNotes: doc.reviewerNotes,
      createdAt: toIso(doc.createdAt)!,
      updatedAt: toIso(doc.updatedAt)!,
    };
  }
}
