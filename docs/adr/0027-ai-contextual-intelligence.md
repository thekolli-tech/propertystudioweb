# ADR 0027 — AI Copilot Contextual Intelligence

## Status

Accepted (Phase 14C)

## Context

Phases 11 and 13 delivered a shared AI orchestration layer (`AiToolsService`, `DeterministicAiProvider`) and a multi-turn chatbot (`ChatbotService`) with conversation isolation. Phase 14A added role dashboards and CRM workflow surfaces; Phase 14B added saved searches, saved properties, and smart-alert matches.

The Copilot still answered largely without workspace awareness: it did not systematically assemble the user’s role, active organization, focused property/project/requirement, saved inventory, or CRM state. Adding a second AI stack or treating frontend-supplied IDs as authorization would violate the existing tenancy model.

## Decision

### Context architecture

- Introduce a server-side **AI Context Assembly** layer (`AiContextAssemblyService`) that builds an `AiAssembledContextResponse` from existing Prisma data **after** permission checks (`actorHasPermission`) and resource ownership/assignment rules.
- Expose assembly via `GET /api/v1/ai/context` (`ai:assistant`) and via tools such as `get_current_user_context`.
- Conversation `contextHints` (route, property/project/requirement/org public IDs, focus) are **hints only**. They are stored in `contextJson` for UX continuity and prompt enrichment, then **re-authorized** on every tool call and context resolve.
- Frontend-supplied `organizationPublicId` that does not match the actor’s active organization is stripped for non-admin actors. Create-conversation rejects cross-tenant org context with `FORBIDDEN`.

### Authorization model

- NestJS AuthGuard + PermissionsGuard remain authoritative for HTTP.
- Every AI tool independently calls `AiAccessService.requirePermission` and domain permission/ownership checks.
- Saved properties/searches/requirements are scoped to `actor.userId`.
- CRM tools require an active organization and `crm:read` / `lead:read`; queries filter by `recipientOrganizationId` / `organizationId`.
- PROPERTY_ADMIN unpublished property/project focus resolves only with a matching `resource_assignments` row.
- Deleted conversations (`status = DELETED`) remain unreachable via `requireOwnedConversation` — stored hints cannot be used to fetch resources after deletion.

**AI context is not an authorization mechanism.** Presence of a public ID in conversation metadata never grants access.

### Tool model

Extend the existing Phase 11 tool registry (no second registry):

| Tool | Purpose |
| --- | --- |
| `get_current_user_context` | Assembled role/workspace summary |
| `get_saved_properties` / `get_saved_searches` | Owner-scoped Phase 14B data |
| `get_active_requirements` | Owner-scoped requirements |
| `get_my_crm_summary` / `get_my_pipeline` | Org CRM aggregates |
| `get_my_followups` / `get_my_site_visits` / `get_my_deals` | Org operational lists |
| `get_property_context` / `get_project_context` | Aliases over existing authorized detail tools |
| `compare_saved_properties` | Compare only the actor’s saved published properties |
| `get_recommended_next_actions` | Deterministic next-best-action list |

`DeterministicAiProvider` gains regex arms for these tools; no external LLM dependency.

### Next-best-action engine

`NextBestActionService` derives labeled **“Recommended next actions”** from live system state (overdue follow-ups, upcoming site visits, uncontacted leads, saved-search matches, requirements without saves). Not ML; each action includes evidence strings.

### Context lifecycle

1. UI launch points pass query hints into `/app/ai/chat`.
2. Client may call `GET /ai/context` to show a context indicator.
3. Create/post message may persist/merge hints into `contextJson`.
4. On each turn, hints enrich the provider prompt and tool args; assembly/tools re-check access.
5. Soft-delete conversation revokes further access to messages and hints.

### UI

Reuse `/ai/chat`, `/app/ai/chat`, `/studio/ai`. Add `AskAiLink` entry points on property/project detail, saved workspace, requirement detail, and developer/agent/seeker dashboards. Context indicator shows human-readable labels (e.g. “Context: Property PS-PROP-…”) without redesigning the product shell.

### Response contract

Preserve Phase 11 coverage states: `READY` / `INSUFFICIENT_DATA` / `UNAVAILABLE`. Do not fabricate market or property facts. Legal/valuation disclaimers unchanged.

## Consequences

- Copilot answers differ by role and focused resource without a second AI architecture.
- Phase 14B saved/search/alert data becomes available to authorized tools only.
- Context size is capped (e.g. max saved items, max next actions, label slice) to avoid loading entire orgs per turn.

## Security boundaries

- No cross-user saved property/requirement leakage via AI.
- No cross-tenant CRM/project context via frontend org IDs.
- No lead contact reveal beyond existing lead-access rules.
- PROPERTY_ADMIN remains assignment-scoped for unpublished catalog focus.
- Tool authorization is always server-side.

## Known limitations

- Deterministic provider only (no streaming LLM).
- Context does not include full conversation history summarization beyond stored tool result IDs.
- Recent “view” history is not tracked unless already present elsewhere.
- Email/push delivery of AI digests remains out of scope.

## Deferred

- External LLM providers behind the existing `AiProvider` abstraction
- Streaming responses
- Phase 14D and beyond
