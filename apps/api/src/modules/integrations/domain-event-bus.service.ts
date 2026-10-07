import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type DomainEventType } from '@property-studio/contracts';

import { newUuid } from '../../common/crypto/ids';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { AutomationService } from './automation.service';
import { BackgroundJobsService } from './background-jobs.service';
import { WebhooksService } from './webhooks.service';

export type EmitDomainEventInput = {
  eventType: DomainEventType;
  resourceType: string;
  resourcePublicId?: string | null;
  organizationId?: string | null;
  payload: Record<string, unknown>;
};

type DomainEventHandler = (event: {
  id: string;
  publicId: string;
  eventType: DomainEventType;
  resourceType: string;
  resourcePublicId: string | null;
  organizationId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}) => Promise<void>;

/**
 * In-process domain event bus. Core modules emit; integrations subscribe.
 * Persists canonical event records for webhook/idempotent delivery.
 */
@Injectable()
export class DomainEventBus implements OnModuleInit {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly webhooks: WebhooksService,
    private readonly jobs: BackgroundJobsService,
    private readonly automations: AutomationService,
  ) {}

  onModuleInit(): void {
    this.subscribe('*', async (event) => {
      await this.webhooks.enqueueDeliveriesForEvent(event.id);
      await this.jobs.enqueue({
        jobType: 'webhook.dispatch',
        payload: { domainEventId: event.id, eventPublicId: event.publicId },
      });
      if (event.organizationId) {
        await this.automations.handleEvent({
          eventType: event.eventType,
          organizationId: event.organizationId,
          resourcePublicId: event.resourcePublicId,
          payload: event.payload,
        });
      }
    });
  }

  subscribe(eventType: DomainEventType | '*', handler: DomainEventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async emit(input: EmitDomainEventInput): Promise<{ publicId: string; id: string }> {
    const publicId = await this.publicIds.nextDomainEventPublicId();
    const record = await this.prisma.domainEventRecord.create({
      data: {
        id: newUuid(),
        publicId,
        eventType: input.eventType,
        resourceType: input.resourceType,
        resourcePublicId: input.resourcePublicId ?? null,
        organizationId: input.organizationId ?? null,
        apiVersion: 'v1',
        payloadJson: input.payload as object,
        status: 'PENDING',
        occurredAt: new Date(),
      },
    });

    const event = {
      id: record.id,
      publicId: record.publicId,
      eventType: input.eventType,
      resourceType: input.resourceType,
      resourcePublicId: input.resourcePublicId ?? null,
      organizationId: input.organizationId ?? null,
      payload: input.payload,
      occurredAt: record.occurredAt,
    };

    const specific = this.handlers.get(input.eventType) ?? [];
    const wildcard = this.handlers.get('*') ?? [];
    for (const handler of [...specific, ...wildcard]) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.warn(
          `Domain event handler failed for ${input.eventType}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    await this.prisma.domainEventRecord.update({
      where: { id: record.id },
      data: { status: 'DISPATCHED', dispatchedAt: new Date() },
    });

    return { publicId: record.publicId, id: record.id };
  }
}
