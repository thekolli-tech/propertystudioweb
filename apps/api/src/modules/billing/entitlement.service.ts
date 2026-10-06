import { Injectable } from '@nestjs/common';
import { type EntitlementKey } from '@property-studio/contracts';

import { PrismaService } from '../../common/prisma/prisma.module';
import { ACTIVE_SUBSCRIPTION_STATUSES } from './billing.util';

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async listForOrganization(organizationId: string): Promise<EntitlementKey[]> {
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: {
        organizationId,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
        currentPeriodEnd: { gt: new Date() },
      },
      include: {
        plan: {
          include: {
            entitlements: {
              where: { enabled: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return [];
    }

    return subscription.plan.entitlements.map((entry) => entry.key as EntitlementKey);
  }

  async has(organizationId: string, entitlement: EntitlementKey): Promise<boolean> {
    const entitlements = await this.listForOrganization(organizationId);
    return entitlements.includes(entitlement);
  }
}
