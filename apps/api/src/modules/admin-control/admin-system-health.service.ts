import { Injectable } from '@nestjs/common';
import {
  type AdminSystemComponent,
  type AdminSystemComponentStatus,
  type AdminSystemHealthResponse,
} from '@property-studio/contracts';

import { AppConfigService } from '../../common/config/app-config.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { RedisService } from '../../common/rate-limit/redis.module';
import { ObjectStorageService } from '../../common/storage/object-storage.service';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { requirePlatformAdmin } from './admin-access';

function overallStatus(components: AdminSystemComponent[]): AdminSystemComponentStatus {
  if (components.some((c) => c.status === 'UNAVAILABLE')) return 'UNAVAILABLE';
  if (components.some((c) => c.status === 'DEGRADED')) return 'DEGRADED';
  return 'HEALTHY';
}

@Injectable()
export class AdminSystemHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
    private readonly storage: ObjectStorageService,
  ) {}

  async getHealth(actor: AuthActor): Promise<AdminSystemHealthResponse> {
    requirePlatformAdmin(actor);

    const components: AdminSystemComponent[] = [];

    components.push({
      key: 'api',
      label: 'API process',
      status: 'HEALTHY',
      latencyMs: null,
      detail: 'NestJS process responding',
    });

    try {
      const latencyMs = await this.prisma.ping();
      components.push({
        key: 'postgres',
        label: 'PostgreSQL',
        status: latencyMs > 500 ? 'DEGRADED' : 'HEALTHY',
        latencyMs,
        detail: null,
      });
    } catch (error) {
      components.push({
        key: 'postgres',
        label: 'PostgreSQL',
        status: 'UNAVAILABLE',
        latencyMs: null,
        detail: error instanceof Error ? error.message : 'PostgreSQL check failed',
      });
    }

    try {
      const latencyMs = await this.redis.ping();
      components.push({
        key: 'redis',
        label: 'Redis',
        status: latencyMs > 200 ? 'DEGRADED' : 'HEALTHY',
        latencyMs,
        detail: null,
      });
    } catch (error) {
      components.push({
        key: 'redis',
        label: 'Redis',
        status: 'UNAVAILABLE',
        latencyMs: null,
        detail: error instanceof Error ? error.message : 'Redis check failed',
      });
    }

    try {
      const started = Date.now();
      // Read-only configuration probe — does not mutate storage.
      void this.storage.bucket();
      const latencyMs = Date.now() - started;
      const endpoint = this.config.values.S3_ENDPOINT;
      components.push({
        key: 'object_storage',
        label: 'Object storage',
        status: endpoint ? 'HEALTHY' : 'DEGRADED',
        latencyMs,
        detail: endpoint ? `Configured endpoint ${endpoint}` : 'S3 endpoint not configured',
      });
    } catch (error) {
      components.push({
        key: 'object_storage',
        label: 'Object storage',
        status: 'UNAVAILABLE',
        latencyMs: null,
        detail: error instanceof Error ? error.message : 'Object storage check failed',
      });
    }

    const [openDeadLetters, failedJobs, pendingDomainEvents] = await Promise.all([
      this.prisma.deadLetterEvent.count({ where: { status: 'OPEN' } }),
      this.prisma.backgroundJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
      this.prisma.domainEventRecord.count({ where: { status: 'PENDING' } }),
    ]);

    components.push({
      key: 'background_jobs',
      label: 'Background jobs',
      status: failedJobs > 0 ? 'DEGRADED' : 'HEALTHY',
      latencyMs: null,
      detail: `${failedJobs} failed/dead-letter job(s)`,
    });

    components.push({
      key: 'event_processing',
      label: 'Domain event processing',
      status: pendingDomainEvents > 1000 ? 'DEGRADED' : 'HEALTHY',
      latencyMs: null,
      detail: `${pendingDomainEvents} pending domain event(s)`,
    });

    components.push({
      key: 'webhook_processing',
      label: 'Webhook / dead-letter processing',
      status: openDeadLetters > 0 ? 'DEGRADED' : 'HEALTHY',
      latencyMs: null,
      detail: `${openDeadLetters} open dead-letter event(s)`,
    });

    const paymentsProvider = this.config.values.PAYMENTS_PROVIDER;
    const providers = [
      {
        key: 'payments',
        label: 'Payments provider',
        configured: paymentsProvider !== 'NONE',
        mode: paymentsProvider,
      },
      {
        key: 'ai',
        label: 'AI provider',
        configured: true,
        mode: 'DeterministicAiProvider',
      },
      {
        key: 'object_storage',
        label: 'Object storage',
        configured: Boolean(this.config.values.S3_ENDPOINT),
        mode: this.config.values.S3_ENDPOINT ? 'S3_COMPATIBLE' : null,
      },
    ];

    return {
      overall: overallStatus(components),
      components,
      providers,
      checkedAt: new Date().toISOString(),
    };
  }
}
