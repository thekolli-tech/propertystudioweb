import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminLeadListQuerySchema,
  createMarketplaceLeadRequestSchema,
  leadListQuerySchema,
  updateLeadStatusRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { LeadsService } from './leads.service';

@Controller()
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post('leads/from-requirement')
  @UseGuards(AuthGuard, PermissionsGuard)
  createFromRequirement(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createMarketplaceLeadRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leads.createMarketplaceLead(
      actor,
      body as Parameters<LeadsService['createMarketplaceLead']>[1],
      request,
    );
  }

  @Get('leads')
  @UseGuards(AuthGuard, PermissionsGuard)
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(leadListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leads.listForOrganization(
      actor,
      query as Parameters<LeadsService['listForOrganization']>[1],
      request,
    );
  }

  @Get('leads/:publicId')
  @UseGuards(AuthGuard, PermissionsGuard)
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leads.getOne(actor, publicId, request);
  }

  @Patch('leads/:publicId/status')
  @UseGuards(AuthGuard, PermissionsGuard)
  updateStatus(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateLeadStatusRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leads.updateStatus(
      actor,
      publicId,
      body as Parameters<LeadsService['updateStatus']>[2],
      request,
    );
  }

  @Get('admin/leads')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('admin:leads:read')
  listAdmin(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(adminLeadListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.leads.listAdmin(actor, query as Parameters<LeadsService['listAdmin']>[1], request);
  }
}
