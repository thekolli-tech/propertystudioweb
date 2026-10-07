# ADR 0029 — Production Security, Performance & Hardening

## Status

Accepted (Phase 14E)

## Context

Phases 1–14D delivered the Property Studio modular monolith: NestJS-authoritative API, opaque sessions, RBAC + assignment scoping, org isolation, public IDs, financial ledger, AI tools, partner API, admin control center. Phase 14E is the final Phase 14 hardening pass — fix real security/performance defects without redesigning architecture or adding major product features.

## Decision

### Security audit scope

Audited request paths through controller → guard → permission → service → repository → response DTO for catalog, CRM, marketplace/leads, billing/wallet, verification documents, media, AI, partner API, admin analytics, auth/sessions, and webhooks.

### Authorization model (unchanged)

- Platform roles, organization roles, and personas continue to resolve through the existing permission kernel.
- PROPERTY_ADMIN remains assignment-scoped; no org-wide CRM, billing, wallet, or platform admin access.
- Unauthorized resource access continues to resolve as `NOT_FOUND` where that is the established policy.

### Tenant isolation

- Organization membership and resource ownership checks remain at the service boundary.
- Client-supplied organization / resource public IDs and AI context hints are never treated as proof of access.
- Partner API keys are scoped to their owning organization; foreign resource IDs return `NOT_FOUND`.
- Partner lead listing only returns leads with an access grant for that organization.

### Authentication / session model

- Argon2id password hashing and opaque `ps_session` / `__Host-ps_session` cookies remain authoritative.
- Password change revokes all sessions and clears the session cookie.
- Revoked (DB + Redis) and expired sessions cannot continue.
- Rate limiting recognizes both cookie names; `X-Forwarded-For` is honored only when `TRUST_PROXY=true`.

### API security

- Zod validation, pagination max limits, Helmet headers (HSTS in production, frame deny, nosniff, referrer policy).
- Origin checks for browser mutating requests; payment webhook paths excluded (signature auth).
- Body size limit via `BODY_SIZE_LIMIT_BYTES` (default 1 MiB) with `rawBody` preserved for HMAC verification.
- Production env refine: HTTPS for `API_PUBLIC_URL` / `WEB_ORIGIN`; `PAYMENTS_PROVIDER=SANDBOX` blocked unless `ALLOW_SANDBOX_PAYMENTS=true`; Razorpay secrets required when provider is RAZORPAY; debug/trace logging forbidden.

### File / document security

- Storage keys must be safe (no traversal, absolute paths, or null bytes).
- Organization-scoped attaches must use `organizations/{orgPublicId}/…` (confused-deputy defense).
- Signed download URLs remain short-lived; callers authorize first; `storageKey` is not returned in API DTOs.
- Malware scanning is **not** implemented (documented limitation).

### Payment / webhook security

- Razorpay webhooks require HMAC signature over the raw body.
- Duplicate provider events are idempotent (`PROCESSED` → `{ duplicate: true }`).
- Unsigned sandbox webhook endpoint is disabled in production (and when provider is not SANDBOX).
- Wallet ledger semantics and bigint minor units are unchanged.

### Partner security

- API keys hashed with Argon2; secret shown once at creation.
- Scopes, revocation, expiry, org ownership, and partner rate limits remain enforced.
- Outbound webhook HMAC signing / replay tolerance unchanged.

### AI security

- Context assembly re-authorizes every hinted resource.
- Tool arguments for `create_requirement` are Zod-validated; owner is always the authenticated actor.
- Prompt/context hints cannot grant permissions or cross tenants.

### Performance findings

- Parallelized personal count queries in AI context assembly.
- Added composite indexes for CRM follow-ups, leads, deals, and site visits matching org+status(+time) filter patterns.
- Intentionally deferred: broad Redis response caching, analytics warehouse, full N+1 rewrite of every CRM detail path.

### Observability

- Request correlation via `x-request-id` (existing middleware).
- Expanded pino redaction for cookies, API keys, payment signatures, session tokens, and credential fields.
- Never log passwords, session/refresh tokens, API key secrets, payment signatures, or raw private documents.

### Known limitations

- No malware/AV scanning on uploads.
- No cloud backup automation in-repo (see `docs/operations/production-readiness.md`).
- Redis is non-authoritative for sessions (DB is source of truth; Redis caches revocation).
- CSP is not applied on the Nest API process (belongs on the Next.js edge).
- MFA is not part of the current architecture.

### Deferred production infrastructure

- Managed Postgres PITR / object-storage versioning configuration (operator-owned).
- WAF / edge rate limiting in front of the API.
- Centralized log shipping / SIEM integration.

## Consequences

- Production deployments must satisfy the env refine rules.
- Clients attaching media/documents must use organization-namespaced storage keys.
- Sandbox payment webhooks are unavailable in production without explicit staging opt-in.
