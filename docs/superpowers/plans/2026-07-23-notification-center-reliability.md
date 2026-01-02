# Enterprise Notification Center Reliability Implementation Plan

**Date:** 2026-07-23  
**Status:** Approved for execution  
**Design:** `docs/superpowers/specs/2026-07-23-notification-center-reliability-design.md`  
**Method:** Specification → plan → RED test → minimum GREEN implementation → refactor → failure testing → staged rollout

### Evidence notation

- `[x]` means the behavior exists in the current worktree and has direct source/test or checked-in
  inventory evidence.
- `[ ]` means not implemented, not rerun successfully in the current integration environment, or
  dependent on target-environment/runtime evidence. Code presence alone never closes a production
  rollout or capacity gate.

### Evidence snapshot — 2026-07-24

- Canonical catalog/command, transactional acceptance, revisioned mutations, lease-fenced outbox,
  Elasticsearch/Redis projection adapters, rebuild/reconciliation control plane, durable fan-out,
  and all 24 inventoried runtime producer paths are implemented with focused tests.
- Operational commands exist for outbox/fan-out work, status and audited bounded replay; sanitized
  DLQ listing/disposition; projection rebuild/reconciliation/explicit promotion/rollback; and
  preview/apply retention.
- Pipeline health thresholds, content/work/tombstone/ledger retention, rollback-target retirement,
  retired-index deletion fences, authenticated realtime invalidation, and shared frontend
  convergence logic have focused test evidence.
- Realtime connection-close/backpressure/session scoping, account-status authorization, UID
  uniqueness, notification-owned bounded Redis envelopes, maximum connection age, and
  recipient-indexed local delivery are implemented. Multi-instance/partition/load qualification and
  complete operational metrics remain open.
- Latest focused evidence is notification unit 82/82, notification UI 15/15, notification
  integration 65/65, producer atomicity integration 14/14, and API contract 4/4. The integration
  suite includes real Elasticsearch alias/mapping/external-version/cursor/tombstone behavior and
  real main-Redis global admission Lua behavior. The restored `suar_test` was exercised with the
  running container's credential; no Notification test failed.
- The local migration ledger still contains multiple stale/corrupt historical entries, including
  an old `20260723280000_add_notification_outbox_dlq_administration` row and the removed
  `20260705214500_add_notification_pagination_indexes` row. A full historical migration replay
  stops earlier at the unrelated `create_updated_at_trigger(unknown)` migration. This is a
  release/migration-history blocker, not a failure of the current Notification schema or focused
  Notification suite.
- Side-effect, exception, naming, module-boundary, and public-contract-surface architecture gates
  passed without notification allowlist exceptions.
- Target-environment failure injection, load/capacity qualification, 10,000-read/24-hour shadow
  qualification, PostgreSQL synchronous-standby failover proof, and the final complete regression
  audit remain open.
- Operator procedure: `docs/notifications/notification-center-operations-runbook.md`.

## 1. Delivery Goal

Build a production-ready in-app Notification Center whose accepted writes are durable, idempotent, replayable, observable, and independently scalable.

The completed system must have:

- PostgreSQL as the canonical source of truth;
- canonical notification and outbox intent committed atomically;
- deterministic notification identity and monotonic revisions;
- a lease-based outbox worker with retry, dead-letter, replay, and reconciliation;
- an Elasticsearch feed projection that can be rebuilt and promoted through shadow-read gates;
- Redis unread state and realtime invalidation that are always rebuildable;
- one backend-owned notification catalog and one versioned producer contract;
- consistent API and frontend mutation/error behavior;
- no dependency on Elasticsearch or Redis for accepting a business notification.

## 2. Non-Negotiable Engineering Constraints

- Do not modify an existing symbol before running `gitnexus impact <symbol>`.
- Warn before editing any symbol whose GitNexus blast radius is HIGH or CRITICAL.
- Run `gitnexus detect-changes` before final handoff.
- Preserve unrelated user changes in the dirty worktree.
- Add schema changes through migrations; do not mutate historical applied migrations.
- Keep legacy producer compatibility until all effective producer sites are migrated.
- Never publish an outbox event before its database transaction commits.
- Never use an in-process event or Redis Pub/Sub as a durability boundary.
- Never make a per-notification Elasticsearch refresh request.
- Never treat a successful bulk HTTP response as success without checking item-level results.
- Never let a feed backend failure masquerade as a successful empty inbox.
- Implement each behavior by first running a focused test that fails for the expected reason.

## 3. Target File Structure

Paths may be adjusted after symbol-level impact analysis, but ownership boundaries must remain:

```text
app/modules/notifications/
├── actions/
│   ├── create_notification.ts
│   ├── get_user_notifications.ts
│   ├── mark_notification_as_read.ts
│   └── services/notification_public_api.ts
├── commands/
│   ├── notification_outbox_work_command.ts
│   ├── notification_outbox_replay_command.ts
│   ├── notification_projection_rebuild_command.ts
│   └── notification_projection_reconcile_command.ts
├── constants/
│   └── notification_constants.ts
├── domain/
│   ├── notification_catalog.ts
│   ├── notification_command.ts
│   ├── notification_contract_errors.ts
│   └── notification_revision.ts
├── infra/
│   ├── repositories/
│   │   ├── notification_repository.ts
│   │   ├── notification_outbox_repository.ts
│   │   ├── postgres_notification_repository.ts
│   │   └── postgres_notification_outbox_repository.ts
│   ├── search/
│   │   ├── notification_search_document.ts
│   │   └── elasticsearch_notification_projection.ts
│   └── realtime/
│       └── redis_notification_state.ts
├── services/
│   ├── accept_notification.ts
│   ├── notification_outbox_worker.ts
│   ├── notification_projection_service.ts
│   ├── notification_projection_reconciler.ts
│   └── notification_feed_service.ts
└── tests/backend/
    ├── unit/
    ├── integration/
    └── contract/

database/migrations/
└── <timestamp>_add_notification_center_reliability.ts

inertia/
├── shared/notifications/
│   ├── notification_contract.ts
│   ├── notification_actions.ts
│   └── notification_store.svelte.ts
└── apps/{user,org,admin}/modules/notifications/
```

## 4. Phase A — Contract, Catalog, And Canonical Persistence

### Task A1 — Freeze the behavioral contract with RED tests

- [x] Add unit tests for `NotificationCommandV1` validation:
  - stable UUID `eventId`;
  - supported schema version;
  - singular recipient;
  - known catalog type;
  - type-specific parameter schema;
  - producer raw URL rejection;
  - payload-size limits;
  - stable normalization output.
- [x] Add catalog tests proving every canonical type has category, priority, template, version, channels, payload schema, action resolver, retention class, and preference policy.
- [x] Add compatibility tests proving an unknown historical type remains renderable but cannot be newly produced.
- [ ] Add a generated/shared contract drift test for backend and frontend values.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit \
  --files app/modules/notifications/tests/backend/unit/notification_command.spec.ts \
  --files app/modules/notifications/tests/backend/unit/notification_catalog.spec.ts
```

Expected RED reason: the canonical command, validation, and catalog modules do not exist.

GREEN acceptance:

- tests fail on invalid semantic input before persistence;
- no producer can select a template, priority, retention class, or arbitrary URL;
- frontend types are derived from or contract-tested against the canonical catalog.

### Task A2 — Implement the catalog and versioned command

- [x] Inventory every runtime notification type and classify it as canonical, legacy alias, or orphaned historical value.
- [x] Implement the backend-owned catalog without deleting user-owned type changes.
- [x] Implement strict command parsing and normalization.
- [x] Add a legacy adapter for existing `{ user_id, title, message, ... }` producers.
- [ ] Require a stable event ID/occurrence key for idempotent legacy calls; classify and count calls without one as `non_idempotent_legacy`.
- [ ] Emit a metric/log when the legacy adapter is used so migration progress is measurable.
- [x] Document aliases and reject ambiguous mappings.
- [ ] Require zero production legacy usage for 30 consecutive days before adapter removal.

Refactor verification:

```bash
pnpm exec eslint app/modules/notifications
node --import=@poppinss/ts-exec bin/test.ts unit \
  --files app/modules/notifications/tests/backend/unit/notification_command.spec.ts \
  --files app/modules/notifications/tests/backend/unit/notification_catalog.spec.ts
```

### Task A3 — Add canonical schema and durable outbox

- [ ] Use an expand-contract rollout: nullable/default-compatible expansion, dual-write deployment, bounded backfill, concurrent indexes, separately validated constraints, then contract enforcement.
- [x] Add notification canonical columns, defaults, and check constraints from the design.
- [x] Backfill existing rows deterministically:
  - unique `event_id`;
  - `event_fingerprint` derived from the normalized historical snapshot;
  - `schema_version = 1`;
  - `revision = 1`;
  - catalog-derived values when safely known;
  - explicit legacy defaults otherwise.
- [x] Add `unique(event_id, user_id)`.
- [x] Add `unique(user_id, type, dedupe_key) where dedupe_key is not null`.
- [x] Preserve current hard-delete compatibility.
- [x] Add `notification_tombstones` as the persistent delete-revision fence.
- [x] Add `notification_acceptance_ledger` so event fingerprint, dedupe identity, notification ID, and terminal state survive content deletion for the 180-day online idempotency horizon.
- [ ] Add the canonical user FK with `ON DELETE RESTRICT`; route user erasure through a tested purge workflow.
- [x] Create `notification_recipient_states` with canonical unread count and a monotonic per-recipient revision.
- [x] Backfill recipient counts from existing canonical notifications.
- [x] Create `notification_outbox` with:
  - deterministic event identity;
  - monotonic `sequence` high-watermark;
  - aggregate ID and revision;
  - event type and version;
  - destination;
  - recipient ID, absolute unread count, and recipient-state revision;
  - bounded JSON payload;
  - status;
  - attempts;
  - `available_at`;
  - lease owner and expiry;
  - immutable lease token;
  - last error class and sanitized message;
  - processed/dead-letter timestamps;
  - creation/update timestamps.
- [x] Make outbox uniqueness `(destination, partition_key, projection_revision)`, using notification revision for feed and recipient-state revision for unread.
- [x] Add `notification_projection_targets` and `notification_projection_deliveries` for durable per-index delivery/checkpoints during rebuild and rollback.
- [x] Add claim and maintenance indexes.
- [ ] Build large indexes concurrently and validate new constraints separately.
- [x] Update the schema snapshot only after the migration is verified.
- [ ] Add migration tests for empty and populated databases.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_schema.spec.ts
```

Expected RED reason: canonical columns, constraints, and outbox table do not exist.

Migration verification:

```bash
pnpm run db:test:migrate
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_schema.spec.ts
```

GREEN acceptance:

- populated legacy rows survive migration;
- duplicate `(event_id, user_id)` is rejected;
- invalid revisions and invalid read timestamp states are rejected;
- recipient unread state equals the canonical unread-row count after backfill;
- UUIDv5 historical IDs and named legacy defaults are deterministic across reruns;
- tombstones contain no notification content;
- acceptance-ledger retry identity survives canonical hard-delete;
- outbox rows expose enough state for lease, retry, DLQ, and replay;
- old-version application inserts remain valid during the expansion window.

### Task A4 — Implement atomic acceptance and idempotency

- [x] Extend repository contracts with transaction-aware canonical insert/update and outbox append.
- [x] Implement `stage(command, { trx })` returning `status: "staged"` without claiming durability.
- [x] Implement `accept(command)` that owns/commits a local transaction and returns `status: "accepted"` only after commit acknowledgement.
- [x] Pre-validate catalog/command data before entering a transaction.
- [x] Do not catch a PostgreSQL statement failure and continue an aborted transaction.
- [x] Insert canonical row and outbox intent in the same transaction.
- [x] Update canonical recipient unread state in that same transaction.
- [x] Append independent `feed_search` and `unread_cache` destination jobs so one projection cannot block the other.
- [x] Treat a repeated `(event_id, recipient_id)` as an idempotent replay and return the canonical row.
- [x] Reject reuse of one event identity with a materially different payload.
- [x] Preserve the current public API through the legacy adapter during producer migration.
- [x] Ensure post-commit projection work is not performed in the request transaction.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/accept_notification.spec.ts
```

Required tests:

- standalone accept persists exactly one canonical row and exactly two pending jobs (`feed_search`, `unread_cache`);
- staged notification plus outer rollback persists no canonical, recipient-state, tombstone, or outbox row;
- staged return is never labeled accepted before the outer commit;
- repeated identical delivery returns the original row without a second outbox intent;
- accept → delete → retry same event/fingerprint returns the terminal result and creates no row/job;
- repeated identity with different content fails deterministically;
- dedupe-key conflict with another event ID raises the explicit conflict and never merges;
- concurrent duplicate delivery results in one canonical row;
- online occurrences older than 180 days or more than 5 minutes in the future are rejected by the defined clock policy;
- connection loss after an ambiguous commit is safely resolved by retrying the same event ID;
- Elasticsearch and Redis outages do not fail acceptance.

GREEN acceptance:

- “accepted” has the exact transactional meaning defined by the spec;
- no observable dual-write window exists.

## 5. Phase B — Mutation Semantics And Durable Processing

### Task B1 — Make notification mutations monotonic and idempotent

- [x] Run impact analysis for read, read-all, delete, and delete-all symbols.
- [x] Make mark-read preserve the first `read_at` value.
- [x] Increment `revision` only when canonical state changes.
- [x] Append the matching projection intent in the same transaction.
- [x] Use notification revision as feed projection identity and recipient-state revision as unread projection identity.
- [x] Define delete outbox payload as a tombstone containing only identity, recipient, revision, and timestamps.
- [x] Persist the tombstone before deleting canonical content; never use a cascading outbox FK.
- [x] Use one lock order: recipient state, then notification rows.
- [x] For bulk mutation, increment recipient-state revision once, create one aggregate unread job, and create one feed job per changed notification.
- [x] Keep authorization predicates in every mutation query.
- [x] Return a stable result for repeated mutation requests.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_mutation_revision.spec.ts
```

Required tests:

- mark-read twice keeps the original timestamp and revision after the first transition;
- read-all only changes unread rows;
- unauthorized mutation changes nothing;
- delete produces a durable tombstone intent;
- a feed query excludes tombstones;
- revision-1 upsert that resumes after revision-2 tombstone cannot recreate content;
- concurrent create versus mark-all and delete versus mark-read preserve exact count/state.
- create → read → delete produces each revisioned job exactly once; retrying any mutation produces no extra job.

### Task B2 — Implement lease-based outbox claim and processing

- [x] Claim batches with `FOR UPDATE SKIP LOCKED`.
- [x] Assign a unique lease owner, immutable lease token, bounded lease expiry, and heartbeat.
- [x] Process records outside the claim transaction.
- [x] Acknowledge one destination job only when its handler succeeds.
- [x] Retry transient failures with exponential backoff plus jitter.
- [x] Dead-letter permanent failures and exhausted transient failures.
- [x] Reclaim expired leases.
- [x] Fence ACK/retry/dead-letter/heartbeat updates by `(id, lease_token)` and reject updates after lease loss.
- [x] Cap attempts, batch size, payload size, and processing concurrency.
- [x] Sanitize stored errors to avoid secrets and excessive payloads.
- [x] Implement replay by outbox ID/range/error class with an operator reason.
- [x] Make replay auditable and idempotent.
- [x] Emit append-only enterprise audit events for replay actor, reason, selector, affected IDs/count, and before/after status.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_outbox_worker.spec.ts
```

Required tests:

- two workers never process one active lease concurrently;
- crashed work is reclaimed after lease expiry;
- stale worker cannot ACK or retry after another worker reclaims the lease;
- a long-running handler renews its lease and stops when renewal fails;
- transient failure schedules retry;
- permanent mapping/validation failure dead-letters immediately;
- max-attempt failure dead-letters;
- successful retry is acknowledged once;
- replay returns a DLQ row to pending safely;
- poison records do not block later records.

### Task B3 — Add worker and operator commands

- [x] Add continuous worker command with graceful shutdown.
- [x] Add single-pass mode for cron, deployment smoke tests, and tests.
- [x] Add DLQ listing and replay command.
- [x] Add retention/cleanup command for processed jobs, DLQ, tombstones, and old indices with independent policy windows.
- [x] Add health output for oldest pending age, pending count, leased count, retry count, and dead-letter count.
- [x] Add concurrency, batch, lease, retry, and poll settings to validated environment configuration.
- [x] Document one-worker and horizontally scaled deployment modes.

Implemented: `notification:outbox-dlq` provides audited, bounded, sanitized cursor listing and
explicit terminal disposition for irreparable non-tombstone poison rows. Outbox replay is
preview-first and all selectors reject matches above 100 atomically. Preview/apply retention covers
processed/discarded work, successful fan-out jobs, canonical expiry, tombstones, terminal ledger,
rollback-target retirement, and alias-fenced retired-index deletion. Unresolved DLQ remains
indefinite until replay or approved disposition.

Command smoke checks:

```bash
node ace list | rg 'notification:'
node ace notification:outbox-work --once
node ace notification:outbox-status
```

GREEN acceptance:

- SIGTERM stops claiming new work and finishes or releases current leases within the grace window;
- a second worker can be started without coordination outside PostgreSQL;
- operators can inspect and replay failures without editing database rows manually;
- cleanup refuses to remove evidence still needed by replay, rebuild, reconciliation, or rollback.

## 6. Phase C — Producer Migration

### Task C1 — Inventory and classify every effective producer

- [x] Produce a checked-in producer matrix with:
  - source symbol;
  - business transaction present/absent;
  - current notification call before/after commit;
  - current failure behavior;
  - recipient cardinality;
  - canonical type mapping;
  - proposed stable event ID source;
  - migration status.
- [x] Separate actual producer calls from wrappers and internal delegations.
- [x] Identify unbounded fan-out candidates and keep them outside synchronous requests.
- [x] Flag producer paths that swallow business failure after notification failure.

Acceptance:

- the matrix accounts for every effective producer found by GitNexus plus targeted local verification;
- each producer has a deterministic event-ID strategy;
- ambiguous business semantics are recorded, not guessed.

### Task C2 — Migrate transaction-bearing producers

- [x] Run impact analysis for each producer symbol before editing it.
- [x] Move canonical notification acceptance into the existing business transaction.
- [x] Derive `eventId` from a stable business occurrence or persist a generated UUID with that occurrence.
- [x] Remove post-commit direct notification writes only after equivalent atomic tests pass.
- [x] Ensure rollback semantics remain correct.

TDD pattern per producer:

```text
RED: force notification persistence failure and prove business mutation rolls back.
GREEN: accept notification in the caller transaction.
REFACTOR: remove obsolete post-commit/catch behavior.
```

### Task C3 — Migrate non-transactional and bounded batch producers

- [x] Route singular producers through canonical acceptance.
- [x] Use a bounded helper that submits one singular command per recipient.
- [x] Refuse unbounded arrays inside one transaction.
- [x] Use deterministic per-recipient identity.
- [ ] Retain legacy adapter telemetry until its production usage is zero for 30 consecutive days.

Acceptance:

- no effective producer writes `notifications` directly;
- no producer calls Elasticsearch or Redis;
- legacy adapter usage is zero in automated producer coverage and production telemetry for 30 consecutive days before removal.

## 7. Phase D — Elasticsearch Feed Projection

### Task D1 — Define versioned index, aliases, and strict mapping

- [x] Implement a versioned physical index such as `suar_notifications_feed_v000001`.
- [x] Use stable read and write aliases.
- [x] Set `dynamic: strict`.
- [x] Index only query/sort/filter fields.
- [x] Store unbounded parameters/action as non-indexed objects or bounded encoded payloads.
- [x] Fail closed with public `metadata: null`; arbitrary legacy metadata never enters the public
      API or active Elasticsearch feed.
- [ ] Enable non-null public metadata only after each catalog type defines an explicit,
      size/schema-validated allowlist.
- [x] Use deterministic document ID = canonical notification ID.
- [x] Include canonical `revision`.
- [x] Add `deleted`/`deletedAt` content-free tombstone fields and exclude them from feed results.
- [x] Use strict `external` versioning/fencing from canonical revision; reject `external_gte` equal-revision overwrites.
- [x] Implement 30-day processed/discarded-work cleanup, indefinite unresolved-DLQ preservation,
      90-day-minimum tombstones, and a configurable 24-hour default old-index rollback window.
- [x] Reject mappings that would create arbitrary dynamic fields.
- [ ] Assert the exact projection allowlist and prohibited secret/PII classes.

Implemented subset: strict mapping, disabled arbitrary objects, fail-closed public metadata,
revision fencing, processed and explicitly discarded work cleanup, unresolved-DLQ preservation,
90-day tombstones, rollback-target retirement, and alias-fenced retired-index deletion. The
audited administrative DLQ resolution lifecycle is implemented. Named prohibited-data tests and
configuration for currently fixed content/work/tombstone/ledger/retired-index-grace windows remain
open.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_elasticsearch_mapping.spec.ts
```

GREEN acceptance:

- unknown indexed fields fail mapping validation;
- the same canonical row maps to the same document ID;
- sensitive or internal-only fields are absent;
- compatibility is declared between the deployed ES client and cluster.

### Task D2 — Implement revision-safe bulk projection

- [x] Consume outbox upsert and tombstone events.
- [x] Use bulk requests without per-document refresh.
- [x] Inspect every bulk item.
- [x] Classify retryable transport/429/5xx errors separately from permanent mapping/validation errors.
- [x] Prevent a stale event from overwriting a newer revision.
- [x] Project persistent tombstones instead of immediate physical deletes.
- [ ] Record projection latency and error class.

Required tests:

- partial bulk failure retries/dead-letters only failed items;
- out-of-order revisions leave the newest document;
- duplicate upsert is harmless;
- duplicate tombstone is harmless;
- a revision-1 upsert loaded before delete cannot replace a revision-2 tombstone after delete;
- timeout after server-side success is harmless on retry.

### Task D3 — Implement rebuild, reconciliation, and alias cutover

- [x] Create a new physical index.
- [x] Record outbox high-watermark `S0` and register the new physical index as a secondary target.
- [x] Persist target `activeFromSequence`, `requiredUntil`, checkpoint, and reconciliation state.
- [x] Persist one delivery record per required `(outbox, target)` and retain successful target delivery when another target fails.
- [x] Scan PostgreSQL in stable keyset order.
- [x] Bulk project canonical rows with bounded memory.
- [x] Replay all `feed_search` sequences after `S0` until caught up.
- [x] Fence the cutover watermark, capture/replay through `S1`, and run full ID/revision reconciliation.
- [x] Stop rebuild at `ready_for_promotion`; require exact run/target/operator approval and rerun
      catch-up plus report-only reconciliation before cutover.
- [x] Under the exclusive writer fence, verify the final outbox watermark and atomically move the
      read/write aliases only after gates pass.
- [x] Dual-write the previous index during its rollback window; otherwise mark alias rollback ineligible.
- [x] Persist rollback actor/reason/source evidence before the alias attempt and use the exclusive
      final fence for the rollback alias plus PostgreSQL transition.
- [x] Implement delete cleanup for stale projected documents.
- [ ] Implement scheduled reconciliation and repair.

Implemented subset: the operator command reconciles and repairs missing/stale canonical documents,
physically purges bounded extra documents, and blocks revisions ahead of PostgreSQL. Rebuild stops
at `ready_for_promotion`; separate checked-in promote and rollback commands require exact index
confirmation and record operator evidence. Tombstone and retired-index physical cleanup is
proof-gated. Automatic reconciliation scheduling remains open.

Command checks:

```bash
node ace notification:projection-rebuild --dry-run
node ace notification:projection-reconcile --sample
node ace notification:projection-status --actor-id=<authorized-user-uuid>
```

GREEN acceptance:

- rebuild can run while writes continue;
- alias cutover is atomic;
- immediate rollback forces PostgreSQL reads;
- alias rollback is allowed only for a dual-written or caught-up/reconciled previous index;
- reconciliation reports and can repair missing, stale, extra, and revision-mismatched documents.
- worker crash/restart and partial target success cannot advance a target checkpoint past a missing delivery.

### Task D4 — Add shadow-read and guarded promotion

- [x] Keep PostgreSQL as the response source initially.
- [x] Run bounded asynchronous Elasticsearch comparisons for sampled reads.
- [x] Compare ordered IDs, unread state, cursor behavior, and freshness.
- [x] Exclude only expected lag inside the explicit 5-second projection allowance.
- [x] Add runtime modes for PostgreSQL, shadow, and Elasticsearch primary with forced PostgreSQL fallback.
- [x] Add a circuit breaker, per-instance fallback bulkhead, and time budget around ES reads.
- [x] Add Redis-time, atomic cross-replica fallback admission with live-owner renewal, TTL crash
      recovery, and fail-closed coordinator semantics.
- [ ] Record target-environment fallback-storm/load evidence and derive the global lease budget
      from measured PostgreSQL headroom.
- [x] Preserve one signed backend-neutral `(createdAt, id)` cursor across backends; bind it to
      recipient/filter context and do not expose PIT state.

Promotion gates:

- [ ] zero unexplained ID/order/state mismatches older than 5 seconds across at least 10,000 sampled reads and 24 hours;
- [ ] p99 projection lag is at most 5 seconds;
- [ ] stale revision resurrection rate is exactly zero;
- [ ] ES error and timeout rate is below 0.1%;
- [x] PostgreSQL fallback is exercised successfully with real PostgreSQL and main-Redis admission;
- [x] rollback switch is tested.

Elasticsearch is not the primary feed before every promotion gate passes.

## 8. Phase E — Redis Derived State And Realtime

### Task E1 — Implement revisioned absolute unread state

- [x] Store `{ count, revision }`, not blind increments/decrements.
- [x] Use logical key `notifications:v1:recipient:{<recipientUuid>}:unread` on the cache
  connection (physical prefix is deployment-configured, normally `suar:cache:`).
- [x] Use one Lua compare-and-set operation for normal updates and miss rebuilds so older revisions cannot replace newer state.
- [x] Use the 5-minute default TTL.
- [x] Rebuild on miss from the canonical source.
- [x] Negative-cache an empty recipient at revision zero with the same CAS/TTL path.
- [x] Reload canonical recipient state before applying a delayed unread outbox job.
- [x] Invalidate or overwrite after canonical mutations.
- [ ] Add a reconciliation path for sampled users.
- [x] Fall back to PostgreSQL when Redis is unavailable.

RED command:

```bash
CACHE_INTEGRATION_DRIVER=redis node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/notifications/tests/backend/integration/notification_redis_state.spec.ts
```

Required tests:

- duplicate event does not double-change the count;
- out-of-order revision is ignored;
- cache miss rebuilds correctly;
- Redis outage does not break canonical write or feed read;
- eviction followed by rebuild restores correct state.

### Task E2 — Implement realtime invalidation

- [x] Use authenticated Adonis Transmit SSE for v1 clients and Redis Pub/Sub only across server instances.
- [x] Publish `notification.feed.changed` only after `feed_search` success.
- [x] Publish `notification.count.changed` only after `unread_cache` success.
- [x] Include notification and recipient-state target revisions without message content.
- [x] Make clients refetch authoritative state rather than treating Pub/Sub as durable delivery.
- [ ] Return `{ count, recipientStateRevision }` from unread APIs.
- [x] Deduplicate/ignore stale events; refresh feed/count at most at 0 ms, 500 ms, and 1,500 ms, then rely on 30-second foreground polling and focus/reconnect.
- [x] Stop count refresh early when the advertised recipient-state revision is visible; do not require deleted/out-of-page feed items to become visible.
- [x] Apply authorization on subscription channels.
- [x] Revoke subscriptions with sessions, send heartbeats, bound per-connection buffering, and reconnect by refetching feed/count.

Implemented subset: heartbeat, exact authenticated recipient channel, notification-owned bounded
Redis invalidation/revocation envelopes, native-response close fallback, session-scoped logout,
whole-user deactivate/suspend revocation, non-active fallback denial, unique UUID connections,
recipient-indexed local delivery, bounded object-mode queue checks, maximum connection age, and
reconnect refetch exist. Remaining gaps are target-scale/multi-instance soak evidence, per-instance
cap qualification, Redis partition/reconnect-storm drills, and complete realtime operational
metrics/alerts.

The shared feed response currently carries `unreadCount` and `recipientStateRevision`, which lets
the tested store stop a count refresh early. The distinct unread API contract requested above
remains open and is not inferred from frontend test coverage.

Acceptance:

- a disconnected client recovers without missed-notification corruption;
- duplicate and out-of-order signals are harmless;
- no notification message body or sensitive parameter is exposed on a broad channel.

## 9. Phase F — Feed API And Frontend Center

### Task F1 — Normalize backend feed semantics

- [x] Remove redundant offset work from cursor requests.
- [x] Use one total order: `(created_at DESC, id DESC)`.
- [x] Define base64url cursor v2 `{ version, direction, createdAt, id, recipientContextBinding,
issuedAt, expiresAt, keyId, HMAC }` with 24-hour default expiry and bounded key rotation.
- [x] Return a stable restart-required error for invalid/expired cursor; never silently restart page one.
- [x] Return explicit backend-unavailable errors instead of empty-success responses.
- [x] Keep authorization and scope filters identical in PostgreSQL and Elasticsearch.
- [x] Return structured action data resolved by the backend catalog.
- [x] Normalize action serialization and fail closed with public `metadata: null`.
- [ ] Add non-null public metadata only through catalog-owned explicit allowlists and parity tests.
- [ ] Rate-limit bulk destructive/read mutations where appropriate.

RED command:

```bash
node --import=@poppinss/ts-exec bin/test.ts contract \
  --files app/modules/notifications/tests/backend/contract/notification_feed.contract.spec.ts
```

Required tests:

- equal timestamps paginate without duplicates or gaps;
- invalid/expired cursor returns a stable client error;
- the same cursor continues after PostgreSQL/Elasticsearch source fallback;
- fake-clock tests cover immediately before and after cursor expiry;
- backend outage is distinguishable from an empty feed;
- PostgreSQL and Elasticsearch adapters satisfy the same contract;
- PostgreSQL and Elasticsearch adapters return identical sanitized metadata;
- unknown historical type renders through the fallback contract.
- cursor mode marks `total` as a lower bound when Elasticsearch cannot compute an exact count;

### Task F2 — Consolidate frontend state and actions

- [x] Reuse one shared typed notification contract.
- [x] Reuse one state owner for page, dropdown, unread badge, and realtime refresh.
- [x] Preserve app-specific presentation through adapters rather than copied mutation logic.
- [x] Check `response.ok` and parse structured errors on every mutation.
- [x] Apply optimistic changes only with rollback or authoritative refetch.
- [x] Stop guessing URLs from incomplete entity data.
- [x] Consume backend-resolved safe action objects.
- [x] Add unknown-type and no-action fallbacks.
- [x] Reconnect by refreshing feed and unread state.

RED command:

```bash
pnpm exec vitest run \
  inertia/shared/notifications \
  inertia/apps/user/modules/notifications \
  inertia/apps/org/modules/notifications \
  inertia/apps/admin/modules/notifications
```

Required tests:

- page and dropdown cannot diverge after mark-read/delete;
- a failed mutation restores/refetches state and exposes an error;
- unknown type remains visible;
- unsafe or missing action is not navigable;
- duplicate realtime invalidations do not duplicate rows;
- reconnect refreshes authoritative state.

## 10. Phase G — Security, Observability, Failure And Load Qualification

### Task G1 — Add observability and operational alerts

- [ ] Structured logs include event ID, notification ID, recipient ID, correlation ID, revision, outbox ID, attempt, and sanitized error class.
- [ ] Complete the full Notification metric set:
  - acceptance rate/error/latency;
  - duplicate acceptance count;
  - outbox pending/retry/leased/dead-letter counts;
  - oldest pending age;
  - projection success/error/lag;
  - bulk item failures by class;
  - Redis hit/miss/rebuild/fallback;
  - realtime publish errors.
- [x] Expose authenticated low-cardinality Prometheus metrics for feed source/outcome latency,
      Elasticsearch attempt/circuit-open outcomes, and local/global fallback admission.
- [ ] Add a bounded aggregate shadow-divergence counter alongside the existing sanitized
      structured comparison events.
- [x] Define alert thresholds and runbook links.
- [x] Do not put arbitrary recipient or tenant IDs into metric labels; unit and authenticated
      endpoint tests assert their absence.
- [ ] Enforce the exact ES/outbox field allowlists, TLS, least-privilege index credentials, access logging, and named prohibited-data tests.

### Task G2 — Execute failure-injection tests

- [ ] Kill a worker after claim and before acknowledgement.
- [ ] Return Elasticsearch 429, 5xx, timeout, and partial bulk failures.
- [ ] Introduce a permanent mapping failure.
- [ ] Stop Redis during writes and reads.
- [ ] Run duplicate and out-of-order events.
- [ ] Resume a stale upsert after a newer tombstone and resume a stale worker after lease reclaim.
- [ ] Hold projection processing to create controlled lag.
- [ ] Roll back the outer business transaction after notification staging.
- [ ] Drop the client connection around PostgreSQL commit and retry the same event ID.
- [ ] Exercise DLQ replay and reconciliation repair.
- [x] Exercise an ES-primary search failure and forced PostgreSQL fallback with the real
      main-Redis admission script.
- [ ] ACK a transaction with `synchronous_commit=on` and a synchronous standby, force failover fenced at/after its WAL LSN, then verify canonical and outbox rows on the promoted primary.

Acceptance:

- no accepted canonical notification is lost;
- retry does not create duplicate canonical rows;
- stale state cannot overwrite a newer revision;
- poison data is isolated;
- operators can recover without ad-hoc SQL mutation.

### Task G3 — Execute load and capacity tests

- [ ] Benchmark canonical acceptance independently from projection throughput.
- [ ] Benchmark one and multiple outbox workers.
- [ ] Benchmark ES bulk size/concurrency combinations.
- [ ] Benchmark first-page and deep keyset feed reads.
- [ ] Benchmark mark-all-read for realistic high-cardinality users.
- [ ] Measure database connection use, WAL growth, outbox growth, ES indexing pressure, Redis memory, and end-to-end lag.
- [ ] Derive capacity limits from measurements rather than local row count.

Release gates:

- [ ] acceptance p95/p99 within agreed business budget;
- [ ] sustained worker throughput is at least 2× measured peak acceptance rate;
- [ ] a one-hour simulated dependency backlog drains within 15 minutes;
- [ ] no database connection starvation;
- [ ] no ES rejection storm at chosen bulk/concurrency settings;
- [ ] bounded storage growth and documented retention/cleanup.
- [ ] target-environment shadow run includes at least 10,000 sampled reads over at least 24 hours.

### Task G4 — Final verification and change audit

- [x] Run focused notification unit, integration, contract, and UI tests.
- [x] Run architecture boundary checks.
- [ ] A full backend typecheck passed after the Notification changes, but the final worktree rerun
  is now blocked by concurrent unrelated `users/tasks` contract errors
  (`listAssignmentDeliveryFactsV1`, `_contractVersion`, and `TaskAssignmentMetricsRow`). Svelte
  check remains blocked by the workspace's baseline module-resolution/dependency diagnostics
  (6,354 diagnostics across 1,344 files), not by a Notification-specific diagnostic.
- [x] Run lint for touched backend/frontend paths.
- [x] Run the focused Notification integration and contract suites against `suar_test`.
- [x] Run `gitnexus detect-changes`; the worktree contains dozens of changed/new paths, including
  unrelated concurrent changes, so no commit or broad cleanup is safe in this turn.
- [ ] Review the final diff against the producer matrix and design completion criteria.
- [x] Document migration, deployment, rollout flags, rollback, rebuild, reconciliation, DLQ, and incident procedures.
- [ ] Record PostgreSQL `synchronous_commit`, synchronous-standby topology, RPO = 0 for acknowledged transactions, RTO, backup/PITR, ambiguous-commit, WAL-fenced failover, and row-verification evidence.
- [x] Verify processed outbox, DLQ, tombstone, and old-index cleanup policies cannot invalidate replay/rebuild/rollback.

The checked-in runbook documents current commands, invariants, safe defaults, and explicit
production blockers. Bounded DLQ list/preview/disposition, extra-document recovery, explicit
promotion, tested alias rollback, and the audited realtime safety fixes are implemented. This
checklist remains open for production-shaped migration rehearsal, concrete database DR linkage,
target-environment shadow/load/failover evidence, full safe-suite verification, and complete
realtime metrics/alerts.

Commands:

```bash
pnpm run test:unit
pnpm run test:integration:safe
pnpm run test:contract
pnpm run test:ui:runnable
pnpm run check:arch:backend:side-effects
pnpm run check:arch:backend:module-domain-boundary
pnpm run check:arch:backend:public-contract-surface
pnpm run typecheck
node ace notification:projection-status --actor-id=<authorized-user-uuid>
node ace notification:projection-promote --actor-id=<authorized-user-uuid> --run-id=<run-id> \
  --reason="<change approval>" --expected-target-index=<physical-index>
node ace notification:projection-rollback --actor-id=<authorized-user-uuid> \
  --reason="<incident approval>" --expected-current-index=<current-index> \
  --rollback-target-index=<eligible-index>
gitnexus detect-changes
```

## 11. Definition Of Done

Implementation is not complete merely because notifications render in the UI. It is complete only when:

- canonical write and outbox intent are atomic;
- duplicate acceptance and processing are harmless;
- all effective producers use the canonical boundary;
- retry within the 180-day online idempotency horizon, DLQ, replay, rebuild, reconciliation, and rollback have passing tests and operator commands;
- Elasticsearch promotion gates have evidence, with PostgreSQL fallback retained;
- Redis loss cannot corrupt canonical state or prevent core operation;
- backend/frontend catalog and action contracts cannot silently drift;
- API failures are not returned as empty successful feeds;
- observability identifies loss risk, lag, divergence, poison records, and fallback;
- failure and load qualification meet recorded release thresholds;
- `gitnexus detect-changes` shows only expected symbols and execution flows;
- operational documentation is sufficient for an engineer who did not build the subsystem.
