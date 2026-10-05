# ADR 0015: Developer and agency organization profiles

## Status

Accepted

## Context

Phase 3 delivered application shells. Professional marketplace work requires real Developer and Agency organizations with profiles, onboarding, and team foundations before properties, projects, or monetization.

## Decision

- Keep `organizations` + `organization_memberships` as the tenancy kernel.
- Add `developer_profiles` and `agency_profiles` (1:1 with organization) with public IDs `PS-DEV-*` and `PS-AGT-*`.
- Onboarding creates organization, owner membership, profile, and active organization context in one API transaction (`POST /api/v1/organizations/onboard`).
- Agency `verification_status` is foundation-only (`UNVERIFIED` by default). No verification workflow or Verified Expert badges without a real verified record.
- Public routes `GET /api/v1/developers/:publicId` and `GET /api/v1/agents/:publicId` expose non-sensitive fields only.
- Logo storage uses object-key fields + `ObjectStorageService` helpers; upload signed-URL workflows remain deferred.
- Workspace Overview and Team are implemented; other nav items remain empty-state placeholders.

## Consequences

- Tenant isolation continues to return NOT_FOUND for out-of-scope organization resources.
- Properties, projects, communities, billing, CRM, and verification products remain later phases.
