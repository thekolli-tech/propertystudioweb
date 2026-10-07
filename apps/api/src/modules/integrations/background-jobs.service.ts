import { Injectable, Logger } from '@nestjs/common';

import { newUuid } from '../../common/crypto/ids';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { RedisService } from '../../common/rate-limit/redis.module';
import { DeadLetterService } from './dead-letter.service';
import { webhookBackoffMs } from './webhook-signing.util';

const QUEUE_KEY = 'bgjobs:pending';

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new Logger(BackgroundJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly redis: RedisService,
    private readonly deadLetters: DeadLetterService,
  ) {}

  async enqueue(input: {
    jobType: string;
    payload: Record<string, unknown>;
    maxAttempts?: number;
    scheduledAt?: Date;
  }): Promise<{ publicId: string; id: string }> {
    const publicId = await this.publicIds.nextBackgroundJobPublicId();
    const job = await this.prisma.backgroundJob.create({
      data: {
        id: newUuid(),
        publicId,
        jobType: input.jobType,
        status: 'PENDING',
        payloadJson: input.payload as object,
        maxAttempts: input.maxAttempts ?? 8,
        scheduledAt: input.scheduledAt ?? new Date(),
      },
    });

    await this.redis.client.lpush(QUEUE_KEY, job.id);
    return { publicId: job.publicId, id: job.id };
  }

  async processNext(
    handlers: Record<string, (payload: Record<string, unknown>) => Promise<void>>,
  ): Promise<boolean> {
    const jobId = await this.redis.client.rpop(QUEUE_KEY);
    if (!jobId) {
      // Fallback: pull due PENDING jobs from Postgres when Redis queue is empty.
      const due = await this.prisma.backgroundJob.findFirst({
        where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
      });
      if (!due) return false;
      return this.runJob(due.id, handlers);
    }
    return this.runJob(jobId, handlers);
  }

  async processDue(
    handlers: Record<string, (payload: Record<string, unknown>) => Promise<void>>,
    limit = 20,
  ): Promise<number> {
    let processed = 0;
    for (let i = 0; i < limit; i += 1) {
      const ok = await this.processNext(handlers);
      if (!ok) break;
      processed += 1;
    }
    return processed;
  }

  private async runJob(
    jobId: string,
    handlers: Record<string, (payload: Record<string, unknown>) => Promise<void>>,
  ): Promise<boolean> {
    const job = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'PENDING') {
      return true;
    }

    if (job.scheduledAt.getTime() > Date.now()) {
      await this.redis.client.lpush(QUEUE_KEY, job.id);
      return true;
    }

    await this.prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    const handler = handlers[job.jobType];
    try {
      if (!handler) {
        throw new Error(`No handler for job type ${job.jobType}`);
      }
      await handler(job.payloadJson as Record<string, unknown>);
      await this.prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', completedAt: new Date(), failureReason: null },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Job failed';
      const attempts = job.attempts + 1;
      if (attempts >= job.maxAttempts) {
        await this.prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: 'DEAD_LETTER',
            failureReason: reason.slice(0, 500),
            completedAt: new Date(),
          },
        });
        await this.deadLetters.open({
          sourceType: 'background_job',
          sourceId: job.publicId,
          destination: job.jobType,
          failureReason: reason,
          attemptCount: attempts,
          payload: job.payloadJson as Record<string, unknown>,
        });
      } else {
        const nextAt = new Date(Date.now() + webhookBackoffMs(attempts));
        await this.prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            failureReason: reason.slice(0, 500),
            scheduledAt: nextAt,
          },
        });
        this.logger.warn(`Job ${job.publicId} failed attempt ${attempts}: ${reason}`);
      }
    }

    return true;
  }
}
