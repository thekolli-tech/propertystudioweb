import { Module } from '@nestjs/common';

import { AgentAccessModule } from '../agent-ops/agent-access.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { NotificationsModule } from '../notifications/notifications.module';
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
  imports: [MarketplaceModule, NotificationsModule, AgentAccessModule],
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
    BillingAccessService,
    PaymentProviderRegistry,
    WebhookService,
  ],
})
export class BillingModule {}
