import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../common/config/app-config.service';
import { AppError } from '../../../common/errors/app-error';
import { sha256 } from '../../../common/crypto/ids';

export type PaymentProviderCustomer = {
  providerCustomerId: string;
};

export type PaymentProviderSubscription = {
  providerSubscriptionId: string;
  status: string;
};

export type PaymentProviderPayment = {
  providerTransactionId: string;
  status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED';
};

export type PaymentProviderRefund = {
  providerRefundId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
};

export type VerifiedWebhookEvent = {
  externalEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  payloadHash: string;
};

export interface PaymentProvider {
  readonly code: 'NONE' | 'RAZORPAY' | 'MANUAL' | 'SANDBOX';
  createCustomer(input: {
    organizationPublicId: string;
    email?: string | null;
  }): Promise<PaymentProviderCustomer>;
  createSubscription(input: {
    providerCustomerId: string;
    planCode: string;
    amountMinor: bigint;
    currency: string;
  }): Promise<PaymentProviderSubscription>;
  cancelSubscription(input: {
    providerSubscriptionId: string;
    cancelAtPeriodEnd: boolean;
  }): Promise<PaymentProviderSubscription>;
  createPayment(input: {
    amountMinor: bigint;
    currency: string;
    description?: string;
    receipt?: string;
  }): Promise<PaymentProviderPayment>;
  refundPayment(input: {
    providerTransactionId: string;
    amountMinor: bigint;
  }): Promise<PaymentProviderRefund>;
  getPaymentStatus(providerTransactionId: string): Promise<PaymentProviderPayment>;
  verifyWebhook(input: {
    rawBody: string;
    signature: string | undefined;
  }): Promise<VerifiedWebhookEvent>;
}

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  readonly code = 'SANDBOX' as const;

  async createCustomer(input: { organizationPublicId: string }): Promise<PaymentProviderCustomer> {
    return { providerCustomerId: `sandbox_cust_${input.organizationPublicId}` };
  }

  async createSubscription(input: {
    providerCustomerId: string;
    planCode: string;
  }): Promise<PaymentProviderSubscription> {
    return {
      providerSubscriptionId: `sandbox_sub_${input.providerCustomerId}_${input.planCode}`,
      status: 'ACTIVE',
    };
  }

  async cancelSubscription(input: {
    providerSubscriptionId: string;
    cancelAtPeriodEnd: boolean;
  }): Promise<PaymentProviderSubscription> {
    return {
      providerSubscriptionId: input.providerSubscriptionId,
      status: input.cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
    };
  }

  async createPayment(input: {
    amountMinor: bigint;
    currency: string;
    description?: string;
    receipt?: string;
  }): Promise<PaymentProviderPayment> {
    return {
      providerTransactionId: `sandbox_pay_${input.receipt ?? Date.now()}`,
      status: 'CAPTURED',
    };
  }

  async refundPayment(input: {
    providerTransactionId: string;
    amountMinor: bigint;
  }): Promise<PaymentProviderRefund> {
    return {
      providerRefundId: `sandbox_rfnd_${input.providerTransactionId}_${input.amountMinor}`,
      status: 'SUCCEEDED',
    };
  }

  async getPaymentStatus(providerTransactionId: string): Promise<PaymentProviderPayment> {
    return { providerTransactionId, status: 'CAPTURED' };
  }

  async verifyWebhook(input: {
    rawBody: string;
    signature: string | undefined;
  }): Promise<VerifiedWebhookEvent> {
    const payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    const externalEventId =
      typeof payload.id === 'string'
        ? payload.id
        : `sandbox_evt_${sha256(input.rawBody).slice(0, 16)}`;
    const eventType = typeof payload.event === 'string' ? payload.event : 'sandbox.event';
    return {
      externalEventId,
      eventType,
      payload,
      payloadHash: sha256(input.rawBody),
    };
  }
}

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly code = 'RAZORPAY' as const;

  constructor(private readonly config: AppConfigService) {}

  private requireConfigured(): void {
    if (!this.config.values.RAZORPAY_KEY_ID || !this.config.values.RAZORPAY_KEY_SECRET) {
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }
  }

  async createCustomer(): Promise<PaymentProviderCustomer> {
    this.requireConfigured();
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Live Razorpay customer creation is reserved for a later phase.',
    );
  }

  async createSubscription(): Promise<PaymentProviderSubscription> {
    this.requireConfigured();
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Live Razorpay subscriptions are reserved for a later phase.',
    );
  }

  async cancelSubscription(): Promise<PaymentProviderSubscription> {
    this.requireConfigured();
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Live Razorpay cancellation is reserved for a later phase.',
    );
  }

  async createPayment(): Promise<PaymentProviderPayment> {
    this.requireConfigured();
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Live Razorpay payment capture is reserved for a later phase.',
    );
  }

  async refundPayment(): Promise<PaymentProviderRefund> {
    this.requireConfigured();
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Live Razorpay refunds are reserved for a later phase.',
    );
  }

  async getPaymentStatus(providerTransactionId: string): Promise<PaymentProviderPayment> {
    this.requireConfigured();
    return { providerTransactionId, status: 'PENDING' };
  }

  async verifyWebhook(input: {
    rawBody: string;
    signature: string | undefined;
  }): Promise<VerifiedWebhookEvent> {
    const secret = this.config.values.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError('SERVICE_UNAVAILABLE', 'Razorpay webhook secret is not configured.');
    }
    if (!input.signature) {
      throw new AppError('UNAUTHORIZED', 'Missing Razorpay webhook signature.');
    }

    const expected = createHmac('sha256', secret).update(input.rawBody).digest('hex');
    const provided = Buffer.from(input.signature);
    const expectedBuf = Buffer.from(expected);
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new AppError('UNAUTHORIZED', 'Invalid Razorpay webhook signature.');
    }

    const payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    const externalEventId =
      typeof payload.id === 'string'
        ? payload.id
        : typeof (payload as { event_id?: string }).event_id === 'string'
          ? (payload as { event_id: string }).event_id
          : sha256(input.rawBody);
    const eventType = typeof payload.event === 'string' ? payload.event : 'unknown';

    return {
      externalEventId,
      eventType,
      payload,
      payloadHash: sha256(input.rawBody),
    };
  }
}

@Injectable()
export class PaymentProviderRegistry {
  constructor(
    private readonly config: AppConfigService,
    private readonly sandbox: SandboxPaymentProvider,
    private readonly razorpay: RazorpayPaymentProvider,
  ) {}

  getActive(): PaymentProvider {
    const configured = this.config.values.PAYMENTS_PROVIDER;
    if (configured === 'RAZORPAY') {
      return this.razorpay;
    }
    if (configured === 'NONE' || configured === 'MANUAL') {
      return this.sandbox;
    }
    return this.sandbox;
  }

  get(code: 'NONE' | 'RAZORPAY' | 'MANUAL' | 'SANDBOX'): PaymentProvider {
    if (code === 'RAZORPAY') return this.razorpay;
    return this.sandbox;
  }
}
