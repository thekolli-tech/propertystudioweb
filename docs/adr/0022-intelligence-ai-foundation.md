# ADR 0022: Intelligence and AI foundation

## Status

Accepted

## Context

Phases 5–10 delivered catalog inventory, demand marketplace lead matching, CRM, monetization, and trust/communication. Property Studio needs a read-model intelligence layer (property/project/market/infrastructure) and an AI orchestration boundary that can answer questions, match inventory, search in natural language, and record analysis/valuation jobs — without inventing market facts, leaking tenant data, or giving models direct database access.

## Decision

### Property Intelligence boundary

- `PropertyIntelligenceService` / `ProjectIntelligenceService` assemble authorized read models over catalog entities plus market, infrastructure, and trust-score signals.
- Published inventory is readable with `intelligence:read`. Unpublished drafts require active org membership (or platform admin). Cross-tenant / out-of-scope access returns `NOT_FOUND` with `authorization.denied` audit.
- Responses are informational only (`INTELLIGENCE_DISCLAIMER`). They never include owner contact email/phone or other protected PII.
- Coverage is explicit: `READY`, `INSUFFICIENT_DATA`, or `UNAVAILABLE` (for example empty infrastructure). Missing fields are not invented.

### Market Intelligence boundary

- Market data is stored as append-oriented `MarketSnapshot` rows with provenance (`sourceType`, `observedAt`, optional `effectiveAt`, `confidenceBps`).
- Infrastructure is stored as `InfrastructureAsset` rows with category/status and source metadata.
- `IntelligenceObservation` holds keyed subject observations without becoming a second catalog.
- List/trend endpoints return `INSUFFICIENT_DATA` with empty collections when no historical rows exist. Admin list endpoints require `admin:intelligence:read|manage`.
- Valuation and property intelligence **prefer** property → project → locality → city snapshot lookup; they never fabricate medians.

### AI orchestration architecture

- HTTP surface (`AiController`) exposes assistant, property-match, document/floor-plan analysis, valuation, NL property-search, and job status.
- `AiOrchestrationService` creates an `AiJob`, invokes the configured `AiProvider`, executes authorized tools through `AiToolsService`, persists outputs (`DocumentAnalysis`, `FloorPlanAnalysis`, `ValuationEstimate`), and audits completion.
- Tool execution is the only path from model proposals to domain data. Providers propose tool calls; tools enforce permissions and tenancy; answers are assembled only from tool results.

### Provider abstraction (`DeterministicAiProvider`)

- Domain depends on `AiProvider` (`complete` with messages + optional tool results).
- Phase 11 ships `DeterministicAiProvider` (`provider = DETERMINISTIC`): no external LLM, no hallucination. It inspects the user message, proposes a bounded tool set, and narrates only tool outcomes.
- A future LLM provider can replace the binding without changing authorization, job persistence, or tool contracts.

### Authorization model for AI tools

- Route guards require capability permissions (`ai:assistant`, `ai:match`, `ai:search`, `ai:valuation`, `ai:document:analyze`, `ai:floorplan:analyze`).
- Each tool re-checks the relevant permission inside `AiToolsService` / `AiAccessService` (defense in depth).
- Property/project detail tools reuse intelligence access rules (published vs org membership).
- Document analysis requires org membership (or public+published catalog documents). Cross-tenant private documents return `NOT_FOUND`.
- Users lacking `ai:assistant` receive `FORBIDDEN` at the route; unauthorized resource access remains `NOT_FOUND`.

### Data provenance and freshness

- Market/infrastructure rows carry `sourceType`, optional `sourceReference` / `sourceUrl`, `observedAt`, and optional `lastVerifiedAt` / `confidenceBps`.
- AI job rows record provider name, input/output JSON, and coverage state for auditability.
- Clients must treat signals as time-stamped observations, not live guarantees.

### Why AI cannot directly query PostgreSQL

- Direct SQL would bypass RBAC, tenancy, publication gates, PII redaction, and audit.
- Tools call existing Nest domain services (intelligence, marketplace requirements, reviews) so every read inherits the same authorization and DTO shaping as human API clients.
- This keeps the system of record authoritative and prevents prompt injection from becoming an arbitrary data-exfiltration channel.

### Why Phase 7 lead matching remains separate from AI property matching

- Phase 7 `Lead` matching creates organization-owned commercial artifacts (scores, CRM intake, purchase/access grants) from buyer requirements.
- Phase 11 `IntelligenceMatchService` / `ai/property-match` is a **recommendation** over **published** catalog inventory for seekers/agents. It does not create leads, reveal buyer PII, or participate in monetization.
- Keeping these paths separate avoids coupling AI UX to paid lead workflows and preserves distinct audit/entitlement semantics.

### No fabricated production data

- Document/floor-plan analysis foundations record jobs with empty findings and `INSUFFICIENT_DATA` when no OCR/vision provider is configured.
- Valuation returns null estimate bands and `INSUFFICIENT_DATA` when no market snapshots/comparables exist — it does not invent prices.
- Deterministic answers refuse to invent inventory, market medians, or extracted document facts outside tool results.

## Consequences

- Intelligence and AI can grow providers and richer signals without rewriting tenancy or inventing a parallel data plane.
- Security tests assert cross-tenant denials, PII absence, insufficient-data honesty, NL search publication gates, and AI permission enforcement.
- External LLM/OCR/valuation providers can attach later behind the same job + tool + coverage contracts.
