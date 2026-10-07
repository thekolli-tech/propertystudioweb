import { Module, forwardRef } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AgentOpsController } from './agent-ops.controller';
import { AgentOpsService } from './agent-ops.service';
import { AgentProfessionalAccessService } from './agent-professional-access.service';

@Module({
  imports: [BillingModule, NotificationsModule, forwardRef(() => IntegrationsModule)],
  controllers: [AgentOpsController],
  providers: [AgentOpsService, AgentProfessionalAccessService],
  exports: [AgentOpsService, AgentProfessionalAccessService],
})
export class AgentOpsModule {}
