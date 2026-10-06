import { Injectable } from '@nestjs/common';
import {
  type CreateRefundRequest,
  type FinancialTransactionListQuery,
  type FinancialTransactionSummary,
  type FinancialTransactionType,
  type FinancialTransactionStatus,
  type PaymentProviderCode,
  type RefundSummary,
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
import { applyCreatedCursor, bigintToString, encodeCursor, toIso } from './billing.util';
import { PaymentProviderRegistry } from './providers/payment-provider';
import { WalletService } from './wallet.service';

type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BillingAccessService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly providers: PaymentProviderRegistry,
    private readonly wallets: WalletService,
  ) {}

  async createInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      type: FinancialTransactionType;
      status: FinancialTransactionStatus;
      provider: PaymentProviderCode;
      providerTransactionId?: string | null;
      amountMinor: bigint;
      currency: string;
      description?: string | null;
      metadata?: Record<string, unknown> | null;
      idempotencyKey?: string | null;
      actorUserId?: string | null;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await tx.financialTransaction.findFirst({
        where: {
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      });
      if (existing) return existing;
    }

    return tx.financialTransaction.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextPaymentPublicId(),
        organizationId: input.organizationId,
        type: input.type,
        status: input.status,
        provider: input.provider,
        providerTransactionId: input.providerTransactionId ?? null,
        amountMinor: input.amountMinor,
        currency: input.currency,
        description: input.description ?? null,
        metadata: (input.metadata as object | undefined) ?? undefined,
        idempotencyKey: input.idempotencyKey ?? null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
      },
    });
  }

  async list(
    actor: AuthActor,
    query: FinancialTransactionListQuery,
    request?: AuthenticatedRequest,
  ) {
    if (!query.organizationPublicId) {
      throw new AppError('VALIDATION_ERROR', 'organizationPublicId is required.');
    }
    const organization = await this.access.requireOrganization(
      actor,
      query.organizationPublicId,
      'payments:read',
      request,
    );
    const where: Record<string, unknown> = { organizationId: organization.id };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.financialTransaction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;
    return {
      transactions: page.map((row) => this.toSummary(row, organization.publicId)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  async get(
    actor: AuthActor,
    publicId: string,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ) {
    const organization = await this.access.requireOrganization(
      actor,
      organizationPublicId,
      'payments:read',
      request,
    );
    const row = await this.prisma.financialTransaction.findFirst({
      where: { publicId, organizationId: organization.id },
    });
    if (!row) throw new AppError('NOT_FOUND', 'Resource not found.');
    return this.toSummary(row, organization.publicId);
  }

  async createRefund(
    actor: AuthActor,
    body: CreateRefundRequest,
    request?: AuthenticatedRequest,
  ): Promise<RefundSummary> {
    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'payments:manage',
      request,
    );

    const reserved = await this.idempotency.reserve({
      key: body.idempotencyKey,
      scope: 'payment.refund',
      userId: actor.userId,
      organizationId: organization.id,
    });
    if (reserved.existing) {
      const existing = await this.prisma.refund.findFirst({
        where: { organizationId: organization.id, idempotencyKey: body.idempotencyKey },
        include: { financialTransaction: true },
      });
      if (existing) {
        return this.toRefundSummary(
          existing,
          organization.publicId,
          existing.financialTransaction.publicId,
        );
      }
    }

    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { publicId: body.transactionPublicId, organizationId: organization.id },
    });
    if (!transaction) throw new AppError('NOT_FOUND', 'Resource not found.');
    if (!['CAPTURED', 'PARTIALLY_REFUNDED'].includes(transaction.status)) {
      throw new AppError('CONFLICT', 'Only captured payments can be refunded.');
    }

    const amountMinor = body.type === 'FULL' ? transaction.amountMinor : (body.amountMinor ?? 0n);
    if (body.type === 'PARTIAL' && (!body.amountMinor || body.amountMinor <= 0n)) {
      throw new AppError('VALIDATION_ERROR', 'Partial refunds require a positive amountMinor.');
    }
    if (amountMinor > transaction.amountMinor) {
      throw new AppError('VALIDATION_ERROR', 'Refund amount exceeds original transaction.');
    }

    const provider = this.providers.get(transaction.provider);
    const providerRefund = transaction.providerTransactionId
      ? await provider.refundPayment({
          providerTransactionId: transaction.providerTransactionId,
          amountMinor,
        })
      : { providerRefundId: null, status: 'SUCCEEDED' as const };

    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextRefundPublicId(),
          organizationId: organization.id,
          financialTransactionId: transaction.id,
          type: body.type,
          status: providerRefund.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'PENDING',
          amountMinor,
          currency: transaction.currency,
          providerRefundId: providerRefund.providerRefundId,
          reason: body.reason ?? null,
          idempotencyKey: body.idempotencyKey,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });

      const nextStatus =
        amountMinor === transaction.amountMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await tx.financialTransaction.update({
        where: { id: transaction.id },
        data: {
          status: nextStatus,
          version: { increment: 1 },
          updatedBy: actor.userId,
        },
      });

      if (
        created.status === 'SUCCEEDED' &&
        (transaction.type === 'WALLET_TOPUP' || transaction.type === 'LEAD_PURCHASE')
      ) {
        await this.wallets.refundInTx(tx, {
          organizationId: organization.id,
          amountMinor,
          currency: transaction.currency,
          referenceType: 'Refund',
          referenceId: created.id,
          description: body.reason ?? 'Refund',
          idempotencyKey: `refund:${body.idempotencyKey}`,
          actorUserId: actor.userId,
        });
      }

      return created;
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'refund.created',
      resourceType: 'refund',
      resourceId: refund.publicId,
      requestId: request?.requestId,
      after: {
        type: refund.type,
        status: refund.status,
        amountMinor: bigintToString(refund.amountMinor),
      },
    });
    await this.idempotency.complete(reserved.id, 201, { refundPublicId: refund.publicId });

    return this.toRefundSummary(refund, organization.publicId, transaction.publicId);
  }

  async adminList(actor: AuthActor, query: FinancialTransactionListQuery) {
    await this.access.requireAdminBilling(actor, 'admin:billing:read');
    const where: Record<string, unknown> = {};
    if (query.organizationPublicId) {
      const org = await this.prisma.organization.findFirst({
        where: { publicId: query.organizationPublicId },
      });
      if (!org) throw new AppError('NOT_FOUND', 'Resource not found.');
      where.organizationId = org.id;
    }
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.financialTransaction.findMany({
      where,
      include: { organization: { select: { publicId: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;
    return {
      transactions: page.map((row) => this.toSummary(row, row.organization.publicId)),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  toSummary(
    row: {
      publicId: string;
      type: FinancialTransactionType;
      status: FinancialTransactionStatus;
      provider: PaymentProviderCode;
      providerTransactionId: string | null;
      amountMinor: bigint;
      currency: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
  ): FinancialTransactionSummary {
    return {
      publicId: row.publicId,
      organizationPublicId,
      type: row.type,
      status: row.status,
      provider: row.provider,
      providerTransactionId: row.providerTransactionId,
      amountMinor: bigintToString(row.amountMinor),
      currency: row.currency,
      description: row.description,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }

  private toRefundSummary(
    row: {
      publicId: string;
      type: 'FULL' | 'PARTIAL';
      status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
      amountMinor: bigint;
      currency: string;
      reason: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
    transactionPublicId: string,
  ): RefundSummary {
    return {
      publicId: row.publicId,
      organizationPublicId,
      transactionPublicId,
      type: row.type,
      status: row.status,
      amountMinor: bigintToString(row.amountMinor),
      currency: row.currency,
      reason: row.reason,
      createdAt: toIso(row.createdAt)!,
      updatedAt: toIso(row.updatedAt)!,
    };
  }
}
