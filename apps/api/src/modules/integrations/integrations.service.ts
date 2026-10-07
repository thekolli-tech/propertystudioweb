import { Injectable } from '@nestjs/common';
import {
  type CreateApiClientRequest,
  type CreatePartnerIntegrationRequest,
  type PartnerApiScope,
  type UpdatePartnerIntegrationRequest,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { PasswordService } from '../../common/crypto/password.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import { NotificationChannelsService } from './notification-channels.service';
import { IntegrationSecretsService } from './secrets.service';
import { WebhooksService } from './webhooks.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly passwords: PasswordService,
    private readonly secrets: IntegrationSecretsService,
    private readonly audit: AuditService,
    private readonly webhooks: WebhooksService,
    private readonly notificationChannels: NotificationChannelsService,
  ) {}

  async createIntegration(
    actor: AuthActor,
    body: CreatePartnerIntegrationRequest,
    request?: { requestId?: string },
  ) {
    this.requireManage(actor);
    const org = await this.prisma.organization.findUnique({
      where: { publicId: body.organizationPublicId },
    });
    if (!org) {
      throw new AppError('NOT_FOUND', 'Organization not found.');
    }
    if (
      !actorHasPermission(actor, 'admin:integrations:manage') &&
      actor.activeOrganizationId !== org.id
    ) {
      throw new AppError('FORBIDDEN', 'Cross-tenant access denied.');
    }

    const publicId = await this.publicIds.nextPartnerIntegrationPublicId();
    const row = await this.prisma.partnerIntegration.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId: org.id,
        name: body.name,
        integrationType: body.integrationType,
        status: 'ACTIVE',
        healthStatus: 'CONNECTED',
        ownerUserId: actor.userId,
        metadataJson: (body.metadata as object | null | undefined) ?? undefined,
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: org.id,
      action: 'partner.integration.created',
      resourceType: 'partner_integration',
      resourceId: row.publicId,
      requestId: request?.requestId,
    });

    return this.toIntegrationSummary(row, org.publicId);
  }

  async updateIntegration(
    actor: AuthActor,
    publicId: string,
    body: UpdatePartnerIntegrationRequest,
    request?: { requestId?: string },
  ) {
    this.requireManage(actor);
    const existing = await this.requireIntegration(publicId, actor, true);
    const updated = await this.prisma.partnerIntegration.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? undefined,
        status: body.status ?? undefined,
        metadataJson:
          body.metadata === undefined
            ? undefined
            : body.metadata === null
              ? undefined
              : (body.metadata as object),
        healthStatus:
          body.status === 'SUSPENDED' || body.status === 'REVOKED'
            ? 'SUSPENDED'
            : body.status === 'ACTIVE'
              ? 'CONNECTED'
              : undefined,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: updated.organizationId,
      action: 'partner.integration.updated',
      resourceType: 'partner_integration',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { status: updated.status },
    });

    return this.toIntegrationSummary(updated, existing.organization.publicId);
  }

  async listIntegrations(
    actor: AuthActor,
    opts: { organizationPublicId?: string; limit?: number; cursor?: string } = {},
  ) {
    this.requireRead(actor);
    const limit = opts.limit ?? 50;
    const where: Record<string, unknown> = {};

    if (opts.organizationPublicId) {
      const org = await this.prisma.organization.findUnique({
        where: { publicId: opts.organizationPublicId },
      });
      if (!org) {
        throw new AppError('NOT_FOUND', 'Organization not found.');
      }
      if (
        !actorHasPermission(actor, 'admin:integrations:read') &&
        actor.activeOrganizationId !== org.id
      ) {
        throw new AppError('FORBIDDEN', 'Cross-tenant access denied.');
      }
      where.organizationId = org.id;
    } else if (!actorHasPermission(actor, 'admin:integrations:read')) {
      if (!actor.activeOrganizationId) {
        throw new AppError('FORBIDDEN', 'Organization context required.');
      }
      where.organizationId = actor.activeOrganizationId;
    }

    const rows = await this.prisma.partnerIntegration.findMany({
      where,
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { publicId: opts.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((row) => this.toIntegrationSummary(row, row.organization.publicId)),
      nextCursor: hasMore ? (items[items.length - 1]?.publicId ?? null) : null,
    };
  }

  async createApiClient(
    actor: AuthActor,
    integrationPublicId: string,
    body: CreateApiClientRequest,
    request?: { requestId?: string },
  ) {
    if (
      !actorHasPermission(actor, 'api-keys:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const integration = await this.requireIntegration(integrationPublicId, actor, true);
    if (integration.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Partner integration is not active.');
    }

    const { secret, prefix } = this.secrets.generateApiKey(body.environment ?? 'LIVE');
    const keyHash = await this.passwords.hash(secret);
    const publicId = await this.publicIds.nextApiClientPublicId();
    const client = await this.prisma.apiClient.create({
      data: {
        id: newUuid(),
        publicId,
        partnerIntegrationId: integration.id,
        name: body.name,
        environment: body.environment ?? 'LIVE',
        keyPrefix: prefix,
        keyHash,
        scopes: body.scopes,
        status: 'ACTIVE',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: integration.organizationId,
      action: 'api.client.created',
      resourceType: 'api_client',
      resourceId: client.publicId,
      requestId: request?.requestId,
      after: { scopes: client.scopes, keyPrefix: client.keyPrefix },
    });

    return {
      ...this.toApiClientSummary(client),
      secret,
    };
  }

  async listApiClients(actor: AuthActor, integrationPublicId: string) {
    this.requireRead(actor);
    const integration = await this.requireIntegration(integrationPublicId, actor, false);
    const rows = await this.prisma.apiClient.findMany({
      where: { partnerIntegrationId: integration.id },
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map((row) => this.toApiClientSummary(row)) };
  }

  async revokeApiClient(
    actor: AuthActor,
    integrationPublicId: string,
    clientPublicId: string,
    request?: { requestId?: string },
  ) {
    if (
      !actorHasPermission(actor, 'api-keys:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const integration = await this.requireIntegration(integrationPublicId, actor, true);
    const client = await this.prisma.apiClient.findFirst({
      where: { publicId: clientPublicId, partnerIntegrationId: integration.id },
    });
    if (!client) {
      throw new AppError('NOT_FOUND', 'API client not found.');
    }
    const updated = await this.prisma.apiClient.update({
      where: { id: client.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: integration.organizationId,
      action: 'api.client.revoked',
      resourceType: 'api_client',
      resourceId: updated.publicId,
      requestId: request?.requestId,
    });
    return this.toApiClientSummary(updated);
  }

  async rotateApiClient(
    actor: AuthActor,
    integrationPublicId: string,
    clientPublicId: string,
    request?: { requestId?: string },
  ) {
    if (
      !actorHasPermission(actor, 'api-keys:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const integration = await this.requireIntegration(integrationPublicId, actor, true);
    const client = await this.prisma.apiClient.findFirst({
      where: { publicId: clientPublicId, partnerIntegrationId: integration.id },
    });
    if (!client) {
      throw new AppError('NOT_FOUND', 'API client not found.');
    }

    const { secret, prefix } = this.secrets.generateApiKey(client.environment);
    const keyHash = await this.passwords.hash(secret);
    const updated = await this.prisma.apiClient.update({
      where: { id: client.id },
      data: {
        keyPrefix: prefix,
        keyHash,
        status: 'ACTIVE',
        revokedAt: null,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: integration.organizationId,
      action: 'api.client.rotated',
      resourceType: 'api_client',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: { keyPrefix: updated.keyPrefix },
    });

    return { ...this.toApiClientSummary(updated), secret };
  }

  async overview(actor: AuthActor, organizationPublicId?: string) {
    this.requireRead(actor);
    const integrations = await this.listIntegrations(actor, { organizationPublicId, limit: 50 });
    const first = integrations.items[0];
    let apiClients: ReturnType<typeof this.toApiClientSummary>[] = [];
    let webhooks: Awaited<ReturnType<WebhooksService['listEndpoints']>>['items'] = [];
    let recentDeliveries: Awaited<ReturnType<WebhooksService['listDeliveries']>>['items'] = [];
    let failedDeliveries: Awaited<ReturnType<WebhooksService['listDeliveries']>>['items'] = [];

    if (first) {
      apiClients = (await this.listApiClients(actor, first.publicId)).items;
      webhooks = (await this.webhooks.listEndpoints(actor, first.publicId)).items;
      recentDeliveries = (
        await this.webhooks.listDeliveries(actor, {
          integrationPublicId: first.publicId,
          limit: 10,
        })
      ).items;
      failedDeliveries = (
        await this.webhooks.listDeliveries(actor, {
          integrationPublicId: first.publicId,
          failedOnly: true,
          limit: 10,
        })
      ).items;
    }

    return {
      integrations: integrations.items,
      apiClients,
      webhooks,
      recentDeliveries,
      failedDeliveries,
      notificationProviders: this.notificationChannels.list().providers,
    };
  }

  notificationProviderStatus() {
    return this.notificationChannels.list();
  }

  private toIntegrationSummary(
    row: {
      publicId: string;
      name: string;
      integrationType: string;
      status: string;
      healthStatus: string;
      lastSuccessfulAt: Date | null;
      lastFailedAt: Date | null;
      errorCount: number;
      createdAt: Date;
    },
    organizationPublicId: string,
  ) {
    return {
      publicId: row.publicId,
      organizationPublicId,
      name: row.name,
      integrationType: row.integrationType as CreatePartnerIntegrationRequest['integrationType'],
      status: row.status as 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
      healthStatus: row.healthStatus as
        'CONNECTED' | 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'SUSPENDED' | 'UNAVAILABLE',
      lastSuccessfulAt: row.lastSuccessfulAt?.toISOString() ?? null,
      lastFailedAt: row.lastFailedAt?.toISOString() ?? null,
      errorCount: row.errorCount,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toApiClientSummary(row: {
    publicId: string;
    name: string;
    environment: string;
    keyPrefix: string;
    scopes: string[];
    status: string;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      publicId: row.publicId,
      name: row.name,
      environment: row.environment as 'LIVE' | 'TEST',
      keyPrefix: row.keyPrefix,
      scopes: row.scopes as PartnerApiScope[],
      status: row.status as 'ACTIVE' | 'REVOKED' | 'EXPIRED',
      expiresAt: row.expiresAt?.toISOString() ?? null,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
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
      !actorHasPermission(actor, 'integrations:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
  }

  private async requireIntegration(publicId: string, actor: AuthActor, manage: boolean) {
    if (manage) this.requireManage(actor);
    else this.requireRead(actor);
    const integration = await this.prisma.partnerIntegration.findUnique({
      where: { publicId },
      include: { organization: true },
    });
    if (!integration) {
      throw new AppError('NOT_FOUND', 'Partner integration not found.');
    }
    const admin =
      actorHasPermission(actor, 'admin:integrations:read') ||
      actorHasPermission(actor, 'admin:integrations:manage');
    if (!admin && actor.activeOrganizationId !== integration.organizationId) {
      throw new AppError('FORBIDDEN', 'Cross-tenant access denied.');
    }
    return integration;
  }
}
