import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  addOrganizationMemberRequestSchema,
  createOrganizationRequestSchema,
  onboardOrganizationRequestSchema,
  updateAgencyProfileRequestSchema,
  updateDeveloperProfileRequestSchema,
  updateOrganizationMemberRequestSchema,
  updateOrganizationRequestSchema,
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

  @Post('onboard')
  onboard(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(onboardOrganizationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.onboard(
      actor,
      body as Parameters<OrganizationsService['onboard']>[1],
      request,
    );
  }

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

  @Patch(':publicId')
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateOrganizationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.updateOrganization(
      actor,
      publicId,
      body as Parameters<OrganizationsService['updateOrganization']>[2],
      request,
    );
  }

  @Post(':publicId/switch')
  switchActive(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.switchActive(actor, publicId, request);
  }

  @Get(':publicId/developer-profile')
  getDeveloperProfile(@CurrentActor() actor: AuthActor, @Param('publicId') publicId: string) {
    return this.organizations.getDeveloperProfile(actor, publicId);
  }

  @Put(':publicId/developer-profile')
  updateDeveloperProfile(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateDeveloperProfileRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.updateDeveloperProfile(
      actor,
      publicId,
      body as Parameters<OrganizationsService['updateDeveloperProfile']>[2],
      request,
    );
  }

  @Get(':publicId/agency-profile')
  getAgencyProfile(@CurrentActor() actor: AuthActor, @Param('publicId') publicId: string) {
    return this.organizations.getAgencyProfile(actor, publicId);
  }

  @Put(':publicId/agency-profile')
  updateAgencyProfile(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updateAgencyProfileRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.updateAgencyProfile(
      actor,
      publicId,
      body as Parameters<OrganizationsService['updateAgencyProfile']>[2],
      request,
    );
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

  @Patch(':publicId/members/:userPublicId')
  updateMember(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Param('userPublicId') userPublicId: string,
    @Body(new ZodValidationPipe(updateOrganizationMemberRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.updateMember(
      actor,
      publicId,
      userPublicId,
      body as Parameters<OrganizationsService['updateMember']>[3],
      request,
    );
  }

  @Delete(':publicId/members/:userPublicId')
  deactivateMember(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Param('userPublicId') userPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.organizations.deactivateMember(actor, publicId, userPublicId, request);
  }
}

@Controller()
export class PublicProfilesController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('developers/:publicId')
  getDeveloper(@Param('publicId') publicId: string) {
    return this.organizations.getPublicDeveloperProfile(publicId);
  }

  @Get('agents/:publicId')
  getAgent(@Param('publicId') publicId: string) {
    return this.organizations.getPublicAgencyProfile(publicId);
  }
}
