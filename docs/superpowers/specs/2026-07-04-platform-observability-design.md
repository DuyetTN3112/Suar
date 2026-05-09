# Platform Observability And Audit Design

**Status:** Approved and in rollout
**Date:** 2026-07-04
**Scope:** Platform-wide logging, audit, workflow traceability, and investigation surfaces across backend and frontend
**Target maturity:** Industrial-grade
**Pilot vertical:** `search-first`

## Current Rollout Status

Platform observability is no longer only design intent. Shared foundation and several high-risk modules are already moving onto the standard contract.

Implemented or in active rollout:

- shared platform event schema, trace context, redaction, operational logger, audit logger, and workflow logger
- search pilot across backend query, projection, runtime, CLI, health, and frontend search telemetry
- auth workflow instrumentation for social login and callback outcomes
- tasks workflow instrumentation for application and assignment flows
- organizations workflow instrumentation for invite, join request, role change, and member removal flows
- reviews workflow instrumentation for dispute lifecycle and AI evaluation handoff
- projects workflow instrumentation for member management and organization member removal listener
- shared frontend UI telemetry ingestion path, now reusable outside search

Still required for full industrial-grade completion:

- notifications, settings, skills, users, admin, authorization, cache, and remaining cross-module workflows
- investigation surfaces that query and visualize workflow timelines from persisted events

## Goal

Establish one observability standard for the whole product, not one-off logging per module.

The target state is:

- every module emits structured operational logs
- every meaningful user or system action can be audited
- every important workflow can be reconstructed end-to-end
- backend and frontend events can be correlated
- support, engineering, and operations can investigate incidents without guesswork

This standard must cover:

- synchronous requests
- async event listeners
- scheduled or CLI jobs
- state transitions
- permissions and access decisions
- background retries
- external integrations
- user-facing failures
- frontend interaction telemetry for critical product flows

## Why Search-Only Is Not Enough

Search is deep enough to serve as a pilot, but search alone does not satisfy the product need.

Industrial-grade observability for this codebase must span:

- `auth`
- `authorization`
- `organizations`
- `projects`
- `tasks`
- `reviews`
- `skills`
- `users`
- `search`
- `notifications`
- `settings`
- `admin`
- `http`
- `events`
- `cache`
- cross-module workflows that move through several modules in one business process

Search remains useful as the first implementation slice because it exercises:

- backend fanout
- async projection
- CLI operations
- health/runtime checks
- frontend query interaction

But platform design must exist above that pilot.

## Design Decision

Use a **three-layer observability model**:

1. **Operational logging layer**
   Structured runtime logs for debugging, latency, failures, retries, throughput, and environment drift.

2. **Audit/event layer**
   Persistent business-significant action records for accountability, support traceability, and policy-sensitive state changes.

3. **Workflow trace layer**
   Correlated timelines across modules, surfaces, listeners, and UI actions so that one investigation can follow a full business journey.

This is the industrial-grade target.

## Non-Negotiable Platform Principles

### 1. Every important event must be machine-readable

Free-text logging is not enough.

### 2. Every important flow must be reconstructable

We need to answer:

- who triggered it
- from where
- in which workflow
- which modules participated
- which state changed
- what succeeded, skipped, retried, or failed
- how long each stage took

### 3. Module ownership remains local, schema remains global

Each module owns its event emitters and business vocabulary.
The platform owns the shared schema, correlation rules, severity rules, privacy rules, and ingestion boundaries.

### 4. Audit and operational logs are different products

Operational logs are for runtime diagnosis.
Audit records are for accountability and support traceability.
They overlap, but they are not identical.

### 5. Frontend is part of the trace

Investigation is incomplete if we only see backend outcomes and cannot see what the user attempted in UI.

### 6. Privacy and minimization are default rules

Sensitive values, tokens, credentials, and arbitrary free-text user input must not be copied blindly into durable logs.

## Canonical Platform Event Schema

Every module-level event must conform logically to one shared contract.

### Required top-level fields

- `event_name`
- `event_family`
- `module`
- `subsystem`
- `workflow`
- `stage`
- `severity`
- `outcome`
- `occurred_at`

### Required context groups

- `actor`
- `request`
- `trace`
- `target`
- `change`
- `runtime`
- `error`
- `compliance`

### Platform field meaning

#### `event_name`

Stable machine name, for example:

- `task.assignment.created`
- `review.dispute.resolved`
- `auth.login.failed`
- `search.query.completed`

#### `event_family`

Examples:

- `request`
- `command`
- `query`
- `audit`
- `state_change`
- `workflow`
- `integration`
- `ui`
- `runtime`

#### `module`

Examples:

- `auth`
- `tasks`
- `reviews`
- `search`
- `organizations`

#### `subsystem`

More specific bounded area within a module.

Examples:

- `social_login`
- `task_status_board`
- `review_dispute`
- `talent_search`

#### `workflow`

Cross-module or module-local investigation path.

Examples:

- `user_login`
- `task_application_review`
- `review_dispute_resolution`
- `global_search`
- `organization_context_switch`

#### `stage`

Examples:

- `started`
- `validated`
- `authorized`
- `persisted`
- `emitted`
- `completed`
- `skipped`
- `failed`
- `retried`

#### `actor`

Examples:

- `actor.user_id`
- `actor.organization_id`
- `actor.project_id`
- `actor.session_id`
- `actor.initiator_type`
- `actor.role_surface`

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
- `trace.workflow_id`
- `trace.frontend_submission_id`
- `trace.correlation_key`

#### `target`

Examples:

- `target.type`
- `target.id`
- `target.scope`
- `target.parent_type`
- `target.parent_id`

#### `change`

Examples:

- `change.action`
- `change.before`
- `change.after`
- `change.diff_summary`
- `change.visibility_reason`

#### `runtime`

Examples:

- `runtime.duration_ms`
- `runtime.retry_count`
- `runtime.queue_name`
- `runtime.job_name`
- `runtime.engine_operation`
- `runtime.enabled`

#### `error`

Examples:

- `error.class`
- `error.message`
- `error.code`
- `error.stack_present`

#### `compliance`

Examples:

- `compliance.contains_user_input`
- `compliance.contains_sensitive_fields`
- `compliance.redaction_applied`
- `compliance.retention_class`

## Required Correlation Model

Industrial-grade means every important flow has correlation.

### Required identifiers

- `request_id` for request-bound flows
- `trace_id` for all workflow-capable flows
- `workflow_id` for multi-stage journeys

### Recommended additional identifiers

- `frontend_submission_id`
- `job_run_id`
- `listener_invocation_id`
- `bulk_operation_id`

### Rule

Any new business-critical flow without correlation metadata is considered incomplete instrumentation.

## Platform Log Classes

### 1. Operational logs

Use for:

- debug
- performance
- runtime errors
- retry loops
- queue processing
- integration failures
- partial degradation

### 2. Audit records

Use for:

- auth outcomes
- permission-sensitive actions
- CRUD state changes with support or compliance value
- reassignments, approvals, removals, submissions, disputes, admin actions
- meaningful user-facing search and workflow actions

### 3. Workflow checkpoints

Use for:

- multi-module journeys
- timeline reconstruction
- partial progress and handoff between modules
- user-to-listener-to-background-to-read-model transitions

## Module Coverage Requirements

### Auth

Must trace:

- login attempt
- login success/failure
- logout
- social auth redirect/callback
- session anomalies
- state mismatch and provider errors

### Authorization

Must trace:

- allow/deny decisions for sensitive surfaces
- admin-only routes
- audit-log viewing
- role escalation or role updates

### Organizations

Must trace:

- organization creation/update/delete
- membership invite/approve/remove
- ownership transfer
- organization context switching

### Projects

Must trace:

- project creation/update/delete
- member add/update/remove
- ownership transfer
- staffing-related actions

### Tasks

Must trace:

- task creation/update/delete
- status changes
- assignment lifecycle
- applications and review decisions
- workflow/status board mutations

### Reviews

Must trace:

- review submission
- confirmation
- anomaly detection
- dispute creation/respond/resolve
- AI callback involvement

### Skills And Users

Must trace:

- skill activation or deactivation
- user approval/deactivation
- profile changes affecting visibility or matching
- searchable profile settings changes

### Search

Must trace:

- query
- projection
- reindex
- runtime health
- UI search behavior

### Notifications

Must trace:

- notification attempts
- notification failures
- downstream delivery class

### Admin

Must trace:

- audit log access
- moderation actions
- privileged data views
- debug/runtime interventions

## Workflow-Centric Coverage

Beyond module coverage, industrial-grade instrumentation must cover complete business flows:

- login flow
- organization join flow
- task application flow
- assignment completion to review creation flow
- review dispute flow
- profile update to search projection flow
- admin moderation flow

Each workflow must have:

- start event
- key checkpoints
- outcome event
- failure event
- correlation metadata connecting every stage

## Frontend Standards

Frontend observability is required for critical product flows, not optional.

### Required frontend event classes

- interaction submitted
- result loaded
- empty-state encountered
- action clicked
- failure shown
- high-risk modal confirmed

### Frontend rules

- debounce noisy change events
- sample where needed
- prefer structured payloads over console output
- carry `frontend_submission_id` into backend where practical
- do not persist raw sensitive text by default

## Backend Standards

### Every controller/command/query/listener does not need direct logging

But every critical flow must have explicit checkpoints at the right boundary:

- request entry
- authorization boundary
- business state mutation
- event emission
- background listener receipt
- external integration call
- final outcome

### Silent catches are forbidden for critical flows

If a catch branch matters, it must emit structured observability.

## Industrial-Grade Support Surfaces

The platform target is not only event emission. It must eventually support investigation surfaces:

- admin audit log views
- workflow timeline views
- filtered event search by actor, target, module, workflow, trace id
- event drill-down with redacted payload details
- operational dashboards for failures, retries, and latency outliers

These UI surfaces can be phased, but the event model must support them from the start.

## Privacy, Security, And Retention

### Default safety rules

- redact credentials
- hash free-text search queries where persistence is durable
- store stack presence and safe message by default, not full raw stack in audit storage
- classify records by retention class

### Recommended retention classes

- `transient_runtime`
- `support_trace`
- `security_audit`
- `compliance_audit`

## Rollout Strategy

### Phase 0: Platform foundation

- shared schema
- shared correlation rules
- shared logger/audit adapters
- shared privacy/redaction rules

### Phase 1: Search pilot

- implement full vertical in search
- validate schema and developer ergonomics
- validate backend/frontend correlation

### Phase 2: High-risk business flows

- auth
- tasks
- reviews
- admin

### Phase 3: Full module rollout

- organizations
- projects
- users
- skills
- notifications
- settings

### Phase 4: Investigation surfaces

- richer admin views
- workflow timelines
- operational analytics and alerting

## Success Criteria

Platform observability is successful when, for any critical incident or support escalation, we can answer:

1. Which user or system actor initiated the chain?
2. Which workflow executed?
3. Which modules were touched?
4. Which state transitions happened?
5. Which stage failed, retried, or skipped?
6. Which frontend action corresponds to the backend chain?
7. Which admin or support operator later inspected or changed the state?
8. Which records are audit-grade versus runtime-only?

If those answers still depend on reading scattered generic log text, the platform is not yet industrial-grade.

## Risks

### Risk: noise explosion

Mitigation:

- split operational, audit, and workflow layers
- define sampling rules
- enforce event taxonomy

### Risk: uneven module adoption

Mitigation:

- use platform standard plus phased rollout
- make high-risk workflows mandatory early

### Risk: privacy leakage

Mitigation:

- centralize redaction and query-hash rules
- add compliance metadata to payloads

### Risk: local module conventions diverge

Mitigation:

- shared payload builders
- contract tests
- review gate for new critical flows

## Relationship To Search Spec

`docs/superpowers/specs/2026-07-04-search-logging-audit-design.md` is now the pilot vertical specification.

This platform spec is the actual umbrella target.

Search implementation must conform to this platform standard and prove the pattern before broader rollout.
