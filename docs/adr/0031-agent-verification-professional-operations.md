# ADR 0031 — Agent Verification & Professional Operations

## Status

Accepted (Phase 15B)

## Context

Phase 10 delivered `VerificationCase` / `VerificationDocument` with subject type `AGENT`, agency profile trust status, and admin review. Phase 9 delivered subscriptions, entitlements, wallet, and Razorpay abstractions. Agencies still lacked: processing-fee gating before review, `REJECTED`/`SUSPENDED` profile states, server-side listing gates, marketplace entitlement enforcement, renewal visibility, and a dedicated agent professional workspace surface.

## Decision

### Reuse verification architecture

- Continue using `VerificationCase` with `subjectType=AGENT` mapped to `AgencyProfile`.
- Extend `AgencyVerificationStatus` with `REJECTED` and `SUSPENDED` (UI + authorization).
- “Verified Expert” badge is derived from backend status: `VERIFIED` and not past `verificationExpiresAt`. No independent frontend boolean.

### Payment ≠ verification

- Agent cases set `processingFeeStatus=REQUIRED` on create/submit.
- Fee payment uses existing `FinancialTransaction` with type `AGENT_VERIFICATION_FEE` (sandbox/provider registry).
- Captured payment marks fee `PAID` and unlocks **admin review eligibility only**.
- Approval remains an admin action and still requires paid/waived/N/A fee. Payment never sets `VERIFIED`.

### Professional access gating

- `AgentProfessionalAccessService` is authoritative for agency listing and marketplace gates.
- Listing create (`property:create`) allowed for agencies only when professionally verified (not suspended, not expired).
- Marketplace receipt for agencies requires professional verification **and** `LEAD_MARKETPLACE_ACCESS` entitlement.
- Lead purchase / contact reveal remain separate Phase 9/10 gates.

### Suspension & renewal

- Suspend sets profile `SUSPENDED` and immediately denies privileged listing/marketplace access.
- Historical CRM/audit retained.
- `verificationExpiresAt` synced from case `expiresAt` on approve/reinstate.
- Automatic expiry job deferred; privileged checks enforce expiry at request time so expired agents cannot retain access.

### Organization scoping

- All agent operational data remains organization-scoped; cross-tenant → `NOT_FOUND`.
- Documents stay private with signed access; public agent DTOs omit storage keys, contacts, and review notes.

## Consequences

- AGENT / AGENT_STAFF gain `property:*` permissions, but create is still blocked without Verified Expert status.
- Operators must collect processing fee before approving agent cases.
- Plans should include `LEAD_MARKETPLACE_ACCESS` (and optionally `AGENT_PROFESSIONAL` for future renewal automation).

## Known limitations

- Live Razorpay agent fee capture remains gated like wallet top-up in production.
- Recurring renewal billing automation is deferred; expiry is enforced on access checks.
- Automatic background expiry transition of case status is deferred.
