import { Injectable } from '@nestjs/common';
import { type ReadyResponse } from '@property-studio/contracts';

import { PrismaService } from '../../common/prisma/prisma.module';
import { RedisService } from '../../common/rate-limit/redis.module';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getHealth() {
    return {
      status: 'ok' as const,
      service: 'property-studio-api' as const,
      timestamp: new Date().toISOString(),
    };
  }

  async getReady(): Promise<{ body: ReadyResponse; ok: boolean }> {
    const checks: ReadyResponse['checks'] = [];

    try {
      const latencyMs = await this.prisma.ping();
      checks.push({ name: 'postgres', status: 'ok', latencyMs });
    } catch (error) {
      checks.push({
        name: 'postgres',
        status: 'error',
        message: error instanceof Error ? error.message : 'PostgreSQL check failed',
      });
    }

    try {
      const latencyMs = await this.redis.ping();
      checks.push({ name: 'redis', status: 'ok', latencyMs });
    } catch (error) {
      checks.push({
        name: 'redis',
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis check failed',
      });
    }

    const hasError = checks.some((check) => check.status === 'error');
    const body: ReadyResponse = {
      status: hasError ? 'error' : 'ok',
      service: 'property-studio-api',
      timestamp: new Date().toISOString(),
      checks,
    };

    return { body, ok: !hasError };
  }
}
