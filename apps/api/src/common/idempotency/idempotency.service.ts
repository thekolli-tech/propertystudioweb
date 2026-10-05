import { Injectable } from '@nestjs/common';

import { newUuid } from '../crypto/ids';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Foundation for future payment/transactional APIs.
   * Reserves or returns an existing idempotency record.
   */
  async reserve(input: {
    key: string;
    scope: string;
    userId?: string | null;
    organizationId?: string | null;
    requestHash?: string | null;
    ttlSeconds?: number;
  }): Promise<{ id: string; existing: boolean }> {
    const existing = await this.prisma.idempotencyKey.findFirst({
      where: {
        key: input.key,
        scope: input.scope,
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
      },
    });

    if (existing && existing.expiresAt.getTime() > Date.now()) {
      return { id: existing.id, existing: true };
    }

    const id = newUuid();
    const ttlSeconds = input.ttlSeconds ?? 24 * 60 * 60;
    await this.prisma.idempotencyKey.create({
      data: {
        id,
        key: input.key,
        scope: input.scope,
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
        requestHash: input.requestHash ?? null,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    return { id, existing: false };
  }

  async complete(id: string, responseCode: number, responseBody: unknown): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        responseCode,
        responseBody: responseBody as object,
      },
    });
  }
}
