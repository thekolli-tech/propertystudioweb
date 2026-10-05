# ADR 0017 — Phase 6 product UI + dynamic frontend

## Status

Accepted

## Context

Phases 1–5 established the monorepo, security kernel, app shell, organization profiles, and catalog APIs. Phase 6 must transform the web UI into the approved Property Studio mockup language while remaining strictly API-driven — no fabricated production data.

## Decision

1. **Design system** lives in `@property-studio/ui` with light premium tokens (navy primary, warm off-white backgrounds, restrained gold accent) and shared catalog/dashboard primitives (`PropertyCard`, `ProjectCard`, `StatCard`, `SidebarNav`, `DashboardShell`, etc.).
2. **Public website** pages consume only public catalog/profile APIs. Empty catalogs render professional empty states.
3. **Super Admin** (`/admin`) and **Property Admin** (`/app/property-admin`) use separate shells. Frontend role checks are UX gates only; NestJS remains authoritative.
4. **Property Admin** lists inventory via `GET /api/v1/properties` without `organizationPublicId`, which returns assignment-scoped rows for `PROPERTY_ADMIN`.
5. Modules without APIs (payments, CRM, construction updates, charts) show “Not available yet” / empty foundations — never fake metrics.

## Consequences

- Visual QA against the mockup is mandatory before merge.
- Missing backend capabilities are documented as empty UI, not stubs with fake JSON.
- Route groups keep `/app/(workspace)` and `/app/property-admin` shells isolated.
