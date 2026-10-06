# ADR 0018: Demand marketplace and lead foundation

## Status

Accepted

## Context

Phase 6 delivered the premium product UI. Commercial demand routing requires a privacy-preserving buyer requirement marketplace, deterministic matching, and an organization-scoped lead foundation before payments, CRM, or AI arrive.

## Decision

### Ownership

- `Requirement` is owned by a user (`owner_user_id`). Personas `PROPERTY_SEEKER` and `INVESTOR` receive `requirement:*` permissions via the existing persona permission grants.
- Users may only mutate their own requirements unless a platform admin acts.
- Out-of-scope access returns `NOT_FOUND` (with `authorization.denied` audit), matching catalog/tenancy conventions.

### Marketplace projection

- Public discovery is a dedicated boundary: `GET /api/v1/public/requirements`.
- Only `status=ACTIVE` and `visibility=MARKETPLACE` rows are listed.
- Responses use a dedicated anonymized DTO (`publicRequirement*Schema`) — never the raw Prisma entity.
- Forbidden fields: phone, email, full name, private notes, owner user IDs/public IDs, credentials, internal UUIDs.

### Privacy model

- Owner detail includes private notes.
- Marketplace participants and public clients receive anonymized projections only.
- `LeadAccessService` is a Phase 7 boundary that always denies buyer contact reveal. Paid reveal / masking arrives later.

### Matching algorithm

Deterministic `RequirementMatchingService` (no AI/LLM). Total weight = 100:

| Criterion | Weight |
| --- | --- |
| Location (city / locality / micro-market) | 30 |
| Budget overlap | 25 |
| Property type | 15 |
| Configuration | 10 |
| Bedrooms | 5 |
| Timeline / transaction fit | 5 |
| Amenities / Vaastu preferences | 5 |
| Purpose | 5 |

Returns `score`, `matched`, `unmatched`, and `explanation`. Unit tested for determinism.

### Lead eligibility

- `LeadEligibilityService.canReceiveMarketplaceLeads(organizationId)`:
  - Developer orgs: ACTIVE org + ACTIVE developer profile
  - Agency orgs: ACTIVE org + ACTIVE agency profile + `verificationStatus=VERIFIED`
- Subscription / wallet / credit enforcement is intentionally **not** implemented. This interface is the plug-in point for later monetization.

### Lead lifecycle

Statuses: `NEW → ASSIGNED → VIEWED → CONTACTED → QUALIFIED → SITE_VISIT → NEGOTIATION → BOOKED | CLOSED | LOST`.

Source for Phase 7: `REQUIREMENT_MARKETPLACE`.

Creation is server-side only via `POST /api/v1/leads/from-requirement` (`createMarketplaceLead`). Arbitrary clients cannot invent buyer leads without eligibility + ACTIVE marketplace requirement checks.

### Duplicate protection

Unique constraint on `(requirement_id, recipient_organization_id)`. Create is idempotent: concurrent/duplicate requests return the existing lead (P2002 race handled).

### Permissions added

- `requirement:create|read:own|update:own|publish|read:marketplace`
- `lead:read|update|assign`
- `admin:requirements:read`, `admin:leads:read`

`PROPERTY_ADMIN` receives none of the marketplace admin/org lead permissions (assignment scope unchanged).

### Public IDs

`PS-REQ-*` and `PS-LEAD-*` via existing `PublicIdService` sequences.

## Consequences

- Later phases can add pay-per-lead, contact reveal, CRM pipelines, and WhatsApp/SMS without redesigning ownership, privacy projection, or eligibility boundaries.
- CRM remains out of scope; leads are the foundation CRM will consume.
