import { Module, forwardRef } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AgentAccessModule } from './agent-access.module';
import { AgentOpsController } from './agent-ops.controller';
import { AgentOpsService } from './agent-ops.service';

@Module({
  imports: [
    AgentAccessModule,
    BillingModule,
    NotificationsModule,
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [AgentOpsController],
  providers: [AgentOpsService],
  exports: [AgentOpsService, AgentAccessModule],
})
export class AgentOpsModule {}
