# Search Enterprise Readiness

## Status

Suar Search now has a measurable relevance contract, a physically isolated Elasticsearch test
plane, stable index aliases, versioned physical indices, bounded fail-closed bulk indexing, and
privacy-safe per-source query telemetry. It is a strong pre-production foundation, but it is not
yet valid to call it production-proven because Suar has no production traffic or representative
capacity environment.

| Capability                    | Current evidence                                                                                       | Status                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Test isolation                | Dedicated `127.0.0.1:9201` service, disposable tmpfs, guarded test-only prefixes                       | Ready                                |
| Ranking quality               | 18 judged queries across 6 indices; Recall@5 `1.0`, MRR@5 `1.0`, nDCG@5 `0.990777`                     | Pass                                 |
| Serial latency                | 360 measured samples; p50 `14.103448 ms`, p95 `65.341186 ms`, p99 `88.773738 ms`                       | Pass against local p95 ≤ 100 ms gate |
| Concurrent latency            | 360 measured samples at concurrency 8; p50 `121.761937 ms`, p95 `290.179903 ms`, p99 `401.390964 ms`   | Fails local p95 ≤ 250 ms gate        |
| Index migration               | Stable alias, versioned backing index, count verification, atomic alias promotion                      | Ready for controlled rebuilds        |
| Generation operations         | Audited inventory, retention cleanup, exact-state fencing, atomic rollback, real Elasticsearch test    | Ready for controlled operations      |
| Bulk safety                   | Maximum 500 documents and 5 MiB per request; any item rejection fails the operation                    | Ready                                |
| Query telemetry               | Query hash/length, total duration, per-source duration/status/count, degradation and ranking algorithm | Ready                                |
| Production SLO/capacity       | No representative deployment or real-user workload                                                     | Not measured                         |
| Concurrent-write-safe rebuild | No durable high-watermark/replay protocol around an alias swap                                         | Open                                 |

The measurements above are the baseline produced on 2026-07-26 with Elasticsearch 8.15.5 in the
single-node local test container. The node has a deliberately small resource budget, so the
concurrent failure is recorded rather than hidden by weakening the gate.

## Ranking system

Each vertical index uses Elasticsearch BM25 through weighted `multi_match` queries. Important
identity/title fields receive higher boosts, fuzzy matching handles typographical errors, and
`phrase_prefix` preserves type-ahead recall. Organization search applies an `AND` operator to the
high-precision fuzzy branch while retaining the prefix branch as a recall fallback.

User directory identifiers use a custom Unicode-aware analyzer. Punctuation in usernames and
emails is tokenized while lowercase and ASCII folding are applied. On the judged corpus, the three
natural identifier queries changed from 0/3 hits to 3/3 rank-one hits.

Search Center then combines application text rank and source/provider rank with Weighted Reciprocal
Rank Fusion:

```text
RRF(d) = Σ weight(signal) / (60 + rank(signal, d))
```

The current weights are `2` for normalized application text rank and `1` for the vertical
provider rank. Competition ranking is used for equal text scores, so the provider rank resolves a
real tie instead of an accidental alphabetical order. Every result exposes
`rankingAlgorithm=weighted_rrf_v1`, its fused score, and the contributing ranks. The legacy display
score remains for UI compatibility and is not presented as the RRF score.

The Elasticsearch ranking improvements on the same judged corpus moved overall MRR@5 from
`0.972222` to `1.0` and nDCG@5 from `0.970273` to `0.990777`; Recall@5 remained `1.0`. Weighted RRF
currently has deterministic unit evidence for cross-source tie behavior, not a separate human
judgment experiment, so no unsupported RRF percentage improvement is claimed.

## Latency work and evidence

Repository search hot paths previously performed `indices.exists` before every query. Removing
that lifecycle request reduced the paired-run serial p50 from `38.966846 ms` to `18.053271 ms`
(`53.7%`) and concurrent p95 from `566.981167 ms` to `371.047993 ms` (`34.6%`). Missing-index
failures now flow through the existing bounded module fallback instead of adding a control-plane
round trip to every healthy query.

The final run recorded serial p95 at `65.341186 ms`, but concurrent p95 remains above the
`250 ms` local gate. Plausible next experiments must be measured one at a time: representative heap
and CPU sizing, shard count, filesystem cache warmup, slow-log evidence, query profiling, and only
then mapping/query changes. Elasticsearch's own guidance emphasizes filesystem cache, avoiding
searching too many shards, realistic benchmarking, and profiling before optimization.

An additional diagnostic matrix used the same 3,022-document corpus with 3 warmups and 10 measured
iterations per query:

| Concurrent workers | Concurrent p95 |
| -----------------: | -------------: |
|                  1 |   94.657092 ms |
|                  2 |   94.026133 ms |
|                  4 |  161.450428 ms |
|                  8 |  380.805066 ms |

The test container has 1 CPU, a 256 MiB Elasticsearch heap, and a search pool of 2 threads. There
were no rejected search tasks, but latency rises sharply after concurrency exceeds the available
search execution capacity. A measured attempt to reduce fuzzy-query expansion
(`prefix_length=1`, `max_expansions=25`) preserved relevance but changed concurrent p95 from
`290.179903 ms` to `293.483008 ms` in the full benchmark, so the change was rejected. This prevents
an unsupported query “optimization” from entering the baseline.

## Index lifecycle

Application reads and writes use stable aliases such as `suar_tasks`. The initial physical index is
versioned, for example `suar_tasks_v1`. An installation that already has the legacy physical
`*_v1` index is adopted by attaching the stable alias; no document copy or deletion is required.

A controlled full rebuild follows this sequence:

1. Build the database-backed document set while the current alias continues serving reads.
2. Create a uniquely named physical generation with the current schema and analyzers.
3. Populate it through bounded bulk requests.
4. Refresh and compare the Elasticsearch document count with the expected count.
5. Promote the generation with one atomic aliases operation.
6. Retain the previous physical index for an explicit rollback decision.

The process prevents search-read downtime and prevents promotion of a partial candidate. It does
not yet eliminate the consistency race from writes committed while a full snapshot is being built.
Before production traffic, add a durable projection high-watermark and replay/catch-up phase (or a
write-quiescence protocol) and prove it under concurrent update/delete tests.

Elasticsearch aliases support atomic multi-action updates and are the intended indirection for
changing backing indices:
[Elasticsearch aliases](https://www.elastic.co/guide/en/elasticsearch/reference/8.19/aliases.html).

### Generation inventory, cleanup, and rollback

Both lifecycle commands are preview-first and require an active operator with
`can_manage_system_settings`. Preview and apply runs are written to the platform audit log. Apply
mode never accepts a wildcard or arbitrary index: physical names must satisfy the selected stable
alias's strict ownership rule.

Preview cleanup for all Search index families:

```bash
node ace search:index-cleanup \
  --actor-id=<operator-user-uuid> \
  --index=all \
  --retain-retired=2 \
  --older-than-hours=24
```

Apply exactly the reviewed policy:

```bash
node ace search:index-cleanup \
  --actor-id=<operator-user-uuid> \
  --index=all \
  --retain-retired=2 \
  --older-than-hours=24 \
  --apply \
  --reason="CHG-123 retire generations after the verified rollback window" \
  --confirmation=DELETE_RETIRED_SEARCH_INDICES
```

Cleanup protects the active generation, every generation attached to any alias, every generation
with an unknown creation date, and the newest retained retired generations. Immediately before
deleting exact physical names, the repository re-reads the alias and aborts if it differs from the
previewed active-index set.

Preview rollback using the exact names emitted by cleanup inventory:

```bash
node ace search:index-rollback \
  --actor-id=<operator-user-uuid> \
  --index=tasks \
  --expected-current-index=suar_tasks_v1_20260727090000-current \
  --rollback-target-index=suar_tasks_v1_20260726090000-previous
```

Apply after review:

```bash
node ace search:index-rollback \
  --actor-id=<operator-user-uuid> \
  --index=tasks \
  --expected-current-index=suar_tasks_v1_20260727090000-current \
  --rollback-target-index=suar_tasks_v1_20260726090000-previous \
  --apply \
  --reason="INC-456 rollback after relevance regression" \
  --confirmation=ROLLBACK_SEARCH_INDEX
```

Rollback requires exactly one active physical index, exact current-index confirmation, and an
owned alias-free retired target. It switches the alias in one atomic multi-action request and then
verifies the resulting alias state. Rolling a non-empty index back to an empty target is blocked
unless the operator also supplies `--allow-empty`.

## Benchmark contract

The benchmark corpus contains 3,022 documents:

- 500 deterministic noise documents per index;
- 22 target/decoy documents across organizations, projects, skills, talents, tasks, and users;
- 18 judged queries containing exact, fuzzy, intent, and natural identifier cases;
- 5 warmup iterations and 20 measured iterations per query;
- serial execution and concurrency 8;
- cutoff K = 5.

Run it only against the dedicated test plane:

```bash
ELASTICSEARCH_TEST_ENABLED=true \
ELASTICSEARCH_TEST_NODE=http://127.0.0.1:9201 \
ELASTICSEARCH_TEST_INDEX_PREFIX=suar_test_benchmark_ \
SEARCH_BENCHMARK_NOISE_DOCUMENTS=500 \
SEARCH_BENCHMARK_WARMUP_ITERATIONS=5 \
SEARCH_BENCHMARK_ITERATIONS=20 \
SEARCH_BENCHMARK_CONCURRENCY=8 \
SEARCH_BENCHMARK_RESULT_CUTOFF=5 \
SEARCH_BENCHMARK_ENFORCE=false \
pnpm run benchmark:search
```

Use `SEARCH_BENCHMARK_ENFORCE=true` only on a stable performance runner. The default gates are:

| Gate           | Threshold |
| -------------- | --------: |
| MRR@5          |    ≥ 0.85 |
| Recall@5       |    ≥ 0.90 |
| nDCG@5         |    ≥ 0.80 |
| Serial p95     |  ≤ 100 ms |
| Concurrent p95 |  ≤ 250 ms |

Elasticsearch also provides a rank evaluation API for larger judged datasets:
[Search rank evaluation](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-rank-eval).

## Telemetry and operations

`search.query.completed` emits no raw query. It records:

- a one-way query hash and normalized query length;
- total wall-clock duration;
- result counts;
- status, latency, and result count for every selected source;
- scalar source-health counts and slowest source duration;
- whether the response was degraded or skipped;
- `weighted_rrf_v1` as the active Search Center ranking algorithm.

A partial response is logged with warning outcome/severity. A complete request failure is a
separate redacted error event. This event shape supports latency percentiles, timeout/failure
ratios, zero-result rate, source-level dashboards, and alerting without persisting raw search text.

For a production-like environment, enable and tune Elasticsearch search slow logs after defining
an evidence-based threshold:
[Elasticsearch slow logs](https://www.elastic.co/docs/deploy-manage/monitor/logging-configuration/slow-logs).
Follow the official search-speed guidance before changing query logic:
[Tune for search speed](https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/search-speed).

## Defensible graduation-project statement

The evidence supports this wording:

> I developed Suar Search as a measured multi-index search system. It combines BM25-based vertical
> retrieval with a Unicode identifier analyzer and explainable Weighted Reciprocal Rank Fusion,
> uses versioned indices with atomic alias promotion, and validates relevance with Recall, MRR, and
> nDCG. On a deterministic local corpus of 3,022 documents and 18 judged queries it achieved
> Recall@5 1.0, MRR@5 1.0, nDCG@5 0.990777, and serial p95 65.34 ms. The concurrent local p95 gate
> is still open, and these results are explicitly a pre-production baseline rather than a
> production capacity claim.

## Remaining production gates

1. Add durable high-watermark plus replay/catch-up for concurrent-write-safe rebuilds.
2. Move the benchmark to a stable CI performance runner and store trend artifacts.
3. Expand judged queries with Vietnamese morphology, negative queries, access-control cases, and
   anonymized real-query samples after deployment.
4. Profile the concurrency bottleneck and retest with representative CPU, heap, shards, and corpus
   size.
5. Define production SLOs only after collecting real traffic, zero-result, timeout, and relevance
   feedback baselines.
