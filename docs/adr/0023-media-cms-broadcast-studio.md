# ADR 0023 — Media CMS & Broadcast Studio

## Status

Accepted (Phase 12)

## Context

Property Studio’s original product pillar is media-centric: creator/editorial content, property/project media publishing, and large-screen presentation (86-inch Broadcast Studio). Phases 1–11 already shipped:

- Phase 5 `media_assets` / `document_assets` + object-storage signed delivery
- Phase 10 content reports / moderation
- Phase 11 intelligence APIs + deterministic AI tool orchestration
- Broadcast Mode CSS tokens in `@property-studio/ui`

Phase 12 must extend these systems rather than replace them.

## Decision

### Media domain boundary

CMS metadata, lifecycle, SEO, tagging, and moderation state live on the existing `media_assets` table via a non-destructive migration. Catalog attach flows continue to create row-level assets with `lifecycleStatus=READY` and `moderationStatus=APPROVED`. CMS creates start as `DRAFT` / `PENDING_REVIEW`.

Supported media types: `IMAGE`, `VIDEO`, `FLOOR_PLAN` (legacy), `AUDIO`, `DOCUMENT`, `EMBED`, `OTHER`.

Public readability requires `visibility=PUBLIC` + `lifecycleStatus=PUBLISHED` + `moderationStatus=APPROVED`. Raw `storageKey` is never returned on public DTOs; access uses `ObjectStorageService` signed URLs.

### CMS lifecycle

Editorial content uses:

`DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED`

Publishing requires `content:publish` / `media:publish`. Ordinary public users cannot publish. Revisions are append-only for edit history.

### Collections

`media_collections` + ordered `media_collection_items` (`sortOrder`, then `publicId`) provide playlists/series foundations without a second media store.

### Moderation integration

Media/editorial moderation statuses reuse the Phase 10 vocabulary (`PENDING_REVIEW`, `APPROVED`, `REJECTED`, `FLAGGED`, `ARCHIVED`). Decisions are audited. Existing `content_reports` remain the report intake mechanism; Phase 12 does not invent a parallel reporting subsystem.

### Provider abstraction

`ExternalMediaProvider` interface supports future YouTube/Vimeo/social providers. Phase 12 ships `NullExternalMediaProvider` that always returns `UNAVAILABLE` with null metrics. No fabricated external statistics.

### Analytics strategy

`media_analytics_events` is an append-only event stream (view/play/completion/click/share/save/engagement). Empty DB ⇒ empty admin lists. Org-scoped admin reads prevent tenant leakage. No warehouse/aggregation layer in this phase.

### Broadcast Studio

`/studio` is a dedicated large-screen surface that forces Broadcast Mode (existing CSS variables). Presentation endpoints aggregate catalog + Phase 11 intelligence APIs. Unavailable/insufficient data is explicit. AI assistant reuses Phase 11 orchestration only.

### Authorization

New permissions (`media:*`, `content:*`, `collections:*`, `creators:*`, `media:analytics:*`, `external-media:*`, `admin:media:*`, `admin:content:*`, `admin:broadcast:*`) are code-owned. `PROPERTY_ADMIN` remains assignment/resource scoped and does not receive global CMS publish.

## Consequences

- Extending `media_assets` avoids dual media tables and preserves Phase 5 public IDs (`PS-MED-*`).
- External integrations are provider-ready but deferred until credentials and product requirements exist.
- Broadcast Mode remains a single design-token system (~30% scale in Phase 12).

## Deferred

- Live YouTube/Vimeo/Instagram/Facebook publish + metrics
- Full analytics aggregation / dashboards
- Automated sitemap generation job beyond the foundation endpoint
