# Filter, Search, and Taxonomy Initial Release Train — 2026-08-01

Status: `[~]` implementation active; release evidence not yet closed  
Release ID: `FST-2026-08-01-initial`  
Approver for applicability records: `FST-COORD`  
Matrix closure authority: `WP-26F`  
Historical snapshot: `main@ff82e2c15892302cbb1dd07a4267420fe1e4f2c6`  
Current audit HEAD: `6b59ae1bfcdc0eaacc561ff16c590290e0938705` (dirty worktree; not a release commit)

This is the canonical Markdown WP-00 release registry consumed by WP-27A, WP-26 and WP-27B. It is
not the machine-readable manifest consumed by `scripts/filtering/validate_filter_search_test_matrix.ts`.
Checkbox status in the
implementation plan or test matrix remains authoritative for execution; `required` here means a row
must eventually reach `[x]` before this release, while `deferred` remains `[ ]` with its reason.

## Validator boundary — audited 2026-08-09

The release registry above is intentionally a human-readable applicability/ownership record. The
validator requires a separate JSON object with `version`, `releaseId`, `approver`,
`closureAuthority`, `matrixCaseIds`, `cases`, and `artifacts`. The existing legacy inputs do not have
that shape and must not be relabeled as a release manifest:

| Path | Role | Current status |
|---|---|---|
| `docs/superpowers/plans/2026-08-01-filter-search-taxonomy-platform.md` | Canonical referenced implementation plan | present; supporting plan only |
| `docs/superpowers/plans/2026-08-01-filter-search-taxonomy-test-matrix.md` | Canonical referenced test-matrix plan | present; supporting plan only |
| `scripts/filtering/validate_filter_search_test_matrix.ts` | Manifest validator CLI/schema | present; authoritative validator implementation |
| `app/modules/filtering/tests/backend/unit/filter_search_matrix_validator.spec.ts` | Runnable Japa wrapper for the validator fixture suite | present; authoritative targeted test entrypoint |
| `docs/12-evidence/test-matrix.json` | Legacy JSON input | present; intentionally `manifest_invalid` |
| `docs/12-evidence/implementation-plan.json` | Legacy JSON input | present; intentionally `manifest_invalid` |
| current approved machine-readable release manifest | Expected `--manifest` target for closure | absent; not created in this audit |

```text
node --import=@poppinss/ts-exec scripts/filtering/validate_filter_search_test_matrix.ts --manifest docs/12-evidence/test-matrix.json
manifest_invalid: Manifest requires version 1, releaseId, matrixCaseIds, and cases.

node --import=@poppinss/ts-exec scripts/filtering/validate_filter_search_test_matrix.ts --manifest docs/12-evidence/implementation-plan.json
manifest_invalid: Manifest requires version 1, releaseId, matrixCaseIds, and cases.
```

The validator implementation has real unit coverage (`tests/unit/filter_search_test_matrix_validator.spec.ts`,
`17 passed`). The fixture suite under `scripts/filtering/fixtures/` is outside the standard Japa
test glob (`NO TESTS EXECUTED`) and is not counted as release evidence. No artifact, closure ID or
hash is synthesized to make this gate green.

## Current closure audit rerun — 2026-08-09

The read-only validator and its authoritative wrapper were rerun against the current worktree:

| Check | Observed result | Closure meaning |
|---|---|---|
| `app/modules/filtering/tests/backend/unit/filter_search_matrix_validator.spec.ts` | `17 passed` | Runnable validator wrapper is green; this does not close the release matrix. |
| `docs/12-evidence/test-matrix.json` | exit `1`, `manifest_invalid` | Legacy project matrix; it has no manifest v1 top-level contract. |
| `docs/12-evidence/implementation-plan.json` | exit `1`, `manifest_invalid` | Legacy implementation-plan JSON; it has no manifest v1 top-level contract. |
| Master scenarios `TC-FST-001..031` | `18 [~]`, `13 [ ]`, `0 [x]` | No complete required-case closure exists. |

The earlier `16 passed` wording is stale; the current runnable wrapper contains 17 tests and the rerun above is
the authoritative count. No new machine-readable manifest is created in this audit because the
repository still lacks authoritative per-case test/RP/screenshot artifact joins, immutable execution
metadata, closure records, reviewer sign-offs, and approved artifact/hash evidence. A synthetic or
fixture-derived manifest would falsely promote incomplete release evidence.

## Immutable WP-00 checkpoint

| Frozen document                                                           | SHA-256                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/superpowers/specs/2026-08-01-filter-platform-design.md`             | `08fa36f81c6fa10e12b6eab1a27d060bf5390f8174c1d6d7d4f1148975afe44b` |
| `docs/superpowers/specs/2026-08-01-enterprise-search-discovery-design.md` | `c80cef712aa2ad7840dc8117559389909d58dc62437b33b6d7170c69d94812c4` |
| `docs/superpowers/specs/2026-08-01-taxonomy-metadata-design.md`           | `34196e0bf5b81ff3a224114d736ad232030fa4615889160ca797a409b2b48732` |
| `docs/superpowers/plans/2026-08-01-filter-search-taxonomy-platform.md`    | `5279c85fdf48cbbd81414febcec71bf339cd8d594f8c6f2698a1e1d344149d48` |
| `docs/superpowers/plans/2026-08-01-filter-search-taxonomy-test-matrix.md` | `99ce42612fe06896db041c5480676a4030fffaee66734e8b3bac65e30b106704` |
| `docs/12-evidence/filter-surface-inventory-2026-08-01.md`                 | `4f1efce7152fdaf966bcf7eaf37b82f536e7ed6d92dee4c55ad0fdec40c6952a` |

These content hashes are the docs-only baseline because the shared worktree contains unrelated
active production work and cannot safely receive a broad coordinator commit. A later intentional
contract change must update the relevant hash and record its approving package; silent drift fails
WP-27A/WP-26.

The frozen table records an earlier coordinator-approved checkpoint. The current audit found plan,
matrix and inventory drift from that checkpoint; no subsequent re-freeze approval is recorded here.
Do not infer semantic equivalence or release readiness from the historical checkpoint.

## Release selection and dependency closure

Selected capabilities and packages:

- provider-neutral Filter AST, validation, canonicalization, URL/state, context registry, reference
  executor, SQL executor, indexed executor, facets, saved views, alerts, taxonomy governance,
  projection generations, Search Discovery V2, qualifier/builder and typed recovery;
- operational SQL pilot `WP-15` on Admin Audit, shared Search adoption `WP-17`, indexed Marketplace
  child `WP-24B`, and indexed Talent child `WP-24C`;
- required implementation closure: `WP-00`, `WP-01`, `WP-02`, `WP-03`, `WP-04`, `WP-05`, `WP-06`,
  `WP-07`, `WP-08`, `WP-09`, `WP-10`, `WP-11`, `WP-12`, `WP-13`, `WP-14`, `WP-15`, `WP-16`,
  `WP-17`, `WP-18`, `WP-19`, `WP-20`, `WP-21`, `WP-22`, `WP-23`, `WP-24B`, `WP-24C`, `WP-26`,
  `WP-27A`, `WP-27B`;
- optional natural-language authoring `WP-25`, advanced relevance `WP-28`, adaptive/policy discovery
  `WP-29`, and advanced closure/canary `WP-30` are deferred from this release.

Inventory contexts deferred from the initial release are `WP-24A` task/team operations,
`WP-24D-*` directories and admin tables, `WP-24E-*` user/org audit copies, `WP-24F` notification
quick filters, and future concrete `WP-24G-*` candidate/reference/application contexts. Reason:
Marketplace and Talent are the two product-priority indexed pilots, while Admin Audit already proves
the deliberately different SQL workbench. A deferred context can enter only after the coordinator
creates a concrete child ID, exact write set, impact report, executable command card, matrix mapping
and dependency closure; no aggregate `WP-24D` or `WP-24G` ticket is assignable.

## Ownership and collision fence

| Owner/package                               | Exclusive scope for the current wave                                                                           | Forbidden overlap                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `WP-03` Search metadata owner               | the eight pre-existing dirty Search/task/benchmark files listed in the plan and below                          | every other worker must treat these as read-only until the dedicated WP-03 commit/handoff |
| `WP-01`                                     | new `app/modules/filtering/domain/**` semantic kernel and its unit fixtures                                    | no provider, HTTP, Svelte, task, Search, composition or route file                        |
| `WP-02`                                     | new `app/modules/taxonomy/**` provider-neutral contracts/conformance fixtures                                  | no existing Skills/Tasks persistence or composition file                                  |
| Integration owner (`WP-14`, later `WP-27A`) | `app/composition/**`, `start/routes/**`, `adonisrc.ts`, generated routes, migration checksum/schema artifacts  | no product/package worker may edit these hotspots                                         |
| `WP-24B`                                    | exact Marketplace/Tasks/UI/test set in its claim card below                                                    | no Talent, shared Filter contract, Search infrastructure, root i18n or composition files  |
| `WP-24C`                                    | exact Talent/User/Search-talent/UI/test set in its claim card below                                            | no Marketplace, shared Filter contract, root i18n or composition files                    |
| Task-to-Accomplishment owners               | all pre-existing dirty/untracked Task-to-Accomplishment paths and migrations `20260801010000`–`20260801050000` | every Filter/Search worker must preserve and never format/stage/absorb them               |

The WP-03 ownership bundle is exactly:

```text
app/modules/search/actions/ports/outbound/task_search_document_reader.ts
app/modules/search/domain/task_search_document.ts
app/modules/search/infra/tasks/task_search_document_builder.ts
app/modules/search/infra/tasks/task_search_index_repository.ts
app/modules/search/tests/backend/unit/task_document_builder.spec.ts
app/modules/tasks/infra/adapters/lucid_task_search_document_reader.ts
app/modules/tasks/tests/backend/integration/task_search_document_reader.spec.ts
scripts/search/search_benchmark_corpus.ts
```

## Migration reservations

| Timestamp                         | Owner                                     | Purpose                                  |
| --------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `20260801010000`–`20260801050000` | other active Task-to-Accomplishment train | reserved, already present; never reuse   |
| `20260801060000`                  | `WP-09`                                   | saved filter views                       |
| `20260801061000`                  | `WP-09`                                   | saved-view grants                        |
| `20260801062000`                  | `WP-22`                                   | filter alerts                            |
| `20260801063000`                  | `WP-23A1`                                 | taxonomy migration runs                  |
| `20260801064000`                  | `WP-23B1`                                 | Search projection generations            |
| `20260801065000`                  | `WP-23B1`                                 | projection entity revisions              |
| `20260801066000`                  | `WP-23B1`                                 | outbox projection invalidation expansion |
| `20260801067000`                  | deferred `WP-28`                          | relevance rules                          |
| `20260801067500`                  | deferred `WP-28`                          | experiments                              |
| `20260801068000`                  | deferred `WP-29`                          | organization vocabulary/policy           |

The five other-train migrations are applied to `suar_test` but are not yet frozen in
`database/migration-checksums.json` or the schema dump. `migration:ledger-verify` is therefore an
external concurrent-work RED, owned by that train and not “fixed” by WP-00. WP-14 serially refreshes
the ledger only after all selected migrations are merged.

## Baseline and environment evidence

| Layer                       | Exact execution                                                                                                                                      | Result                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Unit                        | direct Japa, one exact file per command: `global_search_query.spec.ts`, `task_document_builder.spec.ts`                                              | 14 passed                      |
| Integration                 | direct Japa, one exact file per command: `global_search_api.spec.ts`, `task_search_document_reader.spec.ts`, `audit_logs.spec.ts`                    | 28 passed                      |
| UI                          | `pnpm exec vitest run inertia/apps/user/tests/modules/search/index.test.ts inertia/apps/admin/tests/modules/audit_logs/index.test.ts --maxWorkers=1` | 8 passed                       |
| Live Elasticsearch sentinel | `node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/search/tests/backend/integration/search_index_administration.spec.ts`   | 1 passed in 4s against test ES |

The original `pnpm run test:unit -- --files ...` shape was invalid because Japa interpreted the
standalone `--` as a suite filter. It is a command-card defect, not a product failure; all focused
cards use direct `bin/test.ts <suite> --files <exact-file>` execution.

Runtime topology at freeze:

- PostgreSQL dev/test share `my-postgres-container` but use databases `suar` and `suar_test`;
- primary Redis dev/test share `my-redis-container` with DB 0/14; cache dev/test use separate ports
  6380/6381;
- dev Elasticsearch is healthy on 9200; test Elasticsearch is a distinct
  `my-elasticsearch-test-container` on 9201;
- the stale unlabeled exited test container was removed and recreated without mounts; replacement is
  healthy, limit `805306368` bytes (768 MiB), one CPU, `OOMKilled=false`;
- after startup the test node used about 674 MiB/768 MiB (88%). It is usable and the live sentinel is
  green, but WP-13/WP-26C must record peak/RSS and fail explicitly on OOM during facet and benchmark
  load; this headroom is not silently accepted as a capacity result;
- benchmark ownership requires
  `ELASTICSEARCH_TEST_INDEX_PREFIX=suar_test_benchmark_ pnpm run benchmark:search`; the bare
  `suar_test_` prefix violates the index-namespace guard.

Existing `global_search_api.spec.ts` disables Search and therefore proves HTTP compatibility only;
it is not counted as live-ES evidence. The dedicated sentinel above prevents that false inference.

## Wave 1 closure evidence

Wave 1 closed as three package-atomic commits after independent worker implementation, cross-review,
coordinator reruns, targeted lint/format and `gitnexus detect-changes`:

| Package | Commit       | Coordinator evidence                                                                                                                 | Result |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| WP-01   | `e7857e7769` | 29 focused unit tests: 8 expression/truth, 6 canonicalization/hash, 15 runtime validation; malicious `__proto__` regression included | GREEN  |
| WP-02   | `11ed656ed0` | 18 focused tests: term/assignment contracts plus 7 conformance cases, including 5 deliberately non-conforming providers              | GREEN  |
| WP-03   | `0a21d02f53` | 23 coordinator-rerun unit/integration tests against real test Elasticsearch and dependent task/search flows                          | GREEN  |

WP-03 benchmark evidence used 3,023 documents and 20 judged cases: Recall@5 `1`, MRR@5 `1`, nDCG@5
`0.9917`, last-label/100-label sentinels rank 1, and serial p95 `67.15ms` against `100ms`. Concurrent
p95 was `404.97ms` against `250ms` on the constrained one-CPU/768-MiB test node. That result remains
an explicit performance RED assigned to WP-26C; neither its threshold nor executor fallback was
weakened.

Targeted ESLint and Prettier were GREEN for every WP-01/02/03 file. Whole-repository TypeScript was
not GREEN because the concurrent Task-to-Accomplishment train currently reports errors in
`create_task_authoring.ts`, `lucid_task_authoring_create_persistence.spec.ts`, and
`lucid_task_authoring_inheritance_reader.spec.ts`; no Wave 1 file appears in that diagnostic set.

Deferred findings retain explicit owners: durable partial-generation activation and concurrent alias
fencing to WP-23B/C, caller permission scope to WP-12, analyzer/settings compatibility to WP-23C,
and negative-hit benchmark enforcement to WP-26B/C. These are not treated as completed WP-03
behavior.

## WP-24B exact claim card — Marketplace

Status: `[ ]` unclaimed until dependencies and impacts are green. Owner role:
`marketplace-indexed-pilot-worker`.

Exclusive existing/new write set:

```text
app/modules/marketplace/filtering/marketplace_task_filter_context.ts
app/modules/marketplace/filtering/marketplace_task_filter_permission_provider.ts
app/modules/marketplace/filtering/marketplace_task_filter_request_adapter.ts
app/modules/marketplace/actions/queries/get_marketplace_tasks_query.ts
app/modules/marketplace/actions/queries/get_marketplace_tasks_page_query.ts
app/modules/marketplace/controllers/mappers/request/marketplace_task_request_mapper.ts
app/modules/marketplace/controllers/list_marketplace_tasks_controller.ts
app/modules/marketplace/controllers/list_marketplace_tasks_api_controller.ts
app/modules/marketplace/tests/backend/unit/marketplace_task_filter_context.spec.ts
app/modules/marketplace/tests/backend/unit/get_marketplace_tasks_query.spec.ts
app/modules/marketplace/tests/backend/unit/marketplace_task_request_mapper.spec.ts
app/modules/marketplace/tests/backend/integration/public_task_search_engine.spec.ts
app/modules/tasks/actions/queries/get_public_tasks_query.ts
app/modules/tasks/infra/repositories/read/public_queries.ts
app/modules/tasks/tests/backend/unit/get_public_tasks_query.spec.ts
inertia/apps/user/modules/marketplace/tasks.svelte
inertia/apps/user/modules/marketplace/components/marketplace_filters.svelte
inertia/apps/org/modules/marketplace/tasks.svelte
inertia/apps/org/modules/marketplace/components/marketplace_filters.svelte
inertia/apps/user/tests/modules/marketplace/tasks_filtering.test.ts
inertia/apps/org/tests/modules/marketplace/tasks_filtering.test.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/marketplace_filter_only_roleplay.spec.ts
```

Composition adapter/provider and route changes are excluded and handed to WP-14/WP-27A. Any required
Search mapping/compiler change is returned to WP-13/WP-16 rather than added to this claim.

Executable RED/GREEN card, one command per exact Japa file:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/marketplace/tests/backend/unit/marketplace_task_filter_context.spec.ts
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/marketplace/tests/backend/unit/get_marketplace_tasks_query.spec.ts
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/marketplace/tests/backend/unit/marketplace_task_request_mapper.spec.ts
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/tasks/tests/backend/unit/get_public_tasks_query.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/marketplace/tests/backend/integration/public_task_search_engine.spec.ts
pnpm exec vitest run inertia/apps/user/tests/modules/marketplace/tasks_filtering.test.ts inertia/apps/org/tests/modules/marketplace/tasks_filtering.test.ts --maxWorkers=1
pnpm exec playwright test inertia/apps/user/tests/e2e/filter_search_taxonomy/marketplace_filter_only_roleplay.spec.ts --project=chromium --workers=1
```

Expected RED is the named missing Filter-context/server-authority/secondary-label/URL/facet behavior,
never a missing service. Expected output is filter-only and text-plus-filter browsing across the
complete authorized task population, true multi-label facets, explicit legacy-singleton coverage,
stable URL/cursor, and no browser-authoritative page filtering.

## WP-24C exact claim card — Talent

Status: `[ ]` unclaimed until dependencies and impacts are green. Owner role:
`talent-indexed-pilot-worker`.

Exclusive existing/new write set:

```text
app/modules/users/filtering/talent_discovery_filter_context.ts
app/modules/users/filtering/talent_discovery_permission_provider.ts
app/modules/users/filtering/talent_discovery_filter_request_adapter.ts
app/modules/users/actions/queries/get_talent_directory_page_query.ts
app/modules/users/actions/queries/search_talents_query.ts
app/modules/users/controllers/org_talents_page_controller.ts
app/modules/users/actions/ports/outbound/talent_directory_page_reader.ts
app/modules/users/actions/ports/outbound/talent_search_candidate_reader.ts
app/modules/users/infra/repositories/read/postgres_talent_directory_page_reader.ts
app/modules/users/infra/adapters/lucid_talent_search_document_reader.ts
app/modules/users/public_contracts/talent_search.ts
app/modules/search/actions/ports/outbound/talent_search_document_reader.ts
app/modules/search/domain/talent_search_document.ts
app/modules/search/infra/talents/talent_search_document_builder.ts
app/modules/search/infra/talents/talent_search_index_repository.ts
app/modules/search/tests/backend/unit/talent_document_builder.spec.ts
app/modules/users/tests/backend/unit/talent_discovery_filter_context.spec.ts
app/modules/users/tests/backend/unit/get_talent_directory_page_query.spec.ts
app/modules/users/tests/backend/unit/search_talents_query.spec.ts
app/modules/users/tests/backend/integration/talent_directory_access_and_filters.spec.ts
app/modules/users/tests/backend/integration/talent_search.spec.ts
app/modules/users/tests/backend/integration/talent_search_engine.spec.ts
inertia/apps/org/modules/talents/index.svelte
inertia/apps/org/tests/modules/talents/index.test.ts
inertia/apps/org/tests/e2e/filter_search_taxonomy/talent_discovery_roleplay.spec.ts
```

Composition adapters/providers and routes remain WP-14/WP-27A-owned. Cross-cutting Search generation
or compiler changes are returned to WP-13/WP-23 rather than absorbed here.

Executable RED/GREEN card, one command per exact Japa file:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/users/tests/backend/unit/talent_discovery_filter_context.spec.ts
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/users/tests/backend/unit/get_talent_directory_page_query.spec.ts
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/users/tests/backend/unit/search_talents_query.spec.ts
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/search/tests/backend/unit/talent_document_builder.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/users/tests/backend/integration/talent_directory_access_and_filters.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/users/tests/backend/integration/talent_search.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/users/tests/backend/integration/talent_search_engine.spec.ts
pnpm exec vitest run inertia/apps/org/tests/modules/talents/index.test.ts --maxWorkers=1
pnpm exec playwright test inertia/apps/org/tests/e2e/filter_search_taxonomy/talent_discovery_roleplay.spec.ts --project=chromium --workers=1
```

Expected RED is missing nested same-skill/proficiency/public-evidence semantics, secondary expertise,
state-preserving URL/pagination, or privacy/fairness guardrails. Expected output is a domain-specific
recruiting workbench whose authoritative projection contains verified/public multi-value evidence,
never private/disputed evidence or a sensitive/proxy ranking field.

## Applicability reason codes

| Code        | Explicit reason                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `R-CORE`    | Required by the selected initial platform, SQL/Search pilots, Marketplace/Talent children, compatibility or release evidence gate. |
| `R-WP25`    | Deferred because constrained natural-language assisted authoring is optional and not selected.                                     |
| `R-WP28`    | Deferred because advanced ranking/rules/semantic retrieval/experiments are not selected.                                           |
| `R-WP29`    | Deferred because personalization and organization-specific adaptive policy are not selected.                                       |
| `R-WP28-29` | Deferred because the behavior requires one or both unselected advanced/adaptive trains.                                            |

Every record below has `releaseId=FST-2026-08-01-initial` and `approver=FST-COORD`; those two explicit
record fields are factored into the table heading to avoid a misleading numeric range or wildcard.

## Master scenario records

| Scenario ID | Applicability | Reason | Evidence owner | Closure authority | Release ID             | Approver  |
| ----------- | ------------- | ------ | -------------- | ----------------- | ---------------------- | --------- |
| TC-FST-001  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-002  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-003  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-004  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-005  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-006  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-007  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-008  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-009  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-010  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-011  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-012  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-013  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-014  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-015  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-016  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-017  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-018  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-019  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-020  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-021  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-022  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-023  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-024  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-025  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-026  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-027  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-028  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-029  | deferred      | R-WP25 | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-030  | deferred      | R-WP28 | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| TC-FST-031  | deferred      | R-WP29 | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |

## Role-play journey records

| Journey ID | Applicability | Reason | Evidence owner | Closure authority | Release ID             | Approver  |
| ---------- | ------------- | ------ | -------------- | ----------------- | ---------------------- | --------- |
| RP-FST-01  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-02  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-03  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-04  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-05  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-06  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-07  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-08  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-09  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-10  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-11  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-12  | required      | R-CORE | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-13  | deferred      | R-WP28 | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-14  | deferred      | R-WP25 | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| RP-FST-15  | deferred      | R-WP29 | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |

## Detailed-case records

The required layers and implementation contributors remain canonical in the linked matrix. This
registry adds the one accountable evidence owner and closure authority demanded for release joining.

| Case ID | Applicability | Reason    | Evidence owner | Closure authority | Release ID             | Approver  |
| ------- | ------------- | --------- | -------------- | ----------------- | ---------------------- | --------- |
| AST-001 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-002 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-003 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-004 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-005 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-006 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-007 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-008 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-009 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-010 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-011 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-012 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-013 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-014 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-015 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-016 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-017 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| AST-018 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-001 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-002 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-003 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-004 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-005 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-006 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-007 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-008 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-009 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-010 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-011 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-012 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-013 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-014 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-015 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-016 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-017 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-018 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-019 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-020 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-021 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-022 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-023 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-024 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-025 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-026 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-027 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-028 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| FTM-029 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-001 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-002 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-003 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-004 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-005 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-006 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-007 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-008 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-009 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-010 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-011 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-012 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-013 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-014 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-015 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-016 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-017 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-018 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| EXE-019 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-001  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-002  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-003  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-004  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-005  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-006  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-007  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-008  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-009  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-010  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-011  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-012  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-013  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-014  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-015  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-016  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-017  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-018  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-019  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-020  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-021  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| UX-022  | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-001 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-002 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-003 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-004 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-005 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-006 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-007 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-008 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-009 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-010 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-011 | deferred      | R-WP25    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-012 | deferred      | R-WP25    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-013 | deferred      | R-WP29    | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| SEC-014 | deferred      | R-WP29    | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| SEC-015 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| SEC-016 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-001 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-002 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-003 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-004 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-005 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-006 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-007 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-008 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-009 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-010 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-011 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-012 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-013 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-014 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-015 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-016 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-017 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-018 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-019 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-020 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-021 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-022 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| OPS-023 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-001 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-002 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-003 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-004 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-005 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-006 | required      | R-CORE    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-007 | deferred      | R-WP25    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-008 | deferred      | R-WP25    | WP-26E         | WP-26F            | FST-2026-08-01-initial | FST-COORD |
| ADV-009 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-010 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-011 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-012 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-013 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-014 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-015 | deferred      | R-WP28    | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-016 | deferred      | R-WP29    | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-017 | deferred      | R-WP29    | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-018 | deferred      | R-WP29    | WP-30B         | WP-30C            | FST-2026-08-01-initial | FST-COORD |
| ADV-019 | deferred      | R-WP28-29 | WP-30A         | WP-30C            | FST-2026-08-01-initial | FST-COORD |

## Selected-context traceability

| Context/capability                                      | Master scenarios                                                                                                                                                                               | Detailed focus                                                                                                                                                                                                                                                                                                                                                                                                              | Required role-play                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Admin Audit SQL pilot                                   | TC-FST-004, TC-FST-006, TC-FST-007, TC-FST-008, TC-FST-009, TC-FST-010, TC-FST-011, TC-FST-014, TC-FST-015, TC-FST-016, TC-FST-017, TC-FST-021, TC-FST-022                                     | FTM-001, FTM-002, FTM-003, FTM-004, FTM-005, FTM-006, FTM-007, EXE-001, EXE-005, EXE-006, EXE-008, EXE-009, EXE-012, EXE-013, EXE-017, EXE-018, EXE-019, UX-003, UX-004, UX-005, UX-007, UX-008, UX-011, UX-014, UX-019, UX-020, UX-021                                                                                                                                                                                     | RP-FST-04, RP-FST-05, RP-FST-06, RP-FST-12            |
| Search Discovery V2                                     | TC-FST-002, TC-FST-003, TC-FST-004, TC-FST-007, TC-FST-008, TC-FST-009, TC-FST-010, TC-FST-014, TC-FST-015, TC-FST-021, TC-FST-022, TC-FST-023, TC-FST-024, TC-FST-027, TC-FST-028             | AST-014, AST-015, AST-017, AST-018, FTM-001, FTM-003, FTM-004, FTM-005, FTM-006, FTM-007, EXE-002, EXE-003, EXE-004, EXE-005, EXE-006, EXE-007, EXE-008, EXE-009, EXE-010, EXE-011, EXE-013, EXE-014, EXE-015, EXE-016, EXE-017, EXE-018, EXE-019, UX-001, UX-002, UX-007, UX-012, UX-020, UX-021, UX-022, ADV-001, ADV-002, ADV-003, ADV-004, ADV-005, ADV-006                                                             | RP-FST-02, RP-FST-05, RP-FST-09, RP-FST-11, RP-FST-12 |
| Marketplace `WP-24B`                                    | TC-FST-001, TC-FST-003, TC-FST-005, TC-FST-006, TC-FST-007, TC-FST-008, TC-FST-009, TC-FST-010, TC-FST-013, TC-FST-014, TC-FST-015, TC-FST-021, TC-FST-022, TC-FST-023, TC-FST-024, TC-FST-028 | AST-004, AST-005, AST-006, AST-007, AST-008, AST-009, FTM-001, FTM-004, FTM-007, FTM-009, FTM-010, FTM-011, FTM-012, FTM-018, FTM-026, FTM-027, FTM-029, EXE-002, EXE-004, EXE-005, EXE-006, EXE-008, EXE-010, EXE-013, EXE-014, EXE-019, UX-001, UX-002, UX-005, UX-006, UX-007, UX-008, UX-011, UX-019, UX-020, UX-021                                                                                                    | RP-FST-01, RP-FST-05, RP-FST-09, RP-FST-12            |
| Talent `WP-24C`                                         | TC-FST-003, TC-FST-005, TC-FST-006, TC-FST-007, TC-FST-008, TC-FST-009, TC-FST-010, TC-FST-012, TC-FST-013, TC-FST-014, TC-FST-015, TC-FST-021, TC-FST-022, TC-FST-023, TC-FST-024             | AST-004, AST-005, AST-006, AST-007, AST-008, AST-009, FTM-001, FTM-004, FTM-006, FTM-007, FTM-009, FTM-010, FTM-012, FTM-013, FTM-018, FTM-020, FTM-025, FTM-027, FTM-028, FTM-029, EXE-002, EXE-004, EXE-005, EXE-006, EXE-007, EXE-008, EXE-010, EXE-013, EXE-014, EXE-019, UX-001, UX-002, UX-005, UX-007, UX-008, UX-011, UX-012, UX-019, UX-020, UX-021, SEC-001, SEC-002, SEC-003, SEC-004, SEC-006, SEC-009, SEC-015 | RP-FST-03, RP-FST-05, RP-FST-09, RP-FST-12            |
| Saved views, alerts, taxonomy and projection operations | TC-FST-016, TC-FST-017, TC-FST-018, TC-FST-019, TC-FST-020, TC-FST-021, TC-FST-024, TC-FST-025, TC-FST-026                                                                                     | FTM-014, FTM-015, FTM-016, FTM-017, FTM-018, FTM-019, FTM-020, FTM-021, FTM-022, FTM-023, FTM-024, FTM-025, FTM-029, UX-013, UX-014, UX-015, UX-016, UX-017, SEC-004, SEC-005, SEC-006, SEC-008, OPS-001, OPS-002, OPS-003, OPS-004, OPS-005, OPS-006, OPS-007, OPS-008, OPS-009, OPS-010, OPS-011, OPS-012, OPS-013, OPS-014, OPS-015, OPS-016, OPS-017, OPS-018, OPS-019, OPS-020, OPS-021, OPS-022, OPS-023              | RP-FST-06, RP-FST-07, RP-FST-08, RP-FST-10, RP-FST-12 |

## Current blockers and gates

- WP-00 has no product-code blocker. GitNexus analyzed the current tree, but some broad semantic
  queries still resolved stale paths and concurrent Ladybug access locked the graph. Workers must run
  sequential CLI impacts per symbol and record a targeted-source fallback when the graph lacks a new
  symbol; GitNexus MCP is forbidden.
- The shared migration ledger is temporarily red because of the concurrent Task-to-Accomplishment
  train. WP-14 owns the eventual serialized refresh.
- Test Elasticsearch is healthy but close to its configured memory limit at idle/warm state. A later
  OOM, benchmark breach or circuit-breaker result blocks WP-13/WP-26C; it must not be hidden by SQL
  fallback.
- No master scenario is complete yet. Baseline unit/integration/UI and the live-ES sentinel establish
  environment truth only; WP-26E must still join role-play, screenshot, semantic, negative,
  backend/audit, seed and reviewer evidence before WP-26F changes matrix checkboxes.
