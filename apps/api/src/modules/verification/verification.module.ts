import { Module } from '@nestjs/common';

import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerificationAccessService } from './verification-access.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [NotificationsModule, IntegrationsModule],
  controllers: [VerificationController],
  providers: [VerificationAccessService, VerificationService],
  exports: [VerificationService, VerificationAccessService],
})
export class VerificationModule {}
