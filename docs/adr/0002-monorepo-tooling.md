# ADR 0002: pnpm + Turborepo monorepo

## Status

Accepted

## Context

The platform needs shared contracts, UI, permissions, and tooling across web and API.

## Decision

Use a pnpm workspace with Turborepo task orchestration.

- Node.js engine: `>=24.11.0`
- Package manager: pnpm 10+
- Shared packages under `packages/`
- Apps under `apps/`

## Consequences

- Deterministic installs via lockfile
- Boundary linting can prevent illegal imports
- CI runs lint, typecheck, test, and build through Turborepo
