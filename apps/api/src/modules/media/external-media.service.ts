import { Injectable } from '@nestjs/common';
import {
  type CreateExternalMediaMappingRequest,
  type ExternalMediaMappingSummary,
  type ExternalMediaMetricsResponse,
  type ExternalMediaProviderKind,
  type ExternalMediaProviderListResponse,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { MediaAccessService } from './media-access.service';
import { toIso } from './media-seo.util';
import {
  type ExternalMediaProvider,
  NullExternalMediaProvider,
} from './providers/external-media.provider';

const PROVIDER_KINDS: ExternalMediaProviderKind[] = [
  'YOUTUBE',
  'VIMEO',
  'INSTAGRAM',
  'FACEBOOK',
  'OTHER',
];

@Injectable()
export class ExternalMediaService {
  private readonly providers: Map<ExternalMediaProviderKind, ExternalMediaProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: MediaAccessService,
  ) {
    this.providers = new Map(
      PROVIDER_KINDS.map((kind) => [kind, new NullExternalMediaProvider(kind)]),
    );
  }

  listProviders(): ExternalMediaProviderListResponse {
    return {
      providers: PROVIDER_KINDS.map((provider) => {
        const impl = this.providers.get(provider)!;
        const status = impl.status();
        return {
          provider,
          status,
          message:
            status === 'UNAVAILABLE'
              ? 'Provider not configured.'
              : status === 'DISABLED'
                ? 'Provider disabled.'
                : 'Provider ready.',
        };
      }),
    };
  }

  async createMapping(
    actor: AuthActor,
    body: CreateExternalMediaMappingRequest,
    request?: AuthenticatedRequest,
  ): Promise<ExternalMediaMappingSummary> {
    await this.access.requirePermission(actor, 'external-media:manage', 'external_media', request);

    const media = await this.prisma.mediaAsset.findFirst({
      where: { publicId: body.mediaPublicId, deletedAt: null },
      include: { organization: true },
    });
    if (!media) {
      return await this.access.deny(actor, body.mediaPublicId, request);
    }

    const organizationId = await this.access.resolveOrganizationId(
      actor,
      body.organizationPublicId ?? media.organization?.publicId,
      request,
    );

    const provider = this.providers.get(body.provider)!;
    const mapResult = body.externalMediaId
      ? await provider.mapExternalId(body.externalMediaId)
      : await provider.publish({
          mediaPublicId: media.publicId,
          title: media.title,
          sourceUrl: body.externalUrl ?? media.sourceUrl,
        });

    const mapping = await this.prisma.externalMediaMapping.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextExternalMediaMappingPublicId(),
        organizationId: organizationId ?? media.organizationId,
        mediaAssetId: media.id,
        provider: body.provider,
        providerStatus: mapResult.status,
        externalMediaId: body.externalMediaId ?? mapResult.externalMediaId,
        externalUrl: body.externalUrl ?? null,
        createdBy: actor.userId,
      },
      include: { mediaAsset: true },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: mapping.organizationId,
      action: 'external_media.mapping_created',
      resourceType: 'external_media_mapping',
      resourceId: mapping.publicId,
      requestId: request?.requestId,
    });

    return {
      publicId: mapping.publicId,
      mediaPublicId: mapping.mediaAsset.publicId,
      provider: mapping.provider,
      providerStatus: mapping.providerStatus,
      externalMediaId: mapping.externalMediaId,
      externalUrl: mapping.externalUrl,
      lastSyncedAt: toIso(mapping.lastSyncedAt),
    };
  }

  async getMetrics(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<ExternalMediaMetricsResponse> {
    await this.access.requirePermission(actor, 'external-media:read', publicId, request);

    const mapping = await this.prisma.externalMediaMapping.findFirst({
      where: { publicId },
    });
    if (!mapping) {
      return await this.access.deny(actor, publicId, request, 'external_media_mapping');
    }

    if (
      mapping.organizationId &&
      !this.access.isPlatformAdmin(actor) &&
      !(await this.access.isOrgMember(actor, mapping.organizationId))
    ) {
      return await this.access.deny(actor, publicId, request, 'external_media_mapping');
    }

    const provider = this.providers.get(mapping.provider)!;
    if (provider.status() === 'UNAVAILABLE' || !mapping.externalMediaId) {
      return {
        mappingPublicId: mapping.publicId,
        provider: mapping.provider,
        status: 'UNAVAILABLE',
        metrics: null,
        message: 'Provider not configured.',
      };
    }

    const result = await provider.retrieveMetrics(mapping.externalMediaId);
    if (result.status === 'UNAVAILABLE') {
      return {
        mappingPublicId: mapping.publicId,
        provider: mapping.provider,
        status: 'UNAVAILABLE',
        metrics: null,
        message: result.message,
      };
    }

    await this.prisma.externalMediaMapping.update({
      where: { id: mapping.id },
      data: {
        lastMetricsJson: result.metrics ? (JSON.parse(JSON.stringify(result.metrics)) as never) : undefined,
        lastSyncedAt: new Date(),
        providerStatus: result.status,
      },
    });

    return {
      mappingPublicId: mapping.publicId,
      provider: mapping.provider,
      status: result.status,
      metrics: result.metrics,
      message: result.message,
    };
  }
}
