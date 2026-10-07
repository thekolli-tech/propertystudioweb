import { Module, forwardRef } from '@nestjs/common';

import { AgentOpsModule } from '../agent-ops/agent-ops.module';
import { CrmModule } from '../crm/crm.module';
import { LeadAccessService } from './lead-access.service';
import { LeadEligibilityService } from './lead-eligibility.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { RequirementMatchingService } from './requirement-matching.service';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';

@Module({
  imports: [CrmModule, forwardRef(() => AgentOpsModule)],
  controllers: [RequirementsController, LeadsController],
  providers: [
    RequirementsService,
    LeadsService,
    RequirementMatchingService,
    LeadEligibilityService,
    LeadAccessService,
  ],
  exports: [
    RequirementsService,
    LeadsService,
    RequirementMatchingService,
    LeadEligibilityService,
    LeadAccessService,
  ],
})
export class MarketplaceModule {}
