# Enterprise Notification Center Reliability Design

**Status:** Approved for implementation  
**Date:** 2026-07-23  
**Scope:** In-app Notification Core, PostgreSQL reliability, Elasticsearch feed projection, Redis derived state, and realtime invalidation  
**Deferred:** Email/push delivery adapters and provider-specific delivery tracking  
**Target maturity:** Enterprise-grade, replayable, horizontally scalable notification core

## 1. Goal

Suar must replace the current synchronous in-app inbox write path with a durable Notification Center that:

- never loses an accepted notification because a producer process or projection dependency fails;
- tolerates at-least-once processing without creating duplicate canonical notifications;
- supports retry, dead-letter handling, replay, rebuild, and reconciliation;
- keeps PostgreSQL as the canonical source of notification state;
- projects feed/search data into Elasticsearch without coupling business requests to Elasticsearch;
- keeps unread count and realtime signals as rebuildable Redis state;
- exposes one versioned notification contract and catalog to backend and frontend;
- can add email later without changing every producer;
- scales by adding workers, Elasticsearch nodes, and realtime gateway instances rather than redesigning the core.

“Accepted” has one precise meaning:

> A notification is accepted only after its canonical PostgreSQL row and durable projection intent commit successfully.

Logging, emitting an in-process event, or starting an asynchronous promise does not count as acceptance.

## 2. Non-Goals

This implementation does not:

- send email or push notifications;
- treat Elasticsearch or Redis as canonical storage;
- promise exactly-once execution;
- introduce Kafka;
- implement an unbounded broadcast/fan-out engine;
- hard-code a final delete lifecycle before the product delete decision is recovered;
- require Elasticsearch for business command success;
- use Redis Pub/Sub as a durable delivery channel.

The reliability guarantee is:

> At-least-once processing plus deterministic identity, revision checks, and uniqueness constraints produce effectively-once canonical state.

## 3. Verified Pre-Implementation Baseline

The following was the verified baseline on 2026-07-23, before this implementation plan was
executed:

- writes notification rows directly through `CreateNotification` and `PostgresNotificationRepository`;
- has approximately 30 effective notification emission expressions;
- contains no transactional outbox, durable retry, DLQ, or replay path;
- commits several business transactions before attempting notification writes;
- has inconsistent post-commit failure behavior across producers;
- performs redundant feed/count queries;
- uses different total ordering between offset and cursor paths;
- has separate frontend page and dropdown state;
- has backend/frontend notification catalog drift;
- derives deep links in the frontend from incomplete entity metadata;
- can convert backend feed failures into an empty successful response;
- has an existing Elasticsearch runtime and search implementation, but no notification index or reliable projection pipeline;
- has Redis available for cache/session-style usage, but no notification counter or realtime transport.

Local runtime size is not a capacity decision. It is only evidence that current load cannot prove a database bottleneck. This design intentionally builds the reliability and projection boundaries before production scale arrives.

This section is historical evidence, not a claim about the current worktree. Current implementation
and qualification evidence is maintained in the implementation plan and operations runbook.

## 4. Architecture Decision

Use:

```text
PostgreSQL
= canonical notification state
+ durable projection/outbox state
+ canonical per-recipient unread aggregate and sequence

Elasticsearch
= versioned feed/search projection

Redis
= rebuildable unread cache
+ realtime invalidation signal
```

The write flow is:

```text
Business command
    │
    ├── business mutation
    ├── canonical notification mutation
    └── durable outbox mutation
             same PostgreSQL transaction
                    │
                  COMMIT
                    │
              Outbox worker
                    │
          ┌─────────┼─────────┐
          │         │         │
    Elasticsearch  Redis   Pub/Sub
       projection  count   invalidation
```

The read flow is:

```text
Feed API
    ├── feature flag OFF → PostgreSQL
    ├── shadow mode      → PostgreSQL response + async ES comparison
    └── feature flag ON  → Elasticsearch, bounded PostgreSQL fallback
```

## 5. Canonical Notification Model

### 5.1 Notification state

The initial lifecycle is:

```text
unread ──mark-read──> read
```

The implementation preserves current hard-delete behavior for compatibility until the delete product decision is restored. It must not invent `archived`, `dismissed`, or `purged` as public states yet.

Every state-changing mutation increments `revision`.

### 5.2 Canonical columns

Extend `notifications` with:

- `event_id uuid not null`
- `event_fingerprint char(64) not null`
- `occurred_at timestamptz not null`
- `correlation_id text null`
- `actor_type text null`
- `actor_id text null`
- `subject_type text null`
- `subject_id text null`
- `schema_version integer not null default 1`
- `scope_type text not null default 'user'`
- `scope_id text null`
- `organization_id uuid null`
- `category text not null`
- `priority text not null`
- `template_key text not null`
- `template_version integer not null default 1`
- `locale text not null default 'vi'`
- `parameters jsonb null`
- `action jsonb null`
- `revision bigint not null default 1`
- `dedupe_key text null`

Keep current compatibility columns:

- `id`
- `user_id`
- `title`
- `message`
- `is_read`
- `type`
- `related_entity_type`
- `related_entity_id`
- `metadata`
- `read_at`
- `created_at`
- `updated_at`

`title` and `message` are rendered immutable snapshots. Template metadata is stored for traceability and future channel rendering; existing historical notifications must not change when a template changes.

### 5.3 Integrity rules

Required integrity:

- `unique(event_id, user_id)`;
- `unique(user_id, type, dedupe_key) where dedupe_key is not null`;
- `revision >= 1`;
- `schema_version >= 1`;
- `template_version >= 1`;
- unread rows have `read_at is null`;
- read rows have `read_at is not null`;
- bounded title, message, metadata, parameters, and action payload sizes at application validation;
- a repeated `(event_id, user_id)` is accepted as idempotent only when its stored `event_fingerprint` matches the normalized command;
- `user_id` references the canonical user with `ON DELETE RESTRICT`; user erasure must use the notification purge workflow and may not cascade around tombstone/outbox creation.

Database constraints protect storage integrity. Domain decisions remain in the application layer.

### 5.4 Canonical recipient state

Create `notification_recipient_states`:

- `recipient_id uuid primary key`;
- `unread_count bigint not null default 0`;
- `revision bigint not null default 0`;
- `created_at timestamptz not null`;
- `updated_at timestamptz not null`;
- check constraints require `unread_count >= 0` and `revision >= 0`.

This row is the canonical source for an unread count and, critically, provides one monotonic sequence per recipient. A notification's own `revision` cannot safely order Redis count updates across different notifications.

Every canonical mutation locks or atomically updates the recipient-state row in the same transaction:

- create unread: `unread_count + 1`, `revision + 1`;
- mark unread as read: `unread_count - 1`, `revision + 1`;
- repeated mark-read: no count or revision change;
- delete unread: `unread_count - 1`, `revision + 1`;
- delete read: count unchanged, `revision + 1`;
- bulk mutation: apply the exact affected count once, `revision + 1`.

The resulting absolute `unread_count` and recipient-state `revision` are captured in the outbox intent. Reconciliation can rebuild the row from canonical notifications and advance its revision; Redis never creates or owns this sequence.

### 5.5 Durable deletion fence

Hard-delete compatibility requires `notification_tombstones`:

- `notification_id uuid primary key`;
- `recipient_id uuid not null`;
- `final_revision bigint not null`;
- `deleted_at timestamptz not null`;
- `purge_after timestamptz not null`;
- no title, message, parameters, metadata, or action content.

A delete transaction increments the final notification revision, writes the tombstone, updates recipient state, appends projection jobs, and only then deletes the canonical notification row. `notification_outbox.notification_id` is intentionally not a cascading foreign key.

Elasticsearch stores a content-free tombstone document rather than immediately performing a physical delete. Feed queries exclude tombstones. Every feed projection uses the canonical revision with strict `external` (`external_gt`) version fencing, so revision `n` cannot replace tombstone revision `n+1`. Equal-revision replays intentionally receive a version conflict and are classified as already applied/stale; `external_gte` is not used because it permits equal-revision content to overwrite an existing document and Elasticsearch explicitly warns that incorrect use can lose data.

Tombstones may be physically purged only after:

- every related projection job is processed or administratively resolved;
- processed-outbox and replay windows have elapsed;
- every retained Elasticsearch index is beyond rollback eligibility;
- reconciliation proves no live content document remains.

### 5.6 Acceptance and idempotency ledger

`notification_acceptance_ledger` survives content deletion:

- primary key `(event_id, recipient_id)`;
- `event_fingerprint char(64) not null`;
- `notification_id uuid not null`;
- `type text not null`;
- `dedupe_key text null`;
- `occurred_at timestamptz not null`;
- `terminal_state text not null` in `active`, `deleted`, `purged`;
- `accepted_at timestamptz not null`;
- `terminal_at timestamptz null`;
- partial uniqueness `(recipient_id, type, dedupe_key)` when `dedupe_key is not null`.

Acceptance inserts the ledger and canonical row in the same transaction. Delete/purge updates the ledger terminal state but does not remove the identity fence. A retry of the same event and fingerprint after delete returns the existing terminal result and creates no notification or projection job. A different fingerprint remains a conflict.

The online API accepts occurrences no older than the 180-day idempotency horizon and no more than 5 minutes in the future. Ledger records remain at least 180 days after `occurred_at`; once outside the horizon, an online retry is rejected as too old rather than recreated. Historical import uses a separate privileged path with its own immutable import identity.

### 5.7 Expand-contract migration

Schema rollout is safe for rolling application deployments:

1. expand with nullable/new defaulted columns and new tables;
2. deploy code that dual-writes the legacy and canonical shapes;
3. backfill in bounded primary-key batches; historical event IDs are UUIDv5-derived from notification ID, and unknown catalog values receive named `legacy` metadata;
4. build large indexes concurrently outside a transaction;
5. add check/FK constraints as `NOT VALID`, validate them separately, then enforce `NOT NULL`;
6. deploy code that requires the canonical shape;
7. remove compatibility defaults/adapter only after the defined production observation window.

The test dataset is small, but migration mechanics must remain safe when the same migration pattern is applied to a large production table.

## 6. Notification Command Contract

Producers use one semantic command and never depend on Elasticsearch, Redis, UI routes, or future email providers.

```typescript
interface NotificationCommandV1 {
  eventId: string
  type: NotificationType
  schemaVersion: 1

  recipientId: string
  scope: { kind: 'user'; id: string } | { kind: 'organization'; id: string } | { kind: 'system' }

  actor?: {
    type: string
    id: string
  }

  subject?: {
    type: string
    id: string
  }

  parameters: Record<string, unknown>
  occurredAt: string
  correlationId?: string
  dedupeKey?: string
}
```

Rules:

- `eventId` is stable for one business occurrence and retry.
- `recipientId` is singular. Bounded batch helpers may submit multiple commands.
- unbounded `recipientIds[]` is forbidden in the core contract;
- category, priority, template, allowed channels, retention class, and action resolver come from the catalog;
- payload validation is type-specific;
- producer-provided raw URLs are forbidden;
- producer-provided title/message remains accepted only through a legacy compatibility adapter during migration.

The event fingerprint is SHA-256 over canonical JSON containing `type`, `schemaVersion`, recipient, scope, actor, subject, normalized parameters, normalized `occurredAt`, and `dedupeKey`. Object keys are recursively sorted, timestamps are UTC ISO-8601, and `undefined` values are omitted. `correlationId` is operational context and is excluded so a transport retry can use a new request correlation ID.

Conflict rules:

- same `(eventId, recipientId)` and same fingerprint returns the existing staged/accepted result;
- same `(eventId, recipientId)` with a different fingerprint raises `NotificationEventConflict`;
- same `(recipientId, type, dedupeKey)` with a different event ID raises `NotificationDedupeConflict`;
- no conflict silently merges or overwrites content.

The legacy adapter accepts a stable `eventId` or occurrence key. Calls without one are explicitly `non_idempotent_legacy`, generate a new event ID, and increment a migration metric; they do not inherit the retry guarantee. The adapter can be removed only after zero production use for 30 consecutive days and a complete producer inventory check.

## 7. Canonical Catalog

One backend-owned catalog defines:

```text
type
schemaVersion
category
priority
templateKey
templateVersion
allowedChannels
payloadSchema
actionResolver
retentionClass
preferencePolicy
```

Initial `allowedChannels` is:

```text
["in_app"]
```

Generated/public types are consumed by frontend applications. Frontend must still render unknown values with a default icon, neutral category, plain title/message, and no unsafe action.

Catalog behavior:

- reject unknown producer types on new canonical writes;
- preserve and render legacy database rows with unknown types;
- version payload schemas;
- never index arbitrary parameter keys dynamically in Elasticsearch;
- distinguish mandatory system/security notifications from user-configurable categories.

## 8. Transaction And Acceptance Semantics

### 8.1 Transaction-aware writer

The API distinguishes staging inside a caller-owned transaction from committing a standalone notification:

```typescript
notificationPublicApi.stage(command, { trx }): Promise<StagedNotification>
notificationPublicApi.accept(command): Promise<AcceptedNotification>
```

`stage` never claims durability. It writes the canonical notification, recipient state, tombstone when applicable, and outbox rows through the supplied transaction and returns `status: "staged"`. The owning business service establishes acceptance only when its outer transaction commits.

`accept` opens, owns, and commits a PostgreSQL transaction. It returns `status: "accepted"` only after the commit acknowledgement.

Transactional best-effort writes are not supported in the initial core. Required notification staging failure aborts the owning business transaction. Transitional best-effort producers run after commit through the explicitly named legacy standalone adapter, report `accepted`, `failed`, or `ambiguous`, and are measured. They must never describe a failed write as accepted.

### 8.2 Failure policy

Before commit:

- command/catalog validation happens before opening or using a database transaction;
- canonical notification/outbox failure causes the owning transaction to fail for required notification types;
- no code catches a PostgreSQL statement error and continues using the aborted transaction;
- savepoint-based best-effort behavior is deferred until it has a separate tested contract.

After commit:

- Elasticsearch, Redis, and realtime failure never changes the business result;
- failure remains in durable projection state for retry/replay;
- an API must not report business failure solely because projection failed.

### 8.3 Producer migration

Every existing producer is classified:

- transactional required;
- transactional best-effort;
- standalone post-commit transitional;
- in-process event transitional.

Migration is complete only when no required producer creates notifications after committing its business transaction.

## 9. Durable Outbox

Create `notification_outbox`:

- `id uuid primary key`
- `sequence bigint generated always as identity unique`
- `notification_id uuid null`
- `operation_id uuid not null`
- `source_event_id uuid not null`
- `event_kind text not null`
- `revision bigint not null`
- `projection_revision bigint not null`
- `destination text not null`
- `partition_key text not null`
- `recipient_id uuid not null`
- `recipient_state_revision bigint not null`
- `payload jsonb not null`
- `status text not null default 'pending'`
- `available_at timestamptz not null default now()`
- `attempt_count integer not null default 0`
- `locked_by text null`
- `locked_until timestamptz null`
- `lease_token uuid null`
- `processed_at timestamptz null`
- `dead_lettered_at timestamptz null`
- `last_error_class text null`
- `last_error_message text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Allowed initial durable destinations:

- `feed_search`;
- `unread_cache`.

One logical notification mutation creates one row per required destination. A failing Redis delivery therefore cannot prevent an Elasticsearch delivery, and neither can affect the already committed business result. Redis is still derived state: delivery may be rebuilt or reconciled from PostgreSQL at any time.

Realtime Pub/Sub is not a durable destination. Feed invalidation follows successful `feed_search`; count invalidation follows successful `unread_cache`. Either signal may be lost, so reconnect, focus refresh, and bounded polling restore client state.

Required uniqueness:

```text
unique(destination, partition_key, projection_revision)
```

Allowed statuses are exactly `pending`, `leased`, `processed`, `dead_letter`, and `discarded`.
`discarded` is a terminal operator disposition, never a worker outcome: it requires an authorized
actor, a reason, exact bounded IDs, immutable audit evidence, and projection proof for any
tombstone. `partition_key` is the notification ID for a feed job and the recipient ID for an unread
aggregate job. `projection_revision` is notification revision for `feed_search` and recipient-state
revision for `unread_cache`. A repeated mutation therefore conflicts with its existing job, while
create → read → delete produces distinct revisioned jobs. `payload` contains only the bounded
destination contract: feed identity/tombstone context or absolute unread count plus recipient-state
revision. Full arbitrary producer parameters and secrets are forbidden.

Worker behavior:

1. claim a bounded ordered batch using `FOR UPDATE SKIP LOCKED`;
2. set lease owner, a new immutable lease token, lease expiry, and increment attempt;
3. for `feed_search`, load the latest full canonical notification snapshot, or derive a tombstone if it no longer exists;
4. for `unread_cache`, apply the absolute unread count only when `recipient_state_revision` is newer;
5. project idempotently;
6. mark the exact job processed;
7. retry transient failures with exponential backoff and jitter;
8. move poison jobs to `dead_letter` after configured attempts;
9. allow replay by resetting selected jobs;
10. reclaim expired leases after worker crash.

Every ACK, retry, dead-letter, and heartbeat update must match `(id, lease_token)` and a non-expired lease. A stale worker that resumes after another worker reclaims the row cannot change its status. Handlers renew at the configured heartbeat interval and stop work when fencing renewal fails.

Deleting processed jobs is a retention operation, not part of successful processing.

DLQ replay emits an append-only enterprise audit event with actor, reason, selector, affected
outbox IDs/count, previous status, resulting status, and timestamp. This includes a zero-match
attempt so that an operator cannot perform an unaudited selector probe. Replay authorization is
restricted to the notification-operations role. Unresolved DLQ evidence is retained indefinitely;
successfully replayed work becomes normal processed work, while explicitly discarded work enters
the processed-work retention window.

Bulk mutation lock order is fixed:

1. lock `notification_recipient_states`;
2. lock matching notification rows by ID;
3. apply canonical mutations;
4. increment recipient-state revision once;
5. append one `unread_cache` aggregate job;
6. append one `feed_search` job per changed/deleted notification.

Concurrent create, mark-all, delete-all, and mark-one operations use the same lock order.

## 10. Elasticsearch Projection

### 10.1 Index topology

Use regular versioned indices:

```text
suar_notifications_feed_v000001
suar_notifications_read
suar_notifications_write
```

Do not use a data stream because notification documents are updated in place.

### 10.2 Document identity and mapping

- `_id = notificationId`;
- explicit mapping with `dynamic: strict`;
- custom routing may use recipient/scope after shard-hotspot tests;
- arbitrary parameters are stored disabled/non-indexed or excluded;
- `metadata` is fail-closed to `null` until a catalog type declares an explicit validated public
  allowlist; any future allowlisted value is stored with indexing disabled;
- document includes `revision` and `projectionVersion`;
- old revision must never overwrite a newer document;
- `deleted` and `deletedAt` form a content-free projected tombstone;
- indexing uses strict Elasticsearch `external` versioning/fencing from canonical `revision`; a `409 version_conflict_engine_exception` for an equal or older replay is a successful stale/no-op outcome.

Projection document:

```text
notificationId
eventId
recipientId
scopeType
scopeId
organizationId
type
schemaVersion
category
priority
state
title
body
relatedEntityType
relatedEntityId
action
metadata
occurredAt
createdAt
updatedAt
readAt
revision
projectionVersion
deleted
deletedAt
```

### 10.3 Write behavior

- use bulk indexing;
- inspect the top-level `errors` flag and every item;
- retry only failed items;
- avoid per-document `refresh: true` and `refresh: wait_for`;
- use deterministic full-snapshot upserts;
- emit projection lag and failure metrics;
- keep the projected tombstone until the durable deletion-fence retention conditions are met.

### 10.4 Feed behavior

- mandatory filter by authenticated `recipientId`;
- target contract: optional organization/scope/category/state/priority filters; the current runtime
  exposes only recipient and unread filters, so these remain open until implemented and parity-tested;
- sort by `createdAt DESC, notificationId DESC`;
- paginate with backend-neutral `search_after` values derived from `(createdAt, notificationId)`;
- do not embed Elasticsearch PIT state in the public cursor;
- do not compute exact total for navbar/latest feed;
- keep PostgreSQL fallback behind a circuit breaker, per-instance bulkhead, and mandatory-main-Redis
  cross-replica lease budget. Redis server time and atomic expiry cleanup prevent application-clock
  skew; a live owner renews its lease and TTL reclaims only crashed owners. Coordinator failure is
  fail-closed. The lease must never use the evictable cache plane. Target-environment
  capacity/storm/partition evidence remains a production gate;
- prohibit client-controlled recipient filters.

### 10.5 Rebuild and cutover

Provide:

- index bootstrap;
- backfill;
- full rebuild into a new versioned index;
- atomic alias swap;
- reconciliation by IDs/revisions;
- shadow comparison;
- feature-flagged read cutover;
- rollback to PostgreSQL.

The rebuild algorithm is:

1. create the new physical index and a durable `notification_projection_targets` row, then record outbox high-watermark `S0`;
2. register the new index as a required secondary feed target for all events after `S0`;
3. keyset-scan current PostgreSQL notifications and retained tombstones into the new index;
4. replay `feed_search` events with `sequence > S0`, using revisions to make overlap harmless;
5. repeat catch-up to a captured watermark until no unprocessed or leased feed job exists at or below it;
6. capture `S1`, replay through `S1`, run full ID/revision reconciliation, and stop at
   `ready_for_promotion`; rebuild never changes live aliases;
7. require an explicit authorized promotion for the exact run and target, then repeat the `S1`
   catch-up and report-only reconciliation so stale approval evidence cannot pass;
8. persist the promotion actor/reason and enter `cutting_over`;
9. take the exclusive notification-writer advisory fence, verify delivery catch-up through a newly
   captured final outbox watermark, move both aliases in one Elasticsearch request while the fence
   is held, and finalize PostgreSQL target state in the same fenced operation;
10. keep the previous target dual-written and rollback-eligible for the configured window, or mark
    alias rollback ineligible.

Immediate rollback always forces PostgreSQL reads. Alias rollback is allowed only when the previous index has remained dual-written or has been caught up and fully reconciled. Merely retaining a stale index is not a rollback strategy.

`notification_projection_targets` stores target ID, physical index, status, `active_from_sequence`, `required_until`, checkpoint sequence, and reconciliation status. `notification_projection_deliveries` stores `(outbox_id, target_id)`, status, attempts, lease/error state, and applied revision. A feed outbox job is processed only when every target required for its sequence has succeeded. A target that already succeeded is not forgotten when another target fails or the worker crashes.

During rebuild, existing events through `S0` are covered by canonical backfill. Events after `S0`
receive durable per-target deliveries. Promotion first requires the target checkpoint through `S1`,
zero pending/leased deliveries at or below `S1`, and full ID/revision reconciliation. Final cutover
then rechecks delivery catch-up through the watermark captured under the writer fence. The old
target remains required until the rollback window closes. Rollback records its actor, reason, time,
and exact source target durably before attempting the alias request; its final alias swap and
PostgreSQL transition use the same exclusive fence and final catch-up check.

## 11. Redis Derived State And Realtime

### 11.1 Unread cache

Redis does not own unread truth.

Preferred value:

```json
{
  "count": 12,
  "revision": 431
}
```

Updates are absolute and version-checked. Blind `INCR`/`DECR` is forbidden because retries are at-least-once.

Logical key format is versioned and Redis-Cluster safe (the cache connection's configured
`suar:cache:` prefix is applied by the runtime):

```text
notifications:v1:recipient:{<recipientUuid>}:unread
```

The physical key is therefore normally
`suar:cache:notifications:v1:recipient:{<recipientUuid>}:unread`. Normal updates and miss
rebuilds use the same Lua compare-and-set operation against recipient-state revision. A revision-0
`{count:0,revision:0}` negative cache covers recipients without a state row. Default TTL is
defined in the implementation limits table.

Redis loss behavior:

- feed remains available;
- unread count falls back to PostgreSQL;
- reconciliation rebuilds Redis;
- Redis outage does not fail notification acceptance.

### 11.2 Realtime

Adonis Transmit SSE is the v1 authenticated client transport. Redis Pub/Sub remains the lossy cross-instance invalidation channel.

```text
notification.feed.changed {
  recipientId,
  notificationId,
  notificationRevision
}

notification.count.changed {
  recipientId,
  recipientStateRevision
}
```

`notification.feed.changed` is published only after a successful `feed_search` projection. On that signal, clients perform at most three feed refreshes at 0 ms, 500 ms, and 1,500 ms to cover Elasticsearch refresh visibility, then stop and rely on focus/reconnect plus 30-second foreground polling. This finite rule also works for delete and out-of-page/filter events.

`notification.count.changed` is published only after a successful `unread_cache` projection. Unread responses include `{ count, recipientStateRevision }`; clients stop early when the advertised recipient-state revision is visible, otherwise use the same bounded three-refresh rule.

Transmit authenticates every subscription, authorizes the recipient channel, revokes it when the session is revoked, sends heartbeats, and applies per-connection backpressure limits. Clients refetch state on:

- reconnect;
- browser focus;
- invalidation receipt;
- bounded polling fallback.

Multi-tab clients synchronize through `BroadcastChannel` or a shared browser-side store.

Redis Streams are not part of the initial core because PostgreSQL outbox already provides durable replay.

## 12. API And Frontend Contracts

### 12.1 Feed

Canonical response uses camelCase consistently:

```text
id
eventId
userId
type
relatedEntityType
relatedEntityId
schemaVersion
category
priority
title
message
isRead
action
metadata
createdAt
updatedAt
readAt
revision
```

Latest and full feed must share one item contract.

Cursor-native Elasticsearch responses do not run an exact count. Their compatibility `total` and
`lastPage` values are lower-bound estimates only and are accompanied by
`totalExact: false`/`totalRelation: "lower_bound"`. PostgreSQL-backed offset responses return
`totalExact: true`/`totalRelation: "exact"`. Clients must drive cursor navigation from
`hasNextPage`/`hasPreviousPage`, never from an estimated last page.

Public `metadata` is fail-closed to `null` in the current contract; arbitrary legacy database
objects never cross the API or enter the active Elasticsearch feed. A future catalog type may
expose only an explicitly allowlisted, size/schema-validated `publicMetadata` shape. PostgreSQL and
Elasticsearch adapters must return the same value and shape.

The version-2 public cursor is backend-neutral and contains a version, direction, immutable
`createdAt`, notification ID, `issuedAt`, `expiresAt`, key ID, and HMAC signature. It is base64url
encoded, expires after 24 hours by default, and provides keyset ordering rather than snapshot
isolation. PostgreSQL and Elasticsearch can continue the same `after` or `before` cursor. The
active signing key has an explicit ID and verification accepts a bounded configured previous-key
ring for rotation. Invalid, expired, wrong-direction, unknown-key, or unverifiable cursors return a
stable restart-required client error; the server never silently restarts at page one. The v2
deployment intentionally invalidates any pre-v2 cursor, which is safe only as an announced
restart-required API rollout.

### 12.2 Mutations

- mark one as read is idempotent;
- an already-read notification returns success without modifying `readAt` or decrementing unread count;
- mark-all returns affected count/revision internally;
- unauthorized cross-user mutations remain not-found;
- delete behavior remains current-compatible until the delete lifecycle decision is made;
- mutations create new projection jobs in the same PostgreSQL transaction.

### 12.3 Frontend state

User, organization, and admin shells consume one notification feed store implementation with shell adapters.

The store:

- checks HTTP failures;
- performs reversible optimistic updates or refetches on failure;
- synchronizes page/dropdown/multi-tab state;
- supports unknown types;
- consumes backend action descriptors;
- never guesses a task route from an unrelated entity ID;
- displays degraded-state UI rather than converting failures into an empty successful feed.

## 13. Security And Privacy

- every read/mutation is scoped by authenticated recipient;
- organization filters are server-authorized;
- action descriptors use allowlisted route names and validated parameters;
- arbitrary external URLs are rejected;
- template parameters are allowlisted and size-limited;
- secrets/tokens must never be persisted in parameters or metadata;
- Elasticsearch documents exclude unnecessary PII;
- logs and DLQ errors do not dump full payloads;
- rate limits and fan-out caps prevent notification storms;
- unknown legacy notification types remain inert and non-navigating.

Elasticsearch and outbox field allowlists are explicit. Elasticsearch may contain only the projection fields in §10.2. Outbox may contain only identifiers, versions, absolute count, bounded action descriptor, and tombstone context. Authentication/session tokens, reset links, API keys, payment data, government identifiers, raw request headers, and unrestricted metadata/parameters are prohibited.

Display title/body may contain ordinary user-facing names or user-authored excerpts and are classified as application-confidential. Elasticsearch requires TLS, a notification-index-only service credential, encryption at rest where supported, tenant-filter tests, access audit logs, and deletion/retention controls. Logs, metrics, DLQ errors, and replay audit records never include title/body or arbitrary payloads.

User purge is a privileged canonical workflow: create tombstones, update recipient state, append projection jobs, wait/reconcile projections, then release the user FK and purge content. Direct cascading deletion is forbidden.

## 14. Operating Limits, Observability, And SLO Inputs

Initial engineering limits are versioned configuration with these defaults:

| Limit                                     |                                                       Default |
| ----------------------------------------- | ------------------------------------------------------------: |
| Title                                     |                        240 Unicode characters and 1 KiB UTF-8 |
| Message/body                              |                                                   4 KiB UTF-8 |
| Parameters                                |                                  16 KiB serialized UTF-8 JSON |
| Metadata                                  |                                  16 KiB serialized UTF-8 JSON |
| Action descriptor                         |                                   4 KiB serialized UTF-8 JSON |
| JSON depth / object keys / array length   |                                                   5 / 64 / 50 |
| String inside JSON                        |                                                   2 KiB UTF-8 |
| Feed page default / maximum               |                                                      20 / 100 |
| Synchronous recipient batch               |                                                           100 |
| Outbox claim batch / concurrency          |                                                       100 / 8 |
| Lease / heartbeat / handler deadline      |                                            30 s / 10 s / 25 s |
| Maximum attempts                          |                                                            10 |
| Retry base / cap / jitter                 |                                            1 s / 5 min / ±20% |
| Idle poll                                 |                                                           1 s |
| Elasticsearch bulk maximum                |                       500 documents (1,000 NDJSON actions) or 5 MiB |
| Elasticsearch feed timeout                |                                                        250 ms |
| Redis unread TTL                          |                             5 min, configurable from 1–60 min |
| Processed outbox retention                |                                                       30 days |
| Unresolved dead-letter retention          |             indefinite until replayed or explicitly discarded |
| Tombstone retention                       | at least 90 days and longer than every replay/rollback window |
| Previous-index dual-write rollback window |                     24 hours, configurable from 1 hour–7 days |

Limits are calculated on UTF-8 serialized bytes where a byte size is named. Environment overrides
must remain within validated hard maxima. Content, processed/discarded-work, tombstone,
acceptance-ledger, and retired-index grace windows are fixed policy constants in the current
implementation; they must not be described operationally as configurable until that configuration
exists.

Metrics:

- accepted notifications total/rate;
- duplicate conflicts;
- standalone transitional accepts;
- pending outbox count;
- oldest pending job age;
- projection success/failure/retry/dead-letter rate;
- accepted-to-projected latency;
- Elasticsearch bulk item failures;
- projection revision mismatch;
- shadow-read ID/order/state mismatch;
- Redis counter drift;
- realtime publish/connection failures;
- PostgreSQL fallback rate;
- feed and mutation P50/P95/P99 latency.

The implemented `/metrics/notifications` subset covers process-local feed source/outcome
histograms, Elasticsearch success/failure/circuit-open attempts, and local/global/unavailable
fallback admission outcomes with bounded labels. Acceptance/projection/realtime counters and
production alert wiring remain separate rollout gates.

Initial promotion gates:

- unexplained shadow ID/order/state mismatch: exactly 0 for documents older than the 5-second lag allowance;
- shadow evaluation: at least 10,000 sampled reads over at least 24 hours in the target environment;
- projection p99 lag: at most 5 seconds in steady state;
- ES feed timeout/error rate: below 0.1% over the evaluation window;
- worker sustained throughput: at least 2× measured peak acceptance rate;
- one-hour simulated dependency backlog: drains within 15 minutes after recovery;
- stale revision resurrection and tenant leakage: exactly 0;
- PostgreSQL forced fallback drill: 100% successful requests within the feed API error budget.

Business traffic volume and latency objectives still require owner approval before ES-primary production promotion. Instrumentation and correctness work proceed without those values, but the cutover gate remains closed.

The “accepted notification is not lost” guarantee is conditional on an acknowledged PostgreSQL commit with `synchronous_commit=on`, at least one synchronous standby participating in commit acknowledgement, RPO = 0 for acknowledged transactions, and a failover process fenced at or beyond the acknowledged WAL LSN. Production readiness records topology/RTO, executes an ambiguous-commit retry using the same event ID, and force-fails over immediately after an acknowledged commit while verifying both canonical and outbox rows. A single-node developer database or asynchronous-only replica topology does not satisfy the production durability claim and must advertise its approved non-zero RPO instead.

## 15. Failure Matrix

| Failure                                    | Required behavior                                                |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Process crashes before PostgreSQL commit   | Business and notification roll back                              |
| Process crashes after commit before worker | Outbox remains pending                                           |
| Worker crashes after ES write before ACK   | Retry is idempotent by ID/revision                               |
| ES returns partial bulk failure            | Successful items complete; failed items retry                    |
| Old read event arrives after newer state   | Revision rejects stale overwrite                                 |
| Redis is flushed                           | PostgreSQL/ES feed remains; count rebuilds                       |
| Pub/Sub message is lost                    | Reconnect/focus/refetch restores state                           |
| ES is unavailable                          | Acceptance succeeds; jobs retry; read fallback is bounded        |
| Duplicate business retry                   | Unique event/recipient preserves one canonical row               |
| Retry after canonical hard-delete          | Acceptance ledger returns terminal result and creates no row/job |
| Hard delete precedes projection            | Durable delete/tombstone job removes projection                  |
| Stale upsert resumes after tombstone       | External revision fence preserves the tombstone                  |
| Worker lease expires                       | Another worker reclaims the job                                  |
| Old worker resumes after reclaim           | Lease-token fence rejects its ACK/retry                          |
| Connection is lost after PostgreSQL commit | Retry same event ID resolves accepted vs conflict safely         |

## 16. Testing Strategy

Use TDD for each layer:

- unit tests for catalog, payload validation, action resolution, retry policy, revision comparison;
- repository integration tests for atomic notification/outbox writes and uniqueness;
- transaction tests proving business rollback/commit semantics;
- worker tests for lease, retry, dead-letter, replay, and crash recovery;
- Elasticsearch tests for mapping, aliases, partial bulk failure, revision ordering, rebuild;
- Redis tests for absolute versioned counter updates and rebuild;
- API contract tests for one response shape and error semantics;
- frontend tests for shared state, unknown type, failed mutations, and action routing;
- load tests for feed, outbox worker throughput, and fan-out caps;
- chaos tests for PostgreSQL/Elasticsearch/Redis/process failure.

Required concurrency/fencing cases include stale upsert after tombstone, stale worker ACK after lease reclaim, concurrent create versus mark-all, delete versus mark-read, and an ambiguous commit retry.

Tests must prove failure behavior, not only the happy path.

## 17. Rollout Gates

### Gate A — Canonical core

- catalog and contract active;
- canonical write and outbox atomic;
- required producers no longer create post-commit;
- duplicate/retry tests pass;
- migration reproducibly creates schema.

### Gate B — Projection readiness

- backfill/rebuild/reconcile work;
- bulk partial failures retry;
- stale revisions cannot overwrite;
- projection lag is observable;
- Elasticsearch security, supported version, HA, and recovery plan are approved for the target environment.

### Gate C — Shadow read

- PostgreSQL remains serving path;
- sampled ES comparisons show no unexplained ID/order/state mismatch;
- ES outage and recovery are exercised.

### Gate D — Cutover

- feature flag and rollback tested;
- PostgreSQL fallback protected by the process-local circuit breaker, per-instance bulkhead, and
  cross-replica Redis lease admission; limit sizing and storm behavior remain target-environment
  gates;
- tenant/recipient isolation tests pass;
- target load test passes;
- operational runbook exists.

### Gate E — Redis/realtime

- Redis loss/rebuild tested;
- realtime reconnect/refetch semantics tested;
- no correctness dependency on Pub/Sub delivery.

## 18. Completion Criteria

The Notification Center core is complete only when:

- all existing producers use the approved acceptance path;
- every required transactional producer is atomic with its business mutation;
- no business API fails because Elasticsearch/Redis projection failed after commit;
- retry within the 180-day online idempotency horizon cannot create a duplicate canonical notification, including after hard-delete;
- read/delete/update projection ordering is revision-safe;
- Elasticsearch can be rebuilt from PostgreSQL;
- Redis unread state can be rebuilt from PostgreSQL;
- frontend page/dropdown/multi-tab state converges;
- unknown types do not break rendering or navigation;
- all rollout gates have authoritative test or runtime evidence;
- `gitnexus detect-changes` reports only intended notification-related impact.
