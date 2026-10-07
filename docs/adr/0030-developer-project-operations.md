# ADR 0030 — Developer & Project Operations

## Status

Accepted (Phase 15A)

## Context

Phases 1–14E delivered catalog projects/properties, communities, verification, billing entitlements (`PROJECT_CLAIM`), media/documents, CRM/leads, and production hardening. Developers needed a coherent operational workspace: inventory, construction telemetry, claim workflow, and project-scoped demand views — without a second authz, verification, billing, or storage system.

## Decision

### Project workspace

- Add `GET /api/v1/org/:org/projects/:project/workspace` aggregating authorized project summary, inventory availability counts, construction updates, community stubs, media/document counts, and lead/deal/visit counts (no PII).
- Add `GET .../inventory` for project-scoped property lists.
- Frontend `/app/org/[org]/projects/[project]` becomes the operational dashboard with section tabs.

### Project claims (dedicated relationship)

- Introduce `ProjectClaim` — does **not** change ownership on create/submit.
- Submit allowed without `PROJECT_CLAIM` entitlement (audited as entitlement-missing).
- Approve requires `project:claim:review` (platform admin) **and** active `PROJECT_CLAIM` entitlement; optional linked `VerificationCase` (DEVELOPER or PROJECT subject owned by claiming org).
- On approve: transfer `Project.organizationId` to claiming org in a transaction; emit `project.claim.approved`.
- Public “Claim this Project” CTA only for published projects not already owned by the active developer org.

### Construction updates

- New `ConstructionUpdate` model with draft/publish lifecycle.
- Public API returns **PUBLISHED** only.
- Publishing may sync `Project.constructionPhase` / `constructionPercent`.
- Permissions: `construction-update:read|create|update|publish` (DEVELOPER full; DEVELOPER_STAFF without publish).

### Inventory / availability badges

- Reuse existing `PropertyAvailabilityStatus`: `AVAILABLE | UNDER_OFFER | SOLD | UNAVAILABLE`.
- UI labels `SOLD` as **Sold out** — no duplicate `SOLD_OUT` enum.
- Availability changes emit `inventory.updated` and `project.inventory.availability_changed`.

### Domain events

Added: `project.claim.submitted`, `project.claim.approved`, `project.claim.rejected`, `project.construction.updated`, `project.inventory.availability_changed`.  
Also emit existing `project.created|updated|published` from catalog service.

## Consequences

- Claim privilege escalation before approval is prevented by service-boundary ownership checks.
- PROPERTY_ADMIN remains assignment-scoped and does not receive construction-update or claim permissions.
- Operators must grant `PROJECT_CLAIM` entitlement via subscription plans before claim approval succeeds.

## Known limitations

- Community Q&A/announcements remain on the existing community foundation (no new feed model in 15A).
- Claim does not auto-create VerificationCase; clients may link an existing case.
- No malware scanning on claim documents (Phase 14E limitation).
