# Cache and Redis Enterprise Readiness

| Field             | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Status            | Active engineering audit; not a production-readiness declaration                                                              |
| Scope             | Application cache, Redis topology, session/token storage, rate limiting, invalidation, observability, testing, and operations |
| Audience          | Backend, platform, security, QA, SRE, tech lead                                                                               |
| Last reviewed     | 2026-07-26                                                                                                                    |
| Evidence baseline | Current source tree, targeted tests, real Redis integration, browser role-play, and official Redis documentation              |

## Executive verdict

Suar now has a materially safer development baseline for cache and Redis, but it is
not yet enterprise-production-ready.

The highest-risk correctness defects found in this audit have been mitigated:

- permission-dependent task lists no longer share a cache entry across actors with
  different effective access;
- task audit logs authorize before cache lookup and use viewer-scoped keys;
- refresh-token rotation is atomic and single-use under concurrency;
- cache serialization preserves string identity and cached `null`;
- cache-wide operations use bounded `SCAN` plus paged `UNLINK`, not production
  `KEYS`;
- query cache population is best-effort where Redis is an optimization;
- first-use cache commands no longer race the lazy Adonis/ioredis handshake when
  the offline queue is disabled; concurrent first callers share one bounded wait,
  while reconnecting outage paths still fail fast;
- cache Pub/Sub startup now waits for Redis subscription acknowledgement, retries
  a bounded handshake race, and schedules capped background reconnect attempts
  instead of reporting success before the subscriber exists;
- cache and security-sensitive Redis workloads use separate production endpoints;
- production startup rejects plaintext Redis and default/missing ACL identities;
- HTTP response caching varies by actor, organization, URL, accepted representation,
  and locale;
- invalidation namespaces for tasks, organizations, projects, reviews, and profile
  snapshots have been centralized and covered by targeted tests;
- cache invalidation intent is written transactionally by PostgreSQL triggers,
  claimed with fenced leases, retried with bounded exponential backoff and jitter,
  and recoverable through an authorized, audit-chained dead-letter replay;
- post-commit synchronous invalidation is best-effort, so a Redis outage no longer
  turns a committed business mutation into a misleading HTTP failure;
- runtime telemetry now exposes low-cardinality cache behavior without exporting
  cache keys or values;
- raw user-detail, user-list, user-skill, and profile-snapshot projections no
  longer use Redis; those queries read the database on every request until an
  explicitly viewer-scoped, privacy-reviewed projection is designed;
- task collection generations now include organization and subject-user scopes,
  and a true two-Node-process Redis test proves one fill across process
  boundaries;
- generation-control keys no longer have an unbounded lifecycle: new, rotated,
  and actively reused controls have a validated sliding TTL (seven days by
  default), while expiry or eviction only causes a safe cold miss;
- local and CI cache tests now use a physically separate disposable Redis process,
  not DB15 on the development cache process; the fail-fast guard rejects
  logical-DB-only cache-test isolation;
- the Playwright server maps only explicit PostgreSQL/main-Redis/cache-Redis test
  targets, validates them before boot, and runs cache flows against real Redis;
- a multi-context browser role-play proves a cache hit, performs a real task
  assignment, waits for the independent outbox worker, observes the generation
  change, and preserves actor and organization isolation;
- the task-list read path now uses bounded local and distributed single-flight:
  a real PostgreSQL/cache-Redis drill coalesces 64 simultaneous cold reads into
  one list query plus one statistics query, while 128 warm reads perform no
  additional source computation;
- liveness is separated from dependency readiness; the external deployment pipeline
  still has to gate app/worker startup on incremental schema migration.

The remaining release blockers are operational and architectural rather than small
code-style issues:

1. Redis and PostgreSQL run in an independently operated `laragon-linux` Compose
   stack, not this repository's Docker setup. The development Redis was inspected
   and is intentionally not production-ready; the future target environment's HA,
   backup, and failover controls still have no evidence.
2. TLS and named non-default ACL users are mandatory in the application production
   policy, but the external services and effective ACL command/key rules have not
   been verified.
3. The local stack now has per-plane Redis exporters, Prometheus retention, and
   validated alert rules. Production still lacks Alertmanager delivery, centralized
   fleet storage, dashboards, application-metric scrape/discovery, and error-budget
   automation.
4. Isolated local RDB restore and memory-policy pressure drills now pass.
   Off-host/encrypted backup, multipart-AOF backup, production RPO/RTO, failover,
   cold-cache, representative memory pressure, and sustained-load drills still
   have no production evidence.
5. Pattern invalidation is safe from event-loop blocking but remains `O(N)` over a
   namespace and will not scale indefinitely.
6. The repository does not contain the complete historical base migrations required
   to build every business table from an empty PostgreSQL database. The external
   deployment pipeline needs a versioned, restore-tested baseline schema artifact,
   incremental migrations, and an app/worker startup gate.
7. The running `suar_test` database supports the current integration suite, but
   its migration ledger contains historical entries whose source files are no
   longer present. The 2026-07-26 safe migration run reported two corrupt ledger
   entries and twenty pending sources, then failed in the legacy
   `20260602000000` migration because `create_updated_at_trigger()` is absent.
   A clean environment still cannot be treated as reproducibly provisioned until
   a versioned base-schema artifact and ledger reconciliation are tested from
   empty storage.
8. The host currently reports `vm.overcommit_memory=0`. Redis persistence and
   fork-heavy operations need a platform-owned overcommit decision and alert.
   THP reports `madvise`, not the recommended `never`; this audit intentionally
   did not change host-wide sysctls.

No production launch should be approved until the release gates in this document
have objective evidence.

## Audit method and evidence

This audit used:

- GitNexus CLI impact analysis before symbol edits;
- source-level call-site inventory for cache and direct Redis operations;
- unit tests for cache contracts, invalidation patterns, policy, middleware, and
  production configuration;
- integration and contract tests through HTTP, persistence, and real cache state;
- a real Redis integration suite covering physical TTL, serialization envelope,
  multi-page `SCAN`, expiry, generation rotation, and cross-process stampede
  protection using two independent Node processes;
- opt-in, isolated runtime drills for cache outage/recovery, RDB copy/restore, and
  `allkeys-lfu` versus `noeviction` behavior under a bounded memory ceiling;
- browser role-play with separate organization-owner and member sessions, a real
  cache Redis connection, and an authenticated cache-hit counter delta;
- negative-path tests that warm cache as a privileged actor and retry as a less
  privileged actor;
- official Redis guidance for persistence, eviction, security, ACL, TLS, Sentinel,
  latency monitoring, `INFO`, and `SCAN`, plus the upstream Redis exporter and
  Prometheus alert-rule documentation.

Static call-site inspection found application caching across organizations, tasks,
reviews, users, and HTTP middleware, plus direct main-Redis usage in the session
token service. Documentation examples were excluded when determining active
runtime behavior.

## Point-in-time external development Redis evidence

On 2026-07-23, a credential-redacted audit first inspected the independent
`laragon-linux` Compose definition and running Redis read-only. After explicit
operator authorization, it performed a controlled local hardening cutover. No
business key or value was inspected, no Redis/PostgreSQL volume was removed, and
PostgreSQL/Elasticsearch were not restarted. A fresh RDB snapshot and successful
AOF transition preceded the main Redis container recreation. The controls and
runtime values below were re-audited on 2026-07-26.

| Control                  | Observed development state after hardening                                                             | Production interpretation                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Configuration owner      | External `laragon-linux/docker-compose.yml`                                                            | Project Docker files are irrelevant to this topology               |
| Data-plane topology      | Separate main process on `6379` and cache process on `6380`, both DB 0                                 | Local fault isolation is now representative                        |
| Image/runtime            | Redis pinned to `8.4.0-alpine`; Commander, exporters, and Prometheus pinned by digest                  | Retain controlled upgrade and vulnerability review                 |
| Server mode/role         | Two standalone primaries, zero replicas                                                                | No HA or failover evidence                                         |
| Application transport    | Loopback plaintext; TLS disabled for both configured connections                                       | Acceptable local containment, not a production transport           |
| ACL identity             | `default`, `nopass`, unrestricted on both processes                                                    | Named least-privilege identities remain a release gate             |
| Host exposure            | Redis ports publish only on `127.0.0.1`; no IPv4/IPv6 wildcard listener                                | Initial remote unauthenticated exposure is contained               |
| Container network        | Dedicated network containing only Redis, Commander, exporters, and Prometheus                          | Reduces lateral reach from unrelated Compose services              |
| Management UIs           | Commander `127.0.0.1:8082` and Prometheus `127.0.0.1:9090`; no HTTP credentials                        | Local-only residual risk; authenticate or stop when unused         |
| External telemetry       | Separate non-root exporter per plane; Prometheus 15-day/1-GiB retention; 17 healthy rules              | Local evidence only; production delivery and dashboards remain     |
| Main persistence         | RDB plus AOF `everysec`; status healthy; isolated local RDB restore passes                             | Production off-host backup, AOF restore, and RPO remain unproved   |
| Cache persistence        | RDB/AOF disabled                                                                                       | Correct disposable-cache development contract                      |
| Main memory              | Redis 512 MiB `noeviction`; container 1 GiB                                                            | Calibrate from load and fork/COW evidence                          |
| Cache memory             | Redis 256 MiB `allkeys-lfu`; container 384 MiB                                                         | Calibrate hit rate, churn, and runtime headroom                    |
| Cache test plane         | Separate Redis on `127.0.0.1:6381`; 128 MiB LFU/192 MiB container; no persistence/volume               | Local/CI destructive-test isolation, not a production service      |
| Container isolation      | Main/cache/cache-test run as Redis user, read-only root, `no-new-privileges`, all capabilities dropped | Local containment is materially stronger; not a production sandbox |
| Health/resource controls | All three Redis services have healthchecks; main/cache have 1 CPU/200 PID ceilings                     | Local guardrails exist; target sizing is still unproved            |
| Restart behavior         | `unless-stopped`                                                                                       | Local self-recovery is enabled                                     |
| Latency/slowlog          | Latency monitor at 100 ms; slowlog at 10 ms with 1,024-entry cap                                       | Initial forensic baseline, to be tuned from SLOs                   |
| Observed latency history | Slowlog length 0 on both; main recorded AOF write events up to about 114 ms, cache none                | Investigate disk/fsync tail latency under representative writes    |
| Current memory           | Main about 1.90 MiB dataset process memory; cache about 1.28 MiB                                       | Too small to validate capacity or fragmentation forecasts          |
| Fragmentation ratio      | About 11 main and 16 cache at near-empty allocation                                                    | Do not extrapolate; repeat under representative allocation         |

The Compose definition now provides three explicit Redis data planes: main
development on port 6379, rebuildable development cache on port 6380, and a
disposable cache-test process on loopback port 6381. On 2026-07-26 the
independently operated `laragon-linux` PostgreSQL, all three Redis services,
Elasticsearch, Kibana, Redis Commander, and monitoring containers were running.
Application tests use PostgreSQL `suar_test`, main Redis DB14 on port 6379, and
cache-test Redis DB0 on port 6381; cache development at port 6380 remains
untouched.
The host-level `vm.overcommit_memory=0` setting remains an open persistence and
fork-headroom risk. Transparent Huge Pages currently reports `madvise`, while
Redis production guidance recommends disabling THP. Both changes require the
platform operator's system-level change process.

The initial state was one shared process, wildcard host publication,
`protected-mode=no`, an unrestricted `nopass` identity, no memory ceiling, no
healthcheck, RDB-only persistence, and a wildcard-published Commander UI. The
wildcard exposure was the P0 development finding; loopback publication and
physical main/cache separation have closed its remote-routing path. Host firewall,
router/NAT, and VPN controls remain defense-in-depth rather than the primary
control.

### Applied development containment and residual risk

Completed during the controlled cutover:

1. Redis and Redis Commander are published only on loopback.
2. Main and cache now use separate processes, volumes, ports, memory policies, and
   failure domains.
3. Redis is version-pinned and Commander is digest-pinned.
4. Both Redis services have healthchecks and resource ceilings.
5. Main has AOF `everysec` plus RDB; cache is explicitly non-persistent.
6. A dedicated container network contains only the Redis-related services.
7. Two digest-pinned, non-root, read-only exporters feed a digest-pinned local
   Prometheus collector with bounded retention and tested alert evaluation.
8. Cache integration/E2E has a non-root, read-only, capability-dropped Redis test
   process with an independent memory/eviction/failure domain and no persistent
   volume.
9. An opt-in drill copies a fresh atomic RDB, validates its checksum, restores it
   into a network-isolated Redis process, verifies a random sentinel, and refreshes
   the live RDB after removing the sentinel.
10. Main Redis was recreated with a read-only root, Redis UID, all capabilities
    dropped, and `no-new-privileges`; an expiring pre-recreate sentinel survived
    through AOF/RDB and was deleted after verification.

Still required before storing imported production-like data or permitting
non-loopback access:

1. Replace the `nopass` default identity with named users and secrets.
2. Configure Commander with least-privilege Redis credentials and HTTP
   authentication, or stop it when unused.
3. Keep secrets outside Compose and repository history; rotate them through the
   application's `.env` or a development secret manager.
4. Run negative authentication and restore drills.

The repository-local `.env` was initially only inspected. After the operator
explicitly authorized changes, it was updated to point cache at loopback port
`6380`, DB 0, while main remains on `6379`, DB 0. Session, lock, and rate limiter
use main Redis. TLS and ACL credentials remain intentionally unset for this
loopback-only development topology. The legacy `REDIS_CONNECTION` variable is
still present but has no active consumer. Editing `.env.example` did not modify
`.env`; the later `.env` change was a separate, direct authorized edit.

Never run `docker compose down -v` on the independent stack: the `-v` option would
remove the named Redis/PostgreSQL volumes.

The read-only command `node ace cache:invalidation-status` also reported
`configured=false` for the currently configured development PostgreSQL database.
This is expected before applying the new migration, but the outbox worker must not
be started there until migration succeeds. No migration was applied to the
external database during this audit.

## Workload and data classification

Rebuildable does not mean public:

| Plane        | Typical content                                                                | Classification                     |
| ------------ | ------------------------------------------------------------------------------ | ---------------------------------- |
| Main Redis   | Session state; hashed token keys; user ID, email, role, and organization scope | Confidential security state        |
| Cache Redis  | Organization/member/task/review/profile projections and HTTP response bodies   | Confidential derived business data |
| Logs/metrics | Namespace, bounded counters, latency buckets, and truncated identifier digests | Operational metadata               |

Raw cache keys, raw search text, public-profile access tokens, cache values, Redis
credentials, and endpoint addresses are not permitted in ordinary logs or metrics.
The cache data plane still requires encryption and ACLs because its values can
contain PII and business-sensitive material.

### Main Redis

Main Redis is security-sensitive and not a disposable cache.

Current consumers include:

- Adonis server-side sessions;
- access-token and refresh-token records;
- distributed rate limiting;
- the currently in-development notification unread-count projection;
- other runtime primitives using the default Redis connection.

Required behavior:

- `noeviction`;
- bounded memory with writes rejected before the external service runtime reaches
  OOM;
- persistence and tested restore;
- high availability;
- authentication, TLS, and least-privilege ACL;
- fail closed for token/session validation;
- no cache-admin flush operations against this endpoint.

Application-side contract:

- main and cache use separate named client connections;
- production startup rejects a shared main/cache endpoint;
- command/connect timeout and request retry budgets are bounded;
- the client continues background reconnect with capped backoff after an outage;
- health checks distinguish the main and cache connections;
- production startup requires Redis-backed session, distributed-lock, and
  rate-limiter stores; process-local alternatives remain test/development only.

The independently operated local main Redis now provides RDB plus AOF `everysec`,
512 MiB `noeviction`, a 1 GiB container ceiling, a healthcheck, bounded resources,
latency monitoring, and a dedicated endpoint. It remains a single plaintext
primary with an unrestricted default user. Production still requires named ACL,
TLS, HA, backup/restore, failover, and measured host-headroom evidence.

Shared local/test endpoints are accepted only when main and cache use different
logical DBs. Merely repeating `REDIS_CACHE_HOST` does not count as endpoint
isolation, and a shared endpoint with the same DB is rejected at startup because
`FLUSHDB` ignores key prefixes. Obvious aliases are canonicalized before this
comparison: DNS names are case-insensitive and ignore a trailing dot, while
`localhost`, IPv4 `127.0.0.0/8`, and IPv6 loopback spellings are treated as one
host. Production rejects shared endpoints entirely. Application boot cannot prove
that two arbitrary DNS/CNAME names do not resolve to the same managed service, so
the deployment gate must additionally verify provider resource IDs/endpoints and
network routes.

The two clients deliberately have different outage semantics:

- main starts eagerly and retains a bounded offline queue so the first
  session/limiter command does not race the initial Redis handshake. Command
  timeout and retry budgets are still bounded; this security-sensitive data plane
  remains mandatory and fails closed;
- cache starts eagerly but disables its offline queue. Optional request-path reads
  and populations therefore fail immediately while disconnected, while background
  reconnection continues with capped exponential backoff and jitter;
- the first group of cache commands shares at most a 250 ms wait only while the
  client is in its initial `connecting` state. This prevents a healthy startup
  handshake race without creating one listener/wait per request. Once an
  established client is reconnecting after an outage, all cache operations fail
  immediately instead of consuming a request or test deadline.

A transient cache outage therefore neither queues optional work behind reconnect
attempts nor permanently closes the client. The same application process resumes
cache reads and writes after Redis recovers.

Important durability nuance for the external configuration decision:
`appendfsync everysec` is not zero-loss durability. Redis documents that AOF with
periodic fsync trades durability for performance, and asynchronous replication can
still lose acknowledged writes during failure. The selected external persistence
mode and token/session behavior must therefore be explicitly accepted in the
product RPO.

### Cache Redis

Cache Redis contains rebuildable derived data.

Required behavior:

- an independent endpoint and memory budget;
- eviction instead of application-wide failure when full;
- no persistence unless cold-start cost later justifies it;
- query paths degrade to the source of truth where safe;
- mutation invalidation remains observable and retryable;
- no authorization decision may be inferred from cache presence.

Application-side baseline:

- 24-hour maximum application TTL;
- generation-control TTL strictly longer than the maximum payload TTL, bounded
  to 86,401–7,776,000 seconds and defaulting to 604,800 seconds;
- 512-byte maximum logical key/pattern length;
- 1 MiB maximum serialized value;
- isolated cache connection and physical key prefix;
- startup guard against same endpoint plus same logical DB, because `FLUSHDB`
  ignores prefixes;
- best-effort reads/population and durable invalidation recovery;
- every non-administrative query population path uses the centralized
  best-effort writer, so an external cache outage does not fail the source read.

The independent local cache now uses 256 MiB `allkeys-lfu`, no persistence, one
logical DB, a 1,000-client ceiling, a 384 MiB container ceiling, a healthcheck, and
an explicit loopback app endpoint. It runs as the named `redis` user with a
read-only root filesystem, all Linux capabilities dropped,
`no-new-privileges`, and tmpfs-backed `/data`; no persistent cache volume is
mounted. The isolated cache-test process uses the same hardening with 128 MiB
`maxmemory`, a 256-client ceiling, and tighter container limits. This is a
development hypothesis, not production sizing evidence. Redis explicitly
recommends selecting eviction policy from observed access patterns rather than
treating one policy as universally correct.

## Current keyspace inventory

The table describes active or intentionally dormant logical namespaces. The
physical cache prefix is `suar:cache:`.

| Namespace                                          | Scope                                       |                TTL | Invalidation                     | Status                                          |
| -------------------------------------------------- | ------------------------------------------- | -----------------: | -------------------------------- | ----------------------------------------------- |
| `orgs:list:*`                                      | user + filters                              |               300s | membership/org registry          | Active                                          |
| `org:detail:*`                                     | organization + includes                     |           120–300s | organization registry            | Active                                          |
| `org:members:*`                                    | organization + filters                      |               180s | membership registry              | Active                                          |
| `organization:pending_requests:*`                  | organization                                |                60s | organization registry            | Active                                          |
| `tasks:list:*`                                     | canonical filters + effective access digest |      query-defined | task invalidator                 | Active                                          |
| `tasks:public:v3:query:<digest>`                   | canonical anonymous public-list query       |               120s | task invalidator                 | Active; raw filters absent                      |
| `tasks:grouped:*`                                  | organization + actor + effective permission |               120s | task/membership invalidator      | Active; bounded distributed single-flight       |
| `tasks:timeline:*`                                 | organization + actor + effective permission |               120s | task/membership invalidator      | Active; bounded distributed single-flight       |
| `task:stats:*`                                     | organization + actor + effective permission |               300s | task/membership invalidator      | Active; bounded distributed single-flight       |
| `task:user:*`                                      | subject user + organization + filters       |               180s | task invalidator                 | Dormant: no production caller found             |
| `task:metadata:v3:*`                               | organization, after current access check    |               600s | org/member/project/skill changes | Active; bounded distributed single-flight       |
| `task:audit:*`                                     | task + viewer + limit                       |               120s | task-scoped audit invalidator    | Active                                          |
| `task:applications:*`                              | task + actor + filters                      |                60s | application invalidator          | Active                                          |
| `user:applications:*`                              | applicant + filters                         |                60s | application invalidator          | Active                                          |
| `review:session:v4:*`                              | review session                              |               300s | canonical key + durable outbox   | Active; authorization still runs per request    |
| `user:pending_reviews:*`                           | reviewer + cursor filters                   |                60s | review cache port                | Active                                          |
| `users:featured_reviews:v2:*`                      | public aggregate by user + limit            |               300s | review/user mutation registries  | Active; aggregate only                          |
| `users:delivery_metrics:*`                         | aggregate delivery metrics by user          |               300s | user/review mutation registries  | Active; no raw assignments                      |
| `users:spider_chart:v4:*`                          | aggregate skill chart by user               |               300s | user/review mutation registries  | Active; no evidence/comments                    |
| `users:work_history:*`                             | subject user + self/public viewer scope     |               300s | user/org/project mutations       | Active; visibility changes rotate generations   |
| `profile:snapshot:*`                               | user or public access scope                 |                n/a | none                             | Disabled; authoritative DB reads                |
| `users:detail:*`, `users:skills:*`, `users:list:*` | raw user projections                        |                n/a | none                             | Disabled; never repopulated                     |
| HTTP `*:v2:<sha256>`                               | actor + org + URL + representation + locale | middleware-defined | TTL/private-response policy      | Dormant: middleware is not attached to a route  |
| `generation:control:<sha256>`                      | global/org/user/task collection scope       | 7d sliding default | atomic rotate/half-life refresh  | Active; expiry is correctness-safe              |
| `singleflight:lock:*`                              | cache key                                   |   2s sliding lease | compare-and-delete Lua release   | Ephemeral; bounded renewal lifetime             |
| `task:detail:*`                                    | intended task detail                        |                n/a | task invalidator                 | Dormant: query sets `cacheKey = null`           |
| `projects:*`                                       | intended project query cache                |                n/a | project invalidator              | Dormant: key/TTL methods are not invoked        |
| `perm:*`                                           | intended permission cache                   |                n/a | org/project/user invalidators    | Dormant: invalidators exist, producer not found |

Dormant entries are documented because they create false confidence. They must
either be deliberately activated with full correctness tests or removed from code
and diagrams. The disabled user/profile namespaces are an intentional zero-cache
policy, not a cache miss that may be silently re-enabled.

## Correctness and security findings

### Closed: permission collision in task list cache

Previous behavior could build a collection key before resolving the actor's real
permission filter. A privileged actor could warm an organization list that was then
reused by a member with narrower access.

Current behavior:

- permission scope is resolved before lookup;
- the canonical key includes effective scope and sorted filter inputs;
- actor/permission variants cannot collide;
- an integration test warms as owner and verifies a same-organization member cannot
  see the owner-only task;
- browser role-play reproduces the two-user journey.

### Closed: task audit log cache bypassed authorization

Previous behavior:

- the query did not receive an actor context;
- it read `task:audit:<task>:<limit>` before any task-level policy;
- route middleware proved authentication and organization context only;
- payloads include actor email and field-level old/new values.

Current behavior:

- actor and task permission context are resolved before every cache lookup;
- audit-log access excludes marketplace-only and read-only project viewers;
- keys include the viewer ID as defense in depth;
- a contract test warms as owner, then proves an unrelated approved organization
  member receives `403` and no viewer cache entry is created.

Invariant: a cache hit is never an authorization decision.

### Closed: refresh-token replay race

Refresh flow now:

- validates token payload and requested organization before consumption;
- rotates with one Lua compare-and-swap operation;
- consumes the old refresh token and creates the new pair atomically;
- allows only one winner when concurrent requests use the same refresh token;
- does not destroy the valid old token when an invalid organization switch is
  requested.

This Lua script is a correctness transaction on main Redis, not a general-purpose
distributed lock.

### Closed: serialization ambiguity

Plain JSON serialization could not distinguish the string `"123"` from number
`123`, or string `"null"` from cached `null`.

The cache now uses a versioned envelope, preserves string identity, reads legacy
values, caches `null` without recomputation, and rejects unsupported values such as
`undefined`, functions, symbols, non-finite numbers, and `bigint`.

### Closed: sensitive user input in cache metadata

Anonymous marketplace keys previously embedded raw keyword/filter material, and
public-profile snapshot keys embedded the raw share token. Current cacheable
search and HTTP keys use fixed-size SHA-256 digests, while profile snapshots are
now database-only:

- long anonymous filters cannot exceed the cache-key budget;
- search terms, slugs, and share tokens do not appear in Redis keyspace metadata;
- public-profile snapshot values are never written to Redis, so share tokens do
  not enter the cache keyspace or payloads;
- no snapshot invalidation is required while the snapshot query family remains
  zero-cache;
- cache-admin set/clear audit events persist only namespace plus digest, not the
  operator-supplied raw key.

Unit and integration tests inspect the actual keyspace and authoritative profile
response payload.

### Closed P0: raw user projections are zero-cache by policy

The audit found that several user queries returned viewer-dependent or private
fields while using keys that did not encode the full authorization context:

- user detail included identity and current-organization fields;
- user lists serialized the full user model;
- user skills could include evidence, comments, and source URLs;
- current, historical, and public profile snapshots could contain private
  projections or share-link context.

Those four query families now bypass Redis completely and read the authoritative
database. Their old namespaces are absent from the invalidation outbox and
regression tests seed stale keys, execute the query, and prove that no key is
read or repopulated. This is deliberately conservative: a future projection
must define its viewer/organization/privacy dimensions first, then add a
dedicated DTO, key contract, TTL, invalidation matrix, and multi-actor tests.

Aggregate profile cards remain cacheable only where the output is intentionally
non-sensitive (featured-review summaries, delivery aggregates, and spider-chart
facts). `users:work_history:*` remains split into self/public keys, but its
organization-membership visibility contract is still an open privacy review; do
not widen that cache or reuse it for a new viewer scope without a policy test.

### Closed: review-session cache touched before authorization

Review-session policy used to run after cache lookup/population. It still prevented
the response leak, but an unrelated actor could trigger a sensitive source query
and populate the shared cache before receiving `403`. Authorization now runs first.
A multi-actor HTTP test proves an unrelated approved member cannot populate a cold
entry and still receives `403` after an authorized owner warms it.

### Closed P1: review-session writers invalidated a legacy key

The reader used `review:session:v4:sessionId:<id>`, while the synchronous review
port, submit/confirm commands, and all three PostgreSQL trigger branches emitted
`review:session:sessionId:<id>`. The active key was not generation-scoped, so
every invalidation missed and a sensitive projection could remain stale for its
full 300-second TTL.

The contract now has one validated `reviewSessionCacheKey()` builder used by the
reader and synchronous writers. The durable trigger emits the same v4 key, and a
forward-only reconciliation migration reinstalls the canonical trigger. Unit
tests reject unsafe identifiers; submit/confirm tests seed the active key; a real
PostgreSQL/Redis test warms v4, commits a session mutation, runs the outbox worker,
and proves the exact physical entry is removed.

### Closed P0: task metadata authorized too late and missed membership invalidation

`task:metadata:v3:org:<id>` contains organization member emails, project names,
and parent-task titles. The query previously had no authorization boundary of its
own and could start in parallel with task-edit authorization. It now requires an
actor, resolves current system/organization access before every cache lookup, and
denies pending members and outsiders even after an owner has warmed the shared
entry. Approved members and system administrators are covered as positive cases.

Organization-membership changes now rotate task metadata synchronously and through
the transactional outbox. The canonical trigger is reconciled by a forward-only
migration. Skill metadata is also a tracked dependency: a skill change invalidates
task metadata, review-session, featured-review, and spider-chart projections.

### Closed P0: role downgrade could replay broad task collections

Grouped tasks, timeline, and statistics resolved current permission before Redis,
but their keys only contained organization and user. An administrator could warm
an `all` result, be downgraded, then hit the same key with a narrower permission.
Security depended on eventual outbox delivery.

All three keys now include the resolved permission-filter type. Organization
membership mutations also rotate all three tenant generations synchronously, and
project membership changes rotate the affected user generations. A real
PostgreSQL/cache-Redis regression warms as organization admin, downgrades the same
actor to member without cache invalidation, and proves owner-only tasks disappear
from grouped, timeline, and statistics results. These high-traffic reads and task
metadata now use bounded distributed `remember` coordination rather than an
uncoalesced `get -> source -> set` path.

### Closed P0/P1: membership and visibility transitions retained derived data

Project membership invalidation used to be a no-op even though
`user:pending_reviews:v3` is keyed only by reviewer. A former project member could
therefore replay pending-review rows until TTL or durable worker delivery. The
synchronous project invalidator now rotates pending reviews, work history, and
user-scoped task collection generations. The existing durable project-membership
trigger remains the crash-safe second layer; real Redis coverage proves a warm
review disappears after outbox delivery.

Project visibility updates now rotate the global work-history generation, closing
the public-to-private project transition window. Cursor-backed pending reviews
also normalize legacy `page` metadata to page 1, so equivalent page inputs no
longer collide while replaying different `current_page` values.

### Closed P1: process-local custom-role permissions were indefinitely stale

Custom system-role permissions were cached in one Node process and refreshed only
by the process that performed the write. Another application instance could retain
revoked permissions indefinitely. The authorization default now has zero maximum
age: every independent lookup reloads PostgreSQL, while simultaneous lookups share
one in-flight refresh. Positive caching remains available only through an explicit
bounded `maxAgeMs` option capped at 60 seconds; production service composition does
not opt into it. Tests prove immediate revocation visibility and concurrent
single-flight loading.

### Open P1 correctness matrix: secondary projection dependencies

The audit deliberately keeps these as release-visible risks:

- user identity changes can remain in task applications, pending reviews, task
  audit, organization pending requests, and review-session presentation fields
  until their current 60–300 second TTL;
- many active namespaces still lack an explicit projection/schema version, so a
  rolling deployment can read an old DTO shape until TTL expiry;
- anonymous marketplace filter canonicalization/cardinality bounds and temporal
  deadline predicates need property/load tests;
- localized work-history/delivery strings should become domain facts or add locale
  to the key before those projections serve multiple locales.

These are bounded stale-presentation/capacity risks, not authorization bypasses:
authorization-sensitive readers re-evaluate current policy before cache access.
They still require a table-driven source-to-projection dependency registry before
production rather than relying on scattered string literals.

### Closed in code, deployment evidence pending: durable invalidation

The cache invalidation path now has two deliberately different layers:

1. The synchronous post-commit path uses best-effort invalidation for low latency.
   Redis failure is counted/logged but does not report a false business-mutation
   failure after PostgreSQL already committed.
2. PostgreSQL triggers enqueue logical invalidation patterns inside the same
   transaction as source-table writes. Rollback removes both the business change
   and its intent; commit persists both.
3. A dedicated worker claims rows using `FOR UPDATE SKIP LOCKED`, increments the
   attempt count, assigns a random lease token, and fences ACK/retry/dead-letter
   updates by that token and a non-expired lease.
4. Redis deletion is idempotent. If the worker crashes after deletion but before
   ACK, a later worker safely repeats the deletion.
5. All unsettled leases in a claimed batch are heartbeated, including rows waiting
   behind a slow scan. Identical logical patterns are coalesced within that batch,
   while every row retains an independent ACK/retry/dead-letter outcome.
6. Transient failures use bounded exponential backoff with jitter. Malformed
   payloads go directly to dead letter; exhausted transient failures do the same.
7. Error class/message are sanitized and bounded; the outbox stores entity IDs and
   logical patterns, never business titles, emails, cache values, or Redis
   credentials.
8. Dead-letter replay requires an active system operator with
   `can_manage_system_settings`, an explicit 10–500 character reason, and either
   1–100 UUIDs or a sequence window of at most 100 positions.
9. Replay reset and a critical, hash-chained audit event commit in one PostgreSQL
   transaction. If audit persistence fails, replay rolls back.

Tracked source tables currently include organizations and memberships, projects and
memberships, tasks/statuses/assignments/applications/workflow/required skills,
review sessions/reviewer assignments/skill reviews, and users/user skills/work
history. User-detail, user-list, user-skill, and profile-snapshot response caches
are intentionally absent from this outbox; their source tables remain business
tables, but no Redis invalidation is needed for a cache that is never populated.

Database constraints bound each intent to 1–64 patterns and 32 KiB. A unique index
deduplicates identical source intent inside one PostgreSQL transaction. Processed
rows are purged in bounded batches after the configured retention period.

Evidence now present:

- rollback/commit atomicity against PostgreSQL;
- no business title leakage in the payload;
- concurrent workers claim disjoint batches;
- lease expiry reclaim and stale-token fencing;
- persisted retry resumed by a new worker instance;
- waiting-job heartbeat and duplicate-pattern batch coalescing;
- poison-message isolation;
- real Redis deletion of owner/member permission variants while preserving an
  unrelated key;
- low-cardinality backlog readiness;
- bounded replay validation and audited dead-letter recovery.

Still required before production:

- deploy the migration and worker in a production-like environment;
- kill Redis and worker processes during real traffic, then prove recovery;
- alert on dead letters and age/backlog thresholds;
- establish worker DB/Redis ACLs separately from app credentials;
- measure trigger write amplification and `SCAN` cost at forecast key cardinality;
- extend generation routing to any remaining namespace that breaches its measured
  pattern-scan latency budget.

The implementation intentionally does not use an in-memory retry queue because
process restart would lose the intent.

### Partially closed P1: broad pattern invalidation has a scale ceiling

`SCAN` avoids blocking Redis like `KEYS`, and paged `UNLINK` bounds application
memory. It still scans a keyspace and may return duplicate keys while the keyspace
changes. Redis documents these limited iteration guarantees.

Active hot task, organization, application, review, and work-history collections
now use organization/user/task-aware generation controls. Remaining unrecognized
patterns still use bounded `SCAN`/paged `UNLINK`. The migration rule for any
namespace that exceeds its measured budget is:

- namespace generation keys, for example `tasks:list:g:<generation>:...`;
- increment generation on broad invalidation;
- let old generations expire naturally;
- use entity tag sets only when the write amplification is measured and acceptable;
- retain targeted exact deletes for small fan-out;
- never put correctness-critical state behind an eventually cleaned tag set.

### Open P1: high availability is not implemented

Separate external endpoints prevent cache eviction from damaging sessions, but
endpoint separation alone does not prove replication or failover.

For a non-sharded deployment, Redis Sentinel or a managed equivalent must provide
primary/replica failover. Official Redis guidance recommends at least three Sentinel
processes placed across independently failing machines or zones, and explicitly
requires periodic failover tests. Redis replication is asynchronous, so Sentinel
does not by itself guarantee retention of every acknowledged write.

The recommended launch topology is two independent managed Redis services:

- main/security service: multi-zone primary plus replica, automatic failover,
  AOF/RDB or provider durability matched to the accepted session/token RPO;
- rebuildable cache service: independent memory/eviction budget; add a replica and
  failover if a cold-cache event would exceed PostgreSQL capacity or the cache SLO;
- no Redis Cluster at launch unless measured single-node throughput/memory requires
  sharding.

If self-hosting instead, the minimum candidate is one main primary, at least one
main replica, and three Sentinel voters on independent failure domains. Cache HA
is a separate cost/SLO decision and must never share main's process or memory
policy.

If Redis Cluster is chosen later:

- multi-key Lua and transactions need hash-slot-compatible keys;
- `SCAN` and pattern invalidation must cover every primary shard;
- generation resolution currently evaluates multiple independently hashed control
  keys in one Lua call and therefore is not Redis Cluster hash-slot-safe;
- the current implementation cannot be assumed cluster-safe without a deliberate
  key-slot/redesign decision and cluster integration tests.

### Closed local baseline, Open P1 production integration: backup and restore

Redis documents that a completed RDB is an immutable point-in-time file and can be
copied safely while the server remains online. The opt-in
`test:redis:backup-restore` runner now proves this local path without restoring over
the live volume:

1. verify the audited main endpoint is loopback, healthy, AOF `everysec`, and
   `noeviction`;
2. write a cryptographically random, five-minute sentinel under an operations-only
   namespace;
3. wait for persistence to become idle, run `BGSAVE`, and require a successful
   completion;
4. copy only the atomically completed `dump.rdb` to a temporary directory and run
   `redis-check-rdb`;
5. boot the same Redis image as the invoking host UID in a temporary
   `--network none` container, verify PING, the sentinel value, and a non-empty
   database;
6. delete the sentinel from live Redis, create another successful RDB so the live
   snapshot is clean, stop the temporary container, and assert main/cache Redis,
   PostgreSQL, and Elasticsearch container identities did not change.

The observed empty-development-dataset snapshot was only 224 bytes; it proves
mechanics and cleanup, not throughput, fork copy-on-write headroom, or recovery
time for production data.

This does not close the production backup gate. Redis 7+ multipart AOF backup needs
rewrite coordination, and production still needs encrypted off-host copies,
retention policy, immutability/access controls, freshness alerts, periodic restore
automation against representative volume, documented ownership, and accepted
RPO/RTO. HA failover is also independent of backup/restore.

### Closed local policy semantics, Open P1 production capacity: memory pressure

The opt-in `test:redis:memory-pressure` runner verifies both audited live
configuration and Redis behavior without filling, restarting, or writing test data
to either live data plane:

1. require main and cache Redis, PostgreSQL, and Elasticsearch to be running and
   capture their container identities;
2. require distinct main/cache containers, `noeviction` on main,
   `allkeys-lfu` on cache, positive Redis memory ceilings, and container limits
   larger than the corresponding Redis `maxmemory`;
3. boot two temporary instances from the exact running main Redis image with
   `--network none`, a read-only root filesystem, no capabilities, non-root host
   UID/GID, 96 MiB container memory, and 16 MiB Redis `maxmemory`;
4. pressure the disposable-cache instance and require positive eviction count,
   zero command-error replies, and a successful post-pressure write/read;
5. pressure the main-policy instance and require zero evictions, positive command
   errors, preservation of a pre-pressure sentinel, and objective rejection of a
   newly attempted key at the memory boundary;
6. remove both temporary containers and require the four protected runtime
   container identities to remain unchanged.

The 2026-07-23 local run observed 29,394 cache evictions with zero cache errors.
The main-policy instance observed zero evictions and 639 error replies, retained
its existing sentinel, and eventually rejected a new 4 KiB probe. Exact counters
are workload- and allocator-dependent; the assertions intentionally check the
policy contract rather than pinning those counts.

This closes only isolated eviction-policy semantics and the safety of the drill.
It does not validate the current 512 MiB/256 MiB sizes, fork copy-on-write
headroom, allocator fragmentation at steady state, cache hit-rate degradation,
PostgreSQL fallback capacity, login/session behavior at main write rejection,
alert delivery, or recovery under representative concurrency. Those require a
target-environment pressure and sustained-load exercise with accepted capacity and
SLO criteria.

### Closed in code, external evidence pending: TLS and least-privilege ACL

Production startup now rejects plaintext connections, missing usernames, and the
`default` ACL identity for both data planes. Development remains permissive so the
current external environment can be upgraded without blocking feature work.
Official Redis security guidance recommends named ACL users for fine-grained
command and key access, and TLS for encryption in transit.

This startup invariant proves only requested client configuration. A release still
needs server-side evidence that TLS negotiation succeeds, the default user is
disabled, and each named identity has the exact command/key restrictions below.

Required users should be separated:

- application-main: token/session/limiter commands on `suar:*`, no admin commands;
- application-cache: cache read/write/expiry/scan/unlink and required Lua on
  `suar:cache:*`;
- operations-readonly: `INFO`, latency, slowlog read, and diagnostics;
- break-glass-cache-admin: cache-only flush, disabled or unissued by default.

The application-cache identity should not receive `FLUSHALL`, `CONFIG`, `DEBUG`,
`SHUTDOWN`, replication, module administration, or access to main keys.

The application cache control plane now fails closed:

- `CACHE_ADMIN_API_ENABLED=false` is the default; production does not register
  the routes at all, while disabled development/test requests return 404;
- enabling it still requires the built-in `superadmin` role. `system_admin` and
  custom roles are deliberately insufficient;
- every request requires an independent 32–256 byte
  `CACHE_ADMIN_BREAK_GLASS_TOKEN`, supplied through
  `x-cache-admin-break-glass-token` and compared in constant time;
- a missing or weak configured secret makes the control plane unavailable rather
  than falling back to the authenticated session;
- production registers only exact-key and cache-plane flush invalidation.
  Key listing, arbitrary value reads, and cache-value injection exist only in
  development/test;
- full flush retains a second explicit `x-confirm-cache-flush: flush-cache`
  confirmation and writes its critical audit intent before mutation;
- real-Redis HTTP integration proves rejected requests neither mutate cache nor
  create mutation audit events, and proves a cache-plane flush preserves a main
  Redis sentinel.

The break-glass secret must still be issued from a secret manager, rotated,
time-bounded by operations procedure, and omitted entirely while the feature
gate is disabled. This application guard does not replace the server-side ACL
release gate.

### Closed P1: rebuildable notification unread state is isolated on cache Redis

The notification unread-count projection is derived from PostgreSQL, has a
five-minute TTL, and falls back to canonical state on cache failure. Current
source now reads, writes, and publishes its rebuildable unread projection through
the dedicated `cache` connection rather than the main session/token plane.

Audit testing then exposed two residual defects:

- direct notification calls raced the cache connection's first healthy handshake
  because the optional cache correctly disables ioredis offline queuing;
- the revision CAS Lua script decoded an existing value without protection, so a
  malformed, legacy, or oversized payload prevented rebuild until TTL expiry.

The cache module now exposes a narrow `cacheRedisCommandStore` for raw,
revisioned projections. It shares `redisCacheStore`'s bounded initial handshake,
fail-fast reconnect behavior, key/script bounds, low-cardinality metrics, and
failure-log suppression. General application caching still uses the versioned
`cacheStore` codec. A static boundary test rejects any production module outside
the cache owner that calls `connection('cache')` directly.

The unread CAS now decodes only values at most 512 bytes and uses protected Lua
decode; invalid payloads are atomically replaced from canonical state. A
physically isolated real-Redis integration proves:

- the very first command succeeds without another cache flow warming the client;
- the physical key exists only on cache Redis, never main Redis;
- count/revision CAS and TTL behave correctly;
- malformed and oversized legacy values self-repair;
- the first miss rebuilds from PostgreSQL and the next read hits Redis;
- realtime cache publication succeeds even when it is the process's first cache
  command.

The connection boundary now scans both `app/` and `start/`. Realtime subscription
is exposed through a cache subscription port, and vendor health checks are created
inside a dedicated cache-infrastructure adapter; neither composition root receives
the raw cache connection. Only these two cache infrastructure owners are
allowlisted. The subscription port resolves only after the Redis ACK callback,
retries three bounded setup attempts, and the web composition root retries a
failed startup subscription with exponential backoff capped at 30 seconds. A
real-Redis first-subscription test proves an immediately published message is
received before startup declares the subscription healthy.

The notification PostgreSQL-fallback admission ZSET intentionally remains on main
Redis. It is a short-lived distributed lease/bulkhead, not rebuildable response
data, and therefore belongs with security/coordination locks rather than the LFU
cache eviction plane. Its Lua contract, lease renewal, release, TTL recovery, and
global concurrency cap have separate unit/real-Redis evidence. Production ACLs
must grant only the required sorted-set/scripting commands for this coordination
key.

### Closed P0: optional cache outage consumed the request deadline

The first live-container drill stopped only the dedicated cache Redis and ran all
six `List Tasks` integration flows. Every flow timed out after roughly four to six
seconds, and teardown also timed out. The database fallback code existed, but the
ioredis offline queue retained commands while reconnect and per-request retry
budgets elapsed. Calling this cache "best effort" was therefore not operationally
true.

The fix disables the offline queue only on the cache connection. Main Redis keeps
its bounded initial queue because sessions and the rate limiter are mandatory and
otherwise raced their first connection handshake. Cache callers share at most one
250 ms wait for the first healthy handshake; reconnecting clients never wait.
Test cleanup may suppress an unavailable cache only behind the explicit
`CACHE_CLEANUP_ALLOW_CACHE_OUTAGE=1` chaos-test flag.

Automated local evidence:

- an unused cache port completed `get`, best-effort population, and
  source-computing `remember` fallback, including a 50-read burst, in roughly
  8–14 ms;
- with the real cache container stopped, an authorized `List Tasks` query returned
  the PostgreSQL result in roughly 120–170 ms, below its 1.5-second regression
  deadline;
- during the same real outage, an independently authenticated operations request
  still received valid application-cache Prometheus metrics in roughly 100 ms;
- after a live stop/start, the same ioredis client instance wrote and read cache
  data again without restarting the application process; the orchestrated local
  drill completed in about six seconds.
- the HTTP readiness exercise reports both unavailable optional-cache checks as
  sanitized warnings. Unrelated required checks may still correctly return 503;
  on this workstation the independent RSS check exceeded its 350 MiB threshold,
  which the test now reports without misattributing the failure to Redis.

These timings prove fail-fast behavior on this development workstation. They are
not production latency SLO, sustained representative load, or HA failover
evidence.

### Closed local P1: task-list cold misses could stampede PostgreSQL

The representative task-list flow previously performed `cache get -> PostgreSQL
list -> PostgreSQL stats -> cache set`. `redisCacheStore` already provided local and
Redis-backed single-flight, but this query bypassed `remember`, so simultaneous
cold requests could each execute both source queries.

The query now:

- resolves authorization before cache coordination and includes the effective
  permission scope in the logical key;
- resolves one immutable generation-scoped physical key;
- uses `cacheStore.remember` with a 1.5-second bounded waiter budget when Redis is
  available, coalescing work both within one process and across processes;
- falls back to process-local single-flight on the authorization-scoped logical
  key when generation resolution is unavailable, so a cache outage does not
  immediately become one source query per request inside every app instance;
- never stores the local outage result and remains source-of-truth correct.

The opt-in `test:redis:task-list-load` drill uses the dedicated PostgreSQL test
database and physical cache-test Redis:

- 64 simultaneous owner cold reads produced exactly one pagination call and one
  statistics call; 128 subsequent warm reads produced no additional source call;
- 32 owner plus 32 member cold reads produced exactly one computation per
  authorization scope and never exposed the owner-only task to the member;
- after organization generation rotation, another 32+32 burst again produced
  exactly one computation per scope;
- three consecutive final drill runs with telemetry assertions passed; observed
  cold/warm-scope cases completed in roughly 0.25–0.54 seconds on this
  workstation.

The CI integration job runs the same drill after the full safe integration suite,
using its PostgreSQL service and physically separate cache Redis service. The
Redis-only CI job deliberately does not claim database-backed flow coverage.

During a real stop of cache development Redis, 50 concurrent task-list reads also
returned the authorized PostgreSQL result with one pagination and one statistics
call in roughly 0.36 seconds. This is bounded local evidence, not a sustained-load
SLO. During a total Redis outage, coordination is only per app process; an
N-instance fleet can still execute up to N source computations for the same key.
Production acceptance therefore still requires representative multi-instance
cold-start, outage, recovery, connection-storm, and database-capacity evidence.

### Closed P1: cache outage amplified application logs

Fail-fast Redis commands originally still emitted one structured log per failed
read, best-effort write, generation lookup, distributed-lock operation, and lease
operation. Under a broad cache outage this could turn source-database fallback
traffic into a log I/O and ingestion incident.

The application now keeps one process-local gate per fixed low-cardinality
dependency channel: `read`, `write`, `generation`, `lock`, and `lease`.

- the first failure is logged immediately;
- repeated failures remain counted but their physical logs are suppressed;
- one periodic failure log is allowed per channel after the configured interval
  and reports how many failures were suppressed since its previous emission;
- the first successful command closes that channel and emits one recovery event
  with outage duration, total failures, and remaining suppressed count;
- the default interval is 30 seconds and configuration is rejected outside
  `1,000–300,000 ms`;
- no raw cache key, value, tenant, user, or query enters the decision state,
  metric labels, or recovery log.

The real unused-port drill sends 50 concurrent cache reads. It completed in about
8–14 ms, emitted exactly one physical read-channel error log, counted and
suppressed the other 49, and still returned 50 cache misses. The live stop/start
drill proves the same process increments the recovery counter after its first
successful post-recovery read. This bounds each process independently; a fleet
outage still produces one initial log per channel per process, so the production
collector must aggregate `suar_cache_dependency_log_events_total`.

The audit also exposed a test-runner race: Redis lock tests and an authenticated
HTTP metrics file previously shared one Japa process and cache-test DB. HTTP
fixture teardown uses an intentional `FLUSHDB`; when it overlapped a slow
single-flight test, the distributed lock vanished and produced false duplicate
computations. Arbitrary sleeps did not solve this. Lock tests now wait for positive
`PTTL` before starting a follower. `test:redis:integration` runs five Redis-only
behavior, multi-process, notification, cache-admin HTTP, and metrics files in
sequential Node/Japa processes. The database-backed
`test:redis:authorization` runner separately executes durable outbox, task
collection authorization, and task metadata authorization after the safe
PostgreSQL bootstrap. The current combined local run passed 38/38 against the
isolated cache-test endpoint.

### Closed local baseline, Open P1 production integration: observability

Implemented application signals:

- read hits, misses, and failures;
- strict and best-effort writes;
- invalidation counts, errors, and number of keys unlinked;
- distributed-lock acquired, contended, and unavailable outcomes;
- wait success/timeouts and recomputations;
- dependency-log emitted, suppressed, and recovered outcomes split only by the
  fixed five-value channel label;
- fixed latency buckets per cache operation;
- health reporting for both Redis endpoints and memory;
- a dedicated-`METRICS_API_KEY`-protected `/metrics/cache` Prometheus text endpoint
  with process-start, read/write/invalidation/lock counters, and cumulative
  operation histograms;
- no key/value/user/organization labels in telemetry;
- cache failure logs expose only a validated namespace plus a truncated SHA-256
  correlation digest, never the raw logical key, pattern, lock key, or value.

The independently operated local stack now also provides:

- one `redis_exporter` v1.84.0 instance per Redis data plane, pinned by multi-arch
  digest, running as UID/GID 59000, with a read-only root filesystem, all Linux
  capabilities dropped, no published host port, config-value redaction, a
  two-second connect timeout, and the arbitrary-target `/scrape` endpoint disabled;
- Prometheus v3.13.1 LTS pinned by digest, running as `nobody`, read-only with all
  capabilities dropped, published only on `127.0.0.1:9090`, and bounded to 15 days
  or 1 GiB of TSDB retention;
- separate stable labels for main/security-sensitive and cache/rebuildable planes;
- one hit-ratio recording rule plus 16 availability, connection, client, memory,
  eviction, persistence, and hit-ratio alert rules with `owner=platform`;
- `promtool` proof that the collector config and all 17 rules parse;
- runtime proof that both exporter targets and both `redis_up` series equal one,
  every base metric used by the rules exists, and all rule groups report
  `health=ok`;
- a live cache-stop drill where `redis_up{job="redis-cache"}` changed to zero and
  `RedisCacheUnavailable` became pending, followed by a return to one after
  recovery; the application metrics endpoint also remained available throughout
  the stopped-cache phase. Main Redis, PostgreSQL, and Elasticsearch container
  identities did not change.

The local exporter currently covers these server signals:

- `used_memory`, `maxmemory`, allocator fragmentation;
- `keyspace_hits`, `keyspace_misses`;
- `evicted_keys`, `expired_keys`;
- rejected connections and command failures;
- connected and blocked clients;
- command latency percentiles and slowlog growth;
- AOF rewrite status and last persistence error;
- role, replica link status, replication lag, and full resync count;
- Sentinel quorum/failover state when HA is introduced.

The local Prometheus configuration does not scrape the application
`/metrics/cache` endpoint because `METRICS_API_KEY` is intentionally unset in
the development environment. This avoids inventing or committing a collector
secret; production must mount a dedicated secret and configure an authenticated
HTTPS scrape before application cache SLOs can be alerted.

Still required before production:

- discover and scrape `/metrics/cache` on every application instance. Supply
  `x-api-key` through Prometheus `http_headers` using a mounted secret file, never
  an inline committed secret; use TLS and a dedicated collector identity in the
  target environment;
- deploy a highly available or managed collector/remote-write target with fleet
  aggregation, retained incident correlation, and capacity ownership;
- add reviewed dashboards for main Redis, cache Redis, application cache,
  invalidation outbox, source-database fallback load, and SLO/error budget;
- connect rules to Alertmanager or the organization paging system, test receiver
  routing/inhibition/escalation, and protect the monitoring UI with production
  authentication and TLS;
- provision a dedicated least-privilege monitoring ACL identity when Redis ACLs
  are enabled;
- calibrate every threshold with sustained-load, memory-pressure, cold-cache, and
  failover evidence. A syntactically healthy local rule is not proof of an
  operational production alert.

### Closed P2 in code, production calibration pending: synchronized expiry

Distributed single-flight limits duplicate work per key, including across processes,
but it cannot stop many different hot keys with one fixed TTL from expiring
together. Every rebuildable `redisCacheStore` write now receives deterministic
downward-only jitter in the inclusive 90–100% window:

- a SHA-256-derived key bucket gives the same logical key the same effective TTL
  across application processes while spreading different keys across the window;
- effective TTL never exceeds the caller's requested TTL, so jitter cannot extend
  the maximum-staleness contract;
- one-second and other small TTLs remain at least one second;
- both the in-memory test adapter and physical Redis use the same policy;
- session, refresh token, limiter, and other security state use main Redis directly
  and never pass through `redisCacheStore`.

Unit evidence proves deterministic bounds and distribution over 512 keys.
Real-Redis evidence verifies physical `PTTL` for 48 keys matches the computed
window. Production still needs namespace-specific TTL/hit-rate tuning; a ten
percent earlier expiry can increase source load if a namespace's TTL was already
too short.

### Closed P1 lifecycle leak, production cardinality calibration pending

The audit found `generation:control:*` keys with Redis TTL `-1`. Because their
names contain opaque scope digests, every organization, user, or task scope that
was ever visited could leave a permanent control after the source entity was
deleted. Cache eviction placed an eventual memory ceiling on this behavior, but
it did not provide an explicit lifecycle.

The generation resolver now applies one validated lifecycle policy:

- default 604,800 seconds (seven days), configurable from
  `CACHE_GENERATION_CONTROL_TTL_SECONDS`;
- fail-fast range 86,401–7,776,000 seconds, strictly longer than the maximum
  payload TTL;
- missing controls are created with `SET ... EX` inside the resolver Lua script;
- legacy controls with TTL `-1`, controls below half-life, and controls above a
  newly reduced configured ceiling are atomically repaired with `EXPIRE`;
- healthy controls above half-life are read without an expiry write, avoiding
  write amplification on every cache lookup;
- generation rotation always installs the next token with the full TTL.

Concurrent first-resolve coverage proves 50 callers converge on one physical key.
Real Redis tests also prove legacy persistent-key repair, half-life refresh,
rotation TTL, and the safety property that control expiry makes an old payload
unreachable while leaving it physically present until its own TTL.

This bounds idle control lifetime, not absolute cardinality. Capacity must include
every distinct global/org/user/task control touched during the sliding window.
Before a rolling production rollout, stop old writers that can still create
persistent controls. Then either perform a planned cache-only cold flush, or use a
bounded cursor-based migration that matches only `generation:control:*`, attaches
TTL only where `TTL = -1`, and records scanned/repaired/error counts. Never run
`KEYS` for this migration. The current development cache was empty after test
cleanup, so no destructive migration was needed.

The local exporter was verified with one temporary volatile key and one temporary
persistent key: `redis_db_keys - redis_db_keys_expiring` reported exactly one,
after which both audit keys were deleted. `RedisCachePersistentKeys` now warns per
logical DB after 15 minutes and the live Prometheus rule API confirms it is loaded.
Production alert delivery/calibration and a generation-control
cardinality/create/refresh signal remain open.

### Closed P2 baseline, bounded residual: slow distributed fills

A real-Redis regression first proved the old failure: a healthy 2.3-second source
callback exceeded the fixed two-second waiter budget and executed twice across two
simulated application processes.

Distributed `remember` now uses:

- a two-second Redis lease acquired with a random owner token;
- a 500 ms heartbeat whose Lua compare-and-`PEXPIRE` extends only the current
  owner's lease;
- fenced compare-and-delete release, so a stale owner cannot delete its successor;
- bounded exponential polling that detects a published value, an unavailable
  cache, or a disappeared lease;
- prompt takeover after an abandoned lease expires;
- a five-second default wait budget and an explicit per-call `waitTimeoutMs`
  contract bounded to 100–30,000 ms;
- a maximum heartbeat lifetime of `waitTimeoutMs + 2 seconds`, preventing a hung
  callback from renewing a lock forever;
- low-cardinality metrics for lease extension/loss/error/cap and waiter
  success/timeout/release/unavailability.

Real-Redis evidence now proves:

- the same 2.3-second fill executes once and both processes receive the leader
  value while heartbeat extensions occur;
- a synthetic abandoned 300 ms owner is detected and taken over in about 370 ms;
- replacing the owner token during a fill is detected, and the stale owner's
  release leaves the successor lock intact;
- a deliberately short 300 ms waiter budget falls back to a second source
  computation and increments timeout/recomputation metrics.

The final behavior is deliberately bounded, not an unlimited wait. A callback
longer than its wait budget can still be recomputed to preserve request
availability. Before a slow namespace uses `remember`, set its budget from the
source p99 and end-to-end request deadline, alert on wait timeout/lease error, and
ensure fallback concurrency remains within database capacity. Serving stale data
is not a safe global substitute because several namespaces contain
authorization-scoped views; stale-while-revalidate requires an explicit
namespace-level security and staleness contract.

The Redis integration suite now forks two independent Node processes, shares one
real Redis lock, holds the leader fill for 800 ms, and proves that both processes
receive the same result while the source callback executes once. This closes the
cross-process correctness baseline. Add namespace-level load cases for callback
durations below the wait budget, between the wait and lease budgets, and above
the lease. Alert on lock-wait timeouts and duplicate computations rather than
hiding them inside a global hit-rate metric.

### Closed baseline, calibration pending: value-size budget

Logical keys, TTLs, and serialized values are bounded. One rebuildable cache value
may not exceed 1 MiB:

- strict writes reject an oversized value before contacting Redis;
- best-effort population skips and counts the write while returning source data to
  the user;
- reads reject an oversized pre-existing raw value before decoding and degrade to a
  miss, preventing an untrusted or legacy entry from bypassing the write bound;
- logs contain only byte counts and the configured maximum, not the key or value;
- unit and real-Redis integration prove rejected writes create no physical entry
  and oversized existing entries are not returned.

Before production, measure the serialized value distribution and decide whether the
1 MiB default should be lowered (for example to 512 KiB). Per-namespace exceptions
must be based on measured source-query cost and memory/network budgets, not
convenience. Add a near-limit histogram/alert in the external metrics exporter.

### Closed P2 by API removal: atomic counters require a separate encoding contract

`INCRBY`/`DECRBY` operate on raw Redis integer strings, whereas ordinary
`redisCacheStore.set` writes an envelope. Audit found no active counter call site, so
the unsafe `increment`/`decrement` methods were removed from the public cache
surface. This prevents a future caller from mixing the two encodings on one key
and receiving a Redis value/type error.

If counters become a real product requirement, they must be introduced as a
separate port only after all of the following exist:

- define a dedicated counter namespace and initializer;
- add real Redis contract tests;
- prevent ordinary cache writes to counter keys;
- document overflow and TTL behavior.

A unit contract asserts that the envelope cache API does not expose raw counter
commands.

## Failure-mode matrix

| Failure                                                | Expected behavior now                                                                       | Remaining risk                               | Required proof                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Cache Redis unavailable during read                    | fails fast; task-list burst coalesces once per app process; local 50-read flow about 0.36 s | up to one source fill per process/key        | sustained multi-instance outage load                          |
| First cache commands race the initial handshake        | one bounded wait is shared across concurrent callers                                        | first request may bypass after 250 ms        | concurrent cold-process Redis integration                     |
| Cache Redis unavailable during best-effort population  | write rejects immediately; response succeeds; skip counted                                  | hit rate collapse                            | deployed telemetry assertion                                  |
| Cache Redis outage under request burst                 | every failure counted; one initial/periodic log per channel; recovery logged                | one initial event per process/channel        | fleet-scale outage and collector load test                    |
| Cache Redis unavailable during invalidation            | committed mutation succeeds; durable intent retries                                         | stale window until recovery                  | outage/recovery load drill                                    |
| Cache Redis recovers after a live stop                 | existing application client reconnects without restart                                      | fleet timing and connection storm unknown    | deployed multi-instance recovery drill                        |
| Cache Redis monitoring detects outage                  | local `redis_up` becomes 0 and alert becomes pending; returns to 1 on recovery              | no receiver/paging delivery yet              | Alertmanager routing exercise                                 |
| Worker dies after Redis delete, before ACK             | lease expires; next worker repeats idempotent delete                                        | extra scan/unlink work                       | process-kill drill                                            |
| Worker dies while holding a lease                      | expired lease is reclaimed; stale token cannot ACK                                          | delay up to lease duration                   | deployed lease-recovery drill                                 |
| Invalid outbox payload                                 | poison row dead-letters; next rows continue                                                 | manual review/replay required                | DLQ alert and runbook exercise                                |
| Outbox migration missing                               | readiness fails; app/worker deployment gate must fail                                       | service cannot become ready                  | clean deployment verification                                 |
| Test database baseline/ledger is not reproducible      | safe migration reports 2 corrupt/20 pending and a missing legacy helper                     | false confidence from a pre-existing DB      | restore approved baseline, reconcile ledger, migrate empty DB |
| Dedicated cache reaches maxmemory                      | isolated drill proves LFU eviction and continued read/write                                 | low hit rate, churn, DB fallback surge       | target-load memory-pressure test                              |
| Main Redis reaches maxmemory                           | isolated drill proves no eviction, preserved reads, and rejected new writes                 | login/refresh/session failures               | target-load alert and capacity test                           |
| Local topology regresses to one shared process         | production policy rejects; dev needs runtime audit                                          | host OOM kills main and cache together       | topology assertion + capacity test                            |
| Main Redis unavailable                                 | auth/session/limiter fail                                                                   | application availability                     | HA failover drill                                             |
| Cache process restarts                                 | same-key task-list burst is single-flight                                                   | many distinct keys and fleet reconnect surge | representative multi-key cold-start load                      |
| One app process restarts                               | local single-flight/metrics reset                                                           | fleet metric discontinuity                   | external collector                                            |
| Healthy cache fill exceeds the old fixed waiter budget | heartbeat keeps owner lease; bounded waiter shares the published value                      | fills beyond configured budget recompute     | namespace p99/deadline load test                              |
| Fill owner crashes while holding a lease               | lease expires; waiter detects release, acquires, and recomputes                             | delay up to remaining lease TTL              | real-Redis abandoned-owner test                               |
| Stale fill owner releases after ownership changed      | fenced release preserves the successor token                                                | successor may still exceed its own budget    | real-Redis owner-replacement test                             |
| Generation control expires or is evicted               | next resolve creates a new token; old payload is unreachable                                | safe cold miss and extra source load         | real-Redis expiry test                                        |
| Historical generation control has no expiry            | active namespace is repaired at resolve                                                     | idle orphan persists until rollout cleanup   | bounded migration plus persistent-key alert                   |
| Invalidation event duplicated                          | deletes repeat safely                                                                       | extra Redis work                             | idempotency/load evidence                                     |
| Keyspace changes during `SCAN`                         | duplicate/unstable scan pages possible                                                      | repeated unlink or missed newly created key  | generation invalidation                                       |
| AOF loses latest second                                | recent main writes may disappear                                                            | session/token inconsistency                  | accepted RPO + failover/restore drill                         |

## Proposed SLO and alert baseline

These are proposed engineering gates, not claims about current production behavior.
They must be accepted by product/platform owners and calibrated with load tests.

### Main Redis

| Signal                | Initial target                                    |
| --------------------- | ------------------------------------------------- |
| Availability          | ≥99.95% monthly                                   |
| Command p99           | <10 ms inside deployment network                  |
| Used memory           | warning at 75%, critical at 85% of configured max |
| Evicted keys          | exactly 0                                         |
| Rejected writes / OOM | exactly 0 outside a planned test                  |
| Replication lag       | <1 second sustained                               |
| Persistence errors    | exactly 0                                         |
| Full resync           | alert on unexpected occurrence                    |

### Cache Redis and application cache

| Signal                       | Initial target                                            |
| ---------------------------- | --------------------------------------------------------- |
| Cache command p99            | <10 ms inside deployment network                          |
| Best-effort write skips      | <0.1% over 5 minutes                                      |
| Read errors                  | <0.1% over 5 minutes                                      |
| Distributed lock unavailable | 0 sustained; alert if >1% over 5 minutes                  |
| Lock wait timeout            | <0.1% of remembered lookups                               |
| Pattern invalidation p99     | <250 ms at tested peak key count                          |
| Used memory                  | warning at 80%, critical at 90%                           |
| Hit rate                     | establish per namespace; do not use one fleet-wide target |

Hit rate must be segmented by stable, low-cardinality namespace. A single global hit
rate can hide a failing critical cache behind a high-volume healthy cache.

## Capacity model

Do not size Redis from payload bytes alone.

For each namespace, measure:

1. serialized value bytes;
2. key bytes;
3. Redis object/dictionary overhead using `MEMORY USAGE`;
4. active key count at peak cardinality;
5. replica and persistence copy-on-write headroom;
6. allocator fragmentation;
7. client buffers, Lua, slowlog, and operational overhead.
8. generation-control cardinality across the configured sliding window, including
   deleted tenant/user/task scopes that have not expired yet.

A conservative starting estimate is:

`required maxmemory = peak live key bytes × fragmentation factor ÷ target occupancy`

Use an observed fragmentation factor, initially 1.3 if no evidence exists, and a
target occupancy no higher than 0.70–0.75. The external service runtime or VM must
remain above
Redis `maxmemory` to leave headroom for allocator overhead, replication buffers,
fork copy-on-write, and the server itself.

The opt-in generation-capacity drill created 5,000 unique controls through the
real application Lua resolver on the isolated cache-test process. On
2026-07-26 it measured:

- 5,000 unique physical controls, all with the configured TTL;
- about 29,147–40,099 resolutions/second across three local runs (diagnostic
  throughput, not a production SLO);
- `MEMORY USAGE` p50/p95 of 163 bytes per control;
- 1,004,400–1,090,248 bytes of total `used_memory` growth, about 201–218 bytes per
  control once allocator/dictionary growth is included;
- exact cleanup returning the cache-test process to `DBSIZE=0`.

At the observed total delta, one million controls alone would require roughly
192–208 MiB before payloads, client buffers, fragmentation headroom, replication,
or operational reserve. A seven-day TTL therefore still needs an
admission/capacity forecast based on new distinct scopes per day; TTL bounds time,
not traffic.

Main Redis capacity must include:

- server-side sessions for the full 30-day configured session age;
- one access and one refresh record per active issued pair;
- refresh-token overlap caused by user devices and login frequency;
- rate-limiter keys and their burst cardinality;
- operational headroom during AOF rewrite and failover.

## Production release gates

Every gate needs a dated artifact, owner, command/scenario, and result.

- [ ] Dedicated main and cache endpoints in the target environment.
- [ ] TLS verified from application to both endpoints.
- [ ] Named least-privilege ACL users; default user disabled.
- [ ] Secrets supplied by a secret manager, not image, repository, or shared
      environment file.
- [ ] Main Redis primary plus replica and automated failover.
- [ ] At least three independent Sentinel voters, or managed-service equivalent.
- [ ] Planned failover completes within accepted RTO and the client reconnects.
- [ ] Redis hosts have an approved `vm.overcommit_memory` policy, THP disabled,
      swap/oom behavior reviewed, and fork/replication headroom measured.
- [ ] Main Redis backup/restore drill meets accepted RPO/RTO.
- [x] Local atomic RDB copy, checksum validation, isolated boot, sentinel restore,
      and live-snapshot cleanup are automated and evidenced.
- [ ] Cache flush/cold restart under peak-like traffic stays within DB capacity.
- [x] Isolated local memory-policy drill proves cache LFU eviction with continued
      writes and main `noeviction` preservation/rejection behavior.
- [ ] Target-environment memory-pressure test under representative concurrency
      validates capacity, fallback load, alert delivery, and recovery.
- [x] Transactional invalidation outbox, fenced worker, DLQ, bounded replay, and
      readiness are implemented with unit/PostgreSQL/real-Redis evidence.
- [x] Real Redis CI job covers physical TTL, generation rotation, failure
      semantics, authenticated cache metrics, and two-process single-flight.
- [x] Five Redis-only and three PostgreSQL-backed cache authorization files run
      through separate sequential runners so fixture `FLUSHDB` or schema teardown
      cannot erase another file's in-flight work.
- [x] Local and CI cache tests use a physical cache-test endpoint; the guard
      rejects DB-number-only isolation from cache development.
- [x] Startup/test guards reject obvious equivalent-host aliases and normalized
      ports; target deployment must still prove arbitrary DNS/CNAME endpoints map
      to different provider resources.
- [x] The opt-in 5,000-control capacity drill measures TTL, per-key memory,
      aggregate Redis memory growth, throughput, and exact cleanup.
- [x] Generation controls have a validated sliding TTL; real Redis tests cover
      concurrent creation, legacy repair, refresh, rotation, and expiry safety.
- [ ] Target rollout proves no cache-plane generation control remains persistent
      and alerts when non-expiring cache keys reappear.
- [x] Playwright E2E boot is guarded by explicit PostgreSQL/main/cache Redis test
      targets. Owner/member/other-organization role-play proves a real cache hit,
      mutation-driven generation change, independent outbox delivery, and tenant
      isolation.
- [x] Raw user-detail/list/skills/profile-snapshot caches are disabled and
      regression tests prove stale Redis entries are ignored.
- [ ] Deployed invalidation outbox survives forced Redis outage and worker process
      death under peak-like traffic.
- [ ] Versioned base-schema artifact can provision an empty database before
      incremental migrations run.
- [x] Local per-plane Redis exporters, bounded Prometheus retention, rule syntax,
      live target health, and cache-outage alert transition are evidenced.
- [x] Local cache-plane persistent-key expression was measured against temporary
      volatile/persistent keys; the loaded alert detects the exact difference.
- [x] Application cache metrics expose valid Prometheus text behind the operations
      API-key boundary, with unit and authenticated/unauthenticated HTTP evidence.
- [x] Real unused-port burst proves 50 failures become one read-channel log plus
      49 counted suppressions; live restart proves recovery telemetry.
- [ ] Production collector discovers and scrapes every application instance using
      TLS and a secret-backed collector credential.
- [ ] Dashboards and alerts cover application and server signals.
- [ ] Slowlog and latency-monitor review is part of performance acceptance.
- [x] Local bounded task-list drill covers same-key warm/cold load, authorization
      scopes, generation invalidation, a 50-request outage burst, and same-process
      Redis recovery.
- [ ] Target-environment sustained load covers many keys, multiple app instances,
      cache outage/recovery, connection storms, and database capacity.
- [ ] Authorization cache matrix covers owner/admin/member/viewer/external/system
      actors for every permission-dependent namespace.
- [x] Highest-risk warm-cache transitions cover task metadata access, task
      collection admin downgrade, project-member pending-review revocation, and
      review-session authorization/invalidation with real Redis.
- [x] Static raw-cache-connection policy scans `app/` and `start/`; only the
      cache command/subscription owner and cache health adapter are allowlisted.
- [x] Admin cache control plane defaults disabled, requires strict superadmin plus
      a separate bounded break-glass credential when enabled, removes value
      inspection/injection routes from production, and has real-Redis negative
      and cache-plane-isolation evidence.
- [ ] Full regression suite is green, or every unrelated failure is triaged and
      explicitly accepted.

## Required test pyramid

A unit test alone is never accepted as proof for a cache-sensitive user flow.

For each critical cache flow, require:

1. Domain/unit test:
   key canonicalization, policy decision, codec, or invalidation pattern.
2. Component test:
   `redisCacheStore` behavior with controlled failures and time.
3. Real Redis integration:
   physical TTL, atomicity, `SCAN`, Lua, reconnect/failure behavior.
4. Database integration:
   mutation changes source data and invalidates the actual key.
5. HTTP contract test:
   status, response shape, authorization, and side effects.
6. Multi-actor negative test:
   privileged actor warms; less privileged actor cannot reuse.
7. Browser role-play:
   separate sessions navigate the real UI and verify visible behavior.
8. Static policy guard:
   intentionally zero-cache sensitive query families cannot import or call the
   cache service again without an explicit test review.
9. Load/chaos test:
   concurrent misses, Redis outage, failover, cold cache, and recovery.

Current evidence includes levels 1–7 for the task-list authorization boundary:
the browser layer uses isolated owner/member/other-organization contexts and
proves a real Redis hit through the authenticated Prometheus counter. It then
assigns the task through the real HTTP mutation, waits for the independent
invalidation worker, proves only the affected organization generation changes,
and verifies the member sees the new assignment while the other organization
remains isolated. The latest role-play run passed 3/3, and exact seed cleanup left
zero seed tasks/users and zero outbox rows. Levels 1–3 cover cache
codec/generation/single-flight behavior. Level 8 is enforced for the zero-cache
user projections, and their database-backed suite passed 3/3 against `suar_test`.
The current eight-process PostgreSQL/real-Redis runner passed 38/38, including
role-downgrade, task-metadata authorization, project-member revocation, and
review-session-v4 outbox regressions. Outbox integration teardown preserves
migration-owned schema.

Level 9 has bounded local evidence: unused-port failure; 64 cold plus 128 warm
task-list reads; parallel owner/member scopes before and after invalidation; a
50-request authorized database-backed outage burst; optional-cache readiness
warnings; same-process recovery; and a two-process single-flight drill all pass
with explicit deadlines. The final task-list load drill passed three consecutive
complete runs, the browser role-play passed three times after this change, and the
current cache-outage subset passed 4/4. The opt-in
`test:redis:resilience` runner restores cache through an exit trap and asserts
that PostgreSQL, Elasticsearch, and main Redis
container identities do not change. Sustained multi-key load, cold-fleet
pressure, multi-instance reconnect behavior, database-capacity acceptance, and
production HA failover remain release blockers.

## Operational triage

Safe first checks:

1. Use `GET /live` only to determine whether the application process can serve HTTP.
2. Call protected `GET /health` with `x-api-key` and distinguish main Redis, cache
   Redis, and `cache_invalidation_outbox`.
3. Run `node ace cache:invalidation-status`. Exit code `2` means schema missing or
   dead letters exist; the JSON line exposes only counts and oldest age.
4. If a dead letter is understood and Redis/root cause is fixed, replay a bounded
   reviewed set:

   `node ace cache:invalidation-replay --actor-id=<operator-uuid> --reason="<why safe>" --ids=<outbox-uuid,...>`

   Alternatively supply both `--from-sequence` and `--to-sequence`; the inclusive
   range cannot exceed 100 positions. `--error-class` is only an additional filter,
   never a standalone selector.

5. Confirm rows return to `pending`, the worker processes them, dead-letter count
   reaches zero, and the `cache.invalidation_outbox.replayed` audit event exists.
6. Inspect application cache runtime telemetry:
   - read error rate;
   - best-effort skips;
   - invalidation errors;
   - lock contention/unavailable/timeouts;
   - operation latency.
7. Inspect Redis `INFO` sections for memory, stats, clients, persistence,
   replication, command stats, and keyspace.
8. Compare cache-plane total keys with expiring keys. Investigate every persistent
   key by namespace; generation controls and ordinary cache payloads must expire.
9. Review `SLOWLOG GET` and `LATENCY LATEST`.
10. Compare source DB state with one exact logical cache key.
11. If data is stale, identify the mutation and invalidation intent before flushing
    a namespace.

Default outbox readiness thresholds:

- warning: at least 1,000 pending rows or oldest outstanding age at least 30 seconds;
- failure: at least 10,000 pending rows, any dead letter, or oldest outstanding age
  at least 300 seconds;
- thresholds for age are configurable; counts are deliberately low-cardinality.

Deployment order:

1. restore/provision the validated base PostgreSQL schema;
2. run `node build/ace.js migration:run --force` once;
3. only after success, start the app and cache-invalidation worker;
4. verify `/live`, protected `/health`, and `cache:invalidation-status`;
5. do not let every app replica run migrations independently.

Do not:

- run `KEYS *` on production;
- run `FLUSHALL`;
- flush main Redis;
- paste passwords into shell history or incident chat;
- use `MONITOR` during normal production traffic;
- treat deletion as a fix without locating the missing invalidation;
- treat a healthy `PING` as proof of acceptable latency, memory, persistence, or
  replication.

## Official references

- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis production administration](https://redis.io/docs/latest/operate/oss_and_stack/management/admin/)
- [Redis configuration](https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- [Redis key eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [Redis security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- [Redis ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)
- [Redis TLS](https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/)
- [Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- [Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- [Redis latency monitoring](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/)
- [Redis latency diagnosis and `KEYS` warning](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)
- [Redis `INFO` metrics](https://redis.io/docs/latest/commands/info/)
- [Redis `SCAN` guarantees](https://redis.io/docs/latest/commands/scan/)
- [Upstream Redis exporter](https://github.com/oliver006/redis_exporter)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus scrape and custom HTTP-header configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)

## Decision record

This document deliberately does not declare Redis Cluster, Sentinel, managed Redis,
or a specific cloud service as the final platform. The correct decision depends on
traffic, availability target, operating model, and budget.

It does declare the non-negotiable properties:

- security-sensitive state and disposable cache remain physically isolated;
- authorization is evaluated independently from cache;
- main Redis is durable and highly available;
- cache can fail without corrupting source-of-truth data;
- invalidation intent is durable;
- key/value/TTL cardinality is bounded;
- production behavior is observable;
- user-role, real-Redis, load, outage, failover, and restore evidence exists before
  launch.
