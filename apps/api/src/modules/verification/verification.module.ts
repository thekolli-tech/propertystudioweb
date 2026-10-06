import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { VerificationAccessService } from './verification-access.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [NotificationsModule],
  controllers: [VerificationController],
  providers: [VerificationAccessService, VerificationService],
  exports: [VerificationService, VerificationAccessService],
})
export class VerificationModule {}
