import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { PaymentProviderRegistry } from './providers/payment-provider';
import { WalletService } from './wallet.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providers: PaymentProviderRegistry,
    private readonly wallets: WalletService,
  ) {}

  async handleRazorpay(rawBody: string, signature: string | undefined) {
    const provider = this.providers.get('RAZORPAY');
    let verified;
    try {
      verified = await provider.verifyWebhook({ rawBody, signature });
    } catch (error) {
      await this.audit.write({
        action: 'webhook.rejected',
        resourceType: 'payment_webhook_event',
        metadata: {
          provider: 'RAZORPAY',
          reason: error instanceof AppError ? error.message : 'verification_failed',
        },
      });
      throw error;
    }

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: 'RAZORPAY',
          externalEventId: verified.externalEventId,
        },
      },
    });
    if (existing?.status === 'PROCESSED') {
      return { ok: true, duplicate: true };
    }

    const event =
      existing ??
      (await this.prisma.paymentWebhookEvent.create({
        data: {
          id: newUuid(),
          provider: 'RAZORPAY',
          externalEventId: verified.externalEventId,
          eventType: verified.eventType,
          payloadHash: verified.payloadHash,
          status: 'RECEIVED',
          payload: verified.payload as object,
        },
      }));

    try {
      await this.processEvent(event.id, verified.eventType, verified.payload);
      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date(), errorMessage: null },
      });
      await this.audit.write({
        action: 'webhook.processed',
        resourceType: 'payment_webhook_event',
        resourceId: event.id,
        metadata: { provider: 'RAZORPAY', eventType: verified.eventType },
      });
      return { ok: true, duplicate: false };
    } catch (error) {
      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message.slice(0, 1000) : 'processing_failed',
        },
      });
      throw error;
    }
  }

  async handleSandbox(rawBody: string) {
    const provider = this.providers.get('SANDBOX');
    const verified = await provider.verifyWebhook({ rawBody, signature: 'sandbox' });

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_externalEventId: {
          provider: 'SANDBOX',
          externalEventId: verified.externalEventId,
        },
      },
    });
    if (existing?.status === 'PROCESSED') {
      return { ok: true, duplicate: true };
    }

    const event =
      existing ??
      (await this.prisma.paymentWebhookEvent.create({
        data: {
          id: newUuid(),
          provider: 'SANDBOX',
          externalEventId: verified.externalEventId,
          eventType: verified.eventType,
          payloadHash: verified.payloadHash,
          status: 'RECEIVED',
          payload: verified.payload as object,
        },
      }));

    await this.processEvent(event.id, verified.eventType, verified.payload);
    await this.prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
    await this.audit.write({
      action: 'webhook.processed',
      resourceType: 'payment_webhook_event',
      resourceId: event.id,
      metadata: { provider: 'SANDBOX', eventType: verified.eventType },
    });
    return { ok: true, duplicate: false };
  }

  private async processEvent(
    _eventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    if (eventType === 'payment.captured' || eventType === 'sandbox.payment.captured') {
      const providerTransactionId =
        typeof payload.providerTransactionId === 'string'
          ? payload.providerTransactionId
          : typeof (payload.payload as { payment?: { entity?: { id?: string } } } | undefined)
                ?.payment?.entity?.id === 'string'
            ? (payload.payload as { payment: { entity: { id: string } } }).payment.entity.id
            : null;
      if (!providerTransactionId) return;

      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { providerTransactionId },
      });
      if (!transaction || transaction.status === 'CAPTURED') return;

      await this.prisma.$transaction(async (tx) => {
        await tx.financialTransaction.update({
          where: { id: transaction.id },
          data: { status: 'CAPTURED', version: { increment: 1 } },
        });
        if (transaction.type === 'WALLET_TOPUP') {
          await this.wallets.creditInTx(tx, {
            organizationId: transaction.organizationId,
            amountMinor: transaction.amountMinor,
            currency: transaction.currency,
            referenceType: 'FinancialTransaction',
            referenceId: transaction.id,
            description: 'Webhook payment capture',
            idempotencyKey: `webhook-capture:${transaction.id}`,
          });
        }
      });
      await this.audit.write({
        organizationId: transaction.organizationId,
        action: 'payment.captured',
        resourceType: 'financial_transaction',
        resourceId: transaction.publicId,
      });
    }
  }
}
