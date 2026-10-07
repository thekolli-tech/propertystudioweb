# ADR 0025 — Unified Dashboards & Cross-Module Workflow Orchestration

## Status

Accepted (Phase 14A)

## Context

Phases 1–13 delivered authoritative domain modules (catalog, marketplace, CRM, billing, trust, notifications, AI, integrations) but role home pages still assembled incomplete or frontend-local views. Operators need role-aware dashboards and a thin orchestration layer that connects Requirement → Lead → CRM → Follow-up → Site visit → Deal without duplicating state machines or introducing a second event bus.

## Decision

### Dashboard read services

Purpose-built endpoints aggregate authorized counts and recent items:

- `GET /api/v1/dashboard/developer`
- `GET /api/v1/dashboard/agent`
- `GET /api/v1/dashboard/seeker`
- `GET /api/v1/dashboard/property-admin`
- `GET /api/v1/dashboard/admin`

NestJS remains authoritative: each endpoint authenticates, resolves organization membership or platform role, enforces resource scope (PROPERTY_ADMIN assignment scope), and returns typed Zod DTOs. Frontend route visibility is UX only.

Domain services remain the write path. Dashboards never re-implement CRM transitions, lead purchase, or verification rules.

### Workflow orchestration boundaries

`WorkflowOrchestrationService` is a thin coordinator:

- `POST /api/v1/workflows/crm-contact-from-lead` creates/reuses a CRM contact for an entitled org lead (idempotent on `(organizationId, sourceLeadId)`).
- Protected contact PII is included only when `includeRevealedContact` is true **and** an access grant has `lastRevealedAt`.
- CRM create/update paths emit domain events via the existing Phase 13 `DomainEventBus`.
- Workflow subscribers may create Phase 10 in-app notifications; they do not introduce a second notification store.

### Domain events added

Additive event types (string column, no Prisma enum migration required for storage):

- `lead.accessed`
- `requirement.published`
- `crm.contact.created`
- `crm.follow_up.created`
- `crm.site_visit.scheduled`
- `crm.site_visit.completed`

Existing types (`lead.created`, `lead.assigned`, `crm.deal.*`, …) remain in use.

### Idempotency

- CRM contact-from-lead: unique index on `(organization_id, source_lead_id)` plus find-before-create and race-safe catch.
- Domain event / webhook delivery uniqueness remains Phase 13 (`endpointId + domainEventId`).
- Lead purchase continues to use Phase 2 idempotency keys.

### Authorization & tenant isolation

- Developer/Agent dashboards require active membership in the target org of the correct type; outsiders receive `NOT_FOUND`.
- PROPERTY_ADMIN dashboards only count `resource_assignments` for the actor.
- Admin dashboard requires platform admin permissions.
- Seeker dashboard is user-scoped (own requirements/notifications/conversations).

## Consequences

- Org home, `/app`, `/admin`, and `/app/property-admin` consume dashboard APIs instead of ad-hoc multi-fetch samples.
- AI Copilot remains Phase 13 routes; dashboards only link into it (full contextual AI is Phase 14C).
- No second CRM, event bus, notification system, or RBAC layer.

## Deferred

- Full contextual AI over dashboard state (Phase 14C)
- Historical analytics warehouse / trend charts
- Commission/payout automation beyond existing Phase 9 capabilities
- Live external email/SMS/WhatsApp providers (remain UNAVAILABLE)
