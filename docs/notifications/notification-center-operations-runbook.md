# Notification Center Operations Runbook

**Owner:** Platform / Notification Operations  
**Last reviewed:** 2026-07-24  
**Applies to:** In-app Notification Center only  
**Canonical source:** PostgreSQL  
**Derived systems:** Elasticsearch feed, Redis unread cache, Adonis Transmit SSE  
**Design:** `docs/superpowers/specs/2026-07-23-notification-center-reliability-design.md`  
**Implementation plan:** `docs/superpowers/plans/2026-07-23-notification-center-reliability.md`

## 1. Purpose And Safety Boundary

This runbook is the operator procedure for deploying, monitoring, recovering, rebuilding, and
retaining Notification Center data. It is deliberately conservative:

- PostgreSQL canonical rows, recipient state, acceptance ledger, fan-out state, tombstones, and
  outbox state decide correctness.
- Elasticsearch and Redis are projections. Their failure must not turn an already committed
  business transaction into a failed notification acceptance.
- Transmit/Redis Pub/Sub is lossy invalidation. A missed realtime message is repaired by client
  refetch, focus/reconnect refresh, and bounded foreground polling.
- Operators must use the checked-in commands. Do not update queue, delivery, tombstone, projection
  target, or ledger rows with ad-hoc SQL.
- Replay, rebuild, reconcile, and applied retention require an active user with
  `can_manage_notification_operations` and a specific reason of 10–500 characters.

An accepted notification has one operational meaning: PostgreSQL acknowledged the transaction
containing the canonical notification and its durable projection intents. An Elasticsearch
document, Redis key, log line, or SSE signal does not establish acceptance.

### Current production blockers

This document does not declare the subsystem production-qualified. The rollout procedure below may
be exercised in development/test, but production execution remains blocked until the implementation
plan closes:

- expand/contract migration rehearsal on empty and production-shaped populated databases, including
  bounded backfill, concurrent index creation, constraint validation, abort criteria, and application
  rollback compatibility;
- dated target-environment evidence for multi-instance SSE capacity, subscriber readiness,
  publication failures, local delivery, rejection, and backpressure metrics;
- a concrete production scheduler/owner for retention and reconciliation, plus recovery automation
  for ambiguous partial progress;
- the distinct unread-count API revision contract still listed as open in the implementation plan;
- a distributed fallback admission-control/metrics drill. The current implementation has both a
  per-instance bulkhead and a Redis-time, TTL-recovered cross-replica lease budget on the mandatory
  main Redis plane, but its limits still require target-environment PostgreSQL capacity evidence;
- target-environment failure/load/shadow/failover gates in §14.

An operator must not reinterpret the presence of commands as approval to bypass these gates.

## 2. Correctness Invariants

Stop an operation and escalate if any of these invariants cannot be established:

1. Every required business mutation and its notification/fan-out intent commit in one PostgreSQL
   transaction.
2. One business occurrence and recipient reuse one deterministic event identity.
3. Feed projection is fenced by notification revision; unread cache is fenced by recipient-state
   revision.
4. A job may be acknowledged only by its current, unexpired lease token.
5. A feed outbox job is complete only after every projection target required for its sequence has a
   successful durable delivery.
6. A tombstone is content-free and remains until projection/replay/rollback proof permits purge.
7. A stale or retained Elasticsearch index is never treated as a valid rollback target merely
   because it still exists.
8. Realtime payloads contain identifiers and revisions only, never title, body, arbitrary metadata,
   parameters, credentials, or tokens.

## 3. Production Topology

```text
                         ┌─────────────────────────┐
Clients ── HTTPS/SSE ───>│ Load balancer / proxy   │
                         └───────────┬─────────────┘
                                     │
                          ┌───────────▼─────────────┐
                          │ Web instances (N >= 2) │
                          │ API + Transmit SSE     │
                          └───────────┬─────────────┘
                                      │ canonical transactions
                         ┌────────────▼─────────────┐
                         │ PostgreSQL primary      │
                         │ + synchronous standby   │
                         └──────┬───────────┬───────┘
                                │           │
                ┌───────────────▼───┐   ┌───▼────────────────┐
                │ Fan-out workers N │   │ Outbox workers N   │
                │ targets → canon.  │   │ projection jobs    │
                └───────────────┬───┘   └───┬─────────┬──────┘
                                │           │         │
                                └───────────┘     ┌───▼───────────┐
                                                  │ Elasticsearch │
                                             ┌────▼───────────────┤
                                             │ Redis cache        │
                                             │ unread + bounded  │
                                             │ invalidation bus  │
                                             └────────────────────┘

Redis main: session/security state and cross-instance session-revocation control.
Redis cache: rebuildable unread state and the notification-owned bounded invalidation channel.
Native Transmit Redis transport is disabled; each web instance validates Redis envelopes and writes
only to its local authenticated recipient connections.
```

Recommended process separation:

| Process                    | Horizontal scale                                    | Durability role                                             |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Web/API + Transmit         | Multiple instances                                  | Accepts/stages only through PostgreSQL                      |
| `notification:fanout-work` | One or more                                         | Materializes frozen recipients into canonical notifications |
| `notification:outbox-work` | One or more                                         | Projects canonical state to Elasticsearch and Redis         |
| `notification:retention`   | One scheduled invocation at a time                  | Bounded lifecycle cleanup                                   |
| PostgreSQL                 | HA primary plus synchronous standby for RPO 0 claim | Canonical source and queue coordination                     |
| Elasticsearch              | Production HA cluster                               | Rebuildable feed/search projection                          |
| Redis main/cache           | Production HA deployments                           | Security/session control and rebuildable derived state      |

`FOR UPDATE SKIP LOCKED` and lease-token fencing allow multiple fan-out and outbox workers. Start
with the defaults, then change worker count, batch size, or concurrency only from measured target
environment throughput and dependency headroom.

## 4. Configuration Baseline

The checked-in defaults are:

| Setting                                       |             Default | Validated limit / meaning                           |
| --------------------------------------------- | ------------------: | --------------------------------------------------- |
| `NOTIFICATION_OUTBOX_BATCH_SIZE`              |                 100 | 1–100                                               |
| `NOTIFICATION_OUTBOX_CONCURRENCY`             |                   8 | 1–8                                                 |
| `NOTIFICATION_OUTBOX_LEASE_MS`                |               30000 | 1–300 seconds                                       |
| `NOTIFICATION_OUTBOX_HEARTBEAT_MS`            |               10000 | Less than lease                                     |
| `NOTIFICATION_OUTBOX_HANDLER_DEADLINE_MS`     |               25000 | Less than lease                                     |
| `NOTIFICATION_OUTBOX_MAX_ATTEMPTS`            |                  10 | 1–100                                               |
| `NOTIFICATION_OUTBOX_RETRY_BASE_MS`           |                1000 | Exponential retry base                              |
| `NOTIFICATION_OUTBOX_RETRY_CAP_MS`            |              300000 | Maximum five-minute delay by default                |
| `NOTIFICATION_OUTBOX_POLL_MS`                 |                1000 | 100–60000                                           |
| `NOTIFICATION_FANOUT_MAX_TARGETS`             |               10000 | 1–50000 frozen recipients per job                   |
| `NOTIFICATION_FANOUT_BATCH_SIZE`              |                 100 | 1–100                                               |
| `NOTIFICATION_FANOUT_CONCURRENCY`             |                   8 | 1–8                                                 |
| `NOTIFICATION_FANOUT_LEASE_MS`                |               30000 | 1–300 seconds                                       |
| `NOTIFICATION_FANOUT_MAX_ATTEMPTS`            |                  10 | 1–100                                               |
| `NOTIFICATION_FANOUT_POLL_MS`                 |                1000 | 100–60000                                           |
| `NOTIFICATION_PIPELINE_WARN_AGE_SECONDS`      |                  30 | Warning objective                                   |
| `NOTIFICATION_PIPELINE_FAIL_AGE_SECONDS`      |                 300 | Failed health objective                             |
| `NOTIFICATION_PIPELINE_WARN_PENDING`          |               10000 | Warning queue depth                                 |
| `NOTIFICATION_PIPELINE_FAIL_PENDING`          |              100000 | Failed health queue depth                           |
| `NOTIFICATION_RETENTION_BATCH_SIZE`           |                 100 | Apply command hard maximum 1000                     |
| `NOTIFICATION_FEED_READ_MODE`                 |          `postgres` | `postgres`, `shadow`, or `elasticsearch`            |
| `NOTIFICATION_FEED_FALLBACK_ENABLED`          |              `true` | Bounded PostgreSQL fallback                         |
| `NOTIFICATION_FEED_FALLBACK_MAX_CONCURRENT`   |                  32 | Per-instance PostgreSQL fallback bulkhead           |
| `NOTIFICATION_FEED_FALLBACK_GLOBAL_MAX_CONCURRENT` |              64 | Cross-replica Redis lease budget                    |
| `NOTIFICATION_FEED_FALLBACK_ADMISSION_LEASE_MS` |             10000 | Auto-recovery lease; 1–60 seconds                   |
| `NOTIFICATION_FEED_CURSOR_SECRET`             |           `APP_KEY` | HMAC secret; use a dedicated secret in production   |
| `NOTIFICATION_FEED_CURSOR_KEY_ID`             |           `primary` | Active signing-key identifier                       |
| `NOTIFICATION_FEED_CURSOR_PREVIOUS_KEYS`      |                `{}` | Bounded JSON key ring, at most 10 previous keys     |
| `NOTIFICATION_FEED_CURSOR_TTL_MS`             |            86400000 | 1–7 days; signed expiry survives a later TTL change |
| `NOTIFICATION_FEED_CIRCUIT_FAILURE_THRESHOLD` |                   5 | ES failures before open circuit                     |
| `NOTIFICATION_FEED_CIRCUIT_OPEN_MS`           |               30000 | Default open interval                               |
| `NOTIFICATION_FEED_SHADOW_LAG_ALLOWANCE_MS`   |                5000 | Expected projection lag window                      |
| `NOTIFICATION_FEED_SHADOW_SAMPLE_RATE`        |                 0.1 | 0–1                                                 |
| `NOTIFICATION_PROJECTION_ROLLBACK_WINDOW_MS`  |            86400000 | 1 hour–7 days; default 24 hours                     |
| `NOTIFICATION_UNREAD_CACHE_TTL_SECONDS`       |                 300 | 60–3600; default 5 minutes                          |
| `TRANSMIT_REDIS_ENABLED`                      | `true` outside test | Cross-instance SSE delivery                         |
| `TRANSMIT_PING_INTERVAL_MS`                   |               25000 | 10–60 seconds                                       |
| `TRANSMIT_MAX_CONNECTIONS_PER_USER`           |                   5 | 1–20                                                |
| `TRANSMIT_MAX_BUFFERED_EVENTS`                |                 128 | 16–1024 estimated queued events                     |
| `TRANSMIT_MAX_CONNECTION_AGE_MS`              |              900000 | 1–60 minutes; forces authenticated reconnect        |

Do not increase a failure threshold to silence an incident. A threshold change requires capacity
evidence, an owner, a reason, and a rollback value.

## 5. Deployment Procedure

### 5.1 Pre-deployment

1. Confirm PostgreSQL backups/PITR and the target topology's actual `synchronous_commit`,
   synchronous standby, RPO, and RTO. The design's RPO = 0 claim is invalid on a single node or an
   asynchronous-only topology.
2. Confirm Elasticsearch TLS, notification-index-only credentials, cluster health, disk watermark,
   supported client/cluster versions, snapshot/recovery policy, and capacity for rebuild overlap.
3. Confirm Redis main and cache endpoints, TLS/authentication, memory policy, and HA behavior.
4. Keep `NOTIFICATION_FEED_READ_MODE=postgres`. A deploy is not permission to promote ES reads.
5. Capture:

```bash
node ace notification:fanout-status
node ace notification:outbox-status
node ace notification:projection-status --actor-id=<authorized-user-uuid>
node ace notification:retention
```

6. Record pending/leased/retry/DLQ counts, oldest age, active projection runs, aliases, and current
   physical index in the change record.

### 5.2 Rollout order

1. After the migration rehearsal gate above has passed, apply the approved expand-compatible
   database migrations. If the target has not recorded the backfill/constraint/rollback evidence,
   stop before this step.
2. Deploy web instances with feed mode still `postgres`.
3. Run one bounded smoke pass:

```bash
node ace notification:fanout-work --once
node ace notification:outbox-work --once
```

4. Start continuous fan-out workers.
5. Start continuous outbox workers.
6. Verify `/health` with the operations API key, scrape `/metrics/notifications` with the distinct
   metrics collector key, and inspect the `notification_pipeline` component.
7. Create a canary business occurrence and verify this chain:

```text
business row
→ canonical notification / ledger / recipient state
→ processed fan-out target when applicable
→ processed feed_search and unread_cache jobs
→ ES document and Redis revision
→ authenticated client refetch
```

8. Observe at least one lease interval plus the normal projection lag objective before completing
   the deployment.

### 5.3 Deployment rollback

Application rollback is safe only while the older version remains compatible with the expanded
schema and the canonical contract. Do not roll back across a schema-contract migration that made
legacy columns or tables unavailable.

If the new release affects reads, force `NOTIFICATION_FEED_READ_MODE=postgres` first. Keep workers
running unless they are the confirmed source of corruption; stopping them creates backlog but does
not undo accepted notifications.

### 5.4 Read-path capacity model

Elasticsearch reduces PostgreSQL load only for page-1 and signed `after`/`before` cursor windows
when `NOTIFICATION_FEED_READ_MODE=elasticsearch` and the circuit is healthy. Numeric offset
requests with `page > 1` intentionally use PostgreSQL for compatibility. Shadow mode also reads
PostgreSQL first and compares Elasticsearch asynchronously, so it is a qualification mode, not an
offload mode.

Unread count on an Elasticsearch feed is read from Redis with eventual consistency. A cache miss,
Redis error, PostgreSQL feed read, or PostgreSQL fallback uses canonical PostgreSQL unread state
and refreshes the cache best-effort. Acceptance, recipient state, outbox coordination, retention,
and all fallback paths still require PostgreSQL.

Elasticsearch cursor responses and Elasticsearch-to-PostgreSQL fallback responses do not compute
exact totals. Compatibility `total`/`lastPage` values are lower bounds and are marked
`totalExact=false`/`totalRelation=lower_bound`; clients must use cursor
`hasNextPage`/`hasPreviousPage`, not a guessed last page.

The feed circuit breaker remains process-local. PostgreSQL fallback is protected first by a
per-instance bulkhead and then by a main-Redis sorted-set lease budget shared by all replicas. The
Lua acquisition uses Redis server time, removes expired owners atomically, fails closed when
coordination is unavailable, renews an owned lease while the read remains active, and releases
best-effort after the read. TTL recovers a crashed owner; losing renewal is a warning and the local
bulkhead remains active. Capacity qualification must still derive the global limit from PostgreSQL
pool/headroom and include fallback request-rate, Redis-partition, event-loop-stall, and recovery
drills; do not enable ES-primary based on focused tests alone.

Scrape `/metrics/notifications` on every web replica. Aggregate
`suar_notification_feed_reads_total`, `suar_notification_feed_read_duration_seconds`,
`suar_notification_feed_search_total`, and
`suar_notification_feed_fallback_admission_total`. The endpoint uses the dedicated
`METRICS_API_KEY`; it contains only bounded source/outcome labels and no recipient/tenant IDs.

### 5.5 Cursor key rotation

Cursor rotation is a two-phase configuration change:

1. generate a new dedicated HMAC secret and deploy it as
   `NOTIFICATION_FEED_CURSOR_SECRET` with a new `NOTIFICATION_FEED_CURSOR_KEY_ID`, while placing
   the previous `(keyId, secret)` in `NOTIFICATION_FEED_CURSOR_PREVIOUS_KEYS`;
2. wait at least the maximum cursor TTL plus deployment skew before removing the previous key.

The verification ring is bounded to ten previous keys. A TTL change does not invalidate already
signed cursors; their embedded expiry remains authoritative. The v2 cursor rollout intentionally
invalidates pre-v2 cursors, so announce a restart-required client refresh and deploy all readers
compatibly before switching traffic.

## 6. Routine Operations

### 6.1 Status and health

```bash
node ace notification:fanout-status
node ace notification:outbox-status
node ace notification:projection-status --actor-id=<authorized-user-uuid>
node ace notification:retention
```

The status commands return exit code `2` when dead-letter/operator intervention is present. The
projection status command also returns `2` for alias cardinality mismatch, aliases that do not
resolve to the single PostgreSQL primary target, or a missing/ambiguous primary target.
Retention without `--apply` is read-only.

The `notification_pipeline` health check reports low-cardinality metadata:

- pending, leased, retry-pending, dead-letter, and oldest pending age for outbox and fan-out;
- active/completed-with-errors fan-out jobs;
- due retention work;
- tombstones awaiting projection proof;
- expired rollback targets and retired physical indices awaiting deletion.

Interpretation:

| State   | Condition                                                                                | Operator response                                                                    |
| ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| OK      | Depth/age below warning and no operator-action flag                                      | Continue observation                                                                 |
| Warning | Age ≥ 30 s, depth ≥ 10,000, any DLQ/completed-with-errors, or blocked retention evidence | Investigate promptly; warning does not by itself justify restarting healthy web pods |
| Failed  | Age ≥ 300 s, depth ≥ 100,000, or the health reader cannot inspect state                  | Page on-call; protect dependencies and restore worker progress                       |

Thresholds use configured values, not necessarily the defaults shown above. Dead letters produce a
warning rather than deliberately making application availability depend on poison data.

### 6.2 Worker lifecycle

Continuous mode:

```bash
node ace notification:fanout-work
node ace notification:outbox-work
```

Bounded diagnostic mode:

```bash
node ace notification:fanout-work --once --batch-size=10 --concurrency=1
node ace notification:outbox-work --once --batch-size=10 --concurrency=1
```

On `SIGTERM`/`SIGINT`, workers stop claiming new batches. The lease model recovers work from a
process that exits after claim. Never run database scripts to “unlock” a lease; allow expiry and
fenced reclaim unless code/database analysis proves a different incident.

Scale in this order:

1. Verify ES/Redis/PostgreSQL are healthy and no permanent error dominates.
2. Add worker replicas.
3. Re-measure database connections, Elasticsearch rejections, Redis latency, WAL, queue drain rate,
   and end-to-end projection lag.
4. Only then consider batch/concurrency changes within validated limits.

### 6.3 Command exit semantics

| Command                      | Exit `0`                                                            | Exit `1`                                                | Exit `2`                                       |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| fan-out/outbox status        | No reported DLQ condition                                           | Boot/query failure                                      | DLQ or completed-with-errors needs attention   |
| projection status            | Both aliases and the single PostgreSQL primary resolve to one index | Boot/query failure                                      | Topology mismatch or ambiguous primary         |
| fan-out/outbox work `--once` | Batch has no newly dead-lettered/lease-lost work                    | Iteration failure, dead-letter, or lease loss           | Not used                                       |
| fan-out replay               | Authorized replay transaction completed, including zero matches     | Invalid/unauthorized input or failure                   | Not used                                       |
| outbox DLQ/replay            | Bounded audited preview or applied operation                        | Invalid/unauthorized input or failure                   | Preview proves selector exceeds 100 rows       |
| projection rebuild           | Dry-run or target is ready for explicit promotion                   | Validation/runtime failure                              | Waiting for catch-up or reconciliation blocked |
| projection promote/rollback  | Idempotent alias operation completed                                | Invalid, unauthorized, stale, expired, or unsafe state  | Not used                                       |
| projection reconcile         | Reconciliation passed                                               | Invalid/unauthorized input or runtime failure           | Unresolved mismatch                            |
| retention preview/apply      | Preview or all categories completed                                 | Invalid/unauthorized input or any later category failed | Not used                                       |

Capture JSON/stdout, stderr, exit code, UTC timestamp, deployed revision, and command arguments with
secrets omitted. Exit `0` with zero replay matches is not recovery proof.

## 7. Fan-Out Incident Procedure

Fan-out is upstream of canonical acceptance for high-cardinality recipient snapshots. Its target
status means:

- `pending`/retry: frozen recipient still needs canonical acceptance;
- `leased`: one worker owns the current lease;
- `processed`: canonical notification and projection jobs committed with the target ACK;
- `dead_letter`: canonical acceptance did not complete for that target;
- completed-with-errors job: at least one target requires operator action.

When fan-out age/depth grows:

1. Run `notification:fanout-status`.
2. Check PostgreSQL availability/locks/connections and worker logs by sanitized error class.
3. Determine whether the error is transient or permanent. Do not replay a permanent payload/catalog
   failure before deploying its correction.
4. If healthy work exists behind poison work, keep workers running; claims are bounded and poison
   targets do not have to block the queue.
5. After the cause is corrected, replay the narrowest selection:

```bash
node ace notification:fanout-replay \
  --actor-id=<authorized-user-uuid> \
  --reason="INC-1234 corrected catalog mapping and verified canary" \
  --ids=<target-uuid>
```

Alternative bounded selectors are `--job-id`, `--from-sequence`/`--to-sequence`, and
`--error-class`. An explicit list is limited to 100 IDs. Prefer ID or job selectors over a broad
error-class replay.

After replay, confirm audit creation, falling DLQ count, processed targets, canonical notifications,
and new outbox work.

Do not recreate the audience. The durable job's normalized template and recipient snapshot are the
replay input. A changed snapshot/template for the same source identity is a conflict by design.

## 8. Outbox And DLQ Procedure

Outbox destinations are independent:

- `feed_search` loads the latest canonical snapshot/tombstone and projects it to every required ES
  target;
- `unread_cache` applies an absolute count only if its recipient-state revision is newer.

When outbox age/depth grows:

1. Run `notification:outbox-status`.
2. Separate failures by destination and sanitized error class.
3. For ES: inspect cluster health, disk watermark, bulk rejections, mapping errors, aliases, target
   deliveries, and network timeout rate.
4. For Redis: inspect cache endpoint health, memory/eviction, Lua execution, timeout rate, and
   authentication/TLS.
5. Keep acceptance and business APIs running if PostgreSQL is healthy. Projection outage is not
   canonical loss.
6. After fixing the cause, list only sanitized DLQ metadata:

```bash
node ace notification:outbox-dlq \
  --actor-id=<authorized-user-uuid> \
  --error-class=mapping_rejected \
  --limit=50 \
  --json
```

Continue with `--after-sequence=<nextAfterSequence>`. Optional filters are `--ids`,
`--from-sequence`, `--to-sequence`, `--error-class`, and `--destination`. Pages are limited to
100 rows and never expose recipient ID, payload, stored error message, title/body, metadata, or
parameters.

7. Preview the exact replay selector. Replay is preview-only unless `--apply` is supplied:

```bash
node ace notification:outbox-replay \
  --actor-id=<authorized-user-uuid> \
  --reason="INC-1234 restored ES capacity and validated bulk canary" \
  --ids=<outbox-uuid>
```

If the preview returns `has_more=true`/exit `2`, narrow the selector. Every selector, including
sequence and error-class selectors, is fenced at 100 matching rows. After reviewing the preview,
repeat the same command with `--apply`.

After replay, verify:

- replay audit is immutable and contains no notification content;
- rows return to pending once;
- stale/equal ES revisions are harmless;
- absolute Redis count/revision converges;
- oldest pending age and DLQ count fall.

Never delete an unresolved DLQ row to make health green. Current retention keeps unresolved DLQ
evidence indefinitely; after successful replay it becomes processed and enters the normal
processed-work window.

For an irreparable poison record, obtain business-owner/change approval and use explicit IDs only:

```bash
node ace notification:outbox-dlq \
  --actor-id=<authorized-user-uuid> \
  --ids=<outbox-uuid> \
  --discard \
  --reason="INC-1234 source contract is irreparable and owner approved discard" \
  --confirmation=DISCARD
```

Disposition is atomic for at most 100 unique UUIDs, preserves immutable audit evidence, records the
operator/reason on the row, and moves the row to `discarded`. A notification tombstone cannot be
discarded before projection proof. Resolved discarded work enters the normal 30-day processed-work
retention window; unresolved DLQ remains indefinite. Fan-out replay also rejects, rather than
partially processing, selectors that match more than 100 targets.

## 9. Elasticsearch Rebuild, Cutover, And Rollback

### 9.1 Preconditions

- Keep client reads on PostgreSQL or approved shadow mode.
- Ensure no unresolved feed DLQ affects the intended watermark.
- Ensure enough disk for old and new physical indices plus merge headroom.
- Confirm the read/write aliases each resolve to exactly one source index.
- Capture outbox/fan-out status and a retention preview.
- Use one authorized operator and one incident/change reason throughout.

### 9.2 Dry-run

```bash
node ace notification:projection-rebuild \
  --actor-id=<authorized-user-uuid> \
  --reason="CHG-1234 rebuild notification projection before shadow qualification" \
  --dry-run
```

Dry-run is read-only and reports the planned target. Review index naming, source target, expected
watermark, active-run state, and available capacity.

### 9.3 Execute or resume

```bash
node ace notification:projection-rebuild \
  --actor-id=<authorized-user-uuid> \
  --reason="CHG-1234 rebuild notification projection before shadow qualification" \
  --batch-size=500
```

`--batch-size` must be 10–500. Runtime depends on canonical/tombstone volume and catch-up lag; run it
from an execution environment whose process/terminal timeout exceeds the approved maintenance
window. A caller timeout does not cancel the durable run.

The command is resumable:

1. It creates/ensures a versioned target and registers durable target state at `S0`.
2. It keyset-backfills canonical rows and retained tombstones.
3. Outbox deliveries after `S0` target both required indices.
4. It captures `S1` and checks durable catch-up.
5. If it returns `waiting_for_catchup` with exit code `2`, keep the outbox worker running, resolve
   DLQ, and rerun the same command.
6. It reconciles IDs/revisions, repairs missing/stale documents, and physically purges bounded extra
   documents discovered by the canonical merge.
7. A revision ahead of PostgreSQL or any unresolved mismatch returns `reconciliation_blocked`;
   promotion does not occur.
8. A passing run stops at `ready_for_promotion`. Rebuild never swaps live aliases.

Review the reported run and exact target in the active change window, then explicitly promote:

```bash
node ace notification:projection-promote \
  --actor-id=<authorized-user-uuid> \
  --run-id=<ready-run-uuid> \
  --reason="CHG-1234 approved notification projection promotion" \
  --expected-target-index=<exact-physical-index>
```

Promotion first revalidates a fresh `S1` catch-up and report-only reconciliation. It then persists
the exact actor/reason approval, enters `cutting_over`, takes the exclusive notification-writer
fence, verifies feed delivery catch-up through a newly captured final outbox watermark, changes
both aliases in one Elasticsearch request while the fence is held, and finalizes PostgreSQL target
state under the same fence. A retry is verify-only: a `completed` run succeeds only when its
durable target is still the single PostgreSQL primary, both aliases already point to that target,
and the actor/reason exactly match the recorded approval. It never swaps aliases after a rollback.
The previous target remains dual-written and rollback-eligible for the configured window.

The rebuild output identifies the durable run; a subsequent rebuild invocation resumes the single
active run but still cannot promote it. There is no checked-in abandon/force-complete command. If
the process disconnects or the run is stuck, run `notification:projection-status` and inspect
aliases read-only, keep PG reads, and escalate. Never manually update run rows or move aliases
while a durable rebuild/promotion is active. A strict mapping change requires a new physical index,
backfill/reconciliation, and explicit promotion; never mutate a live physical index in place.

Immediately after a completed cutover, verify both aliases resolve only to the reported target,
outbox/fan-out health is current, a canary read matches PostgreSQL, reconciliation passes, and the
previous target remains rollback-eligible. A failed check forces PostgreSQL reads; it does not
authorize a manual alias change.

### 9.4 Standalone reconciliation

Report only:

```bash
node ace notification:projection-reconcile \
  --actor-id=<authorized-user-uuid> \
  --reason="INC-1234 investigate projection mismatch" \
  --sample
```

Repair missing/stale canonical documents:

```bash
node ace notification:projection-reconcile \
  --actor-id=<authorized-user-uuid> \
  --reason="INC-1234 repair verified projection mismatches" \
  --repair
```

`--sample` and `--repair` are mutually exclusive. Repair uses bounded batches: missing/stale
documents are re-projected and extra documents are physically purged from the selected projection.
A document whose revision is ahead of PostgreSQL remains blocking and requires investigation; the
reconciler never silently accepts or overwrites it.

### 9.5 Read rollback

The first and always-valid rollback is:

```text
NOTIFICATION_FEED_READ_MODE=postgres
```

Apply it through the normal secret/config deployment path and restart/roll web instances. Confirm
the forced PostgreSQL path within the feed API error budget.

An alias rollback is permitted only while the former target is explicitly rollback-eligible,
reconciled, not physically deleted, inside `required_until`, at least as current as the primary
checkpoint, and has no incomplete required deliveries. Capture both exact index names, then run:

```bash
node ace notification:projection-rollback \
  --actor-id=<authorized-user-uuid> \
  --reason="INC-1234 approved rollback after post-promotion verification failed" \
  --expected-current-index=<exact-current-primary-index> \
  --rollback-target-index=<exact-eligible-rollback-index>
```

Before the alias request, the command durably records actor, reason, request time, and exact source
target evidence. The final operation takes the exclusive writer fence, re-reads alias state,
checks the target is still eligible using the database clock, verifies delivery catch-up through
the current outbox watermark, swaps aliases only when both are still on the expected current
index, and commits the PostgreSQL transition under that fence. A retry with the same approval is
verify-only when both aliases and PostgreSQL already show the target. PostgreSQL read fallback
remains the first incident control and must stay available throughout the alias rollback.

After the rollback window:

1. retention changes the expired `rollback` target to `retired` under the projection fence;
2. it waits another 24-hour retired-index grace;
3. it refuses deletion if any active rebuild/reconcile exists or the index still owns the read or
   write alias;
4. it deletes the physical index;
5. it records `physical_deleted_at` under the fence.

## 10. Retention And Deletion Lifecycle

Retention is bounded, repeatable, and safe-by-proof. Preview first:

```bash
node ace notification:retention
```

Apply:

```bash
node ace notification:retention \
  --apply \
  --batch-size=100 \
  --actor-id=<authorized-user-uuid> \
  --reason="CHG-1234 scheduled notification retention cycle"
```

The apply command writes critical start/completed/failed audit events.

One invocation processes every retention category in the service, with `--batch-size` applied as a
per-category maximum, not a global row maximum. There is no category selector or interactive
confirmation. Earlier categories commit independently, so a later Elasticsearch/alias failure can
leave safe partial progress even though the overall run records failure. Preview, record every
category count, use a small initial batch, and rerun only after correcting the failing category.

Lifecycle:

| Data                                |            Default window | Deletion proof                                                                                                                                               |
| ----------------------------------- | ------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical notification content      |  180 days from occurrence | Converted through revisioned tombstone/ledger/unread/outbox transaction                                                                                      |
| Processed/discarded outbox evidence |                   30 days | Processed feed jobs have all required deliveries; discarded poison has explicit actor/reason audit; tombstones cannot be discarded                           |
| Successful completed fan-out job    |                   30 days | No error/DLQ target; failed jobs are not auto-purged                                                                                                         |
| Projected tombstone                 |          At least 90 days | No related outbox; no active rebuild/reconcile; exact retained target set; physical delete succeeds on every retained index; final DB confirmation is fenced |
| Acceptance ledger terminal row      |         At least 180 days | State is `purged`, content/tombstone absent, and online idempotency horizon elapsed                                                                          |
| Rollback target                     |  Through `required_until` | No active projection operation before transition to `retired`                                                                                                |
| Retired physical index              |  Additional 24-hour grace | No active projection operation and no read/write alias                                                                                                       |
| Unresolved outbox/fan-out DLQ       | Indefinite until resolved | Never auto-deleted                                                                                                                                           |

If retention fails after deleting an ES tombstone but before PostgreSQL confirmation, rerun it.
Physical deletes treat not-found as idempotent success. If it fails after deleting a retired index
but before recording proof, rerun only after confirming aliases and target state; index not-found
must be treated as an incident requiring state verification, not as permission for manual row
deletion.

Pause retention during an unresolved projection-control-plane incident. The repository fence also
blocks destructive target/tombstone confirmation while an active rebuild/reconcile run exists.
Pausing means disabling the platform scheduler entry through the normal deployment/change-control
system; no scheduler is defined by this repository. Record the last preview, disable time, owner,
and resume condition. There is no checked-in repair command for an Elasticsearch index deleted
before `physical_deleted_at` was recorded; an ambiguous retired-index deletion must be escalated for
a code-backed recovery, not repaired with SQL.

## 11. Realtime And SSE Operations

Realtime accelerates convergence; it does not carry canonical notification content.

- Channel: `notifications/users/{recipientId}`.
- Subscription requires authentication and exact recipient equality.
- Feed signal contains notification ID/revision only.
- Count signal contains recipient-state revision only.
- Projection succeeds before broadcast; broadcast failure is logged and does not retry an already
  successful durable projection.
- Each client refetches at 0/500/1500 ms at most, then relies on 30-second foreground polling and
  focus/reconnect.
- Browser tabs synchronize through `BroadcastChannel`.
- Session revocation control is published through Redis main; notification invalidation uses Redis
  cache.

Reverse proxies must preserve streaming:

```nginx
location /__transmit/ {
    proxy_pass http://suar_web;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    gzip off;
    proxy_read_timeout 75s;
    proxy_send_timeout 75s;
    add_header X-Accel-Buffering no;
}
```

The proxy/LB/CDN idle timeout must be at least three heartbeat intervals and never less than 90
seconds; adjust the example when the configured heartbeat changes. Disable response
compression/buffering for `text/event-stream`, preserve authentication cookies, and apply the
application's approved Origin/CSRF/SameSite policy. Verify end-to-end that the response is
`text/event-stream`, heartbeat traffic arrives, two web instances receive the same cache-channel
invalidation, and connection draining causes an authenticated reconnect/refetch.

### 11.1 Realtime controls and remaining qualification gaps

Implemented controls:

- `stream.end()` is followed by a bounded forced native-response close for rejection,
  backpressure, maximum-age, and revocation paths;
- buffering is measured from the object-mode readable queue and checked before/after each direct
  local delivery;
- authenticated UUID connection IDs are unique; a duplicate attempt closes only the new response
  and cannot evict the established connection;
- logout revokes one session, suspend/deactivate revokes the whole user, and every non-active
  account is rejected on session/bearer fallback;
- native Transmit Redis transport is disabled. Bounded versioned invalidation uses Redis cache;
  bounded versioned revocation uses Redis main;
- each connection has a maximum lifetime and must authenticate again; active connections are
  indexed by recipient for local O(connections-for-recipient) delivery.

Remaining production qualification gaps:

- the connection cap is per web instance, so target-scale tests must include the maximum replica
  count and load-balancer behavior;
- Redis Pub/Sub revocation is still best-effort during a partition; maximum connection lifetime and
  non-active reauthorization bound, but do not eliminate, that interval;
- active connection, subscriber readiness, local delivery, invalid envelope, publish failure,
  duplicate/limit rejection, and backpressure-close metrics/alerts are not yet complete;
- multi-instance SSE soak, proxy drain, Redis partition, reconnect storm, and target-peak load
  evidence is still required by §14.

HTTP feed/count refetch remains the data-recovery path and does not by itself prove session
revocation safety.

Realtime incident triage:

1. Confirm normal feed/count APIs still work. If yes, notification data can converge; session
   revocation and SSE authorization safety still require separate verification.
2. Check Redis cache transport, Redis main revocation subscriber, Transmit connection failures,
   proxy timeouts, per-user connection rejections, and backpressure closures.
3. Confirm the frontend's 30-second polling and focus/reconnect refresh.
4. Restore Redis/proxy/Transmit; clients refetch on reconnect. Do not replay SSE messages.

## 12. Failure Response Matrix

| Symptom                        | Preserve              | Immediate action                                                                                                                                                                       | Recovery proof                                                           |
| ------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| PostgreSQL unavailable         | No false acceptance   | Stop notification-producing state changes and invoke the separately approved database DR procedure; if none exists, page the database incident commander and do not improvise failover | Same event retry resolves; canonical and outbox rows verified            |
| Ambiguous PostgreSQL commit    | Event identity        | Retry exact event ID/fingerprint; never generate a replacement ID                                                                                                                      | Existing accepted result or deterministic conflict                       |
| Fan-out backlog                | Frozen jobs/targets   | Keep web acceptance if PG healthy; restore/scale fan-out workers                                                                                                                       | Targets processed once; outbox created                                   |
| Outbox backlog                 | Canonical state       | Restore/scale workers and dependencies                                                                                                                                                 | Oldest age drains; ES/Redis revisions converge                           |
| ES 429/5xx/timeout             | PG source and outbox  | Keep PG reads; reduce pressure/restore cluster                                                                                                                                         | Item-level retries complete; reconciliation passes                       |
| Permanent ES mapping failure   | DLQ evidence          | Fix mapping/code; rebuild if required; narrow replay                                                                                                                                   | No mapping DLQ; no stale resurrection                                    |
| Redis cache loss               | PG recipient state    | Allow fallback; restore Redis and let cache miss/strong reads plus outbox delivery rebuild state; sampled reconciliation command remains open                                          | Absolute count and revision converge                                     |
| Redis main loss                | Session safety        | Restore security Redis; invalidate affected sessions through normal auth controls                                                                                                      | Revoked sessions cannot reconnect                                        |
| Worker crash after side effect | Lease/revision fences | Allow lease reclaim; do not unlock manually                                                                                                                                            | Retry is stale/no-op or ACKs current lease                               |
| Reconciliation extra document  | Canonical PG state    | Keep PG reads; run report-only reconciliation, then approved bounded `--repair` physical purge                                                                                         | Follow-up reconciliation passes; no ahead revision or stale resurrection |
| Realtime outage                | API refetch           | Keep HTTP APIs; restore Transmit/proxy/Redis                                                                                                                                           | Reconnect refetch converges                                              |
| Retention backlog              | Evidence first        | Preview; clear projection/DLQ blockers; apply bounded batches                                                                                                                          | Due/blocked counters fall without losing rollback proof                  |

## 13. Escalation And Incident Record

Page the Notification/Platform on-call when:

- pipeline health is failed;
- oldest pending age exceeds the configured failure objective;
- DLQ grows after a known fix/replay;
- a lease-loss or reconciliation mismatch repeats;
- canonical and derived revision ordering disagrees;
- aliases have an unexpected cardinality/target;
- tenant isolation, stale resurrection, or prohibited data exposure is suspected;
- PostgreSQL durability/failover evidence is uncertain.

Record:

- incident/change ID, operator, UTC start/end, reason;
- deployed version and configuration values;
- PostgreSQL primary/standby and acknowledged WAL/failover evidence when relevant;
- status snapshots before/after;
- affected sequences, job/target/outbox IDs, and sanitized error classes;
- replay/rebuild/reconcile/retention command and exit code;
- source/target aliases and physical indices;
- reconciliation result and remaining mismatches;
- customer impact, first accepted occurrence, last recovered occurrence;
- follow-up test, alert, capacity, or code change.

Never copy notification title/body, arbitrary metadata/parameters, credentials, or raw DLQ payloads
into an incident channel.

## 14. Promotion And Release Gates

Presence of the implementation is not production qualification. ES primary remains prohibited until
target-environment evidence proves all of:

- at least 10,000 shadow-read samples across at least 24 hours;
- zero unexplained ID/order/state mismatch older than the five-second allowance;
- projection p99 lag ≤ 5 seconds;
- ES timeout/error rate < 0.1%;
- stale revision resurrection and tenant leakage exactly zero;
- forced PostgreSQL fallback drill succeeds;
- sustained worker throughput ≥ 2× measured peak acceptance;
- one-hour dependency backlog drains within 15 minutes;
- no database connection starvation or ES rejection storm;
- bounded measured storage growth with retention execution evidence;
- acknowledged PostgreSQL failover test verifies canonical and outbox rows on the promoted primary.

Until those gates have dated evidence and owners, use PostgreSQL as the serving source and treat
`shadow` only as an evaluation mode.

## 15. Operator Verification Checklist

After deployment, replay, rebuild, retention, or incident recovery:

- [ ] `/health` can inspect `notification_pipeline`.
- [ ] Outbox/fan-out oldest pending age is falling or below objective.
- [ ] No unexplained new DLQ/completed-with-errors job exists.
- [ ] No stale worker can ACK after lease reclaim.
- [ ] Reconciliation reports no unresolved ID/revision mismatch.
- [ ] Read/write aliases each resolve to exactly one approved physical index.
- [ ] PostgreSQL fallback is available.
- [ ] Redis loss cannot hide canonical unread truth.
- [ ] Authenticated SSE subscribes only to the caller's recipient channel.
- [ ] Logs/audits contain identifiers and sanitized error classes, not notification content.
- [ ] Any changed threshold or worker count has measured capacity evidence and rollback values.
