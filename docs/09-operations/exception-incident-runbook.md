# Exception incident runbook

| Field         | Value                               |
| ------------- | ----------------------------------- |
| Status        | Active                              |
| Audience      | On-call, backend, platform, support |
| Owner         | Engineering / platform              |
| Last reviewed | 2026-07-26                          |

## First response

1. Capture the `requestId`, `correlationId`, timestamp, route, actor, and the
   stable error `code`. Do not collect credentials, payloads, or browser stacks
   from the user.
2. Check whether the symptom is one request, one tenant, one dependency, or the
   whole service.
3. Query `error_events` by request/correlation ID, then compare the rate by
   error code and status.
4. Check `/health` and the affected durable worker before retrying a mutation.
5. Preserve idempotency: never manually replay a committed mutation unless its
   operation-specific contract says replay is safe.

When a log includes `committed: true`, the primary database mutation succeeded.
Treat the incident as a failed post-commit effect. Do not tell the caller that
the mutation rolled back and do not repeat the primary write blindly.

## Database queries

Find a single incident:

```sql
SELECT id, code, status, severity, request_id, correlation_id,
       actor_user_id, actor_org_id, method, url, created_at
FROM error_events
WHERE request_id = :request_id
   OR correlation_id = :correlation_id
ORDER BY created_at DESC
LIMIT 50;
```

Find a spike without exposing diagnostic text:

```sql
SELECT code, status, count(*) AS occurrences,
       min(created_at) AS first_seen, max(created_at) AS last_seen
FROM error_events
WHERE created_at >= now() - interval '15 minutes'
GROUP BY code, status
ORDER BY occurrences DESC;
```

`message`, `details`, IP, and user-agent fields are restricted diagnostic data.
Do not paste them into tickets or chat without redaction.

Correlate post-commit failures without relying on raw exception text:

```text
{ committed: true, effect, aggregateType, aggregateId, requestId,
  correlationId, errorName }
```

Use `effect` and the aggregate identifiers to inspect the responsible durable
worker, cache invalidator, or event subscriber. A best-effort effect may be
retried only through its operation-specific idempotent path. If the effect is
required for eventual correctness, open an incident when no durable
outbox/state record exists.

## Classification decisions

- 401/403: verify identity and policy data; do not retry automatically.
- 404: verify resource ID and tenant scope. A plain object cannot produce this
  status.
- 409/422: return the stable code and safe correction guidance to the caller.
- 429: honor `Retry-After`.
- 503 with `retryable=true`: use bounded retry with jitter only for an
  idempotent operation.
- 500 or `E_INVARIANT_VIOLATION`: treat as a defect or corrupted/configuration
  state, not as bad user input.
- `E_PERSISTED_DATA_INTEGRITY`: stop the affected projection/workflow and
  inspect the named table, field, and record scope. Do not substitute an empty
  collection, zero score, or "not found" response.

## Persisted-data integrity triage

Malformed application-owned JSON and missing catalog references are server-side
integrity failures. Current guarded examples include review confirmations,
talent explainability projections, user-skill catalog facts, and task
recommendation trust data.

1. Capture the stable error code and the bounded `table`, `field`,
   `record_id`, and `reason` details.
2. Quarantine or repair the source record through a reviewed migration or
   operation-specific repair command. Never edit production JSON ad hoc.
3. Re-run the owning projector/exporter before retrying the user workflow.
4. Verify both the source contract and every derived projection. A successful
   HTTP response with an empty result is not evidence of recovery.

The debug command `node ace test:ai-dispute` is non-destructive: it creates one
isolated dispute and polls sequentially. If it reports an infrastructure
failure, fix the dependency and rerun; do not clear shared dispute,
case-file, or evaluation tables.

## Auth-session evidence reconciliation

Session mutation and PostgreSQL outbox staging use different datastores and
cannot form one atomic commit. Follow
[`auth-session-evidence-reconciliation.md`](./auth-session-evidence-reconciliation.md)
when a login/logout succeeded but its durable evidence row is absent. Use the
stable event ID, never fabricate a receipt, and verify that the receipt plus
schema-v3 Audit row commit in the consumer transaction before closing the
incident. Confirm `source_occurred_at` independently from the database-assigned
`occurred_at` chain order.

## Transaction integrity triage

- A required audit record missing for an otherwise committed mutation is a
  transaction-boundary defect. The audit write and mutation must share the same
  transaction client.
- A rollback failure after commit indicates an unguarded manual transaction.
  Rollback is legal only while `trx.isCompleted` is false.
- A client-visible 5xx after a confirmed commit indicates an unsafe
  post-commit effect. Event, cache, search, and notification failures must be
  settled and reported as `committed: true`.
- Do not repair any of these by swallowing the dependency error. Preserve a
  stable error type/code and add a fault-injection regression test.

## Durable project lifecycle and search projection

Project create, update, and delete mutations stage
`project:lifecycle:changed:v1` in the caller's PostgreSQL transaction. Inspect
the durable row by project aggregate instead of replaying the HTTP mutation:

```sql
SELECT id, sequence, event_name, aggregate_id, status, attempt_count,
       available_at, locked_by, locked_until, last_error_code, processed_at
FROM domain_event_outbox
WHERE aggregate_type = 'project'
  AND aggregate_id = :project_id
ORDER BY sequence ASC;
```

Delivery is ordered per project. The outbox sequence is also the Elasticsearch
external version. Durable deletes write a minimal versioned tombstone containing
only `project_id` and `deleted_at`; search excludes tombstones, and an expired
old upsert cannot overwrite a later delete even after Elasticsearch's ordinary
delete-version retention window expires.
`SEARCH_PROJECTION_TRANSIENT_FAILURE` is bounded-retryable;
`SEARCH_PROJECTION_AUTHORIZATION_REJECTED` and
`SEARCH_PROJECTION_REQUEST_REJECTED` require configuration, credential, or
mapping repair before an authorized DLQ replay.

An update/create event whose source project has already been hard-deleted
converges to an idempotent, version-fenced index delete. Do not recreate the
database row to unblock projection delivery.

Legacy `project:created`, `project:updated`, and `project:deleted` listeners are
best-effort compatibility effects after strict search delivery. Their failure
is reported but does not poison the durable search event. Do not attach a new
non-idempotent subscriber to those legacy events; use a durable contract with a
consumer receipt.

When search is disabled by configuration, lifecycle events are acknowledged
without contacting Elasticsearch. Before enabling search or routing traffic to
it, set the approved runtime configuration, run
`node ace search:reindex --index=projects`, and verify the index health. A
dependency outage while search remains enabled is not equivalent to this
configured-disabled state and must surface as a delivery failure.

## Clawagent trigger recovery

Inspect the durable auto-queue intents first. A committed dispute report must
have one row per `(source_type, source_id)` even if the process exited before
the immediate queue attempt:

```sql
SELECT id, source_type, source_id, status, attempt_count, available_at,
       locked_by, locked_until, last_error_code, processed_at, updated_at
FROM ai_dispute_auto_queue_intents
WHERE status <> 'processed'
ORDER BY available_at ASC, created_at ASC
LIMIT 100;
```

`pending` is retryable, `leased` is owned until `locked_until`, and
`dead_letter` requires operator attention. Do not manually clear a live lease
or decrement `attempt_count`; expired leases are reclaimed with lease-token
fencing.

Then inspect evaluations whose external Clawagent trigger is not accepted:

```sql
SELECT id, source_type, source_id, status, trigger_state,
       trigger_attempt_count, trigger_last_attempt_at,
       trigger_next_attempt_at, trigger_error_code
FROM ai_dispute_evaluations
WHERE trigger_state <> 'accepted'
ORDER BY created_at ASC
LIMIT 100;
```

Run one bounded reconciliation pass:

```bash
node ace ai-dispute:trigger-work --once
```

Run the worker continuously under the process supervisor:

```bash
node ace ai-dispute:trigger-work
```

An exit code of 1 in `--once` mode means permanent failure, retry exhaustion,
or an ambiguous item requiring operator attention. Do not edit
`attempt_count`, `trigger_attempt_count`, lease fields, or fabricate an
external run ID. Fix the dependency or source-state conflict and let the stable
source identity and evaluation idempotency key govern replay. Clawagent must
honor the `Idempotency-Key` header for end-to-end duplicate suppression.

## Notification outbox dead-letter operations

Use the DLQ administration service to preview bounded, sanitized metadata.
Preview output must not contain notification payloads, recipient identifiers,
or raw dependency error messages. A terminal discard is allowed only for
explicit dead-letter UUIDs, a 10–500 character operator reason, and the exact
confirmation value `DISCARD`.

Preview one bounded page with an authorized operator:

```bash
node ace notification:outbox-dlq \
  --actor-id=<operator-uuid> \
  --error-class=<sanitized-error-class> \
  --limit=50 \
  --json
```

Continue with `--after-sequence=<nextAfterSequence>`. Preview and replay are
capped at 100 rows; narrow the selector instead of bypassing the cap.

Replay only after the dependency or contract defect is fixed:

```bash
node ace notification:outbox-replay \
  --actor-id=<operator-uuid> \
  --ids=<outbox-uuid-1>,<outbox-uuid-2> \
  --reason="<10-500 character operator reason>" \
  --apply
```

Discard locks and fences each dead-letter row and writes a critical audit record
in the same transaction. An audit failure therefore rolls the discard back.
Discarded rows are terminal and cannot be replayed; preserve the audit trail
instead of editing the outbox row directly.

```bash
node ace notification:outbox-dlq \
  --actor-id=<operator-uuid> \
  --ids=<irreparable-outbox-uuid> \
  --discard \
  --reason="<10-500 character terminal disposition reason>" \
  --confirmation=DISCARD
```

## Escalation

Escalate immediately when:

- 5xx rate crosses the service SLO alert threshold;
- the same invariant code affects multiple tenants;
- deadlock/serialization retries remain elevated for more than one window;
- stale `dispatching` records keep returning after reconciliation;
- a response contains a stack, secret, SQL diagnostic, or another tenant's
  identifier.

After mitigation, add a regression/fault-injection test and update the
exception boundary gate if the failure represented a reusable anti-pattern.
