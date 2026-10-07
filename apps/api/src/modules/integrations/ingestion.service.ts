import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { type UpsertExternalResourceMappingRequest } from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../common/tenancy/access-scope';
import {
  type InventoryIngestionProvider,
  type NormalizedExternalRecord,
  NullInventoryIngestionProvider,
} from './providers/inventory-ingestion.provider';

@Injectable()
export class IngestionService {
  private readonly provider: InventoryIngestionProvider = new NullInventoryIngestionProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
  ) {}

  providerStatus() {
    return {
      provider: this.provider.provider,
      status: this.provider.status(),
      message:
        this.provider.status() === 'UNAVAILABLE'
          ? 'Inventory ingestion provider not configured.'
          : 'Provider ready.',
    };
  }

  async sync(actor: AuthActor, request?: { requestId?: string }) {
    if (
      !actorHasPermission(actor, 'integrations:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const result = await this.provider.syncChanges();
    if (result.status === 'UNAVAILABLE') {
      return {
        status: 'UNAVAILABLE' as const,
        imported: 0,
        message: result.message,
      };
    }

    let imported = 0;
    for (const item of result.items) {
      await this.upsertMapping(
        actor,
        {
          provider: this.provider.provider,
          resourceType: item.resourceType,
          externalId: item.externalId,
          status: 'NEW',
        },
        request,
      );
      imported += 1;
    }

    return { status: 'OK' as const, imported, message: result.message };
  }

  async upsertMapping(
    actor: AuthActor,
    body: UpsertExternalResourceMappingRequest,
    request?: { requestId?: string },
  ) {
    if (
      !actorHasPermission(actor, 'integrations:manage') &&
      !actorHasPermission(actor, 'admin:integrations:manage')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    let organizationId: string | null = null;
    if (body.organizationPublicId) {
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
      organizationId = org.id;
    } else if (actor.activeOrganizationId) {
      organizationId = actor.activeOrganizationId;
    }

    const existing = await this.prisma.externalResourceMapping.findUnique({
      where: {
        provider_resourceType_externalId: {
          provider: body.provider,
          resourceType: body.resourceType,
          externalId: body.externalId,
        },
      },
    });

    if (
      existing?.canonicalPublicId &&
      body.canonicalPublicId &&
      existing.canonicalPublicId !== body.canonicalPublicId
    ) {
      const conflicted = await this.prisma.externalResourceMapping.update({
        where: { id: existing.id },
        data: {
          status: 'CONFLICT',
          conflictReason: `Canonical ID conflict: existing ${existing.canonicalPublicId} vs ${body.canonicalPublicId}`,
        },
      });
      return this.toSummary(conflicted);
    }

    if (existing) {
      const updated = await this.prisma.externalResourceMapping.update({
        where: { id: existing.id },
        data: {
          canonicalPublicId: body.canonicalPublicId ?? existing.canonicalPublicId,
          status: body.status ?? 'UPDATED',
          conflictReason: body.conflictReason ?? null,
          organizationId: organizationId ?? existing.organizationId,
          lastSyncedAt: new Date(),
        },
      });
      return this.toSummary(updated);
    }

    const publicId = await this.publicIds.nextExternalResourceMappingPublicId();
    const created = await this.prisma.externalResourceMapping.create({
      data: {
        id: newUuid(),
        publicId,
        organizationId,
        provider: body.provider,
        resourceType: body.resourceType,
        externalId: body.externalId,
        canonicalPublicId: body.canonicalPublicId ?? null,
        status: body.status ?? 'NEW',
        conflictReason: body.conflictReason ?? null,
        lastSyncedAt: new Date(),
        createdBy: actor.userId,
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'external.mapping.upserted',
      resourceType: 'external_resource_mapping',
      resourceId: created.publicId,
      requestId: request?.requestId,
    });

    return this.toSummary(created);
  }

  normalize(input: {
    provider: string;
    resourceType: UpsertExternalResourceMappingRequest['resourceType'];
    externalId: string;
    payload: Record<string, unknown>;
    canonicalPublicId?: string | null;
  }): NormalizedExternalRecord {
    const payloadHash = createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');
    return {
      provider: input.provider,
      resourceType: input.resourceType,
      externalId: input.externalId,
      status: 'NEW',
      canonicalPublicId: input.canonicalPublicId ?? null,
      payloadHash,
      conflictReason: null,
    };
  }

  private toSummary(row: {
    publicId: string;
    provider: string;
    resourceType: string;
    externalId: string;
    canonicalPublicId: string | null;
    status: string;
    conflictReason: string | null;
    lastSyncedAt: Date | null;
  }) {
    return {
      publicId: row.publicId,
      provider: row.provider,
      resourceType: row.resourceType as UpsertExternalResourceMappingRequest['resourceType'],
      externalId: row.externalId,
      canonicalPublicId: row.canonicalPublicId,
      status: row.status as 'NEW' | 'UPDATED' | 'REMOVED' | 'UNAVAILABLE' | 'CONFLICT',
      conflictReason: row.conflictReason,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    };
  }
}
