# ADR 0021: Trust, verification, and communication

## Status

Accepted

## Context

Phases 7–9 delivered marketplace leads, CRM operations, and monetized lead purchase. Property Studio needs an internal trust layer: organization/subject verification, reviews and trust scores, in-app notifications, relationship-gated messaging, and paid lead contact reveal — without claiming legal certification or opening unconstrained DMs.

## Decision

### Verification lifecycle

- Organizations submit `VerificationCase` records for subjects (`AGENT`, `DEVELOPER`, `PROJECT`, `PROPERTY`) matching `verificationType`.
- Lifecycle: `DRAFT` → `SUBMITTED` / `UNDER_REVIEW` → `APPROVED` | `REJECTED` | `CHANGES_REQUESTED`; approved cases may be `REVOKED`.
- Submit requires an accepted declaration and moves the subject into a pending trust state.
- Approve sets subject `verificationStatus` / `trustStatus` to `VERIFIED` (with expiry), writes audit (`verification.case.approved`), and notifies the submitter.
- Reject, request-changes, and revoke are admin-gated (`verification:approve|reject|review|revoke`) and update subject trust state accordingly.
- Cross-tenant case access returns `NOT_FOUND` with `authorization.denied` audit.

### Verification document handling

- Documents reuse existing `DocumentAsset` storage (`entityType = VERIFICATION_CASE`); there is no second object-storage subsystem.
- `VerificationDocument` links case ↔ asset with review status and optional extracted references / reviewer notes.
- Only the case organization (with document permissions) or platform verification admins may attach or inspect documents.
- Signed URL delivery for private assets remains a future enhancement; Phase 10 persists `storageKey` and visibility only.

### Badge semantics

- Verification badges and subject trust fields are **backend-authoritative** and **informational**.
- They indicate completion of Property Studio’s internal review workflow, not a government license, RERA certification, or legal endorsement.
- Clients must not invent badge state from local heuristics.

### Review eligibility

- Authenticated users with `reviews:create` (persona or org role) may create one review per subject.
- Eligibility basis is recorded as `AUTHENTICATED_USER`, or `VERIFIED_CLIENT` when a closed/booked CRM deal links the author to the subject organization.
- Moderation (`HIDE` / `REJECT` / `RESTORE` / `FLAG`) is admin/moderator-only; public/participant list DTOs expose only published reviews and never moderator notes or author email/PII.

### Trust score formula

Matches `TrustScoreService` exactly:

- Only `PUBLISHED` reviews are considered.
- If `reviewCount < 3` → `state = INSUFFICIENT_DATA`, `score = null`.
- Else:

```
score = round(((0.6 * overallAvg) + (0.25 * structuredAvg) + (0.15 * verificationComponent)) / 5 * 100)
```

  where `verificationComponent` is `5` if the subject is verified, else `1`, and `structuredAvg` is the mean of all dimension ratings across published reviews (falling back to overall average when none exist). Raw component is clamped to `[0, 5]` before scaling to 0–100.

### Notification architecture

- `NotificationService` is the sole creation path; domain modules (verification, communications, etc.) call it as a side-effect.
- Delivery in Phase 10 is **IN_APP only**. Preference rows for `EMAIL` / `SMS` / `WhatsApp` exist as foundations but do not send external messages.
- Preferences gate creation for non-`SYSTEM` types when an `IN_APP` preference is explicitly disabled.
- Notifications are user-scoped; user A cannot read or mark user B’s notifications (`NOT_FOUND`).

### Communication authorization

- Conversations are not open DMs. Lead conversations require:
  1. Membership in the recipient organization with `communications:create`,
  2. Lead ownership by that organization,
  3. An active `LeadAccessGrant` (`PURCHASED` or `ACTIVE`, not revoked/expired) — unless platform admin.
- Participants are the acting org member and the requirement owner; non-participants receive `NOT_FOUND`.
- Messaging and conversation reads enforce participant (or moderator) scope.

### Lead contact reveal security

- Buyer contact is never on public requirement DTOs.
- Reveal requires `leads:contact:reveal` plus an active `LeadAccessGrant` for the buyer organization and lead.
- Purchase flow (`LeadPurchaseService`) creates/activates the grant via `LeadAccessService.grantFromPurchase`.
- Reveal returns email to authorized org members and audits `lead.contact.revealed` with grant/lead public IDs only — **never** the email in audit metadata.

### PII protection model

- Public marketplace/requirement endpoints omit owner identity, notes, phone, and email.
- Review DTOs expose author public IDs only (no email, no moderator notes).
- Verification reviewer notes are org/admin scoped, not public.
- Contact reveal is grant-gated and audit-safe; cross-tenant and arbitrary IDs return `NOT_FOUND`.

### Explicit non-certification statement

**Property Studio verification is an internal trust workflow and does not constitute legal certification.** Platform badges, `VERIFIED` status, and trust scores must not be represented as RERA approval, government licensing, or any other legal certification.

## Consequences

- Agencies can become marketplace-eligible through verification without inventing a second trust system.
- Paid lead access unlocks contact reveal and messaging without widening public PII surfaces.
- External notification channels and signed document URLs can attach later without reshaping ownership or authorization.
