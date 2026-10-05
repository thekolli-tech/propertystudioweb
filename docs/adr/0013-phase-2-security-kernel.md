# ADR 0013: Phase 2 security kernel

## Status

Accepted

## Context

Phase 1 delivered the monorepo skeleton. Product domains require a verified identity, session, RBAC, tenancy, and audit foundation first.

## Decision

Phase 2 implements only the security kernel:

- Users with UUID v7 internals and `PS-USER-######` public IDs
- Argon2id credentials
- Opaque HttpOnly web sessions with rotation and revocation
- Organizations (`DEVELOPER`, `AGENCY`) and memberships
- Platform roles and user personas
- Active organization context (session + optional `X-Organization-Id`)
- Append-only `audit_events` with DB triggers blocking mutation
- `idempotency_keys` foundation (no payment processing)
- Auth-sensitive rate limiting and failed-login lockout
- Scoped access helpers preparing for later PostgreSQL RLS

Public user ID prefix is `USER` (`PS-USER-000001`) as specified for Phase 2, refining the earlier `USR` placeholder in ADR 0007.

## Consequences

- Business modules remain unimplemented
- Next.js is not an authorization authority
- Cross-tenant access returns not-found for out-of-scope organization resources
- Security integration tests are mandatory before Phase 3
