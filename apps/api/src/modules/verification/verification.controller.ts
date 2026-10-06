import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminVerificationCaseListQuerySchema,
  attachVerificationDocumentRequestSchema,
  createVerificationCaseRequestSchema,
  reviewVerificationCaseRequestSchema,
  submitVerificationCaseRequestSchema,
  updateVerificationCaseRequestSchema,
  updateVerificationDocumentRequestSchema,
  verificationCaseListQuerySchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { VerificationService } from './verification.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post('verification/cases')
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.create(
      actor,
      body as Parameters<VerificationService['create']>[1],
      request,
    );
  }

  @Get('verification/cases')
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(verificationCaseListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.listForOrganization(
      actor,
      query as Parameters<VerificationService['listForOrganization']>[1],
      request,
    );
  }

  @Get('verification/cases/:publicId')
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.getOne(actor, publicId, request);
  }

  @Patch('verification/cases/:publicId')
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.updateDraft(
      actor,
      publicId,
      body as Parameters<VerificationService['updateDraft']>[2],
      request,
    );
  }

  @Post('verification/cases/:publicId/submit')
  submit(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(submitVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.submit(
      actor,
      publicId,
      body as Parameters<VerificationService['submit']>[2],
      request,
    );
  }

  @Post('verification/cases/:publicId/documents')
  attachDocument(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(attachVerificationDocumentRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.attachDocument(
      actor,
      publicId,
      body as Parameters<VerificationService['attachDocument']>[2],
      request,
    );
  }

  @Patch('verification/cases/:casePublicId/documents/:documentPublicId')
  updateDocument(
    @CurrentActor() actor: AuthActor,
    @Param('casePublicId') casePublicId: string,
    @Param('documentPublicId') documentPublicId: string,
    @Body(new ZodValidationPipe(updateVerificationDocumentRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.updateDocument(
      actor,
      casePublicId,
      documentPublicId,
      body as Parameters<VerificationService['updateDocument']>[3],
      request,
    );
  }

  @Get('admin/verification')
  @RequirePermissions('admin:verification:read')
  listAdmin(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminVerificationCaseListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.listAdmin(
      actor,
      query as Parameters<VerificationService['listAdmin']>[1],
      request,
    );
  }

  @Get('admin/verification/:publicId')
  @RequirePermissions('admin:verification:read')
  getAdmin(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.getOne(actor, publicId, request);
  }

  @Post('admin/verification/:publicId/approve')
  @RequirePermissions('verification:approve')
  approve(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reviewVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.approve(
      actor,
      publicId,
      body as Parameters<VerificationService['approve']>[2],
      request,
    );
  }

  @Post('admin/verification/:publicId/reject')
  @RequirePermissions('verification:reject')
  reject(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reviewVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.reject(
      actor,
      publicId,
      body as Parameters<VerificationService['reject']>[2],
      request,
    );
  }

  @Post('admin/verification/:publicId/request-changes')
  @RequirePermissions('verification:review')
  requestChanges(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reviewVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.requestChanges(
      actor,
      publicId,
      body as Parameters<VerificationService['requestChanges']>[2],
      request,
    );
  }

  @Post('admin/verification/:publicId/revoke')
  @RequirePermissions('verification:revoke')
  revoke(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reviewVerificationCaseRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.verification.revoke(
      actor,
      publicId,
      body as Parameters<VerificationService['revoke']>[2],
      request,
    );
  }
}
