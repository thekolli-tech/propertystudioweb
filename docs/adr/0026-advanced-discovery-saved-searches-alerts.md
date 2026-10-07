# ADR 0026 — Advanced Discovery, Saved Searches & Smart Alerts

## Status

Accepted (Phase 14B)

## Context

Phases 5–14A delivered catalog discovery filters, AI NL search, notifications, and DomainEventBus — but seekers still could not persist filter combinations, bookmark inventory, or receive match alerts when new listings appear. `/app/saved` remained an empty shell.

## Decision

### Advanced discovery boundary

- `GET /api/v1/public/discovery/properties` extends public catalog listing with sort (`newest`, `price_asc`, `price_desc`, `bedrooms_desc`), optional text `q`, `state` / `listingType` / `minBedrooms`, and optional facets (`includeFacets=true`).
- Authenticated mirror: `GET /api/v1/discovery/properties` requires `discovery:read`.
- Responses reuse `publicPropertySummarySchema` (published inventory only). No fabricated listings.

### Saved searches (user-owned)

- `SavedSearch` stores named durable `criteria` JSON + `alertFrequency` (`OFF` | `IMMEDIATE`).
- CRUD under `/api/v1/saved-searches` with ownership isolation (`NOT_FOUND` for cross-user access).
- `POST /api/v1/saved-searches/:publicId/run` re-executes criteria through the discovery search path.

### Saved properties (bookmarks)

- `SavedProperty` unique on `(userId, propertyId)`; only **published** properties can be saved.
- Soft-delete unsave; re-save restores the row.

### Smart alerts

- Catalog `PropertiesService` emits existing DomainEventBus types `property.published` / `property.updated` (audit actions already existed; emission was missing).
- `SmartAlertsService` subscribes, matches `alertFrequency=IMMEDIATE` saved searches, inserts idempotent `SavedSearchMatch` (`savedSearchId + propertyId`), and creates Phase 10 in-app notifications (`SAVED_SEARCH_MATCH`).
- No second event bus, notification store, or email/SMS provider (remain UNAVAILABLE).

### Authorization

- New permissions: `discovery:read`, `saved-search:*`, `saved-property:*`.
- Granted to PROPERTY_SEEKER / INVESTOR personas and developer/agency org roles (plus SUPER_ADMIN via full permission set).

## Consequences

- `/app/saved` becomes a real surface for bookmarks, saved searches, and recent matches.
- Phase 14A dashboards/workflows are unchanged.
- Daily digest alerts and email delivery are deferred.

## Deferred

- Daily digest / batch alert frequency
- Live EMAIL/SMS/WhatsApp delivery for matches
- Map/geo polygon filters
- Contextual AI over saved searches (Phase 14C)
