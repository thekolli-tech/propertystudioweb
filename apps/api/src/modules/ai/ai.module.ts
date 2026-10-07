import { Module } from '@nestjs/common';

import { IntelligenceModule } from '../intelligence/intelligence.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { AiAccessService } from './ai-access.service';
import { AiController } from './ai.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { AiContextAssemblyService } from './context/ai-context-assembly.service';
import { NextBestActionService } from './context/next-best-action.service';
import { AI_PROVIDER } from './providers/ai-provider';
import { DeterministicAiProvider } from './providers/deterministic-ai.provider';
import { AiToolsService } from './tools/ai-tools.service';

@Module({
  imports: [IntelligenceModule, MarketplaceModule],
  controllers: [AiController, ChatbotController],
  providers: [
    AiAccessService,
    DeterministicAiProvider,
    { provide: AI_PROVIDER, useExisting: DeterministicAiProvider },
    NextBestActionService,
    AiContextAssemblyService,
    AiToolsService,
    AiOrchestrationService,
    ChatbotService,
  ],
  exports: [
    AiOrchestrationService,
    AiToolsService,
    ChatbotService,
    AiContextAssemblyService,
    NextBestActionService,
  ],
})
export class AiModule {}
