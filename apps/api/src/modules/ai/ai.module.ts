import { Module } from '@nestjs/common';

import { IntelligenceModule } from '../intelligence/intelligence.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { AiAccessService } from './ai-access.service';
import { AiController } from './ai.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AI_PROVIDER } from './providers/ai-provider';
import { DeterministicAiProvider } from './providers/deterministic-ai.provider';
import { AiToolsService } from './tools/ai-tools.service';

@Module({
  imports: [IntelligenceModule, MarketplaceModule],
  controllers: [AiController],
  providers: [
    AiAccessService,
    DeterministicAiProvider,
    { provide: AI_PROVIDER, useExisting: DeterministicAiProvider },
    AiToolsService,
    AiOrchestrationService,
  ],
  exports: [AiOrchestrationService, AiToolsService],
})
export class AiModule {}
