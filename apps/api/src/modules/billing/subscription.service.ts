import { Injectable } from '@nestjs/common';
import {
  type CancelOrganizationSubscriptionRequest,
  type CreateOrganizationSubscriptionRequest,
  type CreateSubscriptionPlanRequest,
  type EntitlementKey,
  type OrganizationSubscriptionSummary,
  type SubscriptionPlanListQuery,
  type SubscriptionPlanSummary,
  type UpdateSubscriptionPlanRequest,
  type AdminSubscriptionListQuery,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { BillingAccessService } from './billing-access.service';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  addBillingPeriod,
  applyCreatedCursor,
  bigintToString,
  encodeCursor,
  toIso,
} from './billing.util';
import { EntitlementService } from './entitlement.service';
import { PaymentProviderRegistry } from './providers/payment-provider';
import { WalletService } from './wallet.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BillingAccessService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly providers: PaymentProviderRegistry,
    private readonly wallets: WalletService,
    private readonly entitlements: EntitlementService,
  ) {}

  async listPlans(query: SubscriptionPlanListQuery) {
    const where: Record<string, unknown> = {};
    if (query.active !== undefined) where.active = query.active;
    applyCreatedCursor(where, query.cursor);
    const rows = await this.prisma.subscriptionPlan.findMany({
      where,
      include: { entitlements: { where: { enabled: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;
    return {
      plans: page.map((row) => this.toPlanSummary(row)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  async createPlan(actor: AuthActor, body: CreateSubscriptionPlanRequest) {
    await this.access.requireAdminBilling(actor, 'admin:billing:manage');
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { code: body.code } });
    if (existing) {
      throw new AppError('CONFLICT', 'A plan with this code already exists.');
    }

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextPlanPublicId(),
        name: body.name,
        description: body.description ?? null,
        code: body.code,
        billingInterval: body.billingInterval,
        priceMinor: body.priceMinor,
        currency: body.currency,
        includedCredits: body.includedCredits,
        leadPurchasePriceMinor: body.leadPurchasePriceMinor,
        active: body.active,
        metadata: (body.metadata as object | undefined) ?? undefined,
        createdBy: actor.userId,
        updatedBy: actor.userId,
        entitlements: {
          create: body.entitlements.map((key) => ({
            id: newUuid(),
            key,
            enabled: true,
          })),
        },
      },
      include: { entitlements: { where: { enabled: true } } },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'subscription.plan.created',
      resourceType: 'subscription_plan',
      resourceId: plan.publicId,
      after: { code: plan.code, priceMinor: bigintToString(plan.priceMinor) },
    });

    return this.toPlanSummary(plan);
  }

  async updatePlan(
    actor: AuthActor,
    publicId: string,
    body: UpdateSubscriptionPlanRequest,
  ): Promise<SubscriptionPlanSummary> {
    await this.access.requireAdminBilling(actor, 'admin:billing:manage');
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { publicId },
      include: { entitlements: true },
    });
    if (!plan) throw new AppError('NOT_FOUND', 'Resource not found.');
    if (body.expectedVersion !== undefined && body.expectedVersion !== plan.version) {
      throw new AppError('CONFLICT', 'Plan was modified by another request.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.entitlements) {
        await tx.planEntitlement.deleteMany({ where: { planId: plan.id } });
        await tx.planEntitlement.createMany({
          data: body.entitlements.map((key) => ({
            id: newUuid(),
            planId: plan.id,
            key,
            enabled: true,
          })),
        });
      }

      return tx.subscriptionPlan.update({
        where: { id: plan.id },
        data: {
          name: body.name ?? undefined,
          description: body.description === undefined ? undefined : body.description,
          code: body.code ?? undefined,
          billingInterval: body.billingInterval ?? undefined,
          priceMinor: body.priceMinor ?? undefined,
          currency: body.currency ?? undefined,
          includedCredits: body.includedCredits ?? undefined,
          leadPurchasePriceMinor: body.leadPurchasePriceMinor ?? undefined,
          active: body.active ?? undefined,
          metadata:
            body.metadata === undefined
              ? undefined
              : ((body.metadata as object | null) ?? undefined),
          version: { increment: 1 },
          updatedBy: actor.userId,
        },
        include: { entitlements: { where: { enabled: true } } },
      });
    });

    return this.toPlanSummary(updated);
  }

  async createSubscription(
    actor: AuthActor,
    body: CreateOrganizationSubscriptionRequest,
    request?: AuthenticatedRequest,
  ): Promise<OrganizationSubscriptionSummary> {
    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'subscriptions:manage',
      request,
    );
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { publicId: body.planPublicId, active: true },
      include: { entitlements: { where: { enabled: true } } },
    });
    if (!plan) throw new AppError('NOT_FOUND', 'Resource not found.');

    const idempotencyKey = body.idempotencyKey ?? `sub:${organization.id}:${plan.id}`;
    const reserved = await this.idempotency.reserve({
      key: idempotencyKey,
      scope: 'subscription.create',
      userId: actor.userId,
      organizationId: organization.id,
    });
    if (reserved.existing) {
      const existing = await this.prisma.organizationSubscription.findFirst({
        where: {
          organizationId: organization.id,
          planId: plan.id,
          status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
        },
        include: { plan: { include: { entitlements: { where: { enabled: true } } } } },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return this.toSubscriptionSummary(existing, organization.publicId);
      }
    }

    const active = await this.prisma.organizationSubscription.findFirst({
      where: {
        organizationId: organization.id,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
        currentPeriodEnd: { gt: new Date() },
      },
    });
    if (active) {
      throw new AppError('CONFLICT', 'Organization already has an active subscription.');
    }

    const provider = this.providers.get(body.provider === 'RAZORPAY' ? 'RAZORPAY' : 'SANDBOX');
    const customer = await provider.createCustomer({
      organizationPublicId: organization.publicId,
    });
    const providerSub = await provider.createSubscription({
      providerCustomerId: customer.providerCustomerId,
      planCode: plan.code,
      amountMinor: plan.priceMinor,
      currency: plan.currency,
    });

    const periodStart = new Date();
    const periodEnd = addBillingPeriod(periodStart, plan.billingInterval);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organizationSubscription.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextSubscriptionPublicId(),
          organizationId: organization.id,
          planId: plan.id,
          status: 'ACTIVE',
          provider: provider.code,
          providerCustomerId: customer.providerCustomerId,
          providerSubscriptionId: providerSub.providerSubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        include: { plan: { include: { entitlements: { where: { enabled: true } } } } },
      });

      if (plan.includedCredits > 0n) {
        await this.wallets.creditInTx(tx, {
          organizationId: organization.id,
          amountMinor: plan.includedCredits,
          currency: plan.currency,
          referenceType: 'OrganizationSubscription',
          referenceId: created.id,
          description: `Included credits for plan ${plan.code}`,
          idempotencyKey: `sub-credits:${created.id}`,
          actorUserId: actor.userId,
        });
      }

      await tx.financialTransaction.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextPaymentPublicId(),
          organizationId: organization.id,
          type: 'SUBSCRIPTION',
          status: 'CAPTURED',
          provider: provider.code,
          providerTransactionId: providerSub.providerSubscriptionId,
          amountMinor: plan.priceMinor,
          currency: plan.currency,
          description: `Subscription ${plan.code}`,
          idempotencyKey,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });

      return created;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'subscription.created',
      resourceType: 'organization_subscription',
      resourceId: subscription.publicId,
      requestId: request?.requestId,
      after: { status: subscription.status, planCode: plan.code },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'subscription.activated',
      resourceType: 'organization_subscription',
      resourceId: subscription.publicId,
      requestId: request?.requestId,
    });
    await this.idempotency.complete(reserved.id, 201, {
      subscriptionPublicId: subscription.publicId,
    });

    return this.toSubscriptionSummary(subscription, organization.publicId);
  }

  async current(
    actor: AuthActor,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<OrganizationSubscriptionSummary | null> {
    const organization = await this.access.requireOrganization(
      actor,
      organizationPublicId,
      'subscriptions:read',
      request,
    );
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: {
        organizationId: organization.id,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES, 'PAST_DUE', 'PAUSED'] },
      },
      include: { plan: { include: { entitlements: { where: { enabled: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return subscription ? this.toSubscriptionSummary(subscription, organization.publicId) : null;
  }

  async cancel(
    actor: AuthActor,
    body: CancelOrganizationSubscriptionRequest,
    request?: AuthenticatedRequest,
  ): Promise<OrganizationSubscriptionSummary> {
    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'subscriptions:manage',
      request,
    );
    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: {
        organizationId: organization.id,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
      },
      include: { plan: { include: { entitlements: { where: { enabled: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) throw new AppError('NOT_FOUND', 'Resource not found.');

    if (subscription.providerSubscriptionId) {
      await this.providers.get(subscription.provider).cancelSubscription({
        providerSubscriptionId: subscription.providerSubscriptionId,
        cancelAtPeriodEnd: body.cancelAtPeriodEnd,
      });
    }

    const updated = await this.prisma.organizationSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: body.cancelAtPeriodEnd,
        cancelledAt: body.cancelAtPeriodEnd ? null : new Date(),
        status: body.cancelAtPeriodEnd ? subscription.status : 'CANCELLED',
        version: { increment: 1 },
        updatedBy: actor.userId,
      },
      include: { plan: { include: { entitlements: { where: { enabled: true } } } } },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'subscription.cancelled',
      resourceType: 'organization_subscription',
      resourceId: updated.publicId,
      requestId: request?.requestId,
      after: {
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        status: updated.status,
      },
    });

    return this.toSubscriptionSummary(updated, organization.publicId);
  }

  async overview(actor: AuthActor, organizationPublicId: string, request?: AuthenticatedRequest) {
    const organization = await this.access.requireOrganization(
      actor,
      organizationPublicId,
      'billing:read',
      request,
    );
    const [
      subscription,
      wallet,
      openInvoices,
      pendingPayments,
      completedLeadPurchases,
      entitlements,
    ] = await Promise.all([
      this.current(actor, organizationPublicId, request),
      this.wallets.getOrCreateWallet(organization.id),
      this.prisma.invoice.count({
        where: { organizationId: organization.id, status: { in: ['ISSUED', 'OVERDUE'] } },
      }),
      this.prisma.financialTransaction.count({
        where: { organizationId: organization.id, status: 'PENDING' },
      }),
      this.prisma.leadPurchase.count({
        where: { organizationId: organization.id, status: 'COMPLETED' },
      }),
      this.entitlements.listForOrganization(organization.id),
    ]);

    return {
      organizationPublicId: organization.publicId,
      subscription,
      walletBalanceMinor: bigintToString(wallet.balanceMinor),
      walletCurrency: wallet.currency,
      openInvoices,
      pendingPayments,
      completedLeadPurchases,
      entitlements,
    };
  }

  async adminListSubscriptions(actor: AuthActor, query: AdminSubscriptionListQuery) {
    await this.access.requireAdminBilling(actor, 'admin:billing:read');
    const where: Record<string, unknown> = {};
    if (query.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!org) throw new AppError('NOT_FOUND', 'Resource not found.');
      where.organizationId = org.id;
    }
    if (query.status) where.status = query.status;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.organizationSubscription.findMany({
      where,
      include: {
        organization: { select: { publicId: true } },
        plan: { include: { entitlements: { where: { enabled: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;
    return {
      subscriptions: page.map((row) => this.toSubscriptionSummary(row, row.organization.publicId)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  private toPlanSummary(row: {
    publicId: string;
    name: string;
    description: string | null;
    code: string;
    billingInterval: 'MONTHLY' | 'YEARLY';
    priceMinor: bigint;
    currency: string;
    includedCredits: bigint;
    leadPurchasePriceMinor: bigint;
    active: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    entitlements: Array<{ key: EntitlementKey }>;
  }): SubscriptionPlanSummary {
    return {
      publicId: row.publicId,
      name: row.name,
      description: row.description,
      code: row.code,
      billingInterval: row.billingInterval,
      priceMinor: bigintToString(row.priceMinor),
      currency: row.currency,
      includedCredits: bigintToString(row.includedCredits),
      leadPurchasePriceMinor: bigintToString(row.leadPurchasePriceMinor),
      active: row.active,
      entitlements: row.entitlements.map((entry) => entry.key),
      version: row.version,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }

  private toSubscriptionSummary(
    row: {
      publicId: string;
      status: OrganizationSubscriptionSummary['status'];
      provider: OrganizationSubscriptionSummary['provider'];
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      cancelledAt: Date | null;
      version: number;
      createdAt: Date;
      updatedAt: Date;
      plan: {
        publicId: string;
        name: string;
        code: string;
        entitlements: Array<{ key: EntitlementKey }>;
      };
    },
    organizationPublicId: string,
  ): OrganizationSubscriptionSummary {
    return {
      publicId: row.publicId,
      organizationPublicId,
      planPublicId: row.plan.publicId,
      planName: row.plan.name,
      planCode: row.plan.code,
      status: row.status,
      provider: row.provider,
      currentPeriodStart: toIso(row.currentPeriodStart)!,
      currentPeriodEnd: toIso(row.currentPeriodEnd)!,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      cancelledAt: toIso(row.cancelledAt),
      entitlements: row.plan.entitlements.map((entry) => entry.key),
      version: row.version,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
