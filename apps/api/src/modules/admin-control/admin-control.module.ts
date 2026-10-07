import { Module } from '@nestjs/common';

import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminControlController } from './admin-control.controller';
import { AdminSystemHealthService } from './admin-system-health.service';

@Module({
  controllers: [AdminControlController],
  providers: [AdminAnalyticsService, AdminSystemHealthService, AdminAuditService],
  exports: [AdminAnalyticsService, AdminSystemHealthService, AdminAuditService],
})
export class AdminControlModule {}
