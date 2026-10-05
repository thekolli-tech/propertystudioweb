# ADR 0014: Frontend application shell and design system

## Status

Accepted

## Context

Phase 2 established NestJS as the authentication and authorization authority with opaque HttpOnly sessions, organizations, and tenant-scoped access. Phase 3 needs a Next.js application shell and design system without duplicating those security boundaries or implementing business domains.

## Decision

- Next.js App Router hosts public, auth, user (`/app`), organization (`/app/org/[orgPublicId]`), and admin (`/admin`) shells.
- NestJS remains the system of record. The web app consumes typed `@property-studio/api-client` methods against existing `/api/v1/auth/*` and `/api/v1/organizations/*` endpoints.
- Same-origin Next.js rewrites proxy `/api/*`, `/health`, and `/ready` to the API so session cookies attach to the web origin. Server components forward the cookie header to the internal API URL; they do not decode roles as a security boundary.
- Middleware may redirect based on cookie presence for UX only. Authorization decisions always come from API responses (401/403/404).
- Shared UI lives in `@property-studio/ui` (shadcn/Radix primitives + Empty/Loading/Error/PageHeader/AppShell + Broadcast Mode CSS foundation).
- Public entity URLs use `PS-*` public IDs only; invalid prefixes render not-found.
- Broadcast Mode is a `data-broadcast-mode` / CSS variable foundation only — no Broadcast Studio product UI.

## Consequences

- Frontend never stores auth secrets in `localStorage` or bypasses API authorization.
- Organization and admin shells are navigation placeholders until later domain phases.
- Cookie attribution depends on the rewrite proxy in local and deployed web→API topologies.
