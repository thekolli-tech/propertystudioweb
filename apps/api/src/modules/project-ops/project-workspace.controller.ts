import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { projectInventoryListQuerySchema } from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { ProjectWorkspaceService } from './project-workspace.service';

@Controller()
export class ProjectWorkspaceController {
  constructor(private readonly workspace: ProjectWorkspaceService) {}

  @Get('org/:orgPublicId/projects/:projectPublicId/workspace')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('project:read')
  getWorkspace(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Param('projectPublicId') projectPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspace.getWorkspace(actor, orgPublicId, projectPublicId, request);
  }

  @Get('org/:orgPublicId/projects/:projectPublicId/inventory')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('property:read')
  listInventory(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Param('projectPublicId') projectPublicId: string,
    @Query(new ZodValidationPipe(projectInventoryListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspace.listInventory(
      actor,
      orgPublicId,
      projectPublicId,
      query as Parameters<ProjectWorkspaceService['listInventory']>[3],
      request,
    );
  }
}
