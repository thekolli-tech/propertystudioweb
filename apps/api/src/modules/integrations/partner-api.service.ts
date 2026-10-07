import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../common/config/app-config.service';
import { AppError } from '../../common/errors/app-error';
import { newUuid } from '../../common/crypto/ids';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { PARTNER_API_SCOPES } from '@property-studio/contracts';
import type { PartnerActor } from './partner-auth';

@Injectable()
export class PartnerApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly config: AppConfigService,
  ) {}

  async listProperties(actor: PartnerActor, limit = 20, cursor?: string) {
    const rows = await this.prisma.property.findMany({
      where: {
        organizationId: actor.organizationId,
        deletedAt: null,
        publicationStatus: 'PUBLISHED',
        ...(cursor ? { publicId: { lt: cursor } } : {}),
      },
      include: { organization: true },
      orderBy: { publicId: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((row) => ({
        publicId: row.publicId,
        title: row.title,
        publicationStatus: row.publicationStatus,
        city: row.city,
        organizationPublicId: row.organization.publicId,
      })),
      nextCursor: hasMore ? (items[items.length - 1]?.publicId ?? null) : null,
    };
  }

  async getProperty(actor: PartnerActor, publicId: string) {
    const row = await this.prisma.property.findFirst({
      where: {
        publicId,
        organizationId: actor.organizationId,
        deletedAt: null,
        publicationStatus: 'PUBLISHED',
      },
      include: { organization: true },
    });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Property not found.');
    }
    return {
      publicId: row.publicId,
      title: row.title,
      publicationStatus: row.publicationStatus,
      city: row.city,
      organizationPublicId: row.organization.publicId,
    };
  }

  async listProjects(actor: PartnerActor, limit = 20, cursor?: string) {
    const rows = await this.prisma.project.findMany({
      where: {
        organizationId: actor.organizationId,
        deletedAt: null,
        lifecycleStatus: 'PUBLISHED',
        ...(cursor ? { publicId: { lt: cursor } } : {}),
      },
      include: { organization: true },
      orderBy: { publicId: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((row) => ({
        publicId: row.publicId,
        name: row.name,
        lifecycleStatus: row.lifecycleStatus,
        city: row.city,
        organizationPublicId: row.organization.publicId,
      })),
      nextCursor: hasMore ? (items[items.length - 1]?.publicId ?? null) : null,
    };
  }

  async listInventory(actor: PartnerActor, limit = 20, cursor?: string) {
    // Inventory foundation: published properties with availability status.
    const rows = await this.prisma.property.findMany({
      where: {
        organizationId: actor.organizationId,
        deletedAt: null,
        publicationStatus: 'PUBLISHED',
        ...(cursor ? { publicId: { lt: cursor } } : {}),
      },
      include: { organization: true },
      orderBy: { publicId: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((row) => ({
        publicId: row.publicId,
        title: row.title,
        publicationStatus: row.publicationStatus,
        city: row.city,
        organizationPublicId: row.organization.publicId,
      })),
      nextCursor: hasMore ? (items[items.length - 1]?.publicId ?? null) : null,
    };
  }

  async listLeads(actor: PartnerActor, limit = 20, cursor?: string) {
    // Only leads with an access grant for this organization (purchase/entitlement boundary).
    const rows = await this.prisma.lead.findMany({
      where: {
        recipientOrganizationId: actor.organizationId,
        leadAccessGrants: { some: { organizationId: actor.organizationId } },
        ...(cursor ? { publicId: { lt: cursor } } : {}),
      },
      include: {
        leadAccessGrants: {
          where: { organizationId: actor.organizationId },
        },
        requirement: true,
      },
      orderBy: { publicId: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => {
        const grant = row.leadAccessGrants[0];
        const entitled = Boolean(grant);
        const contactRevealed = Boolean(grant?.lastRevealedAt);
        return {
          publicId: row.publicId,
          status: row.status,
          entitled,
          contactRevealed,
          contact:
            entitled && contactRevealed
              ? {
                  name: null as string | null,
                  email: null as string | null,
                  phone: null as string | null,
                }
              : null,
        };
      }),
      nextCursor: hasMore ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  async getLead(actor: PartnerActor, publicId: string) {
    const row = await this.prisma.lead.findFirst({
      where: { publicId, recipientOrganizationId: actor.organizationId },
      include: {
        leadAccessGrants: { where: { organizationId: actor.organizationId } },
        requirement: true,
      },
    });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Lead not found.');
    }
    const grant = row.leadAccessGrants[0];
    const entitled = Boolean(grant);
    if (!entitled) {
      throw new AppError('FORBIDDEN', 'Lead access not granted for this partner.');
    }
    const contactRevealed = Boolean(grant?.lastRevealedAt);
    return {
      publicId: row.publicId,
      status: row.status,
      entitled,
      contactRevealed,
      contact: contactRevealed
        ? {
            name: null as string | null,
            email: null as string | null,
            phone: null as string | null,
          }
        : null,
    };
  }

  async recordUsage(input: {
    actor: PartnerActor;
    endpointCategory: string;
    httpMethod: string;
    path: string;
    statusCode: number;
    responseTimeMs: number;
    rateLimited?: boolean;
    resourceType?: string | null;
    resourcePublicId?: string | null;
  }) {
    await this.prisma.integrationUsageEvent.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextIntegrationUsagePublicId(),
        partnerIntegrationId: input.actor.partnerIntegrationId,
        apiClientId: input.actor.apiClientId,
        endpointCategory: input.endpointCategory,
        httpMethod: input.httpMethod,
        path: input.path.slice(0, 320),
        statusCode: input.statusCode,
        responseTimeMs: input.responseTimeMs,
        rateLimited: input.rateLimited ?? false,
        resourceType: input.resourceType ?? null,
        resourcePublicId: input.resourcePublicId ?? null,
      },
    });
  }

  docs() {
    return {
      version: 'v1',
      authentication:
        'Send Authorization: Bearer <api_key>. Keys are shown once at creation and stored as Argon2 hashes.',
      scopes: [...PARTNER_API_SCOPES],
      rateLimits: {
        windowMs: this.config.values.PARTNER_RATE_LIMIT_WINDOW_MS,
        maxRequests: this.config.values.PARTNER_RATE_LIMIT_MAX_REQUESTS,
      },
      webhookSigning: {
        algorithm: 'HMAC-SHA256' as const,
        headers: ['X-PS-Signature', 'X-PS-Timestamp', 'X-PS-Event-Id'],
        replayToleranceSeconds: this.config.values.WEBHOOK_REPLAY_TOLERANCE_SECONDS,
      },
      idempotency:
        'Write operations accept Idempotency-Key and reuse Phase 2 IdempotencyService scopes.',
      resources: ['properties', 'projects', 'inventory', 'leads', 'media', 'webhooks', 'docs'],
    };
  }
}
