import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { CatalogModule } from '../catalog/catalog.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { VerificationModule } from '../verification/verification.module';
import { ConstructionUpdatesController } from './construction-updates.controller';
import { ConstructionUpdatesService } from './construction-updates.service';
import { ProjectClaimsController } from './project-claims.controller';
import { ProjectClaimsService } from './project-claims.service';
import { ProjectWorkspaceController } from './project-workspace.controller';
import { ProjectWorkspaceService } from './project-workspace.service';

@Module({
  imports: [CatalogModule, BillingModule, IntegrationsModule, VerificationModule],
  controllers: [
    ConstructionUpdatesController,
    ProjectClaimsController,
    ProjectWorkspaceController,
  ],
  providers: [ConstructionUpdatesService, ProjectClaimsService, ProjectWorkspaceService],
  exports: [ConstructionUpdatesService, ProjectClaimsService, ProjectWorkspaceService],
})
export class ProjectOpsModule {}
