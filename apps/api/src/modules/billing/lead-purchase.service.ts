import { Injectable } from '@nestjs/common';
import {
  type CreateLeadPurchaseRequest,
  type LeadPurchaseSummary,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppConfigService } from '../../common/config/app-config.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { BillingAccessService } from './billing-access.service';
import { ACTIVE_SUBSCRIPTION_STATUSES, bigintToString, toIso } from './billing.util';
import { EntitlementService } from './entitlement.service';
import { WalletService } from './wallet.service';

@Injectable()
export class LeadPurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BillingAccessService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly entitlements: EntitlementService,
    private readonly wallets: WalletService,
    private readonly config: AppConfigService,
  ) {}

  async purchase(
    actor: AuthActor,
    body: CreateLeadPurchaseRequest,
    request?: AuthenticatedRequest,
  ): Promise<LeadPurchaseSummary> {
    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'lead:purchases:create',
      request,
    );

    const hasEntitlement = await this.entitlements.has(organization.id, 'LEAD_PURCHASE');
    if (!hasEntitlement) {
      throw new AppError('FORBIDDEN', 'LEAD_PURCHASE entitlement is required.');
    }

    const reserved = await this.idempotency.reserve({
      key: body.idempotencyKey,
      scope: 'lead.purchase',
      userId: actor.userId,
      organizationId: organization.id,
    });
    if (reserved.existing) {
      const existing = await this.prisma.leadPurchase.findFirst({
        where: {
          organizationId: organization.id,
          idempotencyKey: body.idempotencyKey,
        },
        include: {
          lead: { select: { publicId: true } },
          financialTransaction: { select: { publicId: true } },
        },
      });
      if (existing) {
        return this.toSummary(existing, organization.publicId, existing.lead.publicId);
      }
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        publicId: body.leadPublicId,
        recipientOrganizationId: organization.id,
      },
    });
    if (!lead) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const duplicate = await this.prisma.leadPurchase.findFirst({
      where: {
        organizationId: organization.id,
        leadId: lead.id,
        status: 'COMPLETED',
      },
    });
    if (duplicate) {
      throw new AppError('CONFLICT', 'Lead has already been purchased by this organization.');
    }

    const subscription = await this.prisma.organizationSubscription.findFirst({
      where: {
        organizationId: organization.id,
        status: { in: [...ACTIVE_SUBSCRIPTION_STATUSES] },
        currentPeriodEnd: { gt: new Date() },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    const amountMinor =
      subscription?.plan.leadPurchasePriceMinor ??
      BigInt(this.config.values.DEFAULT_LEAD_PURCHASE_PRICE_MINOR);

    const purchase = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextPaymentPublicId(),
          organizationId: organization.id,
          type: 'LEAD_PURCHASE',
          status: 'CAPTURED',
          provider: 'NONE',
          amountMinor,
          currency: 'INR',
          description: `Lead purchase ${lead.publicId}`,
          idempotencyKey: body.idempotencyKey,
          metadata: { leadPublicId: lead.publicId },
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });

      await this.wallets.debitInTx(tx, {
        organizationId: organization.id,
        amountMinor,
        currency: 'INR',
        referenceType: 'FinancialTransaction',
        referenceId: transaction.id,
        description: `Lead purchase ${lead.publicId}`,
        idempotencyKey: `lead-purchase:${body.idempotencyKey}`,
        actorUserId: actor.userId,
      });

      const created = await tx.leadPurchase.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextLeadPurchasePublicId(),
          organizationId: organization.id,
          leadId: lead.id,
          financialTransactionId: transaction.id,
          status: 'COMPLETED',
          amountMinor,
          currency: 'INR',
          idempotencyKey: body.idempotencyKey,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        include: {
          lead: { select: { publicId: true } },
          financialTransaction: { select: { publicId: true } },
        },
      });

      return created;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'lead.purchase.created',
      resourceType: 'lead_purchase',
      resourceId: purchase.publicId,
      requestId: request?.requestId,
      after: {
        leadPublicId: lead.publicId,
        amountMinor: bigintToString(purchase.amountMinor),
        status: purchase.status,
      },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'wallet.debited',
      resourceType: 'wallet',
      resourceId: organization.publicId,
      requestId: request?.requestId,
      after: { amountMinor: bigintToString(amountMinor) },
    });

    await this.idempotency.complete(reserved.id, 201, {
      leadPurchasePublicId: purchase.publicId,
    });

    return this.toSummary(purchase, organization.publicId, lead.publicId);
  }

  private toSummary(
    row: {
      publicId: string;
      status: LeadPurchaseSummary['status'];
      amountMinor: bigint;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
      financialTransaction: { publicId: string } | null;
    },
    organizationPublicId: string,
    leadPublicId: string,
  ): LeadPurchaseSummary {
    return {
      publicId: row.publicId,
      organizationPublicId,
      leadPublicId,
      financialTransactionPublicId: row.financialTransaction?.publicId ?? null,
      status: row.status,
      amountMinor: bigintToString(row.amountMinor),
      currency: row.currency,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
