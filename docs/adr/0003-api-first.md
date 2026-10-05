# ADR 0003: API-first NestJS system of record

## Status

Accepted

## Context

Web, future mobile, and partner integrations must share one authorization and data model. Embedding writes in Next.js server actions would fork business rules.

## Decision

NestJS is the system of record. All mutations and privileged reads go through the API. Next.js is an API client. Shared Zod contracts define request/response shapes.

## Consequences

- Mobile compatibility from day one of the security kernel
- Frontend route guards are UX only
- OpenAPI can be generated from contracts later
