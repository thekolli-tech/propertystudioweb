import { Module } from '@nestjs/common';

import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowOrchestrationService } from './workflow-orchestration.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  imports: [IntegrationsModule, NotificationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowOrchestrationService],
  exports: [WorkflowOrchestrationService],
})
export class WorkflowsModule {}
