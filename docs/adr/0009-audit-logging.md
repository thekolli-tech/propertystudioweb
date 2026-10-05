# ADR 0009: Append-only audit logging

## Status

Accepted

## Context

Security-sensitive actions need forensic trail for admin, auth, and tenant-crossing operations.

## Decision

Persist append-only `audit_events`. The application DB role may insert and select; update/delete are revoked. Privileged reads are themselves auditable.

## Consequences

- Schema arrives with the security kernel (Phase 2)
- High-volume product events may use separate telemetry later
- Audit storage must not contain raw secrets
