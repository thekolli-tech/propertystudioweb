import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  assignCrmLeadRequestSchema,
  createCrmActivityRequestSchema,
  createCrmContactRequestSchema,
  createCrmDealRequestSchema,
  createCrmFollowUpRequestSchema,
  createCrmSiteVisitRequestSchema,
  crmActivityListQuerySchema,
  crmContactListQuerySchema,
  crmDealListQuerySchema,
  crmFollowUpListQuerySchema,
  crmLeadListQuerySchema,
  crmOverviewQuerySchema,
  crmSiteVisitListQuerySchema,
  updateCrmContactRequestSchema,
  updateCrmDealRequestSchema,
  updateCrmFollowUpRequestSchema,
  updateCrmLeadStatusRequestSchema,
  updateCrmSiteVisitRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(AuthGuard, PermissionsGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('overview')
  overview(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmOverviewQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.overview(actor, query as Parameters<CrmService['overview']>[1], request);
  }

  @Get('contacts')
  listContacts(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmContactListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.listContacts(
      actor,
      query as Parameters<CrmService['listContacts']>[1],
      request,
    );
  }

  @Post('contacts')
  createContact(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCrmContactRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.createContact(
      actor,
      body as Parameters<CrmService['createContact']>[1],
      request,
    );
  }

  @Get('contacts/:publicId')
  getContact(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.getContact(actor, publicId, request);
  }

  @Patch('contacts/:publicId')
  updateContact(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateCrmContactRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.updateContact(
      actor,
      publicId,
      body as Parameters<CrmService['updateContact']>[2],
      request,
    );
  }

  @Get('activities')
  listActivities(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmActivityListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.listActivities(
      actor,
      query as Parameters<CrmService['listActivities']>[1],
      request,
    );
  }

  @Post('activities')
  createActivity(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCrmActivityRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.createActivity(
      actor,
      body as Parameters<CrmService['createActivity']>[1],
      request,
    );
  }

  @Get('follow-ups')
  listFollowUps(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmFollowUpListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.listFollowUps(
      actor,
      query as Parameters<CrmService['listFollowUps']>[1],
      request,
    );
  }

  @Post('follow-ups')
  createFollowUp(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCrmFollowUpRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.createFollowUp(
      actor,
      body as Parameters<CrmService['createFollowUp']>[1],
      request,
    );
  }

  @Patch('follow-ups/:publicId')
  updateFollowUp(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateCrmFollowUpRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.updateFollowUp(
      actor,
      publicId,
      body as Parameters<CrmService['updateFollowUp']>[2],
      request,
    );
  }

  @Get('site-visits')
  listSiteVisits(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmSiteVisitListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.listSiteVisits(
      actor,
      query as Parameters<CrmService['listSiteVisits']>[1],
      request,
    );
  }

  @Post('site-visits')
  createSiteVisit(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCrmSiteVisitRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.createSiteVisit(
      actor,
      body as Parameters<CrmService['createSiteVisit']>[1],
      request,
    );
  }

  @Patch('site-visits/:publicId')
  updateSiteVisit(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateCrmSiteVisitRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.updateSiteVisit(
      actor,
      publicId,
      body as Parameters<CrmService['updateSiteVisit']>[2],
      request,
    );
  }

  @Get('deals')
  listDeals(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmDealListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.listDeals(actor, query as Parameters<CrmService['listDeals']>[1], request);
  }

  @Post('deals')
  createDeal(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createCrmDealRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.createDeal(actor, body as Parameters<CrmService['createDeal']>[1], request);
  }

  @Get('deals/:publicId')
  getDeal(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.getDeal(actor, publicId, request);
  }

  @Patch('deals/:publicId')
  updateDeal(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateCrmDealRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.updateDeal(
      actor,
      publicId,
      body as Parameters<CrmService['updateDeal']>[2],
      request,
    );
  }

  @Get('leads')
  listLeads(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(crmLeadListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.listLeads(actor, query as Parameters<CrmService['listLeads']>[1], request);
  }

  @Get('leads/:publicId')
  getLeadDetail(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.getLeadDetail(actor, publicId, request);
  }

  @Post('leads/:publicId/assign')
  assignLead(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(assignCrmLeadRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.assignLead(
      actor,
      publicId,
      body as Parameters<CrmService['assignLead']>[2],
      request,
    );
  }

  @Patch('leads/:publicId/status')
  updateLeadStatus(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateCrmLeadStatusRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crm.updateLeadStatus(
      actor,
      publicId,
      body as Parameters<CrmService['updateLeadStatus']>[2],
      request,
    );
  }
}
