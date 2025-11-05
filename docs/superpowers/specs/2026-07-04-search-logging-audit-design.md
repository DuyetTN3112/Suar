# Search Logging And Audit Design

**Status:** Approved pilot spec, implementation in rollout
**Date:** 2026-07-04
**Scope:** Search module observability foundation across backend and frontend
**Primary vertical:** `search-first pilot under platform-wide observability standard`

## Goal

Turn search logging into a real investigation surface instead of loose messages. The system must let us answer who did what, from where, in which flow, against which entity scope, with what result, and what failed or became slow.

This design treats search as the first deep vertical, not the full end-state. The full target is a platform-wide observability standard across all modules and flows. Search is the pilot implementation used to prove schema, correlation, and audit/operational split before broader rollout.

## Position In Platform Rollout

This document is intentionally narrow because search is the proving vertical, not because the platform target is search-only.

The umbrella target now lives in:

- `docs/superpowers/specs/2026-07-04-platform-observability-design.md`

That platform spec covers all modules and cross-module workflows. Search exists here as the first place where the contract is driven deeply enough to validate:

- backend/frontend correlation
- privacy-safe user input handling
- runtime plus audit split
- event taxonomy discipline
- reusable helpers for later modules

## Current State Summary

Search already has meaningful depth:

- backend engine repositories for talents, tasks, projects, skills, organizations, and users
- projection services for reindex and delete flows
- event listener driven reindex triggers
- runtime health checks and CLI commands
- frontend command menu search surface
- API controller and backend fanout query path

Audit and logging already exist in the codebase, but search observability is still fragmented:

- projection services log quiet failures with generic warnings
- search query flow does not emit a consistent structured timeline
- health checks and CLI commands do not share a common event vocabulary
- frontend search interactions are not represented in the log model
- audit log and operational logging are not cleanly separated by purpose

## Design Decision

Use **dual-lane observability**.

Search observability is split into:

1. **Operational log lane**
   For incident response, debugging, latency tracking, engine/runtime failures, retries, drift, and support diagnostics.

2. **Audit/event lane**
   For meaningful behavior and support traceability: search actions, reindex triggers, visibility skips, important manual operations, and user-facing failures worth investigation.

This is intentionally stronger than plain structured logging and intentionally smaller than a full distributed tracing platform.

## Why This Approach

### Rejected: thin structured logging only

This would improve message quality but still leave us without a clear support timeline, without frontend interaction visibility, and without a normalized event language across search flows.

### Rejected: full tracing platform first

This would likely overshoot the current stage of the repo. It adds heavy scope before search itself becomes a clean, well-instrumented reference vertical.

### Chosen: dual-lane observability

This gives:

- strong search-specific debugging
- explicit audit-worthy events
- clean future rollout template
- enough structure to support investigations without requiring a full telemetry platform immediately

## Core Principles

### 1. No generic failure logs

Messages like `Failed to reindex task document` without flow metadata are no longer sufficient.

Every important log must carry enough context to reconstruct the event without reopening half the codebase.

### 2. Shared event vocabulary

Search logs should use stable event names instead of ad hoc free text.

Examples:

- `search.query.started`
- `search.query.completed`
- `search.query.failed`
- `search.projection.received`
- `search.projection.skipped`
- `search.projection.failed`
- `search.reindex.started`
- `search.reindex.completed`
- `search.runtime.ping_failed`
- `search.ui.results_loaded`

### 3. Correlation first

For request/runtime paths, the minimum useful correlation bundle is:

- `request_id`
- `trace_id`
- `flow`

Without those fields, logs are considered incomplete for deep incident tracing.

### 4. Backend and frontend must join

Search investigation cannot stop at backend logs. Frontend search surfaces must emit enough context to explain user intent, empty-result behavior, failed fetches, and clickthrough decisions.

### 5. Audit and operational meaning differ

Not every debug event belongs in audit storage. Not every business-significant event belongs only in transient logger output.

The design keeps both lanes explicit.

### 6. Sensitive data discipline

Raw query text may contain private or surprising user input. The log design must support:

- query length
- normalized/sanitized query
- query hash for correlation
- selective raw query capture only where policy explicitly allows it

The default design prefers hashed or sanitized forms in persistent audit-style records.

## Canonical Event Schema

All search events should be representable through a shared shape. Concrete storage can differ, but the logical schema stays consistent.

### Required top-level fields

- `event_name`
- `event_family`
- `module`
- `subsystem`
- `flow`
- `stage`
- `severity`
- `outcome`
- `occurred_at`

### Required context groups

- `actor`
- `request`
- `trace`
- `entity`
- `search`
- `runtime`
- `error`

### Field intent

#### `event_name`

Stable machine name such as `search.query.completed`.

#### `event_family`

Broad category:

- `query`
- `projection`
- `reindex`
- `runtime`
- `ui`
- `audit`

#### `module`

Always `search` for this vertical.

#### `subsystem`

Examples:

- `global_search`
- `talent_search`
- `task_search`
- `project_search`
- `organization_search`
- `skill_search`
- `user_directory_search`
- `search_runtime`

#### `flow`

Human-recognizable flow identifier such as:

- `command_menu_global_search`
- `public_task_search`
- `talent_marketplace_search`
- `task_projection_reindex`
- `search_health_check`
- `search_cli_reindex`

#### `stage`

Examples:

- `started`
- `fanout_started`
- `fanout_completed`
- `completed`
- `skipped`
- `failed`

#### `severity`

- `trace`
- `debug`
- `info`
- `warn`
- `error`

#### `outcome`

- `success`
- `failure`
- `skipped`
- `warning`

#### `actor`

Examples:

- `actor.user_id`
- `actor.organization_id`
- `actor.session_id`
- `actor.role_surface`
- `actor.initiator_type` (`user`, `system`, `cli`, `listener`)

#### `request`

Examples:

- `request.id`
- `request.method`
- `request.route`
- `request.url`
- `request.ip`
- `request.user_agent`

#### `trace`

Examples:

- `trace.id`
- `trace.parent_id`
- `trace.correlation_key`
- `trace.frontend_submission_id`

#### `entity`

Examples:

- `entity.type`
- `entity.id`
- `entity.scope`
- `entity.index_name`

#### `search`

Examples:

- `search.surface`
- `search.query_text_length`
- `search.query_hash`
- `search.result_counts`
- `search.targets`
- `search.limit`
- `search.skip_reason`

#### `runtime`

Examples:

- `runtime.duration_ms`
- `runtime.engine_node`
- `runtime.engine_operation`
- `runtime.batch_size`
- `runtime.enabled`

#### `error`

Examples:

- `error.class`
- `error.message`
- `error.code`
- `error.stack_present`

## Backend Flow Design

### 1. Query flow

Path:

`frontend search surface -> SearchApiController -> GlobalSearchQuery -> module queries -> response`

#### Required events

- `search.query.started`
- `search.query.backend_fanout_started`
- `search.query.backend_fanout_completed`
- `search.query.completed`
- `search.query.failed`

#### Required fields

- `search.surface`
- `actor.user_id`
- `actor.organization_id`
- `request.id`
- `trace.id`
- `search.query_text_length`
- `search.query_hash`
- `search.targets`
- `search.result_counts`
- `runtime.duration_ms`

#### Notes

- Do not log every implementation detail as a separate audit event.
- Fanout counts matter because search spans multiple domain modules and empty results often come from one failed target rather than full-system failure.

### 2. Projection flow

Path:

`domain event -> search_reindex_listener -> projection service -> document builder -> index repository -> elasticsearch`

#### Required events

- `search.projection.received`
- `search.projection.build_started`
- `search.projection.build_completed`
- `search.projection.upsert_completed`
- `search.projection.deleted`
- `search.projection.skipped`
- `search.projection.failed`

#### Required fields

- `entity.type`
- `entity.id`
- `entity.index_name`
- `actor.initiator_type=listener`
- `search.trigger_event`
- `runtime.engine_operation`
- `search.skip_reason`
- `runtime.duration_ms`

#### Skip reasons

These must be explicit, not inferred from free text:

- `not_public`
- `assigned`
- `deleted`
- `inactive`
- `not_searchable`

#### Notes

- Current projection services already perform silent skip logic and quiet failure logging. This design upgrades them into searchable, structured evidence.

### 3. Bulk reindex flow

Path:

`ACE command or future admin trigger -> searchPublicApi -> projectionService.reindexAll -> sync reader -> builder loop -> bulk upsert`

#### Required events

- `search.reindex.started`
- `search.reindex.batch_progress`
- `search.reindex.completed`
- `search.reindex.failed`

#### Required fields

- `actor.initiator_type`
- `entity.scope`
- `entity.index_name`
- `runtime.batch_size`
- `runtime.duration_ms`
- `search.indexed_count`
- `search.skipped_count`

#### Notes

- `search.reindex.batch_progress` is operational log lane only unless there is a support reason to retain it.
- Final completion event belongs in both lanes when manually initiated.

### 4. Health and runtime flow

Path:

`health check / ping / ensure index / startup diagnostics`

#### Required events

- `search.runtime.ping_started`
- `search.runtime.ping_failed`
- `search.runtime.ensure_index_completed`
- `search.health_check.warning`

#### Required fields

- `runtime.enabled`
- `runtime.engine_node`
- `entity.index_name`
- `error.class`
- `error.message`

#### Notes

- Health warnings are high support value because they explain search degradation that may otherwise look like a product issue.

## Frontend Flow Design

Frontend events are required for usable investigation, but they should not create noisy audit spam.

### 1. Search intent group

Events:

- `search.ui.opened`
- `search.ui.query_changed`
- `search.ui.submitted`

Purpose:

- explain what the user tried to do
- link backend query flow with frontend submission intent

### 2. Search result UX group

Events:

- `search.ui.results_loaded`
- `search.ui.empty_results`
- `search.ui.failed`
- `search.ui.result_clicked`

Purpose:

- explain whether backend success still produced weak UX
- capture failure or zero-result confusion
- link selection behavior to returned groups

### Frontend required fields

- `actor.session_id`
- `trace.frontend_submission_id`
- `search.surface`
- `search.query_text_length`
- `search.query_hash`
- `runtime.duration_ms`
- `search.result_counts`
- `entity.type`
- `entity.id`

### Frontend sampling policy

- `search.ui.query_changed` should usually stay out of persistent audit storage.
- Keystroke-level noise belongs in operational/debug handling only, and may need sampling or debounce aggregation.
- `search.ui.submitted`, `search.ui.failed`, `search.ui.empty_results`, and `search.ui.result_clicked` are the highest-value events.

## Audit Lane Rules

Events that should normally enter audit/event persistence:

- search submission with actor + surface + scope
- important failed search operations
- manual reindex start and completion
- projection skip or delete caused by domain visibility/state changes when support value is high
- significant health warnings affecting user-facing behavior
- frontend failures and empty-result experiences worth support follow-up

Audit lane should emphasize:

- support traceability
- security/operations accountability
- state or visibility decisions
- human-meaningful actions

## Operational Lane Rules

Operational logs should carry rich diagnostic detail for:

- latency
- bulk progress
- backend fanout counts
- repository/index operation details
- Elasticsearch failures
- retry and non-blocking warning paths

Operational lane should emphasize:

- debugging
- performance
- drift detection
- incident triage

## Storage And Surface Strategy

### Existing backend assets to reuse

- `app/modules/logger`
- `app/modules/audit`
- search projection services
- search public API
- search listener
- health checks
- frontend command menu search surface

### Expected system shape

- logger remains main operational output mechanism
- audit module remains persistence path for meaningful events
- search-specific adapters/helpers define event names and payload builders
- frontend emits structured search telemetry events into a bounded ingestion path

## Search-Specific Event Taxonomy

### Query family

- `search.query.started`
- `search.query.backend_fanout_started`
- `search.query.backend_fanout_completed`
- `search.query.completed`
- `search.query.failed`

### Projection family

- `search.projection.received`
- `search.projection.build_started`
- `search.projection.build_completed`
- `search.projection.upsert_completed`
- `search.projection.deleted`
- `search.projection.skipped`
- `search.projection.failed`

### Reindex family

- `search.reindex.started`
- `search.reindex.batch_progress`
- `search.reindex.completed`
- `search.reindex.failed`

### Runtime family

- `search.runtime.ping_started`
- `search.runtime.ping_failed`
- `search.runtime.ensure_index_completed`
- `search.health_check.warning`

### UI family

- `search.ui.opened`
- `search.ui.query_changed`
- `search.ui.submitted`
- `search.ui.results_loaded`
- `search.ui.empty_results`
- `search.ui.failed`
- `search.ui.result_clicked`

## Privacy And Data Handling

### Query text handling

Persistent records should not blindly store raw query text.

Preferred order:

1. `query_hash`
2. `query_text_length`
3. normalized/sanitized query when justified
4. raw query only by explicit policy

### Error handling

Persist:

- error class
- safe message
- code
- stack presence

Avoid:

- schema evidenceing whole stack traces into audit persistence by default
- leaking credentials or tokens into log payloads

## Rollout Boundaries

This spec is for the `search-first` vertical, but it is intentionally reusable.

Future rollout targets:

- auth
- tasks
- reviews
- organizations
- notifications
- admin operations

Search becomes the template for:

- event naming
- payload shape
- backend/frontend join strategy
- audit versus operational split

## Implementation Boundaries

This spec does **not** yet choose exact class/function names or exact file edits. That belongs in the implementation plan.

This spec **does** lock:

- the dual-lane model
- canonical event schema
- the four backend flow groups
- the frontend event groups
- correlation requirements
- the rule against generic search failure logging

## Success Criteria

The design is successful when search logs allow an engineer or support operator to answer:

1. Who triggered the search or reindex?
2. From which surface or runtime path?
3. Which search flow executed?
4. Which targets participated?
5. What result counts came back?
6. What failed or was skipped?
7. How long did it take?
8. Which backend and frontend events belong to the same user action?

If any of those answers still require guesswork, the search logging design is not complete.

## Risks

### Risk: too much noise

Mitigation:

- split audit and operational lanes
- sample noisy UI interaction events
- reserve persistence for meaningful events

### Risk: privacy leakage in query capture

Mitigation:

- hash and sanitize by default
- treat raw query persistence as opt-in policy

### Risk: partial rollout weakens traceability

Mitigation:

- instrument search end-to-end by flow, not file-by-file randomness
- prioritize correlation fields before optional enrichment

### Risk: developers continue free-text logging

Mitigation:

- define event taxonomy and shared builders
- centralize payload construction where practical

## Open Follow-Up For Plan

Implementation planning should answer:

- where request and trace IDs are sourced and propagated
- whether frontend events go straight to backend ingestion or through an existing telemetry path
- which search events persist through `audit` module versus logger only
- exact helper/module boundaries for shared search event builders
- exact test matrix for backend and frontend observability behavior

## Approval Outcome

Design approved by user for specification and planning.
