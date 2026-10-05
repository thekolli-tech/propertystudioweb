import { Injectable } from '@nestjs/common';

import { newUuid } from '../crypto/ids';
import { PrismaService } from '../prisma/prisma.module';

export type AuditWriteInput = {
  actorUserId?: string | null;
  sessionId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditWriteInput): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        id: newUuid(),
        actorUserId: input.actorUserId ?? null,
        sessionId: input.sessionId ?? null,
        organizationId: input.organizationId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        before: input.before === undefined ? undefined : (input.before as object),
        after: input.after === undefined ? undefined : (input.after as object),
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
  }
}
