import { Module, forwardRef } from '@nestjs/common';

import { AgentOpsModule } from '../agent-ops/agent-ops.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CatalogAccessService } from './catalog-access.service';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [IntegrationsModule, forwardRef(() => AgentOpsModule)],
  controllers: [ProjectsController, PropertiesController, CommunitiesController],
  providers: [CatalogAccessService, ProjectsService, PropertiesService, CommunitiesService],
  exports: [ProjectsService, PropertiesService, CommunitiesService, CatalogAccessService],
})
export class CatalogModule {}
