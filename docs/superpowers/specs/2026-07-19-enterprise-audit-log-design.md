# Enterprise Audit Log Design

**Status:** Approved for implementation
**Date:** 2026-07-19
**Scope:** Durable audit logging across user, organization, and system admin surfaces
**Target maturity:** Enterprise audit trail suitable for SOC 2, ISO 27001-style logging controls, and HIPAA-style audit-control expectations

## Goal

Suar must have one authoritative, tamper-evident audit trail that can answer who did what, when, where, why, and with what result. The audit trail must be separate from operational application logs, queryable from three different surfaces, and strong enough to support incident investigation, support review, compliance evidence, and privileged-action accountability.

The three user-facing surfaces are:

- **User audit log:** personal account and activity history visible to the signed-in user.
- **Organization audit log:** organization-scoped governance history visible to organization owners/admins.
- **System admin audit log:** platform-wide security and operations audit history visible to system admins.

These are not three unrelated logs. They are three projections over one enterprise audit event store.

## Current State

Suar already has a PostgreSQL-backed `audit_events` store and an audit module:

- `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts`
- `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts`
- `app/modules/audit/actions/write_audit_log.ts`
- `app/modules/admin/controllers/audit_logs/list_audit_logs_controller.ts`
- `app/modules/observability/contracts/platform_event.ts`

The current implementation records a useful legacy shape:

- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `old_values`
- `new_values`
- `ip_address`
- `user_agent`
- `occurred_at`

Important gaps remain:

- `organizationId`, `requestId`, `traceId`, and `workflowId` exist in action context but are not persisted as first-class audit columns.
- User, organization, and system surfaces are implemented mostly as filters, not as explicit event scopes.
- Organization scope relies on entity lookup and JSON payload inspection, so events can be missed when payloads omit `organization_id`.
- The writer logs failures and continues even for high-value actions.
- Audit integrity is not tamper-evident: no append-only guard, no event hash, no previous hash, no archive policy.
- Structured `PlatformEvent` payloads are stored inside `new_values`, but key investigation fields are not indexable.

## Design Decision

Use one append-only table, `audit_events`, plus one projection table, `audit_event_scopes`.

Do not create separate `user_audit_events`, `organization_audit_events`, and `system_audit_events` tables. A single action can legitimately appear in more than one surface. Example: an organization owner changes a member role. That event belongs to:

- the organization audit surface for governance history
- the affected user's audit surface as a change to their access
- the system admin audit surface as a platform-wide privileged action

The source of truth is one event. Surface membership is modeled as explicit scopes.

## Enterprise Event Shape

Every persisted event must keep legacy compatibility while supporting the platform event contract.

### Required 5W Fields

| 5W | Stored fields |
| --- | --- |
| Who | `actor_type`, `actor_user_id`, `actor_org_id`, `actor_role_surface`, legacy `user_id` |
| What | `event_name`, `action`, `event_family`, `stage`, `outcome`, `severity` |
| When | `occurred_at`, `recorded_at`, output as ISO 8601 UTC |
| Where | `module`, `subsystem`, `target_type`, `target_id`, `target_org_id`, `ip_address`, `user_agent`, `request_id`, `trace_id` |
| Why/Context | `old_values`, `new_values`, `change`, `runtime`, `error`, `compliance`, `correlation_key` |

### New Columns On `audit_events`

Add these nullable columns so existing records remain readable:

- `event_name text`
- `event_family text`
- `module text`
- `subsystem text`
- `workflow text`
- `stage text`
- `severity text`
- `outcome text`
- `actor_type text`
- `actor_user_id uuid`
- `actor_org_id uuid`
- `actor_role_surface text`
- `target_type text`
- `target_id text`
- `target_org_id uuid`
- `request_id text`
- `trace_id text`
- `correlation_key text`
- `retention_class text`
- `redaction_applied boolean not null default false`
- `schema_version integer not null default 1`
- `event_hash text`
- `prev_hash text`
- `recorded_at timestamptz not null default now()`

Keep legacy columns:

- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `old_values`
- `new_values`
- `ip_address`
- `user_agent`
- `occurred_at`
- `created_at`

Legacy writes continue to work. New writes should fill both legacy and enterprise columns.

### New Table `audit_event_scopes`

`audit_event_scopes` defines which surface can see an event.

Columns:

- `id uuid primary key`
- `event_id uuid not null references audit_events(id) on delete cascade`
- `surface text not null`
- `user_id uuid null`
- `organization_id uuid null`
- `created_at timestamptz not null default now()`

Allowed `surface` values:

- `user`
- `organization`
- `system`

Unique constraints:

- `unique(event_id, surface, user_id, organization_id)`

Indexes:

- `(surface, user_id, created_at desc)`
- `(surface, organization_id, created_at desc)`
- `(surface, created_at desc)`
- `(event_id)`

## Scope Rules

### System Scope

Every audit event receives a `system` scope. The system admin surface is the complete audit stream, subject to system-admin authorization.

### User Scope

Add a `user` scope when:

- actor is a user
- target is a user
- event changes a user's auth, profile, role, status, invitation, task assignment, review participation, or account/security settings
- event is a system/admin action that directly affects that user

User surface must not reveal unrelated users' private values. It can show that a system admin or organization admin changed something, but payloads must be redacted to the user-safe view.

### Organization Scope

Add an `organization` scope when:

- actor organization is known
- target organization is known
- target project/task/review/sprint/subscription belongs to an organization
- payload explicitly references `organization_id`

Organization surface must not rely only on JSON payload search. Scope resolution should happen at write time, with read-time legacy fallback only for old rows.

### Admin/System Surface

System admin surface includes all rows. It exposes the richest investigation context:

- actor
- target
- request id
- trace id
- correlation key
- IP
- user agent
- outcome
- severity
- redaction status
- retention class
- raw structured payload

It still must never expose credentials, session tokens, reset tokens, OAuth tokens, cookies, authorization headers, password hashes, or secret keys.

## Privacy And Redaction

Audit payloads must be redacted before persistence.

Always redact fields whose key contains:

- `password`
- `token`
- `secret`
- `authorization`
- `cookie`
- `session`
- `refresh`
- `api_key`

For user-generated free text, store one of:

- field name plus changed/not changed
- length
- hash
- approved excerpt only when product policy allows it

Audit should prefer allowlisted change snapshots over dumping full database rows.

## Integrity And Non-Repudiation

### Append-Only Guard

Application code must not update or delete audit events. Database-level protection should block updates/deletes outside test or maintenance contexts.

The first implementation may add application-level repository guards and tests. Production hardening should add database trigger/policy protection.

### Hash Chain

Each event receives:

- `prev_hash`: the most recent prior hash for the chosen chain
- `event_hash`: SHA-256 of canonical event content plus `prev_hash`

The chain scope for initial implementation is global by `occurred_at`/insert order. If write contention becomes a problem, partition by day or by `target_org_id`.

Hash input must be stable:

- sort object keys
- normalize dates to ISO 8601 UTC
- omit `event_hash`
- include `prev_hash`

### Archive

Production-ready deployment should export audit events to immutable object storage with retention lock. The implementation must keep storage shape compatible with daily export to WORM storage.

## Read Surface Contracts

### User Surface

Route:

- `GET /settings/audit-logs`

Rules:

- authenticated user only
- filters by explicit `audit_event_scopes(surface = 'user', user_id = current_user_id)`
- no user id filter input
- no cross-user rows
- redacted payload view

### Organization Surface

Route:

- `GET /org/audit-logs`

Rules:

- authenticated organization owner/admin only
- filters by explicit `audit_event_scopes(surface = 'organization', organization_id = current_organization_id)`
- no cross-organization rows
- can show actor and target metadata for org members/admin actions
- falls back to legacy org inference only for rows without scopes

### System Admin Surface

Routes:

- `GET /admin/audit-logs`
- `GET /api/admin/audit-logs`

Rules:

- system admin/superadmin only
- uses `system` scope or all rows during migration
- supports existing filters: search, action, resource type, user id, date range, cursor
- records audit-log-viewed events

## Event Vocabulary

Prefer stable dot-separated event names:

- `auth.login.succeeded`
- `auth.login.failed`
- `auth.logout.succeeded`
- `user.profile.updated`
- `user.role.changed`
- `user.status.deactivated`
- `organization.created`
- `organization.settings.updated`
- `organization.member.invited`
- `organization.member.role_changed`
- `organization.member.removed`
- `project.created`
- `project.updated`
- `task.created`
- `task.status.changed`
- `task.assignment.created`
- `review.dispute.created`
- `review.dispute.resolved`
- `admin.audit_log.viewed`
- `admin.user.suspended`

Legacy actions can remain, but new instrumentation should use the platform vocabulary.

## Failure Semantics

Audit writes are not all equal.

Best-effort allowed:

- UI telemetry
- support-trace-only events
- low-risk read events

Must not silently fail:

- login/logout security events
- permission deny on sensitive surfaces
- role changes
- organization ownership transfer
- membership removal
- user suspension/deactivation
- admin package/subscription changes
- audit export
- audit-log access by admin

For critical actions, the implementation should either:

- write the audit event in the same transaction, or
- write to a durable outbox and alert if the outbox cannot be persisted

The initial implementation should expose a `critical` option on the audit writer. Non-critical writes can log and continue; critical writes throw.

## Testing Requirements

### Unit Tests

Cover:

- scope derivation from actor/context/target
- sensitive-field redaction
- stable hash generation
- legacy payload normalization
- mapper extraction of enterprise fields

### Integration Tests

Cover:

- enterprise write persists new columns and scopes
- user surface returns only scoped user events
- organization surface returns only scoped organization events
- system admin surface returns all scoped events
- legacy rows without scopes still read through existing fallback
- critical audit write failure propagates

### E2E Tests

Cover:

- system admin can inspect enterprise metadata in `/admin/audit-logs`
- organization owner/admin can inspect only current organization audit rows in `/org/audit-logs`
- regular user can inspect only personal audit rows in `/settings/audit-logs`
- regular user cannot open `/admin/audit-logs`
- organization owner without system role cannot open `/admin/audit-logs`

### Screenshot And Roleplay Evidence

Capture screenshots for:

- system admin audit event detail
- organization audit event detail
- user personal audit event detail

Roleplay pass:

- sign in as system admin and investigate a suspicious admin/security event
- sign in as organization owner/admin and inspect membership or task governance history
- sign in as regular user and verify personal account/activity history does not leak other users

## Rollout Plan

1. Add enterprise schema and compatibility repository interfaces.
2. Add scope derivation, redaction, and hash helpers with unit tests.
3. Wire write paths to persist enterprise fields and scopes.
4. Update read repository to prefer `audit_event_scopes`.
5. Preserve legacy fallback for existing unscoped rows.
6. Update admin response mapper and frontend detail fields.
7. Add backend integration tests for the three surfaces.
8. Add E2E roleplay and screenshots.
9. Add `gitnexus detect-changes` verification before any commit.

## Acceptance Criteria

- One audit event can appear in user, organization, and system surfaces through explicit scopes.
- User surface never shows unrelated user rows.
- Organization surface never shows foreign organization rows.
- System admin surface can inspect request, trace, actor, target, retention, and redaction metadata.
- Audit writer supports critical writes that fail loudly.
- Sensitive fields are redacted before persistence.
- Event hashes are deterministic and stored for new events.
- Legacy audit rows remain readable.
- Unit, integration, E2E, screenshot, and roleplay verification all produce evidence.
