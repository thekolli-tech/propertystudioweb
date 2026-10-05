# ADR 0005: Authentication

## Status

Accepted

## Context

The platform needs browser sessions and future mobile clients without splitting identity models.

## Decision

- Web: HttpOnly opaque session cookie (`__Host-ps_session` in production)
- Mobile: short-lived access JWT + rotating refresh tokens
- Password hashing: Argon2id
- Session/token revocation supported
- MFA required before production use of `SUPER_ADMIN` and `ADMIN`

## Consequences

- NestJS owns authentication endpoints and session storage
- Cookie and bearer strategies share the same identity tables
- MFA implementation belongs to the security kernel before privileged production access
