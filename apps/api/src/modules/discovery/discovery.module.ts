import { Module } from '@nestjs/common';

import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { SavedPropertiesService } from './saved-properties.service';
import { SavedSearchesService } from './saved-searches.service';
import { SmartAlertsService } from './smart-alerts.service';

@Module({
  imports: [IntegrationsModule, NotificationsModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, SavedSearchesService, SavedPropertiesService, SmartAlertsService],
  exports: [DiscoveryService, SavedSearchesService, SavedPropertiesService, SmartAlertsService],
})
export class DiscoveryModule {}
