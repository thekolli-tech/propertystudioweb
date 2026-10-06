import { Module } from '@nestjs/common';

import { AdminBillingController, BillingController, WebhookController } from './billing.controller';
import { BillingAccessService } from './billing-access.service';
import { EntitlementService } from './entitlement.service';
import { InvoiceService } from './invoice.service';
import { LeadPurchaseService } from './lead-purchase.service';
import { PaymentService } from './payment.service';
import {
  PaymentProviderRegistry,
  RazorpayPaymentProvider,
  SandboxPaymentProvider,
} from './providers/payment-provider';
import { SubscriptionService } from './subscription.service';
import { WalletService } from './wallet.service';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [BillingController, AdminBillingController, WebhookController],
  providers: [
    BillingAccessService,
    EntitlementService,
    WalletService,
    PaymentService,
    InvoiceService,
    SubscriptionService,
    LeadPurchaseService,
    WebhookService,
    SandboxPaymentProvider,
    RazorpayPaymentProvider,
    PaymentProviderRegistry,
  ],
  exports: [
    EntitlementService,
    WalletService,
    SubscriptionService,
    LeadPurchaseService,
    PaymentService,
  ],
})
export class BillingModule {}
