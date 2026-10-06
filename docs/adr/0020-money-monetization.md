# ADR 0020: Money, subscriptions, and monetization

## Status

Accepted

## Context

Phase 8 delivered organization CRM on marketplace leads. Property Studio needs financial infrastructure for subscriptions, wallet credits, lead purchase foundations, invoices, and a Razorpay-ready payment boundary without live production capture or floating-point money.

## Decision

### Money representation

- Persist monetary amounts as `bigint` minor units with ISO currency (`INR` default).
- Never persist floats/decimals for money.
- API contracts serialize minor units as strings.

### Ownership and isolation

- Financial records are organization-scoped via `organization_id`.
- Cross-tenant reads/writes return `NOT_FOUND` (existing security convention).
- `PROPERTY_ADMIN` receives no billing permissions.

### Wallet ledger

- One wallet per organization.
- `WalletService` is the only mutation authority (`credit` / `debit` / `refund` / `adjust`).
- Every mutation writes an immutable `WalletLedgerEntry` and updates `balance_minor` transactionally.
- Debits refuse negative balances with `CONFLICT` / `INSUFFICIENT_FUNDS`.

### Subscriptions and entitlements

- `SubscriptionPlan` + `PlanEntitlement` define commercial packaging.
- `OrganizationSubscription` tracks lifecycle (`TRIALING`…`EXPIRED`).
- `EntitlementService.has(orgId, key)` is the server-side gate (not frontend checks).

### Financial transactions, invoices, refunds

- `FinancialTransaction` captures payment lifecycle without rewriting history.
- Refunds are separate records referencing the original transaction; wallet refunds credit the ledger.
- Invoices/items provide issued billing documents; history remains append-oriented.

### Provider abstraction and webhooks

- Domain depends on `PaymentProvider` (`createCustomer`, subscription/payment/refund, `verifyWebhook`).
- `RazorpayPaymentProvider` verifies signatures when configured but does not perform live capture in Phase 9.
- `SandboxPaymentProvider` supports deterministic local/test pathways.
- `PaymentWebhookEvent` enforces unique `(provider, external_event_id)` idempotency.

### Lead purchase boundary

- `LeadPurchaseService` verifies entitlement, debit wallet, records financial + purchase rows.
- Does not reveal buyer PII; Phase 7 privacy controls remain authoritative.

### Audit

Mutations emit audit actions (`subscription.*`, `wallet.*`, `payment.*`, `refund.*`, `invoice.*`, `webhook.*`, `lead.purchase.*`) without secrets.

## Consequences

- Monetization can attach Razorpay credentials later without rewriting wallet/subscription ownership.
- Communication, GST filing, commissions, and settlement remain later phases.
