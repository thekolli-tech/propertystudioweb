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

### AI Chatbot / Property Studio AI Copilot (consumer layer)

The production-facing chatbot is a **consumer** of Phase 11 AI — not a second provider or orchestration stack:

```
User
→ AI Chatbot (conversations + UI)
→ Phase 11 AI Orchestrator / DeterministicAiProvider
→ Authorized AI Tools (AiToolsService)
→ Existing Property Studio Services
```

Persistent `ai_conversations` / `ai_conversation_messages` are owned by the authenticated user (tenant/org context optional). APIs:

- `POST /api/v1/ai/conversations`
- `GET /api/v1/ai/conversations`
- `GET /api/v1/ai/conversations/:publicId`
- `POST /api/v1/ai/conversations/:publicId/messages`
- `DELETE /api/v1/ai/conversations/:publicId`

UI routes `/ai/chat`, `/app/ai/chat`, and `/studio/ai` share one `AiChatPanel` client. Conversation context enriches follow-ups for the deterministic provider but never bypasses tool authorization. Requirement creation reuses Phase 7 via `create_requirement` only after explicit confirmation. Rate limits reuse Redis (`ai-anon` vs `ai-auth` scopes). Safe analytics events are stored without secrets or private contact data. Streaming is deferred until a streaming-capable provider exists.

## Consequences

- Partner access is additive to session auth; OAuth can later mint the same scoped API clients.
- Event persistence enables idempotent webhook delivery (`endpointId + domainEventId` unique).
- Provider abstractions keep future vendor SDKs out of core domain services.
- Chatbot persistence and UI sit above Phase 11 tools; adding an LLM provider later does not require a second tool/authorization layer.

## Deferred

- Live OAuth2 authorization-code flows
- Concrete portal/CRM/SMS/email/WhatsApp provider adapters
- Visual automation builder
- OpenAPI partner portal beyond the `/partner/docs` foundation endpoint
- Token streaming for AI chat responses (architecture is streaming-ready; deterministic provider is non-streaming)
- Anonymous guest conversation persistence (public catalog chat still requires an authenticated session with `ai:assistant`)
