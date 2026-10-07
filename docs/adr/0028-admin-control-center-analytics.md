# ADR 0028 — Admin Control Center & Platform Analytics

## Status

Accepted (Phase 14D)

## Context

Phases 1–14C delivered domain modules with scattered `/admin/*` operational pages and a lightweight Phase 14A `GET /dashboard/admin` summary. SUPER_ADMIN / ADMIN needed one coherent control center for platform overview, business analytics, operational queues, AI governance, audit visibility, and system health — without a second RBAC system, warehouse, or fabricated metrics.

## Decision

### Architecture

- Add `AdminControlModule` with:
  - `AdminAnalyticsService` → `GET /api/v1/admin/dashboard`
  - `AdminSystemHealthService` → `GET /api/v1/admin/system/health`
  - `AdminAuditService` → `GET /api/v1/admin/audit` and `GET /api/v1/admin/ai/governance`
- Keep Phase 14A `GET /api/v1/dashboard/admin` for backward compatibility.
- Frontend `/admin` redirects to `/admin/overview` (control center). Existing operational routes remain authoritative.

### Metric definitions

- Every metric includes `coverageState`: `READY` | `ZERO` | `UNAVAILABLE`.
- `ZERO` means the system queried successfully and found no matching rows.
- `UNAVAILABLE` means the platform cannot defensibly compute the value (e.g. active users without a durable activity definition; discovery funnel without retained view events).
- Money metrics use bigint minor units serialized as decimal strings; aggregation uses Prisma `_sum` on `amountMinor` / `balanceMinor`.

### Date-range semantics

- Periods: `TODAY`, `DAYS_7`, `DAYS_30` (default), `DAYS_90`, `CUSTOM`.
- Timezone label: `Asia/Kolkata`. “Today” starts at midnight IST.
- Filtering is always server-side.

### Funnel

- Period event counts where createdAt (or equivalent) exists: requirements created, marketplace requirements created, leads created, lead access grants, site visits created.
- Lead lifecycle stages that lack transition history are labeled as **current stock** and must not be presented as period conversion rates.
- Discovery views are `UNAVAILABLE`.

### Authorization

- Control center / system health require `platform:admin` (ADMIN / SUPER_ADMIN).
- Audit list requires `audit:read` and platform admin context.
- AI governance requires `admin:ai:read`.
- PROPERTY_ADMIN, org users, and seekers are denied.
- AI governance never returns conversation message content.
- Audit responses expose metadata **keys** only (sensitive key names stripped); never secrets, hashes, or payment signatures.
- Audit events remain append-only (no mutate/delete API).

### System health

- Read-only probes for API, PostgreSQL, Redis, object-storage configuration, background jobs, domain events, and dead letters.
- Statuses: `HEALTHY` | `DEGRADED` | `UNAVAILABLE`.
- No infrastructure mutations.

### Performance

- Aggregations run as parallel `count` / `groupBy` / `_sum` queries.
- Operational lists remain paginated on existing endpoints.
- No browser-side full-table aggregation.
- No analytics warehouse in Phase 14D.

## Consequences

- `/admin/overview` is the executive + operational control center.
- Existing admin module pages continue to serve deep workflows.
- Expensive metrics should be documented rather than cached ad hoc.

## Known limitations

- No durable “active user” definition.
- No discovery impression/view funnel events.
- Lead stage conversions lack historical transition tables.
- Token/cost AI telemetry is not recorded.
- Custom geospatial heatmaps are out of scope.
