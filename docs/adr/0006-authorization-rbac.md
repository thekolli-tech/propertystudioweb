# ADR 0006: Authorization RBAC

## Status

Accepted

## Context

Roles span platform staff, organization members, and user personas.

## Decision

Authorization is always:

1. Permission check from code-owned catalogs
2. Resource-scope check via policy classes

Inline role-string checks and frontend-only authorization are forbidden.

## Consequences

- Policies live next to domain modules
- Missing and out-of-scope resources return not-found where appropriate
- Permission catalogs are versioned in `packages/permissions`
