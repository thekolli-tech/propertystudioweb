# ADR 0016: Property and project catalog foundation

## Status

Accepted

## Context

Phase 4 delivered developer/agency organizations and profiles. Marketplace discovery and later domains (community discussions, leads, CRM, payments, verification, AI) require a stable catalog ownership and publication model.

## Decision

- Ownership hierarchy is `DEVELOPER organization → Project → Property` (property may optionally omit project).
- Public IDs: `PS-PROJ-*`, `PS-PROP-*`, `PS-COM-*`, plus media/document `PS-MED-*` / `PS-DOC-*`.
- Money uses bigint minor units + ISO currency (`INR`).
- Project lifecycle: `DRAFT | PUBLISHED | ARCHIVED`. Property publication: `DRAFT | PUBLISHED` with separate availability (`AVAILABLE | UNDER_OFFER | SOLD | UNAVAILABLE`).
- Soft delete uses `deleted_at` and never hard-cascades properties when a project is archived/deleted. Project hard-delete FK uses `ON DELETE SET NULL` for properties/communities; soft delete retains `project_id`.
- Public discovery is a separate boundary under `/api/v1/public/projects` and `/api/v1/public/properties`. Only published, non-deleted records are visible. Responses expose public IDs and developer profile public IDs only — never internal UUIDs, org UUIDs, private contacts, private media/docs, or audit data.
- Community entity is foundation-only (`ACTIVE/DISABLED`, `PRIVATE/PUBLIC`) with no feed/comments/reviews.
- Media and document assets store metadata + storage keys via `ObjectStorageService` helpers. No signed upload CMS, no AI analysis, no legal certification.
- Authorization: developer org roles mutate their catalog; agents are discovery-only in this phase; `PROPERTY_ADMIN` requires explicit `resource_assignments` rows (no global property access). Out-of-scope access returns `NOT_FOUND`.

## Consequences

- Later phases can attach discussions, requirements, leads, payments, and verification onto these aggregates without redesigning ownership or publication.
- GitHub Actions continues to rely on workflow env + Turbo `globalPassThroughEnv` so API tests receive required configuration.
