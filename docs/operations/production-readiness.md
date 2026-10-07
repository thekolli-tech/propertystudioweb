# Production Readiness — Property Studio V3

Phase 14E operational expectations. This document describes **required operator practices** and **recommendations**. It does not claim that cloud backup infrastructure is implemented inside this repository.

## 1. Runtime topology

| Component | Role | Authoritative? |
|-----------|------|----------------|
| NestJS API | Application + authz | Yes |
| PostgreSQL | Durable state (users, orgs, catalog, CRM, ledger, audit, sessions) | Yes |
| Redis | Rate limits, session revocation cache, ephemeral job hints | **No** |
| S3-compatible object storage | Media/documents (private by default; signed GET) | Yes (objects) |
| Next.js web | UX only; never authoritative for authz | No |

## 2. Required production environment

See `.env.example` / `apps/api/.env.example`. In `NODE_ENV=production` the API validates:

- `API_PUBLIC_URL` and `WEB_ORIGIN` must be `https://`
- `PAYMENTS_PROVIDER=SANDBOX` is rejected unless `ALLOW_SANDBOX_PAYMENTS=true` (staging only)
- `PAYMENTS_PROVIDER=RAZORPAY` requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `LOG_LEVEL` must not be `debug` or `trace`
- Set `TRUST_PROXY=true` **only** when a trusted reverse proxy sets `X-Forwarded-For`
- Session cookies use `__Host-ps_session` (Secure, HttpOnly, SameSite=Lax, Path=/, no Domain)

Never commit real secrets. Rotate any placeholder values before go-live.

## 3. PostgreSQL backup expectations

**Recommendation (not implemented in-repo):**

- Continuous WAL archiving + nightly base backups (managed Postgres PITR preferred).
- Retain at least 7–30 days of recoverable history for operational mistakes.
- Test restore quarterly into a non-production environment.
- Suggested RPO: ≤ 15 minutes (WAL). Suggested RTO: ≤ 4 hours for primary region restore.

**Recovery priorities (order):**

1. PostgreSQL (identity, tenancy, ledger, audit, catalog metadata)
2. Object storage (binary assets referenced by `storageKey`)
3. Redis (optional warm; can be empty on restart)
4. Application config / secrets vault

## 4. Object storage backup expectations

- Enable bucket versioning and lifecycle rules for noncurrent versions.
- Cross-region replication optional for DR.
- Treat keys under `organizations/{orgPublicId}/…` as tenant-private.
- Signed URLs are short-lived (30–900s); do not treat them as durable access control.

## 5. Redis non-authoritative role

- Session rows live in PostgreSQL; Redis only caches revocation markers.
- Rate-limit counters are ephemeral; loss resets windows (fail-open for limits if Redis is down may deny requests depending on client errors — monitor Redis health).
- Do not use Redis as the sole store for financial or audit data.

## 6. Migration recovery

- Apply migrations with `prisma migrate deploy` only; never invent destructive migrations without an ADR.
- Keep migration SQL in `apps/api/prisma/migrations` under version control.
- On failed migrate: fix forward with a new migration; avoid rewriting applied history on shared environments.
- Phase 14E adds non-destructive composite indexes only.

## 7. Security controls checklist

- [ ] HTTPS termination + HSTS at edge; API Helmet HSTS when `NODE_ENV=production`
- [ ] CORS limited to `WEB_ORIGIN`
- [ ] Webhook endpoints reach Nest with raw body intact for HMAC
- [ ] Sandbox payment webhook disabled in production
- [ ] `TRUST_PROXY` matches real ingress topology
- [ ] No debug logging; pino redaction enabled
- [ ] Object storage buckets are private; no public-read ACL by default
- [ ] Partner API keys issued once; revoked keys rejected
- [ ] Audit events remain append-only (DB trigger)

## 8. Observability

- Propagate / accept `x-request-id` on every request.
- Alert on: auth error spikes, rate-limit exhaustion, webhook signature failures, payment capture failures, background job / dead-letter growth, Redis/Postgres unavailability.
- Never ship logs containing passwords, session tokens, API key secrets, payment signatures, or raw private documents.

## 9. Known production limitations

| Item | Severity | Notes |
|------|----------|-------|
| No malware scanning on uploads | MEDIUM | Documented; operator may add AV at storage edge |
| No in-repo backup automation | INFORMATIONAL | Use managed Postgres/S3 features |
| No MFA | MEDIUM | Not in current auth architecture |
| Nest API CSP disabled | INFORMATIONAL | CSP belongs on Next.js |
| Broad Redis response caching deferred | INFORMATIONAL | Prefer indexes + pagination |

## 10. Verification

Before promoting a build:

```bash
pnpm format:check   # or CI format step
pnpm lint
pnpm typecheck
pnpm test
NODE_ENV=test pnpm --filter @property-studio/api build
NODE_ENV=test pnpm --filter @property-studio/web build
```

GitHub CI must be green on the exact commit being promoted.
