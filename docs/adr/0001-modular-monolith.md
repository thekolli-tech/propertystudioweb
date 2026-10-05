# ADR 0001: Modular monolith

## Status

Accepted

## Context

Property Studio V3 spans discovery, CRM, payments, media, AI, and partner surfaces. A distributed microservice fleet would add operational cost before product-market fit for V3.

## Decision

Ship a modular monolith:

- Next.js web app
- NestJS API
- PostgreSQL + Prisma
- Redis
- S3-compatible object storage

Domain modules live inside one NestJS process with clear module boundaries. Extract services later only when scaling or ownership requires it.

## Consequences

- One deployable API simplifies Phase 1–3 delivery
- Module boundaries and packages must stay strict to avoid a ball of mud
- Mobile and partner clients can still consume the same HTTP API
