# ADR 0012: Phase 1 scope boundaries

## Status

Accepted

## Context

Phase 1 must prove the platform skeleton without product surface area.

## Decision

Phase 1 includes tooling, health/readiness, env validation, logging, errors, Zod validation infrastructure, Redis rate-limit foundation, Prisma configuration, web placeholder, packages, Compose, CI, docs, and ADRs.

Phase 1 excludes:

- Business tables and fake/sample business data
- Auth/session implementation beyond foundations declared in ADRs
- AI, CRM, marketplace, intelligence, and other business modules
- Payment processing
- Homepage/product UI beyond the health placeholder
- Public marketing routes (`/media`, `/requirements`, `/about`) until their phase

Architecture changes require approval and a new ADR.

## Consequences

- Acceptance focuses on boot, health, CI, and cleanliness
- Later phases build on an empty but production-shaped kernel
