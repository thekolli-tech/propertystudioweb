import { Module } from '@nestjs/common';

import { CrmAccessService } from './crm-access.service';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { LeadTransitionService } from './lead-transition.service';

@Module({
  controllers: [CrmController],
  providers: [CrmAccessService, CrmService, LeadTransitionService],
  exports: [CrmAccessService, CrmService, LeadTransitionService],
})
export class CrmModule {}
