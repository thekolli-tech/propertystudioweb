import { Injectable, Logger } from '@nestjs/common';
import {
  type CreateWebhookEndpointRequest,
  type DomainEventType,
  type PartnerApiScope,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { DeadLetterService } from './dead-letter.service';
import { IntegrationSecretsService } from './secrets.service';
import {
  isRetryableWebhookStatus,
  signWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  webhookBackoffMs,
} from './webhook-signing.util';
import { AppConfigService } from '../../common/config/app-config.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly secrets: IntegrationSecretsService,
    private readonly deadLetters: DeadLetterService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async createEndpoint(
    actor: AuthActor,
    integrationPublicId: string,
    body: CreateWebhookEndpointRequest,
    request?: { requestId?: string },
  ) {
    this.requireManage(actor);
    const integration = await this.requireActiveIntegration(integrationPublicId, actor);

    const { secret, prefix } = this.secrets.generateWebhookSecret();
    const publicId = await this.publicIds.nextWebhookEndpointPublicId();
    const endpoint = await this.prisma.outboundWebhookEndpoint.create({
      data: {
        id: newUuid(),
        publicId,
        partnerIntegrationId: integration.id,
        url: body.url,
        description: body.description ?? null,
        secretCiphertext: this.secrets.encrypt(secret),
        secretPrefix: prefix,
        subscribedEvents: body.subscribedEvents,
        status: 'ACTIVE',
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: integration.organizationId,
      action: 'webhook.endpoint.created',
      resourceType: 'outbound_webhook_endpoint',
      resourceId: endpoint.publicId,
      requestId: request?.requestId,
      after: { url: endpoint.url, events: endpoint.subscribedEvents },
    });

    return {
      ...this.toEndpointSummary(endpoint),
      secret,
    };
  }

  async listEndpoints(actor: AuthActor, integrationPublicId: string) {
    this.requireRead(actor);
    const integration = await this.requireIntegrationAccess(integrationPublicId, actor);
    const rows = await this.prisma.outboundWebhookEndpoint.findMany({
      where: { partnerIntegrationId: integration.id },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map((row) => this.toEndpointSummary(row)) };
  }

  async listDeliveries(
    actor: AuthActor,
    opts: { integrationPublicId?: string; failedOnly?: boolean; limit?: number; cursor?: string },
  ) {
    this.requireRead(actor);
    const limit = opts.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (opts.failedOnly) {
      where.status = { in: ['FAILED', 'DEAD_LETTER'] };
    }
    if (opts.integrationPublicId) {
      const integration = await this.requireIntegrationAccess(opts.integrationPublicId, actor);
      where.endpoint = { partnerIntegrationId: integration.id };
    } else if (!actorHasPermission(actor, 'admin:integrations:read')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const rows = await this.prisma.webhookDelivery.findMany({
      where,
      include: {
        endpoint: true,
        domainEvent: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { publicId: opts.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((row) => ({
        publicId: row.publicId,
        endpointPublicId: row.endpoint.publicId,
        eventPublicId: row.domainEvent.publicId,
        eventType: row.domainEvent.eventType,
        status: row.status,
        attemptCount: row.attemptCount,
        responseStatus: row.responseStatus,
        lastError: row.lastError,
        nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
        completedAt: row.completedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? items[items.length - 1]?.publicId ?? null : null,
    };
  }

  async enqueueDeliveriesForEvent(domainEventId: string): Promise<number> {
    const event = await this.prisma.domainEventRecord.findUnique({ where: { id: domainEventId } });
    if (!event) return 0;

    const endpoints = await this.prisma.outboundWebhookEndpoint.findMany({
      where: {
        status: 'ACTIVE',
        subscribedEvents: { has: event.eventType },
        partnerIntegration: {
          status: 'ACTIVE',
          ...(event.organizationId ? { organizationId: event.organizationId } : {}),
        },
      },
    });

    let created = 0;
    for (const endpoint of endpoints) {
      try {
        await this.prisma.webhookDelivery.create({
          data: {
            id: newUuid(),
            publicId: await this.publicIds.nextWebhookDeliveryPublicId(),
            endpointId: endpoint.id,
            domainEventId: event.id,
            status: 'PENDING',
            nextRetryAt: new Date(),
          },
        });
        created += 1;
      } catch {
        // Unique (endpoint, event) — idempotent skip
      }
    }
    return created;
  }

  async deliverPending(limit = 20): Promise<number> {
    const due = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      include: {
        endpoint: { include: { partnerIntegration: true } },
        domainEvent: true,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let delivered = 0;
    for (const delivery of due) {
      if (
        delivery.endpoint.partnerIntegration.status !== 'ACTIVE' ||
        delivery.endpoint.status === 'DISABLED'
      ) {
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'FAILED',
            lastError: 'Partner or endpoint inactive.',
            completedAt: new Date(),
          },
        });
        continue;
      }
      await this.attemptDelivery(delivery.id);
      delivered += 1;
    }
    return delivered;
  }

  async attemptDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        endpoint: true,
        domainEvent: true,
      },
    });
    if (!delivery || delivery.status === 'SUCCEEDED' || delivery.status === 'DEAD_LETTER') {
      return;
    }

    const secret = this.secrets.decrypt(delivery.endpoint.secretCiphertext);
    const bodyObject = {
      eventId: delivery.domainEvent.publicId,
      eventType: delivery.domainEvent.eventType as DomainEventType,
      timestamp: delivery.domainEvent.occurredAt.toISOString(),
      apiVersion: delivery.domainEvent.apiVersion,
      resourceType: delivery.domainEvent.resourceType,
      resourcePublicId: delivery.domainEvent.resourcePublicId,
      payload: delivery.domainEvent.payloadJson as Record<string, unknown>,
    };
    const body = JSON.stringify(bodyObject);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signWebhookPayload(secret, timestamp, delivery.domainEvent.publicId, body);

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.values.WEBHOOK_DELIVERY_TIMEOUT_MS,
      );
      const response = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_SIGNATURE_HEADER]: `sha256=${signature}`,
          [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
          [WEBHOOK_EVENT_ID_HEADER]: delivery.domainEvent.publicId,
          'User-Agent': 'PropertyStudio-Webhooks/1.0',
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 2000);
      if (responseStatus < 200 || responseStatus >= 300) {
        errorMessage = `HTTP ${responseStatus}`;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Delivery failed';
      responseStatus = null;
    }

    const attemptCount = delivery.attemptCount + 1;
    const success = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

    if (success) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SUCCEEDED',
          attemptCount,
          responseStatus,
          responseBody,
          lastError: null,
          completedAt: new Date(),
          nextRetryAt: null,
        },
      });
      await this.prisma.outboundWebhookEndpoint.update({
        where: { id: delivery.endpointId },
        data: { lastSuccessAt: new Date(), status: 'ACTIVE' },
      });
      return;
    }

    const retryable = isRetryableWebhookStatus(responseStatus);
    if (!retryable || attemptCount >= delivery.endpoint.maxAttempts) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DEAD_LETTER',
          attemptCount,
          responseStatus,
          responseBody,
          lastError: (errorMessage ?? 'Permanently failed').slice(0, 500),
          completedAt: new Date(),
          nextRetryAt: null,
        },
      });
      await this.prisma.outboundWebhookEndpoint.update({
        where: { id: delivery.endpointId },
        data: { lastFailureAt: new Date(), status: 'FAILING' },
      });
      await this.deadLetters.open({
        sourceType: 'webhook_delivery',
        sourceId: delivery.publicId,
        destination: delivery.endpoint.url,
        failureReason: errorMessage ?? 'Permanently failed',
        attemptCount,
        lastResponse: responseBody,
        payload: bodyObject.payload,
      });
      return;
    }

    await this.prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'PENDING',
        attemptCount,
        responseStatus,
        responseBody,
        lastError: (errorMessage ?? 'Retryable failure').slice(0, 500),
        nextRetryAt: new Date(Date.now() + webhookBackoffMs(attemptCount)),
      },
    });
    await this.prisma.outboundWebhookEndpoint.update({
      where: { id: delivery.endpointId },
      data: { lastFailureAt: new Date() },
    });
    this.logger.warn(`Webhook delivery ${delivery.publicId} attempt ${attemptCount} failed`);
  }

  async retryDeadLetter(actor: AuthActor, deadLetterPublicId: string) {
    if (!actorHasPermission(actor, 'admin:integrations:manage')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const dlq = await this.prisma.deadLetterEvent.findUnique({
      where: { publicId: deadLetterPublicId },
    });
    if (!dlq || dlq.sourceType !== 'webhook_delivery') {
      throw new AppError('NOT_FOUND', 'Dead-letter webhook delivery not found.');
    }
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { publicId: dlq.sourceId },
    });
    if (!delivery) {
      throw new AppError('NOT_FOUND', 'Webhook delivery not found.');
    }
    await this.prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'PENDING',
        nextRetryAt: new Date(),
        completedAt: null,
        lastError: null,
      },
    });
    await this.deadLetters.markRetried(deadLetterPublicId);
    await this.attemptDelivery(delivery.id);
    return { ok: true as const };
  }

  verifySignature(input: {
    secret: string;
    timestamp: string;
    eventId: string;
    body: string;
    signature: string;
  }) {
    return verifyWebhookSignature({
      ...input,
      toleranceSeconds: this.config.values.WEBHOOK_REPLAY_TOLERANCE_SECONDS,
    });
  }

  assertPartnerCanManageWebhooks(scopes: PartnerApiScope[]) {
    if (!scopes.includes('webhooks:manage')) {
      throw new AppError('FORBIDDEN', 'Insufficient API key scope.');
    }
  }

  private toEndpointSummary(row: {
    publicId: string;
    url: string;
    description: string | null;
    secretPrefix: string;
    subscribedEvents: string[];
    status: string;
    maxAttempts: number;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    createdAt: Date;
  }) {
    return {
      publicId: row.publicId,
      url: row.url,
      description: row.description,
      secretPrefix: row.secretPrefix,
      subscribedEvents: row.subscribedEvents as DomainEventType[],
      status: row.status as 'ACTIVE' | 'DISABLED' | 'FAILING',
      maxAttempts: row.maxAttempts,
      lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: row.lastFailureAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private requireRead(actor: AuthActor) {
    if (
      !actorHasPermission(actor, 'integrations:read') &&
      !actorHasPermission(actor, 'admin:integrations:read')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  private requireManage(actor: AuthActor) {
    if (
      !actorHasPermission(actor, 'webhooks:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  private async requireIntegrationAccess(publicId: string, actor: AuthActor) {
    const integration = await this.prisma.partnerIntegration.findUnique({
      where: { publicId },
      include: { organization: true },
    });
    if (!integration) {
      throw new AppError('NOT_FOUND', 'Partner integration not found.');
    }
    if (
      !actorHasPermission(actor, 'admin:integrations:read') &&
      actor.activeOrganizationId !== integration.organizationId
    ) {
      throw new AppError('FORBIDDEN', 'Cross-tenant access denied.');
    }
    return integration;
  }

  private async requireActiveIntegration(publicId: string, actor: AuthActor) {
    const integration = await this.requireIntegrationAccess(publicId, actor);
    if (integration.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Partner integration is not active.');
    }
    return integration;
  }
}
