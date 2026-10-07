import { Module, type OnModuleInit } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationService } from './automation.service';
import { BackgroundJobsService } from './background-jobs.service';
import { DeadLetterService } from './dead-letter.service';
import { DomainEventBus } from './domain-event-bus.service';
import { IngestionService } from './ingestion.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { LeadDeliveryService } from './lead-delivery.service';
import { NotificationChannelsService } from './notification-channels.service';
import { PartnerApiController } from './partner-api.controller';
import { PartnerApiService } from './partner-api.service';
import { PartnerAuthGuard } from './partner-auth';
import { IntegrationSecretsService } from './secrets.service';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [NotificationsModule],
  controllers: [IntegrationsController, PartnerApiController],
  providers: [
    IntegrationSecretsService,
    NotificationChannelsService,
    DeadLetterService,
    BackgroundJobsService,
    WebhooksService,
    AutomationService,
    IntegrationsService,
    PartnerApiService,
    PartnerAuthGuard,
    IngestionService,
    DomainEventBus,
    LeadDeliveryService,
  ],
  exports: [
    DomainEventBus,
    WebhooksService,
    IntegrationsService,
    LeadDeliveryService,
    NotificationChannelsService,
    BackgroundJobsService,
    IngestionService,
  ],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(
    private readonly jobs: BackgroundJobsService,
    private readonly webhooks: WebhooksService,
  ) {}

  onModuleInit(): void {
    // Register job handlers. Processing is on-demand via admin endpoint / emit side-effects.
    void this.jobs;
    void this.webhooks;
  }
}
