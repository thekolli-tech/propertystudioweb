# ADR 0019: CRM and lead operations

## Status

Accepted

## Context

Phase 7 delivered buyer requirements, deterministic matching, and organization-scoped marketplace leads. Commercial teams need a CRM operating layer that consumes those leads without inventing a second lead status system, exposing buyer PII publicly, or coupling CRM to payments/messaging.

## Decision

### Ownership

- CRM aggregates (`CrmContact`, `CrmActivity`, `CrmFollowUp`, `CrmSiteVisit`, `CrmDeal`) are organization-scoped via `organization_id`.
- Phase 7 `Lead` remains the source opportunity. CRM extends it through relations; it does not replace it.
- Lead assignment continues to use `Lead.recipientUserId` (must be an ACTIVE member of the same organization).

### Contact model

- Private CRM PII (display name, phone, email, notes) lives only on `CrmContact`.
- Optional `source_lead_id` links a contact to the originating marketplace lead.
- Contacts are never projected on `/api/v1/public/*` requirement DTOs.

### Activity timeline

- Append-only operational events (`NOTE`, `CALL`, `EMAIL`, `WHATSAPP`, `MEETING`, `SITE_VISIT`, `STATUS_CHANGE`, `ASSIGNMENT`, `FOLLOW_UP`).
- Status and assignment mutations also write timeline activities for auditability in the product UI.

### Follow-ups / site visits / deals

- Follow-ups (`PS-TASK-*`) are task foundation only — no email/SMS/WhatsApp delivery.
- Site visits (`PS-VISIT-*`) support schedule/status/outcome without external calendars.
- Deals (`PS-DEAL-*`) capture expected value in bigint minor units + ISO currency. No payments, invoices, commissions, or wallets.

### Lead state transitions

Server-enforced graph (shared `LeadTransitionService`) used by CRM and marketplace status updates:

```
NEW → ASSIGNED | VIEWED | CONTACTED | LOST
ASSIGNED → VIEWED | CONTACTED | LOST
VIEWED → CONTACTED | QUALIFIED | LOST
CONTACTED → QUALIFIED | LOST
QUALIFIED → SITE_VISIT | NEGOTIATION | LOST
SITE_VISIT → NEGOTIATION | LOST
NEGOTIATION → BOOKED | CLOSED | LOST
BOOKED → CLOSED | LOST
CLOSED / LOST → (terminal)
```

Platform admins may pass `allowAdminOverride` on the CRM status endpoint for explicit corrections.

### Isolation and permissions

- Cross-tenant CRM access returns `NOT_FOUND` with `authorization.denied` audit.
- New permissions `crm:*` are granted to developer/agency org roles. `PROPERTY_ADMIN` receives none.
- Public users cannot call `/api/v1/crm/*`.

### Future boundaries

Payment collection, commissions, WhatsApp/SMS/email delivery, telephony, calendars, and AI sales assistants remain later phases. Service seams exist via activity types and deal status only.

## Consequences

- Org workspaces can operate leads end-to-end through CRM UI without redesigning marketplace privacy.
- Financial and communication phases can attach to deals/activities without reshaping CRM ownership.
