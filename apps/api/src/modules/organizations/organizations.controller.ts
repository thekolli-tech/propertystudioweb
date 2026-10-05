import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  addOrganizationMemberRequestSchema,
  createOrganizationRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(AuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createOrganizationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.create(
      actor,
      body as Parameters<OrganizationsService['create']>[1],
      request,
    );
  }

  @Get()
  listMine(@CurrentActor() actor: AuthActor) {
    return this.organizations.listMine(actor);
  }

  @Get(':publicId')
  getOne(@CurrentActor() actor: AuthActor, @Param('publicId') publicId: string) {
    return this.organizations.getOne(actor, publicId);
  }

  @Post(':publicId/switch')
  switchActive(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.switchActive(actor, publicId, request);
  }

  @Get(':publicId/members')
  listMembers(@CurrentActor() actor: AuthActor, @Param('publicId') publicId: string) {
    return this.organizations.listMembers(actor, publicId);
  }

  @Post(':publicId/members')
  addMember(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(addOrganizationMemberRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.addMember(
      actor,
      publicId,
      body as Parameters<OrganizationsService['addMember']>[2],
      request,
    );
  }
}
