import { Injectable } from '@nestjs/common';

import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';

@Injectable()
export class DeadLetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
  ) {}

  async open(input: {
    sourceType: string;
    sourceId: string;
    destination: string;
    failureReason: string;
    attemptCount: number;
    lastResponse?: string | null;
    payload?: Record<string, unknown> | null;
  }) {
    const publicId = await this.publicIds.nextDeadLetterPublicId();
    return this.prisma.deadLetterEvent.create({
      data: {
        id: newUuid(),
        publicId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        destination: input.destination.slice(0, 1000),
        failureReason: input.failureReason.slice(0, 500),
        attemptCount: input.attemptCount,
        lastResponse: input.lastResponse?.slice(0, 2000) ?? null,
        payloadJson: (input.payload as object | null | undefined) ?? undefined,
        status: 'OPEN',
      },
    });
  }

  async list(limit = 50, cursor?: string | null) {
    const rows = await this.prisma.deadLetterEvent.findMany({
      where: cursor ? { publicId: { lt: cursor } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map((row) => ({
        publicId: row.publicId,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        destination: row.destination,
        failureReason: row.failureReason,
        attemptCount: row.attemptCount,
        lastResponse: row.lastResponse,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.publicId ?? null : null,
    };
  }

  async markRetried(publicId: string) {
    const row = await this.prisma.deadLetterEvent.findUnique({ where: { publicId } });
    if (!row) {
      throw new AppError('NOT_FOUND', 'Dead-letter event not found.');
    }
    return this.prisma.deadLetterEvent.update({
      where: { id: row.id },
      data: { status: 'RETRIED', resolvedAt: new Date() },
    });
  }
}
