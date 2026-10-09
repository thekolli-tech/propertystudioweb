import { Module } from '@nestjs/common';

import { AgentProfessionalAccessService } from './agent-professional-access.service';

/**
 * Lean module for professional access gates.
 * Intentionally avoids importing Billing/Marketplace/Catalog to prevent Nest circular deps.
 */
@Module({
  providers: [AgentProfessionalAccessService],
  exports: [AgentProfessionalAccessService],
})
export class AgentAccessModule {}
