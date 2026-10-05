# ADR 0007: Identifiers

## Status

Accepted

## Context

Internal joins need opaque stable IDs. Humans and support tooling need readable references.

## Decision

- Internal primary keys: UUID v7
- Public IDs: `PS-{PREFIX}-{number}` with minimum 6-digit zero padding
- One PostgreSQL sequence per prefix
- Public IDs never authorize access by themselves

## Consequences

- URLs and support tickets can use public IDs
- Authorization always resolves to UUID + scope checks
- Prefix registry lives in `packages/public-id`
