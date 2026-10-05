# ADR 0004: Multi-tenancy and scoped data access

## Status

Accepted

## Context

Organizations represent developers, agencies, and future business entities. Individuals may own resources without an organization.

## Decision

- Organization-owned resources require `organization_id`
- User-owned resources require `owner_user_id`
- Exactly one owning principal for resources that must have a single owner
- Enforce isolation with a scoped Prisma client and repository checks
- Add cross-tenant security tests
- PostgreSQL RLS may be added later on the same columns

## Consequences

- No silent cross-tenant access
- Frontend protection alone is insufficient and not trusted
- Personal organizations are not auto-created for every user
