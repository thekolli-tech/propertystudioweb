import { Module } from '@nestjs/common';

import { ReviewsModule } from '../reviews/reviews.module';
import { CompareService } from './compare.service';
import { InfrastructureService } from './infrastructure.service';
import { IntelligenceAccessService } from './intelligence-access.service';
import { IntelligenceAdminService } from './intelligence-admin.service';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceMatchService } from './intelligence-match.service';
import { MarketIntelligenceService } from './market-intelligence.service';
import { ProjectIntelligenceService } from './project-intelligence.service';
import { PropertyIntelligenceService } from './property-intelligence.service';

@Module({
  imports: [ReviewsModule],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceAccessService,
    MarketIntelligenceService,
    InfrastructureService,
    PropertyIntelligenceService,
    ProjectIntelligenceService,
    CompareService,
    IntelligenceMatchService,
    IntelligenceAdminService,
  ],
  exports: [
    IntelligenceAccessService,
    MarketIntelligenceService,
    InfrastructureService,
    PropertyIntelligenceService,
    ProjectIntelligenceService,
    CompareService,
    IntelligenceMatchService,
  ],
})
export class IntelligenceModule {}
