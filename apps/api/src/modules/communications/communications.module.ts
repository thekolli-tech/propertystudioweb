import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { CommunicationsAccessService } from './communications-access.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsAccessService, CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
