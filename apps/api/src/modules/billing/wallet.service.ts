import { Injectable } from '@nestjs/common';
import {
  type WalletLedgerEntryType,
  type WalletLedgerListQuery,
  type WalletSummary,
  type WalletTopUpRequest,
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
import { applyCreatedCursor, bigintToString, encodeCursor, toIso } from './billing.util';
import { PaymentProviderRegistry } from './providers/payment-provider';

type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BillingAccessService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
    private readonly providers: PaymentProviderRegistry,
    private readonly config: AppConfigService,
  ) {}

  async getOrCreateWallet(organizationId: string, currency = 'INR') {
    const existing = await this.prisma.wallet.findUnique({ where: { organizationId } });
    if (existing) return existing;
    return this.prisma.wallet.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextWalletPublicId(),
        organizationId,
        currency,
        balanceMinor: 0n,
      },
    });
  }

  async getWallet(
    actor: AuthActor,
    organizationPublicId: string,
    request?: AuthenticatedRequest,
  ): Promise<WalletSummary> {
    const organization = await this.access.requireOrganization(
      actor,
      organizationPublicId,
      'wallet:read',
      request,
    );
    const wallet = await this.getOrCreateWallet(organization.id);
    return this.toWalletSummary(wallet, organization.publicId);
  }

  async listLedger(actor: AuthActor, query: WalletLedgerListQuery, request?: AuthenticatedRequest) {
    const organization = await this.access.requireOrganization(
      actor,
      query.organizationPublicId,
      'wallet:read',
      request,
    );
    const wallet = await this.getOrCreateWallet(organization.id);
    const where: Record<string, unknown> = {
      walletId: wallet.id,
      organizationId: organization.id,
    };
    if (query.entryType) where.entryType = query.entryType;
    applyCreatedCursor(where, query.cursor);

    const rows = await this.prisma.walletLedgerEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const next = rows.length > query.limit ? page[page.length - 1] : null;

    return {
      entries: page.map((row) => ({
        publicId: row.publicId,
        walletPublicId: wallet.publicId,
        organizationPublicId: organization.publicId,
        entryType: row.entryType,
        amountMinor: bigintToString(row.amountMinor),
        balanceAfterMinor: bigintToString(row.balanceAfterMinor),
        currency: row.currency,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        description: row.description,
        createdAt: toIso(row.createdAt)!,
      })),
      nextCursor: next ? encodeCursor(next.createdAt, next.id) : null,
    };
  }

  async topUp(actor: AuthActor, body: WalletTopUpRequest, request?: AuthenticatedRequest) {
    const organization = await this.access.requireOrganization(
      actor,
      body.organizationPublicId,
      'wallet:manage',
      request,
    );

    if (this.config.isProduction && this.config.values.PAYMENTS_PROVIDER === 'RAZORPAY') {
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'Live Razorpay wallet top-up is reserved for a later phase.',
      );
    }

    const reserved = await this.idempotency.reserve({
      key: body.idempotencyKey,
      scope: 'wallet.topup',
      userId: actor.userId,
      organizationId: organization.id,
    });
    if (reserved.existing) {
      const existing = await this.prisma.financialTransaction.findFirst({
        where: { organizationId: organization.id, idempotencyKey: body.idempotencyKey },
      });
      if (existing) {
        const wallet = await this.getOrCreateWallet(organization.id);
        return {
          transaction: {
            publicId: existing.publicId,
            organizationPublicId: organization.publicId,
            type: existing.type,
            status: existing.status,
            provider: existing.provider,
            providerTransactionId: existing.providerTransactionId,
            amountMinor: bigintToString(existing.amountMinor),
            currency: existing.currency,
            description: existing.description,
            createdAt: toIso(existing.createdAt)!,
            updatedAt: toIso(existing.updatedAt)!,
          },
          wallet: this.toWalletSummary(wallet, organization.publicId),
        };
      }
    }

    const provider = this.providers.getActive();
    const payment = await provider.createPayment({
      amountMinor: body.amountMinor,
      currency: body.currency,
      description: body.description ?? 'Wallet top-up',
      receipt: body.idempotencyKey,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextPaymentPublicId(),
          organizationId: organization.id,
          type: 'WALLET_TOPUP',
          status: payment.status === 'CAPTURED' ? 'CAPTURED' : 'PENDING',
          provider: provider.code,
          providerTransactionId: payment.providerTransactionId,
          amountMinor: body.amountMinor,
          currency: body.currency,
          description: body.description ?? 'Wallet top-up',
          idempotencyKey: body.idempotencyKey,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });

      let wallet = await this.getOrCreateWallet(organization.id);
      if (payment.status === 'CAPTURED') {
        wallet = await this.creditInTx(tx, {
          organizationId: organization.id,
          amountMinor: body.amountMinor,
          currency: body.currency,
          referenceType: 'FinancialTransaction',
          referenceId: transaction.id,
          description: body.description ?? 'Wallet top-up',
          idempotencyKey: `topup:${body.idempotencyKey}`,
          actorUserId: actor.userId,
        });
      }

      return { transaction, wallet };
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: organization.id,
      action: 'payment.created',
      resourceType: 'financial_transaction',
      resourceId: result.transaction.publicId,
      requestId: request?.requestId,
      after: {
        type: result.transaction.type,
        status: result.transaction.status,
        amountMinor: bigintToString(result.transaction.amountMinor),
      },
    });
    if (result.transaction.status === 'CAPTURED') {
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: organization.id,
        action: 'wallet.credited',
        resourceType: 'wallet',
        resourceId: result.wallet.publicId,
        requestId: request?.requestId,
        after: { balanceMinor: bigintToString(result.wallet.balanceMinor) },
      });
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: organization.id,
        action: 'payment.captured',
        resourceType: 'financial_transaction',
        resourceId: result.transaction.publicId,
        requestId: request?.requestId,
      });
    }

    await this.idempotency.complete(reserved.id, 201, {
      transactionPublicId: result.transaction.publicId,
    });

    return {
      transaction: {
        publicId: result.transaction.publicId,
        organizationPublicId: organization.publicId,
        type: result.transaction.type,
        status: result.transaction.status,
        provider: result.transaction.provider,
        providerTransactionId: result.transaction.providerTransactionId,
        amountMinor: bigintToString(result.transaction.amountMinor),
        currency: result.transaction.currency,
        description: result.transaction.description,
        createdAt: toIso(result.transaction.createdAt)!,
        updatedAt: toIso(result.transaction.updatedAt)!,
      },
      wallet: this.toWalletSummary(result.wallet, organization.publicId),
    };
  }

  async creditInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      amountMinor: bigint;
      currency?: string;
      referenceType?: string;
      referenceId?: string;
      description?: string;
      idempotencyKey?: string;
      actorUserId?: string;
    },
  ) {
    if (input.amountMinor <= 0n) {
      throw new AppError('VALIDATION_ERROR', 'Credit amount must be positive.');
    }
    return this.mutateInTx(tx, {
      ...input,
      entryType: 'CREDIT',
      signedAmount: input.amountMinor,
    });
  }

  async debitInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      amountMinor: bigint;
      currency?: string;
      referenceType?: string;
      referenceId?: string;
      description?: string;
      idempotencyKey?: string;
      actorUserId?: string;
    },
  ) {
    if (input.amountMinor <= 0n) {
      throw new AppError('VALIDATION_ERROR', 'Debit amount must be positive.');
    }
    return this.mutateInTx(tx, {
      ...input,
      entryType: 'DEBIT',
      signedAmount: -input.amountMinor,
    });
  }

  async refundInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      amountMinor: bigint;
      currency?: string;
      referenceType?: string;
      referenceId?: string;
      description?: string;
      idempotencyKey?: string;
      actorUserId?: string;
    },
  ) {
    if (input.amountMinor <= 0n) {
      throw new AppError('VALIDATION_ERROR', 'Refund amount must be positive.');
    }
    return this.mutateInTx(tx, {
      ...input,
      entryType: 'REFUND',
      signedAmount: input.amountMinor,
    });
  }

  async adjustInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      amountMinor: bigint;
      currency?: string;
      referenceType?: string;
      referenceId?: string;
      description?: string;
      idempotencyKey?: string;
      actorUserId?: string;
    },
  ) {
    return this.mutateInTx(tx, {
      ...input,
      entryType: 'ADJUSTMENT',
      signedAmount: input.amountMinor,
    });
  }

  private async mutateInTx(
    tx: TxClient,
    input: {
      organizationId: string;
      amountMinor: bigint;
      signedAmount: bigint;
      entryType: WalletLedgerEntryType;
      currency?: string;
      referenceType?: string;
      referenceId?: string;
      description?: string;
      idempotencyKey?: string;
      actorUserId?: string;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await tx.walletLedgerEntry.findFirst({
        where: {
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      });
      if (existing) {
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: { organizationId: input.organizationId },
        });
        return wallet;
      }
    }

    let wallet = await tx.wallet.findUnique({ where: { organizationId: input.organizationId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextWalletPublicId(),
          organizationId: input.organizationId,
          currency: input.currency ?? 'INR',
          balanceMinor: 0n,
        },
      });
    }

    const nextBalance = wallet.balanceMinor + input.signedAmount;
    if (nextBalance < 0n) {
      throw new AppError('CONFLICT', 'Insufficient wallet balance.', {
        code: 'INSUFFICIENT_FUNDS',
        balanceMinor: bigintToString(wallet.balanceMinor),
        requiredMinor: bigintToString(input.amountMinor),
      });
    }

    const updated = await tx.wallet.update({
      where: { id: wallet.id, version: wallet.version },
      data: {
        balanceMinor: nextBalance,
        version: { increment: 1 },
      },
    });

    await tx.walletLedgerEntry.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextWalletLedgerPublicId(),
        walletId: wallet.id,
        organizationId: input.organizationId,
        entryType: input.entryType,
        amountMinor: input.amountMinor,
        balanceAfterMinor: nextBalance,
        currency: input.currency ?? wallet.currency,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        createdBy: input.actorUserId ?? null,
      },
    });

    return updated;
  }

  toWalletSummary(
    wallet: {
      publicId: string;
      currency: string;
      balanceMinor: bigint;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string,
  ): WalletSummary {
    return {
      publicId: wallet.publicId,
      organizationPublicId,
      currency: wallet.currency,
      balanceMinor: bigintToString(wallet.balanceMinor),
      version: wallet.version,
      createdAt: toIso(wallet.createdAt)!,
      updatedAt: toIso(wallet.updatedAt)!,
    };
  }
}
