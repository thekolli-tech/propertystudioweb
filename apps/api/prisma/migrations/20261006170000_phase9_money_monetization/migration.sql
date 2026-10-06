-- Phase 9: Money, subscriptions & monetization

CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "EntitlementKey" AS ENUM ('LEAD_MARKETPLACE_ACCESS', 'LEAD_PURCHASE', 'CRM_ACCESS', 'ADVANCED_LEAD_ACCESS', 'PROJECT_CLAIM', 'PREMIUM_PROJECT_COMMUNITY', 'ANALYTICS', 'EXPORTS');
CREATE TYPE "WalletLedgerEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT', 'EXPIRATION');
CREATE TYPE "FinancialTransactionType" AS ENUM ('SUBSCRIPTION', 'WALLET_TOPUP', 'LEAD_PURCHASE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "FinancialTransactionStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE');
CREATE TYPE "PaymentProviderCode" AS ENUM ('NONE', 'RAZORPAY', 'MANUAL', 'SANDBOX');
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');
CREATE TYPE "RefundType" AS ENUM ('FULL', 'PARTIAL');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "LeadPurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'FAILED');

CREATE SEQUENCE IF NOT EXISTS public_id_plan_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_sub_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_wal_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_wled_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_pay_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_inv_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_ref_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_lpur_seq;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;

CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "code" VARCHAR(64) NOT NULL,
    "billing_interval" "BillingInterval" NOT NULL,
    "price_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "included_credits" BIGINT NOT NULL DEFAULT 0,
    "lead_purchase_price_minor" BIGINT NOT NULL DEFAULT 50000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plan_entitlements" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "key" "EntitlementKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_subscriptions" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "provider" "PaymentProviderCode" NOT NULL DEFAULT 'NONE',
    "provider_customer_id" VARCHAR(128),
    "provider_subscription_id" VARCHAR(128),
    "current_period_start" TIMESTAMPTZ(3) NOT NULL,
    "current_period_end" TIMESTAMPTZ(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "balance_minor" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_ledger_entries" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "wallet_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entry_type" "WalletLedgerEntryType" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "balance_after_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "reference_type" VARCHAR(64),
    "reference_id" UUID,
    "description" VARCHAR(500),
    "idempotency_key" VARCHAR(128),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "status" "FinancialTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProviderCode" NOT NULL DEFAULT 'NONE',
    "provider_transaction_id" VARCHAR(128),
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "description" VARCHAR(500),
    "metadata" JSONB,
    "idempotency_key" VARCHAR(128),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "invoice_number" VARCHAR(64) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal_minor" BIGINT NOT NULL,
    "tax_minor" BIGINT NOT NULL DEFAULT 0,
    "total_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "issued_at" TIMESTAMPTZ(3),
    "due_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "provider_invoice_id" VARCHAR(128),
    "financial_transaction_id" UUID,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount_minor" BIGINT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "financial_transaction_id" UUID NOT NULL,
    "type" "RefundType" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "provider_refund_id" VARCHAR(128),
    "reason" VARCHAR(500),
    "idempotency_key" VARCHAR(128),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProviderCode" NOT NULL,
    "external_event_id" VARCHAR(128) NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ(3),
    "error_message" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_purchases" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "financial_transaction_id" UUID,
    "status" "LeadPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "amount_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "idempotency_key" VARCHAR(128),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "lead_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_public_id_key" ON "subscription_plans"("public_id");
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");
CREATE INDEX "subscription_plans_active_idx" ON "subscription_plans"("active");
CREATE INDEX "subscription_plans_billing_interval_idx" ON "subscription_plans"("billing_interval");

CREATE UNIQUE INDEX "plan_entitlements_plan_id_key_key" ON "plan_entitlements"("plan_id", "key");
CREATE INDEX "plan_entitlements_key_idx" ON "plan_entitlements"("key");

CREATE UNIQUE INDEX "organization_subscriptions_public_id_key" ON "organization_subscriptions"("public_id");
CREATE INDEX "organization_subscriptions_organization_id_idx" ON "organization_subscriptions"("organization_id");
CREATE INDEX "organization_subscriptions_plan_id_idx" ON "organization_subscriptions"("plan_id");
CREATE INDEX "organization_subscriptions_status_idx" ON "organization_subscriptions"("status");
CREATE INDEX "organization_subscriptions_current_period_end_idx" ON "organization_subscriptions"("current_period_end");
CREATE INDEX "organization_subscriptions_provider_subscription_id_idx" ON "organization_subscriptions"("provider_subscription_id");

CREATE UNIQUE INDEX "wallets_public_id_key" ON "wallets"("public_id");
CREATE UNIQUE INDEX "wallets_organization_id_key" ON "wallets"("organization_id");
CREATE INDEX "wallets_currency_idx" ON "wallets"("currency");

CREATE UNIQUE INDEX "wallet_ledger_entries_public_id_key" ON "wallet_ledger_entries"("public_id");
CREATE UNIQUE INDEX "wallet_ledger_entries_organization_id_idempotency_key_key" ON "wallet_ledger_entries"("organization_id", "idempotency_key");
CREATE INDEX "wallet_ledger_entries_wallet_id_idx" ON "wallet_ledger_entries"("wallet_id");
CREATE INDEX "wallet_ledger_entries_organization_id_idx" ON "wallet_ledger_entries"("organization_id");
CREATE INDEX "wallet_ledger_entries_entry_type_idx" ON "wallet_ledger_entries"("entry_type");
CREATE INDEX "wallet_ledger_entries_reference_type_reference_id_idx" ON "wallet_ledger_entries"("reference_type", "reference_id");
CREATE INDEX "wallet_ledger_entries_created_at_idx" ON "wallet_ledger_entries"("created_at");

CREATE UNIQUE INDEX "financial_transactions_public_id_key" ON "financial_transactions"("public_id");
CREATE UNIQUE INDEX "financial_transactions_organization_id_idempotency_key_key" ON "financial_transactions"("organization_id", "idempotency_key");
CREATE INDEX "financial_transactions_organization_id_idx" ON "financial_transactions"("organization_id");
CREATE INDEX "financial_transactions_type_idx" ON "financial_transactions"("type");
CREATE INDEX "financial_transactions_status_idx" ON "financial_transactions"("status");
CREATE INDEX "financial_transactions_provider_idx" ON "financial_transactions"("provider");
CREATE INDEX "financial_transactions_provider_transaction_id_idx" ON "financial_transactions"("provider_transaction_id");
CREATE INDEX "financial_transactions_created_at_idx" ON "financial_transactions"("created_at");

CREATE UNIQUE INDEX "invoices_public_id_key" ON "invoices"("public_id");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");
CREATE INDEX "invoices_due_at_idx" ON "invoices"("due_at");
CREATE INDEX "invoices_financial_transaction_id_idx" ON "invoices"("financial_transaction_id");

CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

CREATE UNIQUE INDEX "refunds_public_id_key" ON "refunds"("public_id");
CREATE UNIQUE INDEX "refunds_organization_id_idempotency_key_key" ON "refunds"("organization_id", "idempotency_key");
CREATE INDEX "refunds_organization_id_idx" ON "refunds"("organization_id");
CREATE INDEX "refunds_financial_transaction_id_idx" ON "refunds"("financial_transaction_id");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

CREATE UNIQUE INDEX "payment_webhook_events_provider_external_event_id_key" ON "payment_webhook_events"("provider", "external_event_id");
CREATE INDEX "payment_webhook_events_status_idx" ON "payment_webhook_events"("status");
CREATE INDEX "payment_webhook_events_event_type_idx" ON "payment_webhook_events"("event_type");
CREATE INDEX "payment_webhook_events_created_at_idx" ON "payment_webhook_events"("created_at");

CREATE UNIQUE INDEX "lead_purchases_public_id_key" ON "lead_purchases"("public_id");
CREATE UNIQUE INDEX "lead_purchases_organization_id_lead_id_key" ON "lead_purchases"("organization_id", "lead_id");
CREATE UNIQUE INDEX "lead_purchases_organization_id_idempotency_key_key" ON "lead_purchases"("organization_id", "idempotency_key");
CREATE INDEX "lead_purchases_organization_id_idx" ON "lead_purchases"("organization_id");
CREATE INDEX "lead_purchases_lead_id_idx" ON "lead_purchases"("lead_id");
CREATE INDEX "lead_purchases_status_idx" ON "lead_purchases"("status");
CREATE INDEX "lead_purchases_financial_transaction_id_idx" ON "lead_purchases"("financial_transaction_id");

ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_purchases" ADD CONSTRAINT "lead_purchases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_purchases" ADD CONSTRAINT "lead_purchases_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_purchases" ADD CONSTRAINT "lead_purchases_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
