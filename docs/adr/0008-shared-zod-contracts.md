# ADR 0008: Shared Zod contracts

## Status

Accepted

## Context

Duplicated DTO validation drifts between API and clients.

## Decision

`packages/contracts` owns Zod schemas for shared API payloads. Nest pipes and the web client validate against the same schemas. `class-validator` is not introduced for domain DTOs.

## Consequences

- Single source of truth for payload shapes
- OpenAPI generation can target the same package later
- Unknown keys are rejected at validation boundaries
