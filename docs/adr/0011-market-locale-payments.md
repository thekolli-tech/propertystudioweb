# ADR 0011: Market, locale, and payments

## Status

Accepted

## Context

V3 launches for India first and must support additional payment providers later.

## Decision

- Initial market: India (`IN`)
- Initial currency: `INR`
- Initial timezone: `Asia/Kolkata`
- Initial locale: `en-IN`
- Initial payment provider: Razorpay
- Payment domain must depend on a provider interface so Stripe or Cashfree can be added without rewriting billing flows
- Payment functionality is not implemented in Phase 1

## Consequences

- Money columns use minor units + currency code
- Webhook verification is provider-specific behind the interface
- Env vars for Razorpay are reserved but unused in Phase 1
