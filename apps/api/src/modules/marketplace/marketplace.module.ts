import { Module } from '@nestjs/common';

import { CrmModule } from '../crm/crm.module';
import { LeadAccessService } from './lead-access.service';
import { LeadEligibilityService } from './lead-eligibility.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { RequirementMatchingService } from './requirement-matching.service';
import { RequirementsController } from './requirements.controller';
import { RequirementsService } from './requirements.service';

@Module({
  imports: [CrmModule],
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
