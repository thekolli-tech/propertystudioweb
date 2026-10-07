# ADR 0024 — Partner API, Integrations & Automation

## Status

Accepted (Phase 13)

## Context

Phases 1–12 established Property Studio as a modular NestJS system of record with session auth, RBAC, tenancy, catalog, marketplace, CRM, billing, trust, intelligence/AI, and media CMS. External partners (portals, CRM vendors, channel partners) need controlled API access, signed webhooks, async jobs, and provider abstractions without replacing core domains.

## Decision

### Partner integrations reuse organizations

`partner_integrations` attaches to existing `organizations`. Status is `ACTIVE | SUSPENDED | REVOKED`. Suspended/revoked partners cannot authenticate or receive webhook deliveries.

### API keys

API clients store Argon2id hashes of secrets (`ps_live_…` / `ps_test_…`). Secrets are shown once at creation/rotation. GET endpoints return only `keyPrefix` + scopes/status. Scopes are explicit partner scopes (`properties:read`, `leads:receive`, …), separate from internal RBAC permissions.

### Partner API

Versioned under `/api/v1/partner/*` with `PartnerAuthGuard` (Bearer API key), scope checks, org tenancy, Redis per-client rate limits, and usage events that never log secrets/headers.

### Domain event bus

In-process `DomainEventBus` persists canonical `domain_events` rows and fans out to webhook enqueue, background jobs, and CRM automation rules. Core modules emit; integrations subscribe — no circular domain coupling.

### Webhooks

Outbound endpoints store AES-GCM encrypted signing secrets (shown once). Deliveries are signed with HMAC-SHA256 over `timestamp.eventId.body` using headers `X-PS-Signature`, `X-PS-Timestamp`, `X-PS-Event-Id`. Replay protection uses configurable timestamp tolerance. Retries use exponential backoff for retryable statuses (408/425/429/5xx); permanent failures enter dead-letter storage with admin retry.

### Background jobs

Postgres `background_jobs` + Redis list coordination provide queue/retry/dead-letter without introducing BullMQ in this phase.

### External inventory & notifications

`InventoryIngestionProvider` and email/SMS/WhatsApp channel providers ship as null implementations returning `UNAVAILABLE`. External IDs map via `external_resource_mappings` with conflict status (no silent overwrite). Lead delivery respects Phase 7/9/10 access grants and contact reveal.

### Authorization UI

Admin `/admin/integrations` and org `/app/org/[orgPublicId]/integrations` manage integrations without displaying secrets. Permissions: `integrations:*`, `api-keys:manage`, `webhooks:manage`, `automations:*`, `admin:integrations:*`.

## Consequences

- Partner access is additive to session auth; OAuth can later mint the same scoped API clients.
- Event persistence enables idempotent webhook delivery (`endpointId + domainEventId` unique).
- Provider abstractions keep future vendor SDKs out of core domain services.

## Deferred

- Live OAuth2 authorization-code flows
- Concrete portal/CRM/SMS/email/WhatsApp provider adapters
- Visual automation builder
- OpenAPI partner portal beyond the `/partner/docs` foundation endpoint
