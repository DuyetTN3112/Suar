# Exception handling enterprise audit

| Field | Value |
| --- | --- |
| Status | Active remediation evidence |
| Audit date | 2026-07-26 |
| Scope | HTTP/API, domain/application exceptions, PostgreSQL, Redis/cache, Elasticsearch, OAuth/HTTP clients, frontend normalization, health checks, observability, async delivery |
| Runtime assumption | Pre-deployment; no production users or production compatibility obligation |
| Datastore topology | PostgreSQL, Redis, cache Redis, and Elasticsearch are externally managed; repository Docker files are not the source of truth |
| Safe test guide | [`docs_AI/integration_test_db_connect.md`](../../docs_AI/integration_test_db_connect.md) |

## Executive verdict

The project had a reasonably centralized exception handler and several durable
delivery mechanisms, but the effective behavior was not yet enterprise-ready.
The primary weaknesses were semantic and operational rather than a lack of
`try/catch` statements:

1. reporting a database exception attempted another write to the same failing
   database before completing the response;
2. the documented Problem Details contract was stronger than the actual
   response contract;
3. generic `400` exceptions hid not-found, conflict, authorization, validation,
   and server-integrity failures;
4. timeout and retry decisions were inconsistent across database, OAuth,
   Elasticsearch, Axios, and browser/client boundaries;
5. health checks could mutate Elasticsearch and one check executed an
   unbounded Linux shell command;
6. frontend retry classification could encourage unsafe replay after an
   ambiguous mutation outcome.

The P0 transport and reporting controls identified in this audit are now
implemented. The system is materially safer, but it should not be represented
as production-complete until the remaining P1 workflow, shutdown, privacy, and
fault-injection items in this document are closed.

## Standards and interpretation

This audit uses the following primary guidance:

- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
  for the canonical error transport;
- [AdonisJS exception handling](https://docs.adonisjs.com/guides/basics/exception-handling)
  for framework exception/reporting behavior;
- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
  for generic client messages and centralized handling;
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
  for sensitive-data exclusion, log injection resistance, and bounded
  diagnostic context.

“Enterprise-ready” in this report means:

- stable and machine-readable public behavior;
- no leakage of internal diagnostics or secrets;
- bounded resource consumption during dependency failure;
- an explicit distinction between safe retry, unsafe retry, and permanent
  failure;
- transaction and post-commit outcomes that do not lie to the caller;
- durable, correlated evidence for incidents;
- fault-injection evidence for every important failure boundary.

It does not mean that every dependency error should be caught locally. Unknown
errors should cross a single trusted boundary, be sanitized, correlated,
reported once, and produce a generic `500`.

## Target exception contract

Canonical `/api/v1` failures use `application/problem+json` and contain:

| Field | Contract |
| --- | --- |
| `type` | Stable URI derived from the application error code |
| `title` | Safe status title; never a raw framework or dependency message |
| `status` | HTTP status |
| `detail` | Safe user-facing explanation |
| `instance` | Request path without query or credentials |
| `code` | Stable application error code |
| `category` | `validation`, `authentication`, `authorization`, `not_found`, `conflict`, `rate_limit`, `dependency`, or `internal` |
| `retryable` | Explicit application decision; never inferred by the caller from status alone |
| `requestId` | Request correlation identifier |
| `correlationId` | Cross-service/workflow correlation identifier |

The legacy response envelope remains unchanged where legacy routes still
require it. New behavior must be implemented in the canonical contract first.

### Required status semantics

| Condition | Status | Retryable | Reporting expectation |
| --- | ---: | --- | --- |
| Malformed or invalid business input | 422 | false | no warning/error report |
| Missing authentication | 401 | false | security telemetry only when useful |
| Authenticated but forbidden | 403 | false | bounded security telemetry |
| Missing or cross-tenant resource | 404 | false | no internal error report |
| State/version/idempotency conflict | 409 | false | no internal error report |
| Rate limit | 429 | true after `Retry-After` | aggregated metric, no per-request warning flood |
| Query deadline exceeded before commit | 504 | operation-specific | report and alert when systemic |
| Dependency connect/pool unavailable | 503 | true only for safe/idempotent operations | report once with correlation |
| Mutation outcome unknown | 503 | false | reconcile by idempotency key; never blind retry |
| Persisted data violates application contract | 500 | false | report as defect/integrity incident |
| Programming/configuration invariant | 500 | false | report as defect |

The crucial distinction is “outcome unknown.” A connection reset or timeout
after a write may mean the database or provider accepted the operation even
though the caller did not receive the answer. Such an error must not be marked
automatically retryable.

## Failure-mode audit

| Boundary | Previous failure mode | Control now present | Residual risk |
| --- | --- | --- | --- |
| Global HTTP handler | Same-DB error reporting was awaited during a PostgreSQL outage | Bounded asynchronous reporter, max in-flight capacity, insert timeout, circuit breaker; database failures skip same-DB persistence; graceful shutdown stops admission and drains within a strict budget | A timed-out drain intentionally loses best-effort evidence and emits an operational warning |
| Problem Details | `category` and `retryable` were documented but absent | Required canonical fields and status-derived safe defaults | Consumer contract coverage should expand to every API domain |
| Framework errors | 405/415 and unknown framework 4xx could become internal errors or expose raw messages | Safe mapping for 405/408/415/502 and generic safe 4xx fallback | Add end-to-end contract tests for reverse-proxy generated failures |
| Reporting policy | Expected 4xx failures produced warning noise | `shouldReport` and severity policy respected; rate-limit flood suppressed | Security-specific 401/403 aggregation remains an observability design item |
| PostgreSQL | SQLSTATE-only classifier missed connect, pool, reset, and ambiguous outcome failures | SQLSTATE and runtime marker classifier; separate connect, pool, query, outcome-unknown, and resource-exhausted codes | Driver message matching needs real fault drills for every deployed topology |
| PostgreSQL deadlines | Connection/pool/query work could wait too long | Bounded connect, acquire, create, statement, and query timeouts | HTTP request cancellation is not yet propagated into all queries |
| Error-event details | Diagnostics could be oversized or unsafe | Key/value redaction, credential and token patterns, URL sanitization, depth/item/byte bounds | Error-event retention and access-control evidence must be reviewed before deployment |
| Axios clients | No common default deadline | Shared 30-second default when a client did not configure one | Raw third-party clients must remain on an inventory gate |
| OAuth provider | Provider user lookup could wait indefinitely and malformed provider payloads were blamed on the user | Application deadline and safe provider-failure result | Ally’s underlying request is not abortable through its current contract; it may continue after the application deadline |
| Elasticsearch | Health check ensured/created the index | Health check is now ping-only and read-only; request timeout and bounded retries are configured | Enabling search after a disabled period still requires a full reindex |
| Application health | `free -m` was Linux-specific and unbounded | In-process V8 heap measurement; no shell or child process | Container/cgroup memory saturation should be monitored by the platform, not inferred from V8 heap alone |
| Browser/client | Network/5xx was broadly treated as retryable | Server `retryable=false` wins; timeout/cancel distinguished; mutation retry requires idempotency key | Not all mutation endpoints currently issue/enforce idempotency keys |
| Domain semantics | Generic business `400` represented unrelated conditions | High-risk sprint, review, task, user-skill, bookmark, audit, OAuth, and organization paths use specific exception types | A transitional inventory of generic business exceptions remains |
| Cache and auth logs | Raw cache diagnostics and routine OAuth/auth identity attributes reached logs | Shared single-line redaction; routine auth events now retain presence flags instead of email/social ID/profile fields | Retention, access control, and approved IP/security-event purpose still require deployment evidence |
| Async delivery | Several outbox flows are bounded and durable | Lease fencing, retry classification, dead-letter controls, shutdown tests in mature workers | Some organization/project/user lifecycle compatibility flows still rely on in-process settlement |

## Implemented controls in this remediation

### Transport and handler

- Made `category` and `retryable` mandatory in the API v1 Problem Details
  contract.
- Made retry fail closed by default. Even an explicitly retryable dependency
  failure is advertised as retryable only for GET/HEAD/OPTIONS or a mutation
  carrying an `Idempotency-Key`; the frontend enforces the same rule.
- Added safe mappings for method-not-allowed, request timeout, unsupported media
  type, and bad gateway failures.
- Prevented raw framework 4xx messages from becoming public details.
- Preserved the legacy envelope while strengthening only the canonical API.
- Stopped warning-reporting expected non-reportable 4xx responses.

### Reporting and observability

- Replaced awaited error-event persistence with a bounded, non-blocking
  reporter.
- Added:
  - `ERROR_EVENT_INSERT_TIMEOUT_MS`;
  - `ERROR_EVENT_MAX_IN_FLIGHT`;
  - `ERROR_EVENT_CIRCUIT_OPEN_MS`;
  - `ERROR_EVENT_SHUTDOWN_DRAIN_MS`.
- During a database-originated failure, structured logs are the primary
  evidence; the handler does not attempt to persist the same error into the
  unavailable database.
- Added bounded/redacted diagnostic persistence and rate-limited drop notices.
- Registered a framework-owned termination hook that stops reporter admission,
  drains accepted writes before datastore shutdown, and bounds the drain.
- Recreates the reporter on every Adonis application boot so repeated
  boot/terminate cycles in one integration-test process cannot inherit a
  permanently closed reporter.
- Sanitized cache middleware error text before logging.
- Removed direct email, provider-user ID, profile attributes, and login IP from
  routine auth log messages; retained bounded operational facts and sanitized
  failure reasons.
- Added a per-module architecture ratchet: the current transitional generic
  business-exception count may decrease but cannot increase.

### Dependency classification and deadlines

- Classified PostgreSQL query cancellation, resource exhaustion, pool
  acquisition, connection refusal, transport reset, and ambiguous transaction
  outcomes separately.
- Added bounded PostgreSQL connection, pool acquisition/create, statement, and
  query deadlines.
- Added bounded HTTP server, Elasticsearch, Axios, and OAuth provider settings.
- Made search health checks read-only and removed the OS shell dependency from
  application health.

### Semantic exception upgrades

Representative upgraded workflows include:

- sprint date/status validation and lifecycle conflicts;
- review dispute state, permissions, terminal callbacks, and persisted-status
  integrity;
- idempotent AI callback replay and conflict on different terminal outcomes;
- user skill, bookmark/rating, task comment, task status, and task creation
  preconditions;
- audit actor invariants and organization member lookup;
- OAuth dependency failure versus user-input failure.

This is intentionally not described as complete. Generic
`BusinessLogicException` remains a compatibility fallback and must not be the
default for new code.

## Retry and idempotency policy

Retry is a property of an operation and its observed failure point, not merely
an HTTP status.

| Operation | Automatic retry |
| --- | --- |
| GET/HEAD/OPTIONS with transient connect failure | Allowed with bounded exponential backoff and jitter |
| POST/PATCH/DELETE without an idempotency key | Never |
| Mutation with a server-enforced idempotency key and known pre-commit failure | Allowed within a bounded budget |
| Mutation with an ambiguous outcome | Reconcile by key/status endpoint first |
| 409/422/401/403/404 | Never |
| 429 | Only after `Retry-After` and within a client budget |
| Persisted integrity or invariant error | Never; open defect/incident |

Recommended retry budget:

- maximum 2 retries for an interactive idempotent request;
- full-jitter backoff, for example 100–300 ms then 300–900 ms;
- total user-visible deadline remains authoritative;
- no nested independent retry loops across proxy, application, SDK, and worker;
- record attempt number and idempotency key hash, never the raw credential or
  request body.

## Transaction and post-commit policy

1. A primary mutation, critical audit record, notification intent, and required
   domain event must share one PostgreSQL transaction when they are all
   PostgreSQL-owned.
2. A Redis session write and PostgreSQL outbox insert cannot be atomic. Use a
   stable event identity plus reconciliation; do not claim atomicity.
3. A failure after commit must be logged as `committed: true`. The caller must
   not be told that the primary mutation rolled back.
4. Required eventual effects use an outbox with idempotent consumers, lease
   fencing, bounded retries, and a DLQ.
5. Best-effort compatibility listeners must not be allowed to poison the
   durable event.

## Operational SLO and alert baseline

These are initial pre-production targets. They must be recalibrated with load
test and real traffic.

| Signal | Initial target / alert |
| --- | --- |
| Availability excluding caller-caused 4xx | 99.9% monthly |
| HTTP 5xx rate | page at >1% for 5 minutes and at least 20 requests |
| `E_INVARIANT_VIOLATION` | ticket on first occurrence; page on repeated/multi-tenant occurrence |
| `E_PERSISTED_DATA_INTEGRITY` | page on first occurrence in a serving workflow |
| DB pool acquisition timeout | warn on first burst; page if >5/minute for 5 minutes |
| DB outcome unknown | page on any mutation unless reconciled automatically |
| Error-event reporter circuit open | alert if open in 2 consecutive windows |
| Outbox oldest pending age | alert before business SLA; page when lease/retry budget is exhausted |
| DLQ growth | page on any critical-event row; ticket for best-effort rows |
| OAuth provider failure | alert by provider and stage, not by raw user identity |

Minimum dashboard dimensions:

- stable error code and category;
- route template, not raw URL;
- dependency and operation;
- committed/not-committed/unknown;
- retryable decision;
- tenant scope using an approved pseudonymous identifier;
- request/correlation ID;
- outbox worker, attempt, and terminal disposition.

## Required fault-injection matrix

| Drill | Expected result | Status |
| --- | --- | --- |
| PostgreSQL unavailable while handler reports a DB error | Response is bounded; no recursive/same-DB report write; structured evidence remains | Unit control implemented; external outage drill pending |
| PostgreSQL pool exhausted | 503 pool code; bounded wait; no unbounded queue | Classifier test implemented; load/fault drill pending |
| PostgreSQL connection reset before a read | Transient dependency failure may be retryable for safe operation | Classifier test implemented |
| PostgreSQL connection reset after mutation dispatch | Outcome unknown, `retryable=false`, reconciliation required | Classifier test implemented; real proxy fault pending |
| Error-event writer stalls/fails | Capacity is bounded and circuit opens | Fault-injection unit test implemented |
| OAuth provider never responds | Safe provider timeout within configured deadline | Unit test implemented |
| Elasticsearch unavailable | Read-only health warning and bounded client wait | Unit behavior implemented; external outage drill pending |
| Search disabled then enabled | No serving until full reindex completes | Runbook present; deployment drill pending |
| Cache unavailable | Request bypasses optional cache safely and logs redacted evidence | Existing resilience suite; deliberate external stop requires explicit local confirmation |
| Duplicate AI callback | Same terminal result is idempotent; different terminal result is 409 | Integration test implemented |
| Process exits with reporter events in flight | Stop admission; drain accepted writes within the configured budget; warn on bounded best-effort loss | Unit contract and Adonis lifecycle hook implemented |
| SIGTERM during every outbox stage | Lease released or expires safely; no duplicate non-idempotent side effect | Mature workers partly covered; per-worker inventory pending |

## Residual risk register

### P1 — required before production traffic

1. **Application-wide request cancellation:** propagate disconnect/deadline
   abort signals into long database work and every downstream SDK. Server
   socket/request settings are not an end-to-end application deadline.
2. **Mutation idempotency inventory:** classify every POST/PATCH/DELETE as
   idempotent, key-enforced, or never-retry. Add persistence uniqueness and
   replay tests for every key-enforced operation.
3. **OAuth cancellation:** replace or wrap the provider transport with an
   abortable client if Ally cannot expose cancellation.
4. **Log privacy governance:** direct routine auth identity attributes have been
   removed, but retention, access control, security-event IP purpose, and
   pseudonymous tenant dimensions still require deployment evidence.
5. **Generic exception burn-down:** a per-module no-growth ratchet is active;
   migrate the remaining `BusinessLogicException` sites using the taxonomy and
   reduce each module budget to zero.
6. **Cross-datastore session evidence:** finish reconciliation telemetry and a
   crash fault-injection drill for Redis session mutation versus PostgreSQL
   evidence.
7. **Lifecycle durability inventory:** move remaining required organization,
   membership, ownership, and user lifecycle effects from in-process settlement
   to durable outboxes.
8. **Critical audit transaction proof:** inventory every critical mutation and
   prove its audit write receives the same transaction client.
9. **External-infrastructure chaos suite:** execute controlled PostgreSQL,
   Redis/cache, and Elasticsearch outage/latency drills against dedicated test
   targets, never development or shared data.

### P2 — hardening and scale

- define error-event retention, partitioning, access control, and purge proof;
- use low-cardinality route templates and pseudonymous tenant dimensions;
- verify reverse-proxy timeouts are strictly outside application/downstream
  budgets;
- add consumer-driven Problem Details contract tests for every frontend;
- inventory application-owned JSON readers and fail closed on corruption;
- define a single retry budget across proxy, HTTP client, SDK, and worker;
- add connection-pool saturation and slow-query load tests;
- add dependency-specific circuit breakers only where they improve recovery and
  do not hide required failures;
- add production-like graceful-shutdown drills under load.

## Pre-production exit criteria

Production readiness requires all of the following:

- no open P0 item and an accepted owner/date for every P1 item;
- full typecheck, lint, architecture gates, unit, contract, UI, and safe
  external-datastore integration suites passing from a controlled tree;
- controlled external PostgreSQL, Redis/cache, and Elasticsearch fault drills
  with evidence attached;
- idempotency classification for every mutation route;
- runbooks tested by someone other than the implementer;
- alert routes and dashboard queries verified against synthetic failures;
- secrets/PII review for logs and `error_events`;
- restore/reconciliation test for each durable workflow;
- a deployment timeout budget documented from client through proxy,
  application, datastore, and third parties.

## Verification evidence for this audit

Final verification in the shared worktree:

- external PostgreSQL test connectivity was verified read-only against the
  configured dedicated test database;
- external Elasticsearch ping succeeded with a bounded client;
- `pnpm run typecheck` passed with zero TypeScript or Svelte diagnostics;
- `git diff --check` passed;
- targeted unit and integration tests passed for the handler, emitter,
  PostgreSQL classifier, bounded reporter, OAuth timeout, frontend
  normalization, sprint/audit/bookmark/user-skill semantics, review callback,
  and search health;
- backend exception, public-contract, module-domain, and side-effect
  architecture gates passed after the foundational changes;
- full unit result: 1,076 passed, 2 failed, 1 skipped;
- full UI result: 585 passed, 2 failed;
- safe external PostgreSQL/Elasticsearch integration result: 934 passed,
  51 failed, 38 skipped;
- external Redis behavior/invalidation/API result: 30 passed;
- external Redis authorization and durable invalidation result: 8 passed;
- the two integration assertions intentionally changed by the new task
  semantics (cross-tenant parent `404`; missing DONE submission `409`) passed
  when rerun individually.

The broad-suite failures are not hidden. They group into pre-existing or
parallel-worktree categories including:

- Admin-to-Users boundary leakage and missing fenced search test composition;
- policy-violation class migrations whose tests still expect older exception
  classes;
- search/event-publisher eventual-delivery expectations;
- outbox worker tests that consume more rows than their fixture owns;
- concurrent factory uniqueness collisions;
- notification rollback state timing;
- project-member HTTP tests that time out and leave PostgreSQL locks, causing
  teardown/query-timeout cascades;
- unrelated admin dispute rendering and missing translation resources.

Full backend lint is also not globally clean: the application scan reports 237
errors and 4 warnings, while the backend rest/config scan adds 2 errors.
Targeted lint over the exception remediation files passes. The global failures
are mainly import-order and test-helper issues in the already dirty shared
worktree and must be closed before production exit.

GitNexus impact checks were run before symbol edits and reported no HIGH or
CRITICAL blast radius. The final Rust `gitnexus detect-changes` command returned
zero changes even though Git reported 1,447 modified, 350 deleted, and 748
untracked paths in the shared worktree. This is treated as a stale/incomplete
index limitation, not as evidence of an empty change set. The
`understand-anything` fallback was not available in this tool session.

A passing targeted suite does not erase the residual risks above, and the broad
suite cannot be called green until the recorded failures are repaired on a
controlled tree.
