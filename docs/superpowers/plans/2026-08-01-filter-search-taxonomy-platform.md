# Filter, Search, and Taxonomy Platform Implementation Plan

> **For multi-agent execution:** workers implement only one claimed work package at a time. The
> coordinator owns status changes, shared contracts, integration files, migration numbering, and
> merges. Every production change follows TDD and GitNexus impact analysis.

**Goal:** Implement the Filter Platform, Search integration, and Taxonomy/Metadata contracts defined
by the approved 2026-08-01 specifications, prove them through two deliberately different pilots,
then migrate additional Suar contexts without making any page or business example the architectural
boundary.

**Primary specifications:**

- [Filter Platform Design](../specs/2026-08-01-filter-platform-design.md)
- [Enterprise Search and Discovery Design](../specs/2026-08-01-enterprise-search-discovery-design.md)
- [Taxonomy and Metadata Design](../specs/2026-08-01-taxonomy-metadata-design.md)
- [Test Matrix and Role-Play Evidence Plan](./2026-08-01-filter-search-taxonomy-test-matrix.md)

**Tech stack:** AdonisJS, TypeScript, Lucid/PostgreSQL, Elasticsearch, Svelte 5, Inertia, Japa,
Vitest, Playwright, existing search benchmark tooling, existing domain-event/outbox infrastructure.

## 1. Status convention

Coordinator note — 2026-08-08: Search/Filter/Taxonomy implementation is intentionally deferred while
the Task → Verified Accomplishment train is executed first. Existing code/tests remain untrusted
until their full unit, integration, UI, E2E, screenshot, security and operational evidence closes.

Coordinator audit snapshot — 2026-08-08: this goal is now actively audited. The worktree was already
dirty before this run and unrelated changes were preserved. Git status, Search/Filtering/Taxonomy
ownership scans, GitNexus status/query/context/impact, and focused baselines were recorded. WP-00
remains partial because the complete surface inventory, immutable baseline checkpoint, release
manifest closure, and role-play ownership are still missing. WP-17 is partial: shared user/org
wrappers exist and the server-authoritative result regression is GREEN, but browser role-play,
cancellation/order races, accessibility, and real-service evidence remain. WP-18 is partial:
saved-view domain/repository migration, client/state/UI slices and focused tests exist, but routes,
composition and real create/share/repair browser workflow are missing. WP-19 and WP-21 through
WP-30 remain not implemented/closed; WP-20 has only its backend parser slice. Adjacent code or unit
tests are not completion evidence.

Coordinator audit update — 2026-08-09: the multi-agent audit completed without production edits.
WP-01/02/03/04/05/06/07/08/12/13/14/16 remain `[~]`: bounded unit/contract evidence exists,
but required integration, differential, API, accessibility, security, operational, browser and/or
role-play gates are not all closed. WP-09 and WP-11 remain `[~]` with persistence/ACL and
component/a11y evidence blocked or unverified. Fresh evidence and exact remaining gates are in
[the 2026-08-09 audit handoff](../handoffs/2026-08-09-filter-search-taxonomy-audit.md). No package
was marked `[x]` from unit-only evidence. The planned `filter_ast.spec.ts` path does not exist and
its attempted run returned `NO TESTS EXECUTED`; this remains an explicit gap.

Focused evidence from this audit: Filtering unit 24/24, Search unit 16/16, saved-view integration
7/7, user/org Search UI 10/10, and the WP-22 alert notification delivery unit/integration pair 2/2
passed. The new delivery integration proves alert → transactional fanout staging → idempotent retry
dedupe → existing fanout worker → one canonical notification. Repository-wide typecheck and lint
remain RED on the dirty worktree, including unrelated composition, result-contract, and
accomplishment changes; no waiver is recorded. WP-22 UI client/state/component/menu tests now pass
12/12 and the alert API contract remains 7/7; mobile, full accessibility, offline/conflict UX,
provider-paused recovery, and browser role-play are still open.

Coordinator audit update — 2026-08-09: a Chromium run provides supporting Search Discovery task-API
evidence `1/1` with real Elasticsearch task reindexing, combined criteria, cursor tamper/recovery,
and a screenshot artifact. It calls the API directly and is not the defined RP-FST-03 Talent/Search
Center UI journey; it does not close RP-FST-03 or TC-FST-003. WP-17 remains `[~]` because the
complete Search UI journey, accessibility, cancellation/order resilience, differential/provider
explanation, and view-state evidence are still incomplete.

Every work item starts with one of these markers:

- `[ ]` — chưa làm;
- `[~]` — đang làm;
- `[x]` — đã xong.

Only the coordinator changes the plan file. A worker reports `STARTED`, `BLOCKED`, or `DONE` with
evidence; the coordinator changes `[ ]` to `[~]` or `[x]`. A blocked package remains `[~]` and gains
a short `BLOCKED:` note until resolved, so the plan has exactly the three requested states.

Package completion requires every nested checkbox, expected output, test gate, and handoff artifact
to be satisfied. “Code exists” is not completion.

`Expected outputs`, `Abnormal cases`, and `Acceptance gate` paragraphs describe evidence/conditions,
not extra untracked actions. Their status is represented by DOD-05/DOD-10 plus the package's overall
checkbox; a worker handoff must link the evidence before the coordinator may mark that overall box
`[x]`. Every executable action in this plan has its own checkbox.

## 2. Multi-worker execution contract

- [ ] **COORD-01 — Establish one branch/worktree per worker.** Preferred isolation is a dedicated
      Git worktree per package. When workers share one filesystem, only packages in the same declared
      parallel wave with disjoint exclusive write sets may run together.
- [ ] **COORD-02 — Assign one owner to every production file.** Workers may read any file but may
      modify only the package's exclusive write set. A needed out-of-scope change is returned to the
      coordinator as a dependency request.
- [ ] **COORD-03 — Reserve integration hotspots for the integration worker.** Only the designated
      package may edit `app/composition/**`, `start/routes/**`, shared barrel exports, common i18n
      registration, or already-numbered migrations.
- [ ] **COORD-04 — Run GitNexus before editing every production symbol.** Use
      `gitnexus impact <symbol>`. HIGH/CRITICAL risk pauses that package for coordinator review. Never use
      GitNexus MCP. If CLI lacks detail, record that limit and use targeted read-only source inspection.
- [ ] **COORD-05 — Enforce test-first evidence.** The worker records the focused command and the
      expected failure reason before production implementation. A test that passes before the change is
      not a valid red phase unless it proves a regression fixture already exists.
- [ ] **COORD-06 — Keep working-tree changes package-atomic without staging.** By explicit user
      instruction, workers and coordinator must not run `git add` or `git commit` until separately
      authorized. A worker returns exact changed files, RED/GREEN commands, `gitnexus detect-changes`
      summary, remaining risks, and proof that `git diff --cached --name-only` is empty.
- [ ] **COORD-07 — Rebase and rerun focused tests before merge.** The coordinator resolves contract
      drift centrally; workers must not independently change the locked AST or transport schema.
- [ ] **COORD-08 — Never run repository-wide formatters from a worker branch.** Format only the
      exclusive write set to avoid touching unrelated user changes.

## 3. Current-worktree safety gate

At plan creation time, the following Search work is modified but not committed and must be treated
as user-owned baseline, not disposable scratch work:

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

The three primary specifications, this plan, and the linked Filter/Search/Taxonomy test matrix are
also initially untracked. No worker may reset, checkout, delete, or overwrite these files to obtain a
clean tree.

The following unrelated Task-to-Verified-Accomplishment documents are also untracked user-owned work
and are outside this plan's write scope:

```text
docs/superpowers/specs/2026-08-01-task-to-verified-accomplishment-design.md
docs/superpowers/plans/2026-08-01-task-to-verified-accomplishment-implementation.md
docs/superpowers/plans/2026-08-01-task-to-verified-accomplishment-test-matrix.md
```

Additional Task-to-Accomplishment production work appeared concurrently while this plan was being
written and is also user/other-worker-owned. WP-00 must refresh the exact status before branching; no
Filter/Search worker may format, stage, regenerate, or absorb these paths:

```text
.adonisjs/server/routes.d.ts
app/modules/accomplishments/**
app/modules/contracts/public_contracts/task_to_accomplishment/**
app/modules/contracts/tests/**
docs/12-evidence/task-to-accomplishment-baseline-2026-08-01.md
```

## 4. Definition of Done for every package

- [ ] **DOD-01 — Contract:** public behavior and ownership match the three specifications.
- [ ] **DOD-02 — Red:** focused test fails for the intended missing behavior, not environment noise.
      Docs/inventory-only packages such as WP-00 instead require a deliberately failing completeness
      validation or recorded baseline gap; they do not invent a production unit test.
- [ ] **DOD-03 — Green:** focused unit/contract/integration/UI tests pass.
- [ ] **DOD-04 — Refactor:** duplication and provider leakage are removed without widening scope.
- [ ] **DOD-05 — Edge cases:** the package's abnormal cases are represented by tests or an explicit
      deferred-risk entry with owner and gate.
- [ ] **DOD-06 — Security:** permission constraints, sensitive values, totals, facets, diagnostics,
      and timing do not leak unauthorized data.
- [ ] **DOD-07 — Compatibility:** old routes/contracts remain working until their named cutover
      package removes or deprecates them.
- [ ] **DOD-08 — Verification:** targeted lint/typecheck passes and no unrelated files changed.
- [ ] **DOD-09 — Graph check:** `gitnexus detect-changes` reports expected symbols/flows at handoff
      and again before any future user-authorized commit.
- [ ] **DOD-10 — Handoff:** worker reports outputs, commands, exact files, migration/rollback notes,
      staged-empty proof, and any follow-up package IDs; a SHA is included only if the user later
      authorizes a commit.
- [ ] **DOD-11 — Matrix traceability:** worker reports affected `TC-FST`/detailed-case IDs and which
      test layers the package supplies; master scenarios remain incomplete until every required layer
      has evidence.
- [ ] **DOD-12 — User-experience proof:** every affected P0 flow has role-play E2E, semantic
      assertions, screenshot checkpoints, backend/audit verification and independent experience review
      according to the linked test matrix. Unit/integration success alone cannot close the feature.

## 5. TDD ladder

Each package chooses the lowest sufficient layer and moves upward only when risk requires it:

1. **Pure unit tests:** AST truth tables, canonicalization, schema migration, URL codec, reducers.
2. **Contract/conformance tests:** every SQL/Search/taxonomy adapter runs the same semantic fixtures.
3. **Integration tests:** PostgreSQL migrations/repositories, permission composition, Elasticsearch
   mappings/aggregations/cursors, outbox/alert delivery.
4. **Component tests:** filter state, chips, expression builder, facet controls, saved views.
5. **E2E tests:** URL/Back/Forward, mobile staged apply, permission boundaries, saved workflows.
6. **Quality/performance gates:** benchmark corpus, high-cardinality facets, failover, cutover,
   rollback, no-leakage cases.

The linked test matrix is the authoritative cross-layer coverage ledger. A worker may turn its focused
tests GREEN while the feature/master scenario remains `[ ]`; only the coordinator/QA owner closes the
scenario after its full evidence bundle and screenshot sequence pass.

Global verification commands used by the coordinator after each wave:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:integration:safe
pnpm run test:ui:runnable
pnpm run test:e2e:policy
```

The final release gate additionally runs:

```bash
pnpm run test:full-confidence
pnpm run benchmark:search
gitnexus detect-changes
```

### 5.1 Executable RED/GREEN command cards

For every card below, the worker first creates the named test, runs the exact focused command, and
records the intended assertion/missing symbol. After the minimal implementation, the worker reruns
the same command GREEN before broader suites. A package may not start with `<path>` or an unresolved
glob in its command card; WP-00 expands inventory-derived WP-24 cards to exact paths.

- [ ] **CMD-WP-01:**
      `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/filtering/tests/backend/unit/filter_*.spec.ts`;
      RED is missing AST semantics/canonicalization, never service setup.
- [x] **CMD-WP-02:**
      `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/taxonomy/tests/backend/unit/*.spec.ts`;
      RED is missing provider contract/lifecycle behavior. The seven exact unit files currently
      pass `29/29`; production composition/version coverage and downstream consumers remain open.
- [x] **CMD-WP-03:**
      `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/search/tests/backend/unit/task_document_builder.spec.ts`;
      RED is the named secondary-label/cardinality assertion. Current focused builder/index/binding
      wave is GREEN (`21/21` together with the task metadata provider/source-reader suites); this
      exact command passes `3/3`; this command card does not close WP-03's production
      canonical-projection gap.
- [x] **CMD-WP-04:** the exact orchestration/security/registry unit files pass `28/28`; RED is no
      longer present in this command scope. WP-04's HTTP/browser/P0 role-play evidence remains open.
- [x] **CMD-WP-05:** the exact `saved_filter_view.spec.ts` and `filter_schema_migration.spec.ts` unit
      files pass `27/27`; persistence/API/UI and P0 role-play evidence remain open.
- [x] **CMD-WP-06:** `pnpm exec vitest run inertia/apps/shared/filtering/tests --maxWorkers=1` passes
      `77/77` across 14 files; consuming-shell browser/mobile and runtime accessibility evidence remain
      open.
- [ ] **CMD-WP-11:** run the exact accessible component files later added under
      `inertia/apps/shared/filtering/tests/`; RED is missing primitive accessibility behavior.
- [x] **CMD-WP-07A:** exact Skill taxonomy unit `18/18`, shared conformance contract `2/2`, Lucid
      catalog integration `3/3`, and composition/container binding `2/2` pass. WP-07A overall remains
      `[~]` because downstream Search/Filter consumption is not proven.
- [x] **CMD-WP-07B:** run the exact Task assignment unit, shared contract, and Lucid integration files; RED
      is complete multi-label/provenance/visibility behavior, not missing DB configuration. The
      current provider/source-reader wave is GREEN (`13/13`); production Search composition remains
      a separate incomplete gate under WP-03/WP-07. Exact unit/contract/integration evidence is
      `7/7 + 3/3 + 3/3`; production Search composition remains unproven.
- [x] **CMD-WP-07B-COMPOSITION:** run the exact task metadata composition unit file; the real
      source-reader/version boundary, application-container binding, and fail-closed unsupported-
      namespace behavior pass `3/3`. This does not prove Search projection adoption or complete
      namespace version coverage.
- [x] **CMD-WP-07B-CONFORMANCE:** the shared metadata-assignment verifier unit passes `2/2` and the
      Task provider contract passes `3/3`, including canonical multi-label uniqueness, provenance /
      free-form separation, taxonomy-version validity, and indistinguishable hidden/unknown probes.
      This verifies provider behavior, not downstream Search projection adoption.
- [x] **CMD-WP-08:**
      `node --import=@poppinss/ts-exec bin/test.ts contract --files app/modules/filtering/tests/backend/contract/filter_reference_executor.contract.spec.ts`;
      the reference/fake-sql/fake-search contract matrix passes `30/30`; production SQL/Search
      adapters and role-play evidence remain separate gates.
- [x] **CMD-WP-09:** run `filter_saved_views.spec.ts` with
      `bin/test.ts integration --files`; RED is missing schema/repository/ACL/concurrency behavior
      after the two reserved migrations boot on the isolated test database.
- [x] **CMD-WP-10:** the SQL executor integration `4/4`, SQL/reference differential contract `4/4`,
      and PostgreSQL conformance contract `2/2` pass against the test database. Production route/UI,
      cursor pagination, and full role-play evidence remain open.
- [x] **CMD-WP-12:** the exact task discovery context and permission-provider unit files pass `11/11`;
      production composition, canonical task projection, and browser evidence remain open.
- [x] **CMD-WP-13:** run compiler unit files with `bin/test.ts unit --files`, then the isolated
      Elasticsearch executor integration file; RED is a semantic binding/facet/cursor assertion,
      not unavailable Elasticsearch.
- [x] **CMD-WP-14:** run exact Filter API contract plus Search API integration files using
      `bin/test.ts contract|integration --files`; RED is the missing V2 transport/composition behavior
      while legacy GET remains GREEN.
- [ ] **CMD-WP-15/17/18:** run exact listed Vitest files with `pnpm exec vitest run`, then the named
      Playwright pilot spec with `pnpm exec playwright test <exact-file> --project=chromium --workers=1`;
      WP-00/WP-15/WP-17 must replace `<exact-file>` before assignment.
- [x] **CMD-WP-16:** run Search discovery/global query unit files and
      `search_discovery_application.spec.ts`; RED is missing wrapper/blended capability or
      authoritative population behavior.
- [x] **CMD-WP-17-V2-PRESENTATION:** server-side Discovery page mapper `2/2`, controller bridge
      `2/2`, Search Center component `8/8`, q-only route `1/1`, and Chromium role-play `1 passed`
      prove complete server-owned presentation cards render without provider documents. This card
      does not close direct browser V2 POST, filter/combined/cursor/recovery, or accessibility gates.
- [ ] **CMD-WP-19/20/21:** run each exact backend unit file with `bin/test.ts unit --files` and each
      frontend subtree with `pnpm exec vitest run`; RED is the named builder/parser/assistance behavior.
- [~] **CMD-WP-22:** focused alert policy/worker/evaluator units, alert repository integration, and
  saved-view HTTP contracts are GREEN; provider-backed delivery, UI, and resilience commands remain.
- [~] **CMD-WP-23A1/A2:** taxonomy plan/repository and Filtering migration unit/integration files are
  GREEN, including real consumer pause/checkpoint atomicity; operator authorization and injected
  failure/recovery commands remain.
- [~] **CMD-WP-23B1/B2/C:** projection generation/lifecycle, candidate rebuild, ready-only activation,
  and transactional invalidation stager evidence are GREEN; task producer hookups, replay,
  crash/reconciliation, and real-service integration remain.
- [ ] **CMD-WP-24:** WP-00 writes one command card per concrete child with exact backend test, Vitest,
      and optional Playwright paths in the release-train manifest. A WP-24 child without that card is
      unassignable and cannot be a WP-27A/WP-26 dependency.
- [ ] **CMD-WP-25:** run the exact unit/contract files with `bin/test.ts`, then
      `pnpm exec vitest run inertia/apps/shared/filtering/tests/assisted_authoring`; RED uses the fake
      provider and named validation/injection/UI assertion.
- [~] **CMD-WP-26:** validator implementation plus the runnable Japa unit suite `14/14` are
  green. The direct CLI invocation is intentionally still RED for the legacy manifest
  (`manifest_invalid`); exact leakage, failure, benchmark, and role-play evidence commands
  remain open.
- [ ] **CMD-WP-27A:** run exact composition/route tests plus migration clean/upgrade rehearsal before
      WP-26; RED is a missing/duplicate/unauthorized route or binding, never a worker-local stub.
- [ ] **CMD-WP-27B:** run `pnpm run test:full-confidence` and the approved evidence commands before
      canary; a failing comparison/gate is an intentional release RED, not bypassed implementation.
- [ ] **CMD-WP-28:** run exact ranking/rule/experiment unit/integration files, direct evaluation
      scripts, and WP-28E admin tests; RED is deterministic rank/rule/attribution/integration behavior.
- [ ] **CMD-WP-29:** run exact personalization/organization unit/integration files and WP-29C UI/API
      tests; RED is opt-out, tenant isolation, migration, or global-fallback behavior.
- [ ] **CMD-WP-30:** WP-30P runs the manifest/matrix validator for docs-only RED→GREEN; A/B run the
      exact RP-FST-13 and/or RP-FST-15 Playwright file selected by that frozen manifest with full
      evidence validation. RED is the first missing semantic/visual/backend/negative/reviewer proof.
      WP-30C reruns the join validator and WP-30D runs approved canary/rollback commands only after
      readiness closure.

## 6. Dependency and parallel-wave map

```text
WP-00 Baseline/inventory
├── Wave 1: WP-01 AST kernel | WP-02 Taxonomy contracts | WP-03 Search baseline reconciliation
│
├── Wave 2 after WP-01: WP-04 Context/executor orchestration | WP-05 Saved-view domain
│                       WP-06 Frontend criteria state
├── Wave 2 after WP-02: WP-07 Domain taxonomy adapters
│
├── Wave 3A: WP-08 Conformance harness | WP-09 Saved-view persistence
│            WP-11 Shared frontend primitives | WP-12 Domain discovery context
├── Wave 3B after WP-08: WP-10 SQL pilot backend | WP-13 Elasticsearch compiler/facets
│
├── Wave 4A after WP-13: WP-16 Search Discovery V2
├── Wave 4B after WP-16: WP-14 HTTP/composition
├── Wave 4C after WP-14: WP-15 SQL pilot UI | WP-17 Search UI | WP-18A Saved-view core
├── Wave 4D after pilots/WP-18A: WP-18B Saved-view pilot slots
│
├── Wave 5A: WP-19 Expression builder | WP-20 parser core | WP-22 Alert core/schema
├── Wave 5B: WP-21 after WP-20 | WP-23 after WP-22 migration
├── Wave 5C after required WP-23 parts: WP-24 Context migrations
├── Wave 5D after WP-19/20/21/23: WP-25 Assisted-authoring implementation (disabled)
│
├── Wave 6A pre-gate assembly: WP-27A Routes/composition/migrations (all capabilities disabled)
├── Wave 6B after WP-27A: WP-26 Quality/security/performance/role-play evidence
├── Wave 6C after WP-26: WP-27B Canary/cutover/docs
│
├── Wave 7A measured expansion: WP-28 Advanced relevance
├── Wave 7B after WP-28: WP-29 Adaptive/organization policies
└── Wave 7C evidence/cutover: WP-30P manifest freeze after WP-27B
    WP-30A after WP-30P/WP-28 | WP-30B after WP-30P/WP-29
    then WP-30C selected closure → WP-30D advanced canary
```

Packages in one wave are parallel only when all listed dependencies are complete and their write
sets remain disjoint after rebase.

## 7. Package index

- [ ] **WP-00 — Baseline, inventory, and ownership map**
- [~] **WP-01 — Filter AST semantic kernel**
- [~] **WP-02 — Taxonomy provider contracts and conformance core**
- [~] **WP-03 — Reconcile the existing Search metadata baseline**
- [~] **WP-04 — Context registry, permission composition, and executor orchestration**
- [~] **WP-05 — Saved-view domain and schema-migration engine**
- [~] **WP-06 — Frontend criteria contracts, URL codec, and state store**
- [~] **WP-07 — Domain taxonomy adapters and canonical assignment projections**
- [~] **WP-08 — Provider-neutral executor conformance harness**
- [~] **WP-09 — Saved-view persistence repository and database migration**
- [~] **WP-10 — Operational PostgreSQL pilot backend**
- [~] **WP-11 — Shared accessible filter UI primitives**
- [~] **WP-12 — Domain-owned indexed discovery context**
- [~] **WP-13 — Elasticsearch filter, facet, preference, and cursor compiler**
- [~] **WP-14 — HTTP transport and composition integration**
- [~] **WP-15 — Operational SQL pilot UI adoption**
- [~] **WP-16 — Search Discovery V2 integration**
- [~] **WP-17 — Search discovery frontend adoption**
- [~] **WP-18 — Saved-view API and frontend workflow**
- [~] **WP-19 — Advanced Boolean expression builder**
- [~] **WP-20 — Deterministic qualifier parser and visual round-trip**
- [~] **WP-21 — Suggestions, zero-result recovery, and explainability**
- [~] **WP-22 — Filter-view alerts and notification delivery**
- [~] **WP-23 — Taxonomy governance and cross-version migration choreography**
- [ ] **WP-24 — Independent migration waves for existing filter contexts**
- [ ] **WP-25 — Constrained natural-language assisted authoring**
- [ ] **WP-26 — Observability, security, performance, and resilience gates**
- [ ] **WP-27 — Pre-gate integration and compatibility cutover (WP-27A/WP-27B)**
- [ ] **WP-28 — Measured advanced retrieval, ranking, and experimentation**
- [ ] **WP-29 — Privacy-bounded adaptive and organization-specific discovery**
- [ ] **WP-30 — Advanced/adaptive role-play evidence, closure, and cutover**

## 8. Detailed work packages

### WP-00 — Baseline, inventory, and ownership map

- [~] **WP-00 overall status** — existing surface inventory, release-train ledger, GitNexus
  status, dirty-worktree ownership note, and focused backend baseline are present. The current
  rerun passes Global Search unit 13/13, Task document builder unit 3/3, Global Search API 4/4,
  Task document reader integration 6/6, and Audit Logs integration 14/14. Immutable docs-only
  freeze/commit, complete inventory reconciliation, frontend baseline summary, ownership table,
  and final release-manifest closure remain.

**Worker profile:** coordinator/integration owner.  
**Dependencies:** none.  
**Parallelism:** runs alone before production workers.  
**Exclusive write set:** this plan, the linked test matrix, the three linked specs, and
`docs/12-evidence/filter-surface-inventory-2026-08-01.md` plus
`docs/12-evidence/filter-search-release-train-2026-08-01.md`. No production code.

- [ ] Record `git status --short`, `git diff --stat`, current branch, and Search-specific diff
      ownership. Assign the existing Search changes to one named worker; do not clean or restage them.
- [ ] Commit or otherwise freeze the three specs and this plan as a docs-only baseline before worker
      branches are created.
- [ ] Run `gitnexus status`. If stale, run `gitnexus analyze` once from the coordinator worktree.
- [ ] Inventory every existing route/list/search/report/filter surface using GitNexus queries first,
      then targeted `rg`. Record resource, context, domain owner, permission owner, current query
      authority, provider, pagination, URL behavior, filter fields, cardinality, and tests.
- [ ] Identify hidden permission filters separately from visible filters.
- [ ] Mark every duplicated user/org/admin frontend implementation and every shared/high-collision
      composition or route file.
- [x] Run the focused pre-change unit baseline, one exact file per command:
      `node --import=@poppinss/ts-exec bin/test.ts unit --files="<exact-file>"` for
      `global_search_query.spec.ts` and `task_document_builder.spec.ts`. Do not insert a standalone `--`;
      Japa interprets the following `--files` as an invalid suite. Current result: 13/13 and 3/3.
- [x] Run the relevant integration baseline, one exact file per command:
      `node --import=@poppinss/ts-exec bin/test.ts integration --files="<exact-file>"` for
      `global_search_api.spec.ts`, `task_search_document_reader.spec.ts`, and `audit_logs.spec.ts`.
      Current result: 4/4, 6/6, and 14/14.
- [x] Run the frontend baseline directly:
      `pnpm exec vitest run inertia/apps/user/tests/modules/search/index.test.ts inertia/apps/admin/tests/modules/audit_logs/index.test.ts --maxWorkers=1`.
      Separate serial runs pass: user Search 6/6 and admin Audit Logs 3/3. The combined command's
      reporter was not stable in this worktree, so the evidence is retained as separate exact runs.
- [ ] Record any pre-existing failure with command, failing file, short excerpt, and whether it blocks
      a package. Do not make unrelated fixes in WP-00.
- [ ] Publish a package/file ownership table and pre-assign migration numbers before Wave 1 starts.
- [ ] Freeze the initial release-train manifest: exact selected WP-24 child ticket IDs, owners,
      dependency closure, deferred contexts/reasons, optional WP-25 status, and the gate that may add or
      remove a ticket. Enumerate every `TC-FST-*` and `RP-FST-*` ID with
      `applicability: required | deferred`, reason, approver, release ID, unique evidence owner and
      closure authority; do not express selection as an implicit numeric range. WP-27A/WP-26/WP-27B
      consume this file rather than an undefined “selected contexts” set.
- [ ] Map every selected requirement/context to `TC-FST` plus detailed test-matrix case IDs, required
      layers, test/evidence owner and applicable role-play journey. A selected context with no matrix
      closure cannot enter the release train.

**Expected outputs:**

- A docs-only baseline commit or immutable coordinator checkpoint.
- A complete surface inventory, not an inventory limited to the examples discussed during design.
- A clean mapping from every later package to exclusive files and existing test coverage.
- A known red/green baseline so workers do not misclassify environmental failures as TDD failures.
- A versioned first-release dependency manifest with no unresolved placeholder ticket.
- A test-matrix baseline proving which layers exist and which E2E/screenshot evidence is still
  missing; existing unit/integration tests are not reclassified as feature proof.

**Abnormal cases to calculate and record:** dirty files owned by another change; deleted/untracked
files; stale GitNexus index; test Elasticsearch unavailable; PostgreSQL integration database busy;
duplicated routes with different permission semantics; browser-only filters over partial data;
filters hidden inside repositories/cache keys; surfaces with no tests.

**Acceptance gate:** no production worker starts until every dirty file has an owner and every Wave 1
package has a disjoint write set.

### WP-01 — Filter AST semantic kernel

- [~] **WP-01 overall status** — kernel implemented; 89 focused unit tests and the reference
  conformance contract are GREEN. Remains `[~]` because DIFF/RP/VS evidence for the operators it
  defines is owned by later packages (see
  `docs/12-evidence/filter-search-wp14-wp10-evidence-2026-08-07.md`).

**Worker profile:** backend domain/TDD worker.  
**Dependencies:** WP-00.  
**Parallelism:** Wave 1; parallel with WP-02 and WP-03.  
**Exclusive write set:**

```text
app/modules/filtering/domain/filter_expression.ts
app/modules/filtering/domain/filter_operators.ts
app/modules/filtering/domain/filter_truth.ts
app/modules/filtering/domain/filter_canonicalizer.ts
app/modules/filtering/domain/filter_validator.ts
app/modules/filtering/domain/filter_hash.ts
app/modules/filtering/domain/filter_error.ts
app/modules/filtering/tests/backend/unit/filter_*.spec.ts
app/modules/filtering/tests/backend/fixtures/filter_semantic_cases.ts
```

- [ ] Run GitNexus queries for existing domain-result/error/canonicalization conventions; record the
      CLI limit if the new module has no graph symbols yet.
- [ ] **RED:** write truth-table tests for `and`, `or`, negation, `require`, `exclude`, explicit
      unknown include/exclude, and unknown inside preference clauses.
- [ ] **RED:** write set tests for Any/All/None/Exactly/At-least-N, empty-known set versus unknown,
      duplicate canonical values, and invalid `minimumMatch`.
- [ ] **RED:** write tests for ranges, relative time with a fixed clock, hierarchy values, nested
      relations, depth/condition/set-size limits, and invalid value/type combinations.
- [ ] **RED:** write canonical-equivalence tests for `exclude contains_any`, `contains_none`,
      `not_in`, harmless value order, and stable SHA-256 hash.
- [ ] **RED:** write bounded preference scoring tests, including clamping, explicit user sort that
      disables relevance, and no boost for unknown data.
- [ ] Run each exact file with
      `node --import=@poppinss/ts-exec bin/test.ts unit --files="<exact-file>"` for
      `filter_expression.spec.ts`, `filter_canonicalizer.spec.ts`, and `filter_validator.spec.ts`;
      expected RED is missing domain implementation, not TypeScript setup failure.
- [ ] Implement the smallest provider-neutral AST and pure functions that satisfy the tests. Do not
      import Lucid, Elasticsearch, HTTP, Svelte, or a product domain.
- [ ] Add property-style fixture loops for idempotence:
      `canonicalize(canonicalize(x)) === canonicalize(x)` and hash stability.
- [ ] Run focused tests GREEN, targeted ESLint, and backend typecheck.
- [ ] Run `gitnexus detect-changes`; expected scope is the new pure filtering domain and tests only.

**Expected outputs:**

- A deterministic, serializable Filter AST V1 and pure semantic kernel.
- Stable canonical payload/hash fixtures consumable by backend and frontend workers.
- Structured validation errors with AST path, error code, and repair hint; no provider DSL.
- A frozen contract-change request process: later workers may add adapters, not mutate semantics.

**Abnormal cases:** empty/one-child groups; double negation; NaN/infinite numbers; invalid or inverted
ranges; locale-sensitive sorting; repeated values with different casing; excessively deep relation
trees; time-zone/DST boundaries; `null` used as a value instead of explicit missing; preference
weights attempting to bypass strict filters; hash differences caused only by input order.

**Acceptance gate:** every normative table in Filter spec §§5.4–5.7 has at least one positive and one
negative test, and all tests run without database/search services.

### WP-02 — Taxonomy provider contracts and conformance core

- [~] **WP-02 overall status** — provider contracts and the shared conformance harness are GREEN
  across the exact taxonomy unit wave (`29/29`). Remains `[~]` until a real domain provider beyond
  the fakes runs the harness and taxonomy governance (WP-23) proves lifecycle behavior end to end.

**Worker profile:** backend domain-contract worker.  
**Dependencies:** WP-00.  
**Parallelism:** Wave 1; parallel with WP-01 and WP-03.  
**Exclusive write set:**

```text
app/modules/taxonomy/domain/taxonomy_term.ts
app/modules/taxonomy/domain/taxonomy_assignment.ts
app/modules/taxonomy/domain/taxonomy_version.ts
app/modules/taxonomy/public_contracts/taxonomy_provider.ts
app/modules/taxonomy/public_contracts/metadata_assignment_provider.ts
app/modules/taxonomy/public_contracts/taxonomy_diagnostics.ts
app/modules/taxonomy/tests/backend/unit/*.spec.ts
app/modules/taxonomy/tests/backend/contract/taxonomy_provider_conformance.ts
```

- [ ] Inspect current skill/category/task taxonomy contracts and lifecycle semantics without editing
      them.
- [ ] **RED:** test namespaced canonical refs, locale label fallback, alias type/review state,
      ambiguous aliases, active/deprecated/retired/merged lifecycle, and replacement refs.
- [ ] **RED:** test multi-parent ancestor paths, cycle rejection contract, multiple legitimate
      assignments, free-form tag separation, and version reporting.
- [ ] **RED:** test explicit/imported/derived/suggested provenance, review states, optional calibrated
      confidence, validity windows, stale/unresolved/missing/not-applicable distinctions.
- [ ] **RED:** create a provider conformance harness proving unauthorized terms and assignments are
      suppressed without count/error leakage.
- [ ] Run focused tests and capture the expected missing-contract RED.
- [ ] Implement provider-neutral types and conformance helpers only. Do not create a universal term
      table or migrate an existing catalog.
- [ ] Run focused unit/contract tests, targeted lint/typecheck, and `gitnexus detect-changes`.

**Expected outputs:** stable provider ports that existing domains can implement without surrendering
source-of-truth ownership; reusable conformance fixtures; explicit version/provenance/completeness
diagnostics.

**Abnormal cases:** alias collision across locale; canonical ID reused after retirement; split with
multiple replacements; graph cycle; orphan parent; confidence outside `[0,1]`; expired assignment;
hidden term inferred from an error; namespace provider unavailable; labels present but canonical ref
missing.

**Acceptance gate:** a fake flat taxonomy and a fake multi-parent taxonomy both pass the same
conformance suite.

### WP-03 — Reconcile the existing Search metadata baseline

- [~] **WP-03 overall status** — task search document builder/reader carry the legacy/multi-value
  baseline and their focused suites are GREEN. The canonical task metadata provider/source-reader
  also has unit/contract/DB evidence, but it is not wired into the production Search document
  reader/builder yet; canonical taxonomy-version coverage and downstream ES/query evidence remain
  open, as do the recorded benchmark and concurrent-p95 release RED owned by WP-26C.

**Worker profile:** the named owner of the pre-existing Search changes.  
**Dependencies:** WP-00 ownership assignment.  
**Parallelism:** Wave 1; parallel with WP-01 and WP-02, but no other worker may touch its files.  
**Exclusive write set:** exactly the eight dirty Search/task/benchmark files listed in §3; any extra
file requires coordinator approval.

- [ ] Review and summarize the existing diff before changing it. Separate finished intent from
      partial experiments; preserve user-authored behavior.
- [ ] Run `gitnexus impact` for `TaskSearchDocument`, `TaskSearchDocumentBuilder`, and
      `TaskSearchIndexRepository`; warn before edits if risk is HIGH/CRITICAL.
- [ ] **RED:** finish or add tests proving all existing multi-value task metadata reaches the reader,
      document, index mapping, and benchmark fixture as exact arrays rather than flattened JSON text.
- [ ] Add negative fixtures for secondary labels, duplicate tags, absent arrays, unknown canonical
      refs, and permission-hidden data.
- [ ] Audit source cardinality before naming a field multi-label. In particular, arrays produced by
      wrapping a singleton `business_domain`, `problem_category`, or `task_type` column must carry
      `legacy_single_value` coverage rather than claiming complete multi-label truth.
- [ ] Run the focused task builder/reader/repository tests and verify the failure is caused by the
      incomplete current diff.
- [ ] Complete the minimum baseline change without importing the not-yet-merged Filter Platform.
- [ ] Verify index mapping changes require a new index generation and do not mutate an incompatible
      active mapping in place.
- [ ] Run focused unit/integration tests and `pnpm run benchmark:search`; record relevance/latency
      deltas separately from platform work.
- [ ] Run `gitnexus detect-changes` and return one exact unstaged handoff so WP-13/WP-16 can consume
      it without absorbing unrelated working-tree changes.

**Expected outputs:** a coherent, tested Search task metadata baseline; exact arrays for every true
multi-label source; explicit legacy-singleton coverage for wrapped scalar classifications; benchmark
corpus containing secondary-label recall cases; no mixed half-completed worktree state.

**Abnormal cases:** `jsonb` string versus array source; duplicate/case-variant tags; empty versus
missing; invalid date; document larger than index limit; old documents without new fields; index
mapping conflict; Elasticsearch unavailable; benchmark variance; accidental inclusion of private
metadata.

**Coordinator closure:** correctness, mapping migration, quality, and serial-latency gates are GREEN.
The constrained test node's concurrent p95 was `404.97ms` against `250ms`; this remains an explicit
release RED owned by WP-26C and is not hidden by changing the threshold or falling back to SQL.

**Acceptance gate:** the existing dirty change is one understandable, explicitly bounded change set;
all eight files have no unresolved partial behavior, staging is empty, and no commit is created
without user authorization.

### WP-04 — Context registry, permission composition, and executor orchestration

- [~] **WP-04 overall status — implementation/test scope GREEN; P0 role-play evidence remains owned
  by WP-26E before package closure.**

**Worker profile:** backend application/ports worker.  
**Dependencies:** WP-01.  
**Parallelism:** Wave 2; parallel with WP-05, WP-06, and WP-07.  
**Exclusive write set:**

```text
app/modules/filtering/domain/filter_context_definition.ts
app/modules/filtering/public_contracts/filter_query.ts
app/modules/filtering/public_contracts/filter_facets.ts
app/modules/filtering/public_contracts/filter_diagnostics.ts
app/modules/filtering/public_contracts/filter_context_provider.ts
app/modules/filtering/actions/ports/outbound/filter_query_executor.ts
app/modules/filtering/actions/ports/outbound/filter_permission_constraint_provider.ts
app/modules/filtering/actions/queries/execute_filter_query.ts
app/modules/filtering/infra/in_memory_filter_context_registry.ts
app/modules/filtering/tests/backend/unit/execute_filter_query.spec.ts
app/modules/filtering/tests/backend/unit/filter_context_registry.spec.ts
```

- [ ] **RED:** test effective-context resolution by principal, field/operator allowlist, capability
      subset validation, context/schema mismatch, and missing executor profile.
- [ ] **RED:** test `AND(mandatory, user)` composition before hits/totals/facets/suggestions and prove
      the response never exposes an editable mandatory clause.
- [ ] **RED:** test fail-closed behavior when permission provider, context provider, or executor
      times out/fails; best-effort dropping is allowed only with explicit context policy and diagnostics.
- [ ] **RED:** test cursor/offset exclusivity, requested-facet allowlist, sort/projection limits,
      maximum cost/depth/conditions, request IDs, and executor degradation propagation.
- [ ] Run focused tests RED.
- [ ] Implement ports, in-memory registry, and orchestration with fake executors only. Do not wire
      routes/composition or product contexts.
- [ ] Add startup-validation helper proving a context capability set is a subset of its executor.
- [ ] Run focused tests GREEN, typecheck/lint, and `gitnexus detect-changes`.

**Expected outputs:** one provider-neutral execution entry point; authorized effective context;
server-owned permission composition; structured failures; zero Search/SQL dependencies in the
orchestrator.

**Abnormal cases:** unknown context; duplicate context key/version; stale client schema; unauthorized
field that resembles an authorized one; executor registered twice; permission returns invalid AST;
timeout after partial provider response; approximate total incorrectly labeled exact; hidden filter
appearing in diagnostics.

**Acceptance gate:** fake SQL and fake Search executors can be swapped without changing the request
or orchestrator tests.

### WP-05 — Saved-view domain and schema-migration engine

- [~] **WP-05 overall status — implementation/test scope GREEN; persistence/API/UI and P0 role-play
  evidence remain downstream dependencies.**

**Worker profile:** backend domain/TDD worker.  
**Dependencies:** WP-01.  
**Parallelism:** Wave 2; disjoint from WP-04/WP-06/WP-07.  
**Exclusive write set:**

```text
app/modules/filtering/domain/saved_filter_view.ts
app/modules/filtering/domain/filter_schema_migration.ts
app/modules/filtering/domain/filter_migration_result.ts
app/modules/filtering/actions/ports/outbound/filter_schema_migration_provider.ts
app/modules/filtering/tests/backend/unit/saved_filter_view.spec.ts
app/modules/filtering/tests/backend/unit/filter_schema_migration.spec.ts
```

- [ ] **RED:** test private/team/org visibility, context/schema ownership, semantic versus
      presentation state separation, default/pinned invariants, and canonical payload size bounds.
- [ ] **RED:** test ordered migrations with `compatible`, `migrated`, `requires_repair`, and `blocked`
      outcomes; idempotency by migration ID/input checksum; no version advance without atomic payload.
- [ ] **RED:** test field rename, operator change, taxonomy merge/retire, ambiguous split, missing
      migration hop, retry after failure, forward-reader rollback, and alert pause state.
- [ ] Run tests RED, implement pure domain behavior, then run GREEN.
- [ ] Ensure migration functions are deterministic and have no database, clock, or network access.
- [ ] Run targeted lint/typecheck and `gitnexus detect-changes`.

**Expected outputs:** provider-neutral saved-view aggregate and migration chain reusable by DB/API/UI
packages; stable checksum/idempotency semantics; explicit repair/blocked state.

**Abnormal cases:** owner deleted; org membership revoked; two defaults in one context; schema
downgrade; corrupt JSON; migration cycle; partial taxonomy split; very large criteria; view created
under permissions no longer held; rollback after a newer payload was persisted.

**Acceptance gate:** all migration outcomes can be exercised in pure tests and no obsolete condition
is silently discarded.

### WP-06 — Frontend criteria contracts, URL codec, and state store

- [~] **WP-06 overall status — implementation/unit/component scope GREEN, including 26/26 URL,
  history, staged-drawer and focus lifecycle tests; Marketplace now consumes the shared drawer with
  component evidence for deferred Apply and Cancel/focus restore; consuming P0 browser/mobile journeys,
  legacy migration, screenshots and runtime accessibility evidence remain downstream dependencies.**

**Worker profile:** frontend state/TDD worker.  
**Dependencies:** WP-01 canonical fixtures.  
**Parallelism:** Wave 2; no production Svelte components yet (the write set includes one component
reactivity test host only).  
**Exclusive write set:**

```text
inertia/apps/shared/filtering/contracts.ts
inertia/apps/shared/filtering/criteria_codec.ts
inertia/apps/shared/filtering/filter_url_codec.ts
inertia/apps/shared/filtering/filter_state.svelte.ts
inertia/apps/shared/filtering/filter_diagnostics.ts
inertia/apps/shared/filtering/tests/filter_url_codec.test.ts
inertia/apps/shared/filtering/tests/filter_state.test.ts
inertia/apps/shared/filtering/tests/filter_contract_fixtures.test.ts
inertia/apps/shared/filtering/tests/filter_state_reactivity.test.ts
inertia/apps/shared/filtering/tests/filter_state_reactivity_probe.svelte
inertia/apps/shared/filtering/fixtures/filter_semantic_cases.json
app/modules/filtering/tests/backend/unit/filter_canonicalizer.spec.ts  # coordinator parity bridge
```

- [ ] **RED:** consume WP-01 canonical JSON fixtures and prove backend/frontend round-trip parity.
- [ ] **RED:** test encoded URL stability independent of labels/locale/order, malformed/truncated URL,
      old schema diagnostics, unsupported condition preservation for repair, and payload-size rejection.
- [ ] **RED:** test committed versus staged draft state, Apply/Cancel, instant/debounced commit,
      Back/Forward, refresh, clearing filters without clearing sort/view, and SSR without `window`.
- [ ] **RED:** test concurrent requests, cancellation, stale response suppression, and request IDs.
- [ ] Run Vitest RED, implement state/codec without page-specific imports, then run GREEN.
- [ ] Run `pnpm exec vitest run inertia/apps/shared/filtering/tests --maxWorkers=1` and frontend
      typecheck/lint.

**Expected outputs:** a shell-neutral criteria store and URL codec; stable transport types; no
authoritative client filtering; shared fixtures proving parity with WP-01.

**Abnormal cases:** invalid percent/base64 encoding; URL exceeds browser/proxy limit; browser history
race; response for old criteria arrives last; selected value absent from new schema; locale changes;
mobile draft abandoned; empty text plus filter-only request; two tabs editing the same saved view.

**Acceptance gate:** user/org/admin shells can instantiate the store without importing one another.

### WP-07 — Domain taxonomy adapters and canonical assignment projections

- [~] **WP-07 overall status — both provider implementations and SQL conformance are GREEN in
  isolation; production composition and downstream Search consumption are not yet proven. Visible
  taxonomy repair/migration role-play remains downstream.**

**Worker profile:** two domain workers may split WP-07A/WP-07B because their write sets are disjoint.  
**Dependencies:** WP-02.  
**Parallelism:** Wave 2.

- [~] **WP-07A — Skill taxonomy provider** — real catalog reader/provider unit `18/18`, shared
  conformance contract `2/2`, Lucid integration `3/3`, and production composition/container binding
  `2/2` are GREEN. Downstream API exposure and Search/Filter consumer evidence remain open.
  - Exclusive files: new provider/adapter/tests under `app/modules/skills/**` and the current
    composition/config wiring. Coordinator-approved durable revision migration:
    `database/migrations/20260801059600_create_skill_taxonomy_revision.ts`; timestamp `060000`
    remains reserved exclusively for WP-09 saved views.
  - [ ] Run GitNexus impact for active skill/category readers before adapting them.
  - [ ] **RED:** test canonical skill refs, categories/parent paths, locale fallback, active/inactive,
        custom organization skills, aliases, ambiguity, permission scoping, and version reporting.
  - [ ] Implement the TaxonomyProvider over existing skill ownership without copying skills into a
        taxonomy table.
  - [ ] Run skill unit/integration tests and shared WP-02 conformance fixtures.
- [~] **WP-07B — Task metadata assignment provider** — provider/source-reader unit, shared contract,
  Lucid integration, and the bounded production composition/container checkpoint are GREEN (`7/7`,
  `3/3`, `3/3`, `3/3`); production Search projection wiring, complete namespace version sources, and
  internal projection visibility remain open. The composition deliberately fails closed for an
  unsupported canonical namespace rather than inventing a taxonomy version.
  - Exclusive files: new provider/adapter/tests under `app/modules/tasks/**`, excluding WP-03 files.
  - [ ] Run GitNexus impact for task taxonomy/required-skill rules before adapting them.
  - [ ] **RED:** test all task assignments, provenance, duplicate canonical refs, free tags versus
        canonical domains/technologies/types, missing versus empty, and permission-visible projection.
  - [ ] Implement domain-owned assignment projection without importing Search infrastructure.
  - [ ] Run task unit/integration tests and shared WP-02 conformance fixtures.

**Expected outputs:** at least one catalog provider and one entity-assignment provider proving the
taxonomy contracts fit existing domains; no duplicated source-of-truth storage.

**Abnormal cases:** inactive/retired skill still referenced; custom skill name collides with canonical
alias; entity has dozens/hundreds of labels; assignment source is deleted; cyclic category data;
organization-specific term leaks; low-confidence suggestion mistaken for reviewed truth.

**Acceptance gate:** providers pass WP-02 conformance and can be consumed without Search or Filter
modules importing domain persistence.

### WP-08 — Provider-neutral executor conformance harness

- [~] **WP-08 overall status — focused implementation, registry, reference/fake SQL/fake Search
  conformance, real Elasticsearch-versus-reference differential, cross-tenant no-leakage, and
  cursor tamper/expiry/generation HTTP/application evidence are GREEN; broad provider parity across
  the complete operator matrix and UI/RP/VS/release gates remain downstream.**

**Worker profile:** backend contract-test worker.  
**Dependencies:** WP-01 and WP-04 port shapes.  
**Parallelism:** Wave 3A; parallel with WP-09/WP-11/WP-12. WP-13 waits in Wave 3B.  
**Exclusive write set:**

```text
app/modules/filtering/actions/queries/internal/filter_executor_registry.ts
app/modules/filtering/tests/backend/contract/support/filter_executor_conformance.ts
app/modules/filtering/tests/backend/contract/support/reference_filter_evaluator.ts
app/modules/filtering/tests/backend/contract/filter_reference_executor.contract.spec.ts
app/modules/filtering/tests/backend/unit/filter_executor_registry.spec.ts
```

- [ ] **RED:** define one bounded reference dataset containing multi-value, range/date, hierarchy,
      relation, known-empty, unknown, permission-hidden, and stable-sort tie cases.
- [ ] **RED:** make the suite assert nested Boolean eligibility, Any/All/None/Exactly/At-least-N,
      mandatory permissions, constrained facets, valid self-excluding facets, and explicit rejection of
      non-extractable self-excluding expressions.
- [ ] **RED:** assert exact/bounded/unknown totals, stable pagination without duplicate/skip,
      tampered/expired cursor, abort/timeout, partial/degraded response, and unsupported capability.
- [ ] Implement a pure reference evaluator and exported
      `defineFilterExecutorConformanceSuite(...)` helper.
- [ ] Implement executor-profile registry with duplicate/missing/capability-mismatch startup errors.
- [ ] Run contract/unit tests GREEN and prove a fake SQL and fake Search executor can both plug into
      the suite.
- [~] Run architecture checks, typecheck/lint, and `gitnexus detect-changes`: exact WP-08 lint,
  Prettier, focused compilation/tests, port-taxonomy, diff-check and graph detection are GREEN;
  full TypeScript is currently blocked by unrelated concurrent
  `synchronize_task_assignment_contract.spec.ts`, while global module checks retain the recorded
  WP-01/WP-02/WP-07A baseline violations and add none from WP-08.

**Expected outputs:** one executable semantic oracle for every provider; adapters cannot claim
compatibility without passing the same fixture IDs/totals/facets/cursors.

**Abnormal cases:** federated total labeled exact; partial provider silently treated complete;
unsupported clause ignored; cursor includes raw principal/secret; provider changes tie-break order;
facet count built from current page; cancellation arrives during count aggregation.

**Acceptance gate:** later SQL and Elasticsearch packages import the conformance helper instead of
copying its expected behavior.

### WP-09 — Saved-view persistence repository and database migration

- [~] **WP-09 overall status** — persistence/domain/integration evidence is GREEN: the saved-view
  integration suite is 8/8, HTTP contract is 8/8, and security integration is 3/3 for membership
  revoke, foreign-tenant known-ID denial, and revoke-after-page-load execute/alert. Remains `[~]`
  for migration clean/upgrade/down rehearsal, UI/browser/RP/VS and release evidence.

**Worker profile:** backend persistence/integration-test worker.  
**Dependencies:** WP-04 and WP-05.  
**Parallelism:** Wave 3; owns reserved migrations only.  
**Exclusive write set:**

```text
database/migrations/20260801060000_create_filter_saved_views.ts
database/migrations/20260801061000_create_filter_saved_view_grants_and_migration_runs.ts
app/modules/filtering/actions/ports/outbound/filter_saved_view_repository.ts
app/modules/filtering/actions/ports/outbound/filter_saved_view_authorization.ts
app/modules/filtering/actions/ports/outbound/filter_transaction_runner.ts
app/modules/filtering/actions/commands/create_saved_filter_view_command.ts
app/modules/filtering/actions/commands/update_saved_filter_view_command.ts
app/modules/filtering/actions/commands/delete_saved_filter_view_command.ts
app/modules/filtering/actions/commands/share_saved_filter_view_command.ts
app/modules/filtering/actions/queries/list_saved_filter_views_query.ts
app/modules/filtering/actions/queries/get_saved_filter_view_query.ts
app/modules/filtering/actions/queries/execute_saved_filter_view_query.ts
app/modules/filtering/infra/repositories/postgres_filter_saved_view_repository.ts
app/modules/filtering/infra/adapters/lucid_filter_transaction_runner.ts
app/modules/filtering/tests/backend/integration/filter_saved_views.spec.ts
```

- [ ] **RED:** migration test requires owner user/org XOR, context/schema, canonical criteria JSONB,
      checksum, separate presentation JSONB, optimistic `lock_version`, migration state, soft delete,
      grants, and partial unique indexes for one default per owner/context.
- [ ] **RED:** test payload size constraints, normalized name uniqueness, two concurrent defaults,
      optimistic update conflict, and criteria/presentation updates remaining independent.
- [ ] **RED:** test private/read/edit/share/subscribe grants independently; current permission is
      re-evaluated on execution; saving never snapshots privileged results/access.
- [ ] **RED:** test deleted/deactivated owner, revoked org membership, cross-org shared view,
      soft-deleted view, corrupted checksum, and context with `savedViews=false`.
- [ ] Run integration tests RED, implement migration/repository/commands minimally, then GREEN.
- [ ] Run migrate-up/down/up rehearsal on the test database; down must not affect unrelated tables.
- [~] Run `pnpm run db:migrations:verify`, focused tests, typecheck/lint, and detect-changes. The
  integration coordinator updates shared migration checksum/snapshot files later.
  Focused integration/domain/migration tests, exact lint/format/diff, targeted rehearsal,
  port-taxonomy, and detect-changes are GREEN. The shared migration ledger still reports the
  recorded missing legacy migration, untracked checksum entries, pending concurrent migrations,
  and schema-dump approval; full TypeScript is blocked only by concurrent unrelated
  Task-to-Accomplishment test edits.

**Expected outputs:** transactional CRUD capability without controller/UI; durable ACL and optimistic
locking; no raw DSL or result snapshot persisted; migration rows ready for WP-23 choreography.

**Abnormal cases:** name normalization bypass with Unicode/whitespace; oversized JSON; two tabs
editing same view; owner removal mid-transaction; grant targets nonexistent principal; default view
soft-deleted; context version retired; checksum mismatch; retry after DB deadlock.

**Acceptance gate:** clean database and upgraded database both reach the same schema and concurrency
tests prove no double default/lost update.

### WP-10 — Operational PostgreSQL pilot backend

- [~] **WP-10 overall status** — differential parity is now proven, closing the gap where only
  capability declarations were compared: `admin_audit_filter_differential.contract.spec.ts` runs the
  PostgreSQL executor and the pure reference evaluator over the same seeded population and the same
  canonical AST (single equality, nested AND, nested OR inside AND, exclusion) and asserts identical
  eligible IDs and totals. A deliberate mutation that ignored the `exclude` effect made that suite
  fail, so the test is not decorative. Remains `[~]`: the shared WP-08 conformance suite still cannot
  host this adapter because it demands preference/relation capabilities the audit context does not
  declare, `page` returns no cursor, and RP/VS/AX evidence is absent.

**Pilot choice:** system audit investigation context. It is intentionally unrelated to Search
discovery and proves the platform works on a permission-sensitive operational SQL collection.  
**Worker profile:** admin/audit backend worker.  
**Dependencies:** WP-04, WP-08.  
**Parallelism:** Wave 3; does not modify current audit route/UI.  
**Exclusive write set:**

```text
app/modules/admin/audit_logs/filtering/admin_audit_filter_context_provider.ts
app/modules/admin/audit_logs/filtering/admin_audit_permission_provider.ts
app/modules/audit/infra/filtering/audit_log_filter_semantic_bindings.ts
app/modules/audit/infra/filtering/postgres_audit_log_filter_executor.ts
app/modules/audit/infra/repositories/read/filter_audit_logs_query.ts
app/modules/admin/tests/backend/unit/admin_audit_filter_context.spec.ts
app/modules/audit/tests/backend/unit/audit_log_filter_sql_compiler.spec.ts
app/modules/admin/tests/backend/integration/admin_audit_filter_executor.spec.ts
app/modules/admin/tests/backend/contract/admin_audit_filter_executor_conformance.contract.spec.ts
```

**Initial context:** `audit.admin.investigation`; resource `audit_event`; optional text; exact offset
pagination; fields include action, resource type/id, actor, outcome, severity, request/trace IDs,
created range, integrity state, and explicit missing actor. System-admin authorization is mandatory
and hidden.

- [ ] Run impacts for `ListAdminAuditLogsQuery`, `buildAdminAuditLogFilter`, and existing response
      mappers; HIGH/CRITICAL pauses the pilot.
- [ ] **RED:** prove a filter-only request returns the exact full permission-visible population and
      full totals/facets, not current-page counts.
- [ ] **RED:** exact action/resource/outcome matching, actor exists/missing, date boundaries with one
      captured `now`, stable `(created_at,id)` ordering, and no raw-string SQL identifiers.
- [ ] **RED:** prove non-system-admin, expired session, permission provider failure, and hidden
      structured payload values fail closed without count/diagnostic leakage.
- [ ] **RED:** prove redacted JSON cannot be recovered through text, facet value, timing, or missing
      count; malicious values remain bound parameters.
- [ ] Plug the executor into WP-08 conformance fixtures for supported capabilities.
- [ ] Implement new query/compiler/context alongside the old listing; do not change existing route
      behavior until WP-14/WP-15.
- [~] Run focused unit/integration/contract tests, audit regression suite, typecheck/lint, and
  detect-changes. WP-10 is GREEN for 9 unit + 4 PostgreSQL integration + 2 contract tests,
  35 existing audit unit regressions, 21 existing audit integration regressions, exact-scope
  ESLint/format, port/side-effect/auth gates, and WP-10 boundary/layer scope. Global TypeScript is
  blocked only by a concurrent Review integration teardown type error; shared architecture gates
  still report the separately tracked Filtering/Taxonomy/Task baseline debt.

**Expected outputs:** `QueryCriteriaResponse<AdminAuditLogRecord>` with exact SQL totals/facets and a
domain-owned context; old audit API remains untouched.

**Abnormal cases:** null actor/service event; redacted payload; invalid timestamp/DST boundary;
identical timestamps; extremely high event volume; integrity record missing; old event lacks request
ID; DB statement timeout; query canceled after count but before hydration; admin permission revoked
during request.

**Acceptance gate:** [ ] the SQL pilot passes supported common conformance plus audit-specific
no-leakage tests, retains selected-zero facets, and does not import Search or alter the legacy audit
route/read repository.

### WP-11 — Shared accessible filter UI primitives

- [~] **WP-11 overall status**

**Worker profile:** frontend component/accessibility worker.  
**Dependencies:** WP-06.  
**Parallelism:** Wave 3; components are shell- and domain-neutral.  
**Exclusive write set:**

```text
inertia/apps/shared/filtering/components/filter_workbench.svelte
inertia/apps/shared/filtering/components/filter_bar.svelte
inertia/apps/shared/filtering/components/filter_drawer.svelte
inertia/apps/shared/filtering/components/facet_group.svelte
inertia/apps/shared/filtering/components/facet_value_combobox.svelte
inertia/apps/shared/filtering/components/active_filter_chips.svelte
inertia/apps/shared/filtering/components/filter_summary.svelte
inertia/apps/shared/filtering/components/filter_ui_types.ts
inertia/apps/shared/filtering/components/filter_field_controls/*.svelte
inertia/apps/shared/filtering/tests/filter_primitives.test.ts
inertia/apps/shared/filtering/tests/filter_accessibility.test.ts
inertia/apps/shared/filtering/tests/filter_drawer.test.ts
```

- [ ] **RED:** render string/set/range/date/hierarchy/missing controls from an authorized definition
      while preserving domain-provided labels/order.
- [ ] **RED:** selected values remain visible at zero count; exact/approximate/unknown totals are
      distinguishable; unavailable facet search does not erase selections.
- [ ] **RED:** active chips summarize Any/All/None/At-least-N and unknown policy without relying on
      color or translated values as identity.
- [ ] **RED:** keyboard combobox/listbox behavior, visible labels, live-region result announcements,
      focus restoration, Escape, mobile focus trap, reduced motion, and screen-reader nesting summary.
- [ ] **RED:** staged drawer Apply/Cancel versus instant desktop commit, loading/error/degraded/partial
      states, duplicate submit suppression, and no authoritative local result counts.
- [ ] Implement primitives without importing user/org/admin pages or embedding page layouts.
- [~] Run Vitest component/accessibility tests, frontend typecheck/lint, and source guards proving no
  cross-shell imports. The touched Drawer/Marketplace/Alert slice is `15/15`, exact-scope ESLint
  and `git diff --check` pass, and strict Svelte check reports 0 errors and 0 warnings; the
  complete shared-filtering/source-guard matrix and repository-wide `tsc --noEmit` remain open.

**Expected outputs:** reusable primitives and behavior contracts; consuming pages choose
composition/density/commit policy; no giant schema form that forces identical interfaces.

**Abnormal cases:** 10,000 facet values; very long localized labels; selected retired term; count
changes while focused; offline facet request; partial source; zero results; touch keyboard; nested
drawer; high zoom; RTL; screen reader receiving too many live updates.

**Acceptance gate:** [~] Story/test hosts for user, org, and admin shells still need to render the same
primitive module without wrapper duplication; this cross-shell composition evidence belongs to the
consumer work packages and keeps WP-11 overall in progress.

### WP-12 — Domain-owned indexed discovery context

- [~] **WP-12 overall status**

**Worker profile:** task-domain context worker.  
**Dependencies:** WP-04 and WP-07B.  
**Parallelism:** Wave 3; no Search infrastructure edits.  
**Exclusive write set:**

```text
app/modules/tasks/filtering/task_discovery_filter_context.ts
app/modules/tasks/filtering/task_discovery_permission_provider.ts
app/modules/tasks/filtering/task_discovery_semantic_fields.ts
app/modules/tasks/tests/backend/unit/task_discovery_filter_context.spec.ts
app/modules/tasks/tests/backend/unit/task_discovery_permission_provider.spec.ts
```

- [ ] **RED:** context declares stable semantic fields—not index paths—for required skills,
      categories, business domains, domain tags, problem categories, task types, technology stack,
      difficulty, priority, workflow/application/verification state, role, organization/project, and
      created/updated/due/deadline ranges.
- [ ] **RED:** allow Any/All/None/At-least-N only on appropriate multi-value fields; bounded
      Prefer/Avoid only on ranking-safe fields; explicit unknown defaults by field.
- [ ] **RED:** anonymous/public/member contexts expose different effective fields and mandatory
      visibility/application constraints without revealing hidden field existence.
- [ ] **RED:** empty request/filter-only behavior, allowed sorts/facets/page size, schema version, and
      Search executor capability requirements are deterministic.
- [ ] Implement context and permission providers without importing Elasticsearch or Search mappings.
- [~] Run focused unit tests, task permission regressions, typecheck/lint, and detect-changes. Focused
  tests, regressions, exact lint/format, diff-check, and WP-12 architecture scope are GREEN;
  global typecheck is blocked by concurrent unrelated Task-to-Accomplishment test files, while
  the shared architecture gates still report the separately tracked WP-01/02/07A baseline debt.

**Expected outputs:** domain-approved vocabulary and permission constraints for the first indexed
vertical; Search receives a semantic definition but does not own business fields.

**Abnormal cases:** private/internal task; application closed; missing metadata; retired skill;
organization-specific tag; conflicting visibility and accepting-applications state; protected or
sensitive fields accidentally offered; field exists in DB but is not projection-ready.

**Acceptance gate:** the context can be validated against a fake Search executor profile without
access to any Search module type.

### WP-13 — Elasticsearch filter, facet, preference, and cursor compiler

- [~] **WP-13 overall status** — implementation and provider-level evidence are complete; bounded
  Prefer/Avoid semantics, unknown-policy rejection and non-finite-weight handling are now covered by
  13/13 focused tests. HTTP/UI,
  cross-provider differential, role-play, screenshot, and release gates remain owned by later
  work packages.

**Worker profile:** Search infrastructure worker.  
**Dependencies:** WP-03, WP-04, WP-08; consumes WP-12 context only through contracts.  
**Parallelism:** Wave 3; owns new Search filtering files, not existing global-query integration.  
**Exclusive write set:**

```text
app/modules/search/infra/filtering/elasticsearch_filter_compiler.ts
app/modules/search/infra/filtering/elasticsearch_preference_compiler.ts
app/modules/search/infra/filtering/elasticsearch_facet_compiler.ts
app/modules/search/infra/filtering/elasticsearch_cursor_codec.ts
app/modules/search/infra/filtering/elasticsearch_filter_query_executor.ts
app/modules/search/tests/backend/unit/elasticsearch_filter_compiler.spec.ts
app/modules/search/tests/backend/unit/elasticsearch_facet_compiler.spec.ts
app/modules/search/tests/backend/unit/elasticsearch_cursor_codec.spec.ts
app/modules/search/tests/backend/integration/elasticsearch_filter_executor.spec.ts
app/modules/search/tests/backend/contract/elasticsearch_filter_executor_conformance.contract.spec.ts
```

- [ ] **RED:** compile strict predicates to filter context, set All/At-least-N to safe `terms_set`
      semantics, ranges/dates/hierarchy/exists, relations/nested scope, and unknown policies.
- [x] **RED/GREEN:** compile bounded Prefer/Avoid separately from eligibility; explicit sort that disables
      relevance cannot be overridden.
- [ ] **RED:** constrained and extractable self-excluding aggregations use full permission-visible
      population; non-extractable expressions return the specified diagnostic.
- [ ] **RED:** facet values support high-cardinality search/pagination, selected-zero retention,
      missing/coverage counts, exact versus approximate relation, and no permission leakage.
- [ ] **RED:** signed/server-held cursor covers sort, tie-break ID, schema/ranking/index generation,
      and PIT when required; tamper, expiry, alias cutover, and sort change fail safely.
- [ ] **RED:** timeout/abort/partial shard/index-unavailable behavior is explicit; no query clause is
      silently dropped.
- [ ] Implement allowlisted semantic bindings; provider query objects never cross the executor port.
- [ ] Run common conformance suite, focused integration with dedicated test Elasticsearch, search
      benchmark subset, typecheck/lint, and detect-changes. WP-13 has 26 focused passing tests plus 30
      passing reference/fake-provider conformance regressions; the WP-13 TypeScript scope and
      exact-scope ESLint are clean; the isolated 53-document/20-query benchmark subset passed quality
      and latency thresholds (serial p95 69.62 ms); Search adds no architecture-gate violation. The
      repository-wide gates still expose separately tracked Filtering/Taxonomy/Skills and concurrent
      Reviews/Tasks/Accomplishments baseline debt.

**Expected outputs:** a generic indexed executor that can serve a registered Search-backed context;
authoritative contextual facets/cursors; no change yet to existing Search route/public API.

**Abnormal cases:** index alias changes between pages; PIT expired; mapping missing old field; shard
failure; too many buckets; approximate count; unsupported nested relation; enormous selected set;
invalid canonical ref; stale projection; Elasticsearch disabled; mandatory permission compiler
failure; query circuit breaker.

**Acceptance gate:** [x] executor passes all nine WP-08 conformance scenarios against the same
fixture IDs as the reference evaluator, and no test inspects raw DSL outside Search infrastructure.

### WP-14 — HTTP transport and composition integration

- [~] **WP-14 overall status** — the Filter HTTP boundary now exists and is routed:
  `GET /api/v1/filter/contexts/:context` and `POST /api/v1/filter/query`, wired through
  `app/composition/filtering_composition.ts` with startup capability validation. Contract (4) and
  real-PostgreSQL integration (6) suites are GREEN, including a seeded case proving the executor
  returns exactly the matching population and never leaks redacted payloads. Remains `[~]`: the
  saved-view CRUD surface is not routed, Search Discovery keeps its own composition rather than the
  shared registry, and no RP/VS/AX evidence exists. Evidence:
  `docs/12-evidence/filter-search-wp14-wp10-evidence-2026-08-07.md`.

**Worker profile:** integration owner; runs alone on shared hotspots.  
**Dependencies:** WP-04, WP-08, WP-09, WP-10, WP-12, WP-13, WP-16.  
**Parallelism:** Wave 4 integration; no other worker edits composition/routes/migration snapshots.  
**Exclusive write set:**

```text
app/composition/filtering_composition.ts
app/composition/filtering_application_provider.ts
app/composition/adapters/search_public_api_adapter.ts
app/composition/search_public_api_composition.ts
app/composition/search_engine_composition.ts
app/modules/filtering/controllers/filter_contexts_controller.ts
app/modules/filtering/controllers/filter_query_controller.ts
app/modules/filtering/controllers/filter_saved_views_controller.ts
app/modules/filtering/controllers/mappers/filter_request_mapper.ts
app/modules/http/controllers/search_discovery_api_controller.ts
app/modules/http/controllers/mappers/request/search_discovery_request_mapper.ts
app/modules/filtering/tests/backend/contract/filter_api.contract.spec.ts
app/modules/filtering/tests/backend/integration/filter_api_permissions.spec.ts
app/modules/search/tests/backend/integration/search_discovery_api.spec.ts
app/modules/search/tests/backend/integration/global_search_api.spec.ts
start/routes/api.ts
start/routes/api_v1.ts
adonisrc.ts
database/migration-checksums.json
```

- [ ] Rebase/merge prior packages and run focused suites before editing hotspots.
- [ ] Run impact analysis for the route registration/provider symbols.
- [ ] **RED:** contract tests for effective context discovery, execute criteria, saved-view CRUD/list,
      stable diagnostics/problem responses, and no `principal`/provider DSL accepted from clients.
- [ ] **RED:** add `POST /api/search/query` for Search Discovery V2 while proving the existing
      `GET /api/search?q=...` response and blank-query behavior remain compatible during the window.
- [ ] **RED:** permission tests prove unknown/unauthorized contexts/fields do not form an enumeration
      side channel and mandatory filters precede totals/facets.
- [ ] **RED:** startup fails on duplicate context/profile, missing executor, incompatible capability,
      or unregistered migration chain.
- [ ] Wire contributions at composition root so Filtering imports no product domain.
- [ ] Register versioned API routes without removing old page/API routes.
- [ ] Update migration checksum/snapshot once after merged migrations and rehearse clean/upgrade DB.
- [ ] Run contract/integration/architecture suites, typecheck/lint, detect-changes, and diff check.

**Expected outputs:** one authorized Filter HTTP boundary, a Search Discovery V2 POST wrapper using
the same criteria contract, and a composition registry serving SQL/Search-backed contexts plus saved
views; legacy routes remain compatible.

**Abnormal cases:** malformed JSON, oversized request, unknown schema, aborted request, principal
changes mid-session, duplicate contribution, executor unavailable, partial response, stale saved
view, migration checksum conflict, route alias collision.

**Acceptance gate:** clean application bootstrap validates all registered contexts/executors and API
contract tests can execute both pilot contexts through the same transport.

### WP-15 — Operational SQL pilot UI adoption

- [~] **WP-15 overall status**

**Worker profile:** admin frontend surface worker.  
**Dependencies:** WP-06, WP-10, WP-11, WP-14.  
**Parallelism:** Wave 4; exclusive ownership of the admin audit surface.  
**Exclusive write set:**

```text
inertia/apps/admin/modules/audit_logs/audit_log_page.svelte
inertia/apps/admin/modules/audit_logs/components/server_filters_card.svelte
inertia/apps/admin/modules/audit_logs/components/investigation_scope_card.svelte
inertia/apps/admin/modules/audit_logs/components/investigation_presets_card.svelte
inertia/apps/admin/modules/audit_logs/console_routing.ts
inertia/apps/admin/tests/modules/audit_logs/index.test.ts
inertia/apps/admin/tests/modules/audit_logs/console_routing.test.ts
inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts
```

- [ ] Run impact analysis for the touched audit Svelte/model functions and record current behavior.
- [ ] **RED:** add a legacy flat-URL-to-AST compatibility fixture; refresh, Back/Forward, new tab, and
      criteria change resetting pagination while preserving selected-event/deep-link state.
- [ ] **RED:** staged Apply/Cancel on desktop/mobile; no dropdown auto-submit in the same staged
      context; filter-only request; authoritative server total/facets.
- [ ] **RED:** permission removes a field/value, selected-zero count remains inspectable, invalid
      date/from-after-to, cursor expiry, partial/degraded/error states, and no sensitive diagnostic.
- [ ] Rename or model existing client-only investigation pivots as presentation/local pivots; they
      must not masquerade as authoritative server filters or totals.
- [ ] Replace the server-filter state/UI with WP-06/WP-11 primitives while retaining the audit-specific
      layout and detail investigation workflow.
- [ ] Keep the legacy URL adapter during the compatibility window; do not remove it in this package.
- [ ] Run focused Vitest and Playwright at desktop plus 390×844 mobile, then frontend typecheck/lint
      and detect-changes.

**Expected outputs:** first real SQL-backed UI using the common AST/URL/workbench; staged UX remains
audit-specific; browser no longer filters a partial page as if it were full truth.

**Abnormal cases:** selected event disappears after filter; event detail query param cleared
accidentally; permission revoked on Back; old URL contains unknown actor; API returns migrated
criteria; two rapid Apply actions; live event arrives while reviewing; 10,000 action values; mobile
keyboard and focus restoration.

**Acceptance gate:** E2E proves URL restoration, permission-safe filter-only browsing, authoritative
counts, and a usable mobile staged flow.

### WP-16 — Search Discovery V2 integration

- [~] **WP-16 overall status** — the canonical HTTP path was re-verified on 2026-08-07 against a
  freshly started Elasticsearch test plane (7 integration tests GREEN); before that plane existed
  every IT-ES suite failed with `ECONNREFUSED 127.0.0.1:9201`. Backend Search Discovery vertical, permission projection,
  cursor/timeout diagnostics, blended capability matrix, facet-timeout partial handling, real
  Elasticsearch evidence, production composition/active-generation wiring, and canonical HTTP API
  evidence are green; combined q+strict-filter+preference behavior is covered by real ES application
  9/9 and canonical HTTP 5/5 evidence, a real Inertia q-only Search Center route is covered by one
  integration test and Search Center frontend has 7 focused tests; authenticated browser/RP/AX/E2E and broader
  multi-vertical adoption remain.

**Worker profile:** Search application/public-contract worker.  
**Dependencies:** WP-03, WP-04, WP-12, WP-13.  
**Parallelism:** produces Search-module capability before WP-14 final composition merge; does not
edit routes or generic Filtering files.  
**Exclusive write set:**

```text
app/modules/search/public_contracts/search_discovery_contract.ts
app/modules/search/public_contracts/search_public_api.ts
app/modules/search/actions/queries/search_discovery_query.ts
app/modules/search/actions/queries/global_search_query.ts
app/modules/search/actions/queries/global_search/source_registry.ts
app/modules/search/actions/queries/global_search/result_builder.ts
app/modules/search/infra/tasks/task_search_index_repository.ts
app/modules/search/tests/backend/unit/search_discovery_query.spec.ts
app/modules/search/tests/backend/unit/global_search_query.spec.ts
app/modules/search/tests/backend/integration/search_discovery_application.spec.ts
```

WP-03 must be merged first because this package modifies one of its formerly dirty files.

- [ ] Run impacts for `GlobalSearchQuery`, `SearchPublicApi`, `TaskSearchIndexRepository`, and source
      registry/result builder; HIGH/CRITICAL stops the edit.
- [ ] **RED:** Search wrapper accepts `QueryCriteriaRequest` without declaring a second AST; q-only,
      filter-only, combined, and context-allowed completely empty discovery all behave distinctly.
- [ ] **RED:** vertical context uses domain-owned definition; blended Search context exposes only
      normalized common fields and rejects vertical-only clauses instead of silently ignoring them.
- [ ] **RED:** `search.blended.global` is authoritative only for common fields/counters supported by
      every included source. During staged migration, unsupported cross-source facets/totals return
      per-source plus explicit `partial/unsupported` diagnostics; they are never derived from the
      bounded 12-per-source/24-blended candidate window or labeled exact.
- [ ] **RED:** totals/facets derive from complete permission-visible population rather than the
      current 12-per-source/24-blended candidate cap.
- [ ] **RED:** existing compatibility response fields and bounded fallback remain available; fallback
      either enforces semantically equivalent mandatory/user filters or returns explicit degraded
      partial/no-result state—never broader unauthorized results.
- [~] **RED:** stable cursor, source timeout, one source partial, Elasticsearch disabled, stale index,
  alias generation change, request abort, ranking version, and opaque search-session/request IDs.
  Stable cursor expiry/staleness, provider timeout, abort, ranking/session IDs, alias/PIT cutover,
  backend facet-timeout partial handling, disabled-index producer, and canonical HTTP API resilience
  evidence are green. A Search Page bridge now routes enabled q-only/all requests through the
  canonical Discovery query and renders complete server-owned presentation cards while retaining
  the legacy aggregate contract (`unit 1/1` plus controller `2/2` and q-only route `1/1`); this is
  bounded presentation-adoption evidence, not full transport migration. Structured
  filter-only/blended scope, full UI/RP/AX/E2E resilience, and multi-vertical adoption remain open.
- [ ] Integrate WP-13 executor for the indexed vertical and preserve current lexical retrieval/RRF
      behavior where compatible.
- [ ] Keep old Search public behavior compiling; WP-14 owns the Search controller, route, composition,
      legacy HTTP compatibility test, and final transport wiring after this capability is green.
- [~] Run Search unit/integration suites, canonical HTTP integration, typecheck/lint, and
  detect-changes; benchmark subset and compatibility/E2E evidence remain.

Actual backend evidence also touched shared WP-04/WP-12/WP-13 contracts (cursor limit, relevance
hint, task permission/projection, and executor diagnostics). WP-14 must treat those files as a
shared dependency handoff and keep route/composition ownership separate.

**Expected outputs:** Search-owned discovery capability consuming Filter contracts; first
authoritative indexed vertical; permission-safe degradation; backward-compatible global search
during migration.

**Abnormal cases:** blank normalized query; exact ID correction attempted; source accepts filter but
fallback does not; result removed between cursor pages; index cutover mid-session; total approximate;
PIT expired; mixed source scopes; partial source reports stale data; session telemetry arrives late;
private record in a facet bucket.

**Acceptance gate:** old global Search tests and new Discovery V2 tests are green together, and the
old candidate-page client filter is no longer required for the new vertical path. Blended scope has a
field-by-source capability matrix proving every advertised authoritative total/facet.

### WP-17 — Search discovery frontend adoption

- [~] **WP-17 overall status** — shared wrappers and server-authoritative result rendering are in
  place; the bounded q-only/all bridge now renders complete server-owned Discovery presentations and
  focused user/org UI tests are GREEN. The bridge is server-mediated, so it is not evidence that the
  browser emits a direct `/api/v1/search/discovery` request. Filter-only/combined UI, cancellation/
  order races, accessibility, cursor/recovery, and complete Search UI E2E evidence remain.

**Worker profile:** shared Search frontend worker.  
**Dependencies:** WP-06, WP-11, WP-14, WP-16.  
**Parallelism:** exclusive ownership of user/org Search; admin Search is deferred to WP-24.  
**Exclusive write set:**

```text
inertia/apps/shared/search/**
inertia/apps/user/modules/search/**
inertia/apps/org/modules/search/**
inertia/apps/user/tests/modules/search/**
inertia/apps/org/tests/modules/search/**
```

- [ ] **RED:** shared Search body works under user/org wrappers that differ only by shell/layout
      context; no byte-for-byte component duplication remains in the migrated surface.
- [ ] **RED:** q-only, filter-only, combined, allowed empty discovery, true server totals/facets,
      selected-zero, cursor, partial/degraded source, and migrated/invalid diagnostics.
- [ ] **RED:** URL refresh/Back/Forward/new tab, scope change invalidating fields, recent search, click
      telemetry, and original versus normalized/corrected query remain inspectable.
- [ ] **RED:** rapid query/facet changes cancel stale requests; response order cannot restore old
      results; empty query no longer automatically means empty results when context allows browsing.
- [x] Remove `filteredResults` and other client-authoritative filtering over bounded server results
      from the new path.
- [ ] Compose shared Filter primitives differently for desktop rail/mobile drawer while retaining
      Search-specific result cards, source health, snippets, and actions.
- [ ] Run user/org Vitest suites, Search E2E compatibility, mobile/keyboard flow, frontend
      typecheck/lint, and detect-changes.

**Expected outputs:** one shared Search Center implementation with thin shell wrappers; server-backed
facets and results; current Search telemetry/recent-history preserved.

**Abnormal cases:** source fails after results from others render; query corrected but user rejects;
cursor result disappears; field allowed in one scope not another; selected term retired; offline
after committing filter; IME Vietnamese composition; scroll/focus lost after preview; very long
explanation.

**Acceptance gate:** user and org tests prove identical semantics and no migrated component imports a
shell-specific alias such as `$lib`/`@shared` from common code.

### WP-18 — Saved-view API and frontend workflow

- [~] **WP-18 overall status** — domain/repository/client/state/UI slices and focused tests exist;
  authenticated HTTP create/list route and composition now pass against the real DB. Mutation
  conflict/error contracts, duplicate, repair/migration, shared/team authorization, and real
  browser create/share/repair workflow remain.

**Worker profile:** WP-18A is a shared Filter frontend/API-client worker; WP-18B is two short,
serialized page-owner integration slots.  
**Dependencies:** WP-18A needs WP-06, WP-09, WP-11, WP-14. WP-18B also needs WP-15 and WP-17.  
**Parallelism:** WP-18A runs in Wave 4C; WP-18B runs in Wave 4D after page owners finish.  
**WP-18A exclusive write set:**

```text
inertia/apps/shared/filtering/saved_views/filter_saved_view_client.ts
inertia/apps/shared/filtering/saved_views/filter_saved_view_state.svelte.ts
inertia/apps/shared/filtering/components/saved_views/saved_view_menu.svelte
inertia/apps/shared/filtering/components/saved_views/saved_view_repair_dialog.svelte
inertia/apps/shared/filtering/components/saved_views/saved_view_share_dialog.svelte
inertia/apps/shared/filtering/tests/saved_views/*.test.ts
```

- [~] **RED:** create/list/duplicate/stale-lock conflict/repair acknowledgement now have authenticated HTTP contracts
  and real DB evidence; rename, pin/default/delete, criteria versus presentation updates, shared
  grants, and full API problem coverage still need their own contract coverage.
- [ ] **RED:** optimistic revision conflict, view deleted in another tab, offline retry with
      idempotency key, owner leaves organization, permission revoked, and shared view cannot edit/share.
- [~] **RED:** persisted `requires_repair` acknowledgement now has an authenticated HTTP contract;
  compatible/migrated/blocked outcomes, taxonomy split orchestration and
  migration-chain idempotency remain open;
  selected obsolete node remains visible; alert-paused status is inspectable.
- [x] Implement client/state/components without storing provider DSL/result snapshots locally.
- [x] Wire authenticated saved-view create/list/duplicate HTTP routes through composition,
      repository, context authorization, and canonical response mapping.
- [ ] Run Vitest, focused E2E for save/share/repair, frontend typecheck/lint, and detect-changes.

#### WP-18B — Serialized saved-view pilot integration slots

- [ ] **WP-18B overall status**

**Exclusive write set after WP-15/WP-17 handoff:**

```text
inertia/apps/admin/modules/audit_logs/audit_log_page.svelte
inertia/apps/admin/tests/modules/audit_logs/index.test.ts
inertia/apps/shared/search/search_center.svelte
inertia/apps/shared/search/tests/search_center.test.ts
```

- [ ] The prior WP-15 page owner integrates the saved-view menu through the audit-owned layout slot,
      then runs the WP-15 and WP-18 focused tests before handing the files back.
- [ ] The prior WP-17 Search owner integrates the same workflow through the Search-owned slot, then
      runs user/org Search and WP-18 focused tests before handing the files back.
- [ ] Verify the shared saved-view module still imports neither pilot layout and that each page retains
      its own density, placement, permission messaging, and mobile behavior.
- [ ] Run the two focused component suites, saved-view E2E, typecheck/lint, and detect-changes after
      both serialized edits.

**Expected outputs:** reusable saved-view workflow with conflict/repair UX; private/team/org sharing;
canonical criteria survives labels/layout changes.

**Abnormal cases:** duplicate name under Unicode normalization; stale lock version; view context
unavailable; server migrates criteria while dialog open; two defaults race; user loses subscribe
permission; browser storage contains older draft; delete succeeds but network response is lost.

**Acceptance gate:** concurrent-update and repair scenarios have deterministic UI, no silent
last-write-wins/drop-condition behavior, and both integration slots were edited only after their
original page packages handed off ownership.

### WP-19 — Advanced Boolean expression builder

- [~] **WP-19 overall status** — controlled AST model, bounded diagnostics, undo/redo and a
  keyboard-operable rendered tree editor are implemented and focused tests are GREEN; field
  capability enforcement, full preference editing, mobile/E2E and complete accessibility audit
  remain.

**Worker profile:** frontend interaction/accessibility worker.  
**Dependencies:** WP-06, WP-11.  
**Parallelism:** Wave 5; does not block pilot release.  
**Exclusive write set:**

```text
inertia/apps/shared/filtering/expression_builder/**
inertia/apps/shared/filtering/tests/expression_builder/**
```

- [x] **RED:** nested AND/OR/NOT; max depth/condition count; empty/one-child stored group; Require and
      Exclude; unknown policy; relation scope; field/operator capability.
- [x] **RED:** Prefer/Avoid is a separate ranking section and cannot be dropped into eligibility;
      unsupported preference fields show repair diagnostics.
- [~] **RED:** keyboard add/remove/move/indent/outdent, focus stability, non-color-only nesting,
  readable summary, bounded undo/redo, paste/oversized AST, and no drag-only operation.
- [~] **RED:** basic controls and builder round-trip to equivalent canonical AST whenever expression
  is representable; advanced-only expressions remain inspectable rather than flattened incorrectly.
- [~] Implement controlled tree editor using WP-06 state and domain-provided labels/options; current
  implementation preserves AST shape and uses domain-provided field/operator options, while
  capability removal and complete preference editing remain.
- [ ] Run component/a11y tests, keyboard/mobile E2E, typecheck/lint, and detect-changes.

**Expected outputs:** accessible advanced authoring without a second expression model; repair
diagnostics anchored to nodes; no raw query DSL.

**Abnormal cases:** permission removes field mid-edit; schema migration changes operator; nested
relation unsupported; taxonomy term split; huge pasted expression; undo after server canonicalizes;
preference weight out of bounds; screen reader navigation through deep groups.

**Acceptance gate:** every AST produced by the builder passes WP-01 validation/canonical fixtures and
keyboard-only tests complete the main editing flow.

### WP-20 — Deterministic qualifier parser and visual round-trip

- [~] **WP-20 overall status** — deterministic backend lexer/parser/serializer is implemented with
  7 focused tests GREEN, including residual text, quoted/escaped phrases, exclusions, Boolean
  groups, comparisons, dates, negative numbers, limits, diagnostics, and round-trip chips. The
  shared frontend qualifier UI, Search boundary integration, and browser/accessibility evidence are
  still open.

**Worker profile:** Filter parser worker; frontend serializer may be a second worker on a disjoint
subtree.  
**Dependencies:** WP-01, WP-04, WP-06; expression-builder integration waits for WP-19.  
**Parallelism:** Wave 5.  
**Exclusive write set:**

```text
app/modules/filtering/domain/filter_qualifier_lexer.ts
app/modules/filtering/domain/filter_qualifier_parser.ts
app/modules/filtering/domain/filter_qualifier_serializer.ts
app/modules/filtering/tests/backend/unit/filter_qualifier_parser.spec.ts
app/modules/filtering/tests/backend/unit/filter_qualifier_round_trip.spec.ts
inertia/apps/shared/filtering/qualifiers/**
inertia/apps/shared/filtering/tests/qualifiers/**
```

- [x] **RED/GREEN:** phrases, escaped quotes, exclusions, ranges, dates, `@me`, repeated qualifiers,
      parentheses, bounded Boolean operators, Any/All/None, hierarchy expansion chips, and residual text.
- [x] **RED/GREEN:** unknown/unauthorized qualifier keys, ambiguous alias, invalid token position,
      unbalanced parentheses, excessive depth/length, Unicode/diacritics, and exact quoted text.
- [x] **RED/GREEN:** backend AST → qualifier → AST round-trip for representable expressions; unrepresentable
      relation/preference/unknown policies retain visual chips and are never lost.
- [x] Keep structured qualifier parsing in Filter; Search receives only residual retrieval text and
      typed criteria.
- [x] Implement parser/serializer with context allowlist and precise diagnostic ranges.
- [ ] Run unit round-trip fixtures, frontend tests, Search compatibility tests, typecheck/lint, and
      detect-changes.

**Expected outputs:** deterministic parser/serializer and autocomplete metadata; no Search-specific
second grammar; every rewrite reversible.

**Abnormal cases:** colon inside phrase; negative number versus exclusion; locale date ambiguity;
duplicate alias; user enters private field name; exact identifier typo; regex/script injection;
unsupported operator; IME composition; qualifier recognized in one scope but not another.

**Acceptance gate:** unknown qualifiers cannot become hidden broadening and round-trip fixtures cover
every supported operator family.

### WP-21 — Suggestions, zero-result recovery, and explainability

- [~] **WP-21 overall status** — provider-neutral backend contracts now cover privacy-filtered
  suggestion grouping, typed reversible zero-result patches, and a typed fail-closed explanation
  contract (`19/19` contract unit). The real Elasticsearch task mapper still emits no explanation
  because it has no stable provider signal provenance; strict-filter, text-match, preference-score
  and taxonomy provenance must be wired from authoritative provider evidence before display.
  Result-count previews, frontend combobox/recovery UI, permission integration and browser/a11y
  evidence also remain.

**Worker profile:** two disjoint workers may implement backend assistance and shared Search UI.  
**Dependencies:** WP-13, WP-16, WP-20; frontend also needs WP-17.  
**Parallelism:** Wave 5.  
**Exclusive write set:**

```text
app/modules/search/actions/queries/search_suggestions_query.ts
app/modules/search/actions/queries/search_zero_result_recovery_query.ts
app/modules/search/domain/search_relaxation_patch.ts
app/modules/search/public_contracts/search_assistance.ts
app/modules/search/tests/backend/unit/search_suggestions_query.spec.ts
app/modules/search/tests/backend/unit/search_zero_result_recovery_query.spec.ts
inertia/apps/shared/search/suggestions/**
inertia/apps/shared/search/recovery/**
inertia/apps/shared/search/tests/assistance/**
```

- [~] **RED:** grouped recent/saved/entity/facet/qualifier suggestions, permission thresholds,
  debounce/cancel/latest-response, alias ambiguity, and no sensitive low-count suggestions.
- [x] **RED:** zero-result diagnosis finds typed exclusion/hierarchy/All→Any/minimum-match clauses and proposes reversible
      patches: remove exclusion, broaden hierarchy parent, relax All→Any, lower At-least-N, or alternate
      scope only when authorized.
- [~] **RED:** exact identifier is never silently corrected; typed relaxation has
  preview/apply/undo and explanation of result-count effect.
- [x] **RED:** result explanation lists strict matches, bounded preferences, unknown fields,
      taxonomy expansion, ranking version, and partial/stale source without exposing hidden constraints.
- [~] Implement backend typed patches; WAI-ARIA combobox/recovery UI and provider binding remain.
- [ ] Run backend unit, frontend component/a11y, permission, and rapid-input tests; typecheck/lint and
      detect-changes.

**Expected outputs:** assistance that edits the same AST; measurable and reversible recovery;
permission-safe explanations; accessible suggestion UX.

**Abnormal cases:** correction arrives after query changed; provider partial produces false zero;
relaxation would cross permission boundary; taxonomy alias collides; query has no relevant result by
design; user rejects correction; one source unhealthy; explanation is too long; behavior data sparse.

**Acceptance gate:** every suggestion/relaxation is a typed patch validated again by WP-04 before
execution, and privacy/no-leakage tests cover suggestions as well as results.

### WP-22 — Filter-view alerts and notification delivery

- [~] **WP-22 overall status** — WP-22A core policy/lifecycle/schema/repository/worker and internal
  creation command are implemented and verified; task-member context dispatch now exposes the
  enabled alert capability, and a notification-fanout delivery adapter is composition-bound and
  integration-verified. Test isolation now removes stale saved views/alerts before global claim
  tests, fixing the reproduced order-dependent alert failures; real search-provider evaluation,
  UI, scheduler/worker orchestration, and role-play evidence remain.

**Worker profile:** WP-22A backend reliability worker followed by WP-22B alert API/frontend worker.  
**Dependencies:** WP-22A needs WP-05, WP-09, WP-14; WP-22B also needs WP-18. Taxonomy-dependent alert
enablement waits for WP-23.  
**Parallelism:** WP-22A may run beside UI-only packages. WP-22B runs only after WP-18 hands off its
saved-view menu files. Final route/composition registration is owned by WP-27A.  
**WP-22A exclusive write set:**

```text
database/migrations/20260801062000_create_filter_alerts.ts
app/modules/filtering/domain/filter_alert.ts
app/modules/filtering/domain/filter_alert_policy.ts
app/modules/filtering/actions/ports/outbound/filter_alert_repository.ts
app/modules/filtering/actions/ports/outbound/filter_alert_delivery.ts
app/modules/filtering/actions/commands/create_filter_alert_command.ts
app/modules/filtering/actions/commands/update_filter_alert_command.ts
app/modules/filtering/actions/commands/pause_filter_alert_command.ts
app/modules/filtering/infra/repositories/postgres_filter_alert_repository.ts
app/modules/filtering/infra/workers/filter_alert_worker.ts
commands/filter_alert_work.ts
app/modules/filtering/tests/backend/unit/filter_alert_policy.spec.ts
app/modules/filtering/tests/backend/integration/filter_alert_worker.spec.ts
```

- [x] Run impact analysis for the existing lease/fence worker and notification-delivery ports; do
      not modify `NotificationFanoutWorker` merely to reuse its behavior.
- [~] **RED/GREEN:** migration/repository tests cover schedule, timezone, context/view revision, last
  successful watermark, next run, pause reason, optimistic lock, lease owner/expiry/fence token,
  retry count, and soft deletion. The unit suite proves absolute interval cadence across Europe/Berlin
  DST transitions (4/4), and the PostgreSQL repository integration proves a completed alert is not
  re-claimed when the observed clock moves backward (1/1); calendar-time scheduling and broader
  clock-injection/stress coverage remain open.
- [~] **RED/GREEN:** policy tests cover subscription permission, minimum interval,
  context alert capability, exact/approximate totals, query cost, stale taxonomy/schema, and
  `compatible`, `requires_repair`, or `blocked` saved-view state.
- [~] **RED/GREEN:** worker tests cover lease/fence, delivery ordering, degraded-provider pause,
  and idempotency-key construction. First-run delta, changed-match policy,
  zero-to-nonzero transition, duplicate poll, overlapping workers, crash before/after delivery,
  retry/backoff, dead letter, late completion with an obsolete fence, and graceful shutdown.
  A real PostgreSQL worker-to-fanout integration now passes 1/1; concurrent/crash/DST and
  provider-backed evaluator cases remain open.
- [ ] **RED:** privacy tests prove alert rows/delivery payloads contain canonical criteria/view refs
      and authorized result summaries—not privileged result snapshots, hidden totals, raw provider DSL,
      or sensitive facet values.
- [x] Implement a claim/lease/fence/checkpoint worker using the repository and delivery ports. Reuse
      existing reliability conventions while keeping Filter independent from a notification provider.
- [x] Re-authorize the saved view and rebuild mandatory permission constraints on every run; a
      degraded provider must pause/retry rather than broaden the query. `PostgresFilterAlertEvaluator`
      resolves current approved organization membership, rechecks subscribe authorization, and
      executes through `ExecuteSavedFilterViewQuery`; unavailable/degraded/approximate results fail
      closed. Cross-layer provider-success, delivery, DST, and browser gates remain open.
- [x] Use deterministic delivery idempotency key
      `alert_id + view_revision + observation_window + result_identity_hash`; advance the watermark only
      after the idempotent delivery acknowledgement is durable.
- [x] Bind `PostgresFilterAlertNotificationDelivery` to the existing notification fanout public
      contract. The adapter stages an owner-scoped `filter.alert.match_detected` job transactionally,
      uses the worker idempotency key as business/dedupe identity, and exposes only the bounded safe
      summary; unit and PostgreSQL/fanout-worker integration tests pass 2/2.
- [x] Add `filter:alert-work` with bounded `--once`/poll/lease flags and signal-safe shutdown. The
      command is registered and composition-bound; the test-DB worker integration proves its bound
      repository/evaluator/delivery path, while a normal local app-DB smoke run remains unavailable
      until that environment applies migration `20260801062000`.
- [~] Run unit/integration, migration verification, typecheck/lint, and
  `gitnexus detect-changes`. Leave checksum manifest and composition registration to WP-27A.

**Expected outputs:** durable scheduled subscriptions for saved criteria; at-most-one visible
notification per observation window under retries; explicit pause/recovery state; delivery through a
port that the existing notification subsystem may implement.

**Abnormal cases:** daylight-saving/invalid timezone; owner deleted; share revoked; context disabled;
taxonomy split; projection generation changes while polling; result disappears before hydration;
approximate total; provider timeout; clock moves backward; lease expires during a slow query; worker
crashes after send but before acknowledgement; poison delivery; alert interval shortened while a run
is active.

**Acceptance gate:** concurrent worker tests prove fencing/idempotency, permission revocation cannot
leak a previously visible match, and a failed/degraded run never advances the success watermark.

#### WP-22B — Alert API, subscription UI, and saved-view integration

- [~] **WP-22B overall status** — lifecycle API routes and optimistic-lock repository mutations plus
  provider-backed notification delivery are implemented; successful real-provider creation, UI,
  scheduler orchestration, and role-play evidence remain open.

**Dependencies:** WP-18, WP-22A.  
**Exclusive write set after WP-18 handoff:**

```text
app/modules/filtering/controllers/filter_alerts_controller.ts
app/modules/filtering/tests/backend/integration/filter_alert_api.spec.ts
inertia/apps/shared/filtering/alerts/filter_alert_client.ts
inertia/apps/shared/filtering/alerts/filter_alert_state.svelte.ts
inertia/apps/shared/filtering/components/alerts/filter_alert_subscription_dialog.svelte
inertia/apps/shared/filtering/components/alerts/filter_alert_status_badge.svelte
inertia/apps/shared/filtering/components/saved_views/saved_view_menu.svelte
inertia/apps/shared/filtering/tests/alerts/filter_alert_workflow.test.ts
inertia/apps/shared/filtering/tests/saved_views/saved_view_menu.test.ts
```

- [~] **RED/GREEN:** API tests cover anonymous access, fail-closed create against an alerts-disabled
  context, and seeded GET/pause/resume/delete lifecycle behavior; repository integration covers
  update/pause/resume/delete/status. Successful provider-backed
  create, current-permission revocation, stale revision, and safe diagnostics remain open; the
  delivery adapter's idempotent fanout path is GREEN in unit and PostgreSQL integration. The
  response now carries the authoritative alert lock version and the API contract asserts its
  monotonic pause/resume progression.
- [~] **RED/GREEN:** UI client/state/component tests cover alert request mapping, typed policy errors,
  optimistic-lock lifecycle state, status semantics, keyboard Escape, subscribe/pause/delete and
  saved-view menu integration (12/12). Zero-result baseline, schedule validation, paused
  taxonomy/permission/provider states, resume eligibility, delivery/open-result state,
  conflict/offline retry, mobile focus and full accessibility remain open.
- [x] Implement the API client/state/components and integrate through the serialized saved-view menu
      slot; shared alert UI does not import notification provider or page layouts.
- [x] Expose inspectable last-success/next-run/pause reason and safe delivery link without showing a
      privileged result snapshot or pretending failed/degraded evaluation succeeded. The API already
      returned these bounded fields, and the subscription dialog now renders next run, last successful
      evaluation, and pause reason; the component suite covers the paused/diagnostic state (5/5).
- [~] Run alert API integration, component/a11y and WP-18 saved-view regression; alert API 7/7 and
  focused UI 12/12 pass, while full a11y/mobile/E2E remain. WP-27A owns
  route/composition registration, after which WP-26E runs RP-FST-08 against the merged app.

**Expected output:** users can subscribe, inspect, pause/resume and open alert results through the UI;
the role-play journey does not need an API shortcut for the core subscription action.  
**Abnormal cases:** view deleted while dialog open; permission revoked before save; timezone changes;
subscription already exists; alert paused for multiple reasons; delivery target removed; browser
offline after submit; resume under newer taxonomy version.  
**Acceptance gate:** RP-FST-08 can create and inspect the subscription entirely through UI, while
backend evidence proves lease/watermark/idempotency and permission safety.

### WP-23 — Taxonomy governance and cross-version migration choreography

- [~] **WP-23 overall status** — WP-23A1 preview/apply contracts and durable migration ledger are
  implemented and verified; consumer coordination and repair-required blocking now have backend
  plus admin component evidence, while projection lifecycle, activation, operator role-play,
  and full repair/a11y evidence remain open.

**Worker profile:** split into the independent subpackages below; the coordinator serializes
their migrations and lifecycle integration.  
**Dependencies:** WP-02, WP-05, WP-07, WP-09, WP-13, WP-16, and the WP-22 alert schema/core commit so
migrations `062000` through `066000` merge in order. Alert traffic remains disabled until WP-27B.  
**Parallelism:** WP-23A1 and WP-23B1 may develop in parallel after contracts freeze; migration commits
merge in numeric order. WP-23A2/WP-23B2 wait for their cores; WP-23A3 waits for A1/A2; WP-23C waits
for A1/A2/B1/B2 and WP-23C2 waits for C.  
**Collision rule:** only WP-23B1 touches event-outbox contracts and only WP-23C touches Search index
lifecycle/administration files.

#### WP-23A1 — Governed taxonomy change planning and application

- [~] **WP-23A1 overall status** — deterministic preview/apply and checkpoint repository are GREEN;
  operator authorization, full consumer impact providers, and crash/rollback integration remain.

**Exclusive write set:**

```text
database/migrations/20260801063000_create_taxonomy_migration_runs.ts
app/modules/taxonomy/domain/taxonomy_change_set.ts
app/modules/taxonomy/domain/taxonomy_migration_plan.ts
app/modules/taxonomy/public_contracts/taxonomy_change_criteria_mapping.ts
app/modules/taxonomy/actions/queries/preview_taxonomy_change_query.ts
app/modules/taxonomy/actions/commands/apply_taxonomy_change_command.ts
app/modules/taxonomy/actions/ports/outbound/taxonomy_migration_repository.ts
app/modules/taxonomy/infra/repositories/postgres_taxonomy_migration_repository.ts
app/modules/taxonomy/tests/backend/unit/taxonomy_migration_plan.spec.ts
app/modules/taxonomy/tests/backend/integration/taxonomy_migration.spec.ts
```

- [~] **RED/GREEN:** preview tests cover rename, alias addition/removal, merge, retirement, re-parent, and
  split; every plan lists impacted assignments, saved views, alerts, projections, and indices.
- [~] **RED/GREEN:** automatic migration is allowed for identity-preserving rename/alias and unambiguous
  merge; ambiguous split returns `requires_repair` and preserves the obsolete ref for UI repair.
- [~] **RED/GREEN:** application tests cover plan token/expected version fencing, chunk checkpoint/resume,
  per-item idempotency, partial failure, rollback before publish, forward-fix after publish, and
  namespace version increasing exactly once.
- [ ] **RED:** permission tests prove preview counts/details are bounded by operator authorization
      and never reveal hidden terms, assignments, views, alerts, or principals.
- [~] Implement provider-owned governance orchestration and migration records without moving source
  catalogs into a generic taxonomy table.
- [~] Publish a deterministic, provider-owned identity mapping and affected-consumer manifest; do not
  directly rewrite Filter-owned saved criteria or call alert commands from Taxonomy.
- [~] Run focused unit/integration/migration tests, typecheck/lint, and detect-changes.

**Expected outputs:** auditable preview/apply workflow; versioned, resumable migration; deterministic
criteria outcome of `compatible`, `migrated`, `requires_repair`, or `blocked`.

**Abnormal cases:** concurrent catalog mutation; alias collision; split with no replacement;
multi-parent cycle; provider unavailable mid-run; hidden affected assignment; stale plan token;
operator loses permission; retry after partial commit; rollback target cannot read newer criteria.

**Acceptance gate:** no taxonomy mutation publishes until impact preview is stable, all automatic
rewrites are deterministic, and repair-required items remain recoverable.

#### WP-23A2 — Filter-owned taxonomy criteria migration and alert coordination

- [~] **WP-23A2 overall status** — pure criteria rewrite, repair preservation, alert-pause port,
  checkpoint coordinator, PostgreSQL pause adapter, transaction forwarding, and real PostgreSQL
  consumer integration are implemented; checkpoint-CAS rollback is now covered in the same
  transaction and composition is bound through `FilteringActionFactory`; owner repair recovery
  is covered by the saved-view HTTP contract, and alert subscriber revocation is covered by a
  real PostgreSQL evaluator integration; full permission role-play remains.

**Dependencies:** WP-05, WP-09, WP-22, WP-23A1.  
**Exclusive write set:**

```text
app/modules/filtering/actions/commands/migrate_taxonomy_filter_criteria_command.ts
app/modules/filtering/actions/commands/coordinate_taxonomy_filter_consumers_command.ts
app/modules/filtering/actions/ports/outbound/filter_alert_pause_port.ts
app/modules/filtering/tests/backend/unit/taxonomy_filter_criteria_migration.spec.ts
app/modules/filtering/tests/backend/integration/taxonomy_filter_consumer_coordination.spec.ts
```

- [~] **RED/GREEN:** consume the Taxonomy mapping through its public contract and drive WP-05 migration
  outcomes without importing provider storage or changing canonical term identity.
- [~] **RED/GREEN:** deterministic rewrites and split/blocked repair preservation are unit-covered;
  compatible/merge rewrites update saved criteria atomically; split/blocked criteria keep
  obsolete refs, enter repair state, and pause affected alerts through a port before taxonomy
  publication can complete.
- [~] **RED:** retry/idempotency, partial batch, alert-pause failure, and stale checkpoint CAS now
  preserve atomic consumer state; saved-view HTTP repair recovery is GREEN, while permission
  revocation and stale plan-token role-play remain.
- [x] Implement the Filter-owned coordinator and ports; composition binds the alert pause port to
      WP-22 and the taxonomy migration repository without Taxonomy importing Filtering or notifications.
- [~] Run focused unit/integration tests, saved-view/alert regressions, typecheck/lint, and
  detect-changes. Coordinator unit `1 passed`, consumer integration `1 passed` (including
  checkpoint rollback), taxonomy migration integration `1 passed`, composition test `2 passed`;
  saved-view HTTP contract `7 passed`; permission/revocation and broader regressions remain.

**Expected output:** Filter retains ownership of saved criteria/alert lifecycle while consuming a
provider-owned taxonomy mapping through stable contracts.  
**Abnormal cases:** view deleted during migration; alert already paused for another reason; mapping
version superseded; owner loses access; one view corrupt; repair completed under a newer taxonomy
version.  
**Acceptance gate:** taxonomy publish cannot leave a saved view silently broadened or an incompatible
alert running.

#### WP-23A3 — Taxonomy governance operator API and UI

- [~] **WP-23A3 overall status** — governed service boundary now exists: provider
  version is authoritative, consumer impact is requested through an aggregate-only
  port, preview creates a signed plan and a durable run, and stale preview state is
  rejected and apply re-reads the provider version (`taxonomy_governance_service.spec.ts` 3/3);
  orchestration now lives in `TaxonomyGovernanceCommand`, with the migration ID generator isolated
  behind an outbound port and Node adapter. System-admin HTTP preview/status/apply routes are now
  composition-bound and integration-verified (`taxonomy_governance_api.spec.ts` 5/5), including
  non-admin/guest denial, page-route authorization, aggregate-only response redaction, unsafe
  no-op apply rejection, and server-owned consumer-coordination gating. The operator page now provides merge/rename/split proposal fields, bounded
  impact cards, blocker-safe apply gating, and safe error/status state; component tests pass 3/3 and
  navigation/page access are integration-covered. The PostgreSQL impact adapter matches proposed
  refs against saved criteria/skill assignments and remains conservative for version-level
  projections; complete consumer attribution, explicit dual approval, a11y, and role-play remain open. A follow-up migration widens the
  millisecond taxonomy revision columns from INTEGER to BIGINT after the API integration exposed
  the overflow. Taxonomy split coordination now also pauses affected alerts and the alert HTTP
  lifecycle refuses resume until the saved view is explicitly repaired; browser/role-play and full
  accessibility evidence remain open.

**Dependencies:** WP-23A1, WP-23A2.  
**Exclusive write set:**

```text
app/modules/taxonomy/controllers/taxonomy_governance_controller.ts
app/modules/taxonomy/tests/backend/integration/taxonomy_governance_api.spec.ts
inertia/apps/admin/modules/taxonomy_governance/**
inertia/apps/admin/tests/modules/taxonomy_governance/**
```

- [~] **RED/GREEN:** the service contract covers authoritative-version preview, aggregate-only
  impact visibility, durable run creation, and stale expected-state rejection; API integration
  covers authorized preview/apply/status, HTTP expected-state token, bounded hidden-impact
  redaction, stale expected-version fencing, non-admin/guest denial, unsafe no-op apply rejection,
  and server-owned consumer-coordination gating (`5/5`). Dual approval where configured and stable
  migration diagnostics remain.
- [~] **RED/GREEN:** admin UI component tests cover a governed merge proposal, aggregate
  assignments/views/alerts/projections/indices summary, consumer-coordination apply blocking,
  an explicit zero-impact checkpoint apply, and safe preview error state (`3/3`); native labels
  and status/alert semantics are present. Rename/split-specific browser flows, repair-required
  progress/resume, full keyboard/a11y audit, and E2E remain open.
- [~] Implemented the provider/consumer boundary without raw provider storage/SQL/DSL exposure;
  the HTTP operator workflow now consumes the governed preview/apply contracts behind system
  admin middleware and cannot bypass Filter consumer coordination. The operator UI consumes the
  contract and disables apply for blocked/repair-required or consumer-impacting plans; the
  current impact adapter is aggregate evidence, not a complete term-level consumer inventory.
- [~] Run API/component/a11y tests; API integration is GREEN at 5/5, UI component/navigation tests
  are GREEN at 3/3 and page auth at 1/1. Full a11y/browser evidence, dual-approval checks, and
  WP-27A merged-app registration remain before WP-26E can run RP-FST-07.

**Expected output:** taxonomy change is genuinely previewable and understandable to an operator, and
the role-play can perform the governed mutation without an undocumented API shortcut.  
**Abnormal cases:** operator loses role after preview; affected counts change; provider unavailable;
split has no valid replacement; progress resumes after reload; private consumer appears only as
redacted aggregate.  
**Acceptance gate:** RP-FST-07 proves rename/merge/split preview and application through the operator
experience, followed by owner repair and alert coordination.

#### WP-23B1 — Durable Search projection generation and replay

- [~] **WP-23B1 overall status** — versioned alias lifecycle, candidate count/fence guards, durable
  generation ledger/state, candidate-without-activation lifecycle, and a ready/requires-repair
  rebuild orchestrator now exist; invalidation catch-up/replay composition and real-service
  evidence remain.

**Exclusive write set:**

```text
database/migrations/20260801064000_create_search_projection_generations.ts
database/migrations/20260801065000_create_search_projection_entity_revisions.ts
database/migrations/20260801066000_expand_outbox_for_search_projection_invalidation.ts
app/modules/search/domain/search_projection_metadata.ts
app/modules/search/domain/search_projection_generation.ts
app/modules/search/public_contracts/search_projection_invalidation.ts
app/modules/search/actions/ports/outbound/search_projection_generation_repository.ts
app/modules/search/actions/ports/outbound/search_projection_invalidation_stager.ts
app/modules/search/infra/adapters/postgres_search_projection_generation_repository.ts
app/modules/search/actions/commands/rebuild_search_projection_command.ts
app/modules/search/actions/commands/reconcile_search_projection_command.ts
app/modules/events/public_contracts/domain_event_outbox.ts
app/modules/events/domain/domain_event_outbox.ts
app/modules/events/infra/adapters/adonis_domain_event_dispatcher.ts
commands/search_projection_reconcile.ts
app/modules/search/tests/backend/unit/search_projection_rebuild.spec.ts
app/modules/search/tests/backend/integration/search_projection_replay.spec.ts
```

- [x] Ran GitNexus impacts for `DomainEventOutbox` (MEDIUM, 47 indexed callers),
      `AdonisDomainEventDispatcher` (MEDIUM, 8 callers), `SearchProjectionGeneration` (LOW),
      `RebuildSearchProjectionGenerationCommand` (LOW), and
      `PostgresSearchProjectionInvalidationStager` (MEDIUM). No HIGH/CRITICAL result; no
      outbox contract edit was made in this pass.
- [~] **RED/GREEN:** projection metadata now distinguishes known-empty, missing, unresolved,
  below-threshold, stale, and private/unavailable; public mapping collapses privacy-sensitive
  availability to `unavailable` (`search_projection_metadata.spec.ts` 2/2). Persisted metadata
  attachment, replay consumer propagation, and integration evidence remain.
- [ ] **RED:** transaction rollback leaves no orphan revision/invalidation; duplicate and
      out-of-order events are idempotent; an older external version cannot overwrite a newer document.
- [ ] **RED:** update/delete during snapshot cannot be lost or resurrected; candidate generation
      dual-write/catch-up uses a durable high-watermark, checkpoint, versioned tombstone, and retention
      fence.
- [ ] **RED:** crash/restart, competing rebuild, outbox gap, poison event/DLQ, candidate count match
      with completeness failure, and taxonomy/context version changing during build all block unsafe
      activation.
- [~] Implement generation state machine
  `building -> catching_up -> validating -> ready`, with `failed/requires_repair` exits; the
  durable rebuild orchestrator and candidate-without-activation path are implemented; focused
  generation unit tests (3/3), rebuild tests (2/2), and PostgreSQL generation integration
  (1/1) pass. Invalidation replay and WP-23C activation integration remain.
- [~] Candidate generations now persist source revision, context version, taxonomy versions,
  enrichment version, counts, checksum, and checkpoint evidence; migration
  `20260801067000_add_search_projection_generation_versions` backfills existing rows and the
  PostgreSQL repository integration passes. Validation evidence attachment, replay updates,
  and retention/fence evidence remain.
- [~] Migration verification for the new generation-version columns, focused unit tests, lint,
  targeted typecheck, PostgreSQL generation integration (1/1), and GitNexus detect-changes
  have run. Replay/Elasticsearch tests, full typecheck/lint, and coordinator checksum-manifest
  evidence remain. WP-23B2 owns producer hookups.

**Expected outputs:** crash-resumable, version-aware Search projections with no snapshot/live-write
gap; a candidate is independently verifiable before routing traffic.

**Abnormal cases:** crash after Elasticsearch write but before checkpoint; outbox retention races;
candidate index manually deleted; external-version conflict; oversized bulk document; malformed
persisted JSON; inactive taxonomy term; private-to-public/public-to-private transition; missing
secondary assignment; stale enrichment; Elasticsearch read-only/circuit breaker.

**Acceptance gate:** deterministic replay reconstructs the same document set/checksum, and no
candidate with an event gap, permission leak, or required metadata loss can reach `ready`.

#### WP-23B2 — Transactional projection-invalidation producer hookups

- [~] **WP-23B2 overall status** — durable invalidation contract, PostgreSQL transactional stager,
  migration, dedupe, rollback, newer-revision persistence, and task create/update/delete/status/
  required-skill producer pilots are implemented; visibility coverage, replay consumer, and
  failure-injection coverage remain open.

**Dependencies:** WP-03, WP-12, WP-23B1.  
**Parallelism:** one domain producer ticket at a time; first ticket is the task indexed pilot. Every
later indexed WP-24 context gets its own copied producer ticket.  
**First-ticket exclusive write candidates, frozen to exact symbols by WP-00 impact analysis before
assignment:**

```text
app/modules/tasks/actions/commands/create_task_command.ts
app/modules/tasks/actions/commands/update_task_command.ts
app/modules/tasks/actions/commands/update_task_status_command.ts
app/modules/tasks/actions/commands/add_task_requirement_command.ts
app/modules/tasks/actions/commands/update_task_requirement_command.ts
app/modules/tasks/actions/commands/remove_task_requirement_command.ts
app/modules/tasks/actions/commands/prefill_task_requirements_from_role_command.ts
app/modules/tasks/actions/commands/delete_task_command.ts
app/modules/tasks/actions/commands/internal/update_task_transaction.ts
app/modules/tasks/actions/ports/outbound/task_search_projection_invalidation_stager.ts
app/modules/tasks/tests/backend/integration/task_search_projection_invalidation.spec.ts
```

- [~] Run GitNexus impact for every task write path that changes an indexed field, visibility, or
  tombstone state; create/update/status/delete/required-skill paths were inventoried with MEDIUM
  blast radius, while visibility and alternate/bulk paths remain open.
- [~] **RED:** create/update/status/delete and required-skill metadata changes stage a versioned
  invalidation in the same database transaction; real PostgreSQL producer integrations prove
  durable rows, while visibility, alternate/bulk paths, and dedicated required-skill rollback
  remain open.
- [~] Task create stages a complete task-index field set, task update stages changed indexed fields,
  task status stages status fields, task delete stages tombstone fields, and required-skill
  add/update stages required-skill fields with the same transaction as persistence. Real create
  (`24 passed`), update (`12 passed`), delete (`4 passed`), status (`17 passed`), and required-
  skill (`16 passed`) integrations prove durable rows; visibility, alternate/bulk paths, replay,
  and dedicated required-skill rollback remain open.
- [ ] **RED:** duplicate, out-of-order, bulk update, stale revision, partial command failure, and
      deletion during rebuild preserve the newest source revision and tombstone semantics.
- [x] Inject the stager port into domain commands without importing Search infrastructure; composition
      binds the port to the durable PostgreSQL invalidation adapter.
- [ ] Run affected task unit/integration tests plus WP-23B1 replay/catch-up tests, typecheck/lint, and
      detect-changes.
- [ ] For each later indexed context, create a child package with the same six checks, exact domain
      write paths, dedicated tests, dependency on WP-23B1, and its own completion checkbox.

**Expected output:** every source mutation relevant to an active/candidate index creates a durable,
transactionally ordered invalidation; the claimed no-snapshot/live-write gap is proven on a real
production write path.  
**Abnormal cases:** update path bypasses command; bulk SQL maintenance; transaction retries; two
commands share revision; soft delete/restore; import/backfill; outbox retention; producer deployed
before consumer; consumer deployed before producer.  
**Acceptance gate:** the task pilot cannot activate until mutation coverage inventory is complete and
fault-injection tests prove no committed indexed change lacks a durable invalidation.

#### WP-23C — Version activation, reconciliation, and rollback

- [~] **WP-23C overall status** — versioned alias activation/rollback guards, lock-scoped activation,
  ready-only promotion, previous-active demotion, transaction-scoped reconcile/adoption, and an
  opt-in fault hook for alias/ledger boundaries now exist. Focused lifecycle/activation/reconcile
  tests pass. Real process-boundary fault injection, durable intent, rollback state choreography/
  compatibility, and role-play evidence remain.

**Dependencies:** WP-23A1, WP-23A2, WP-23B1, WP-23B2.

**Exclusive write set:**

```text
app/modules/search/infra/versioned_search_index_lifecycle.ts
app/modules/search/infra/search_index_administration_repository.ts
app/modules/search/domain/search_index_administration.ts
app/modules/search/domain/search_index_administration_policy.ts
app/modules/search/actions/queries/preview_search_index_activation_query.ts
app/modules/search/actions/queries/preview_search_index_rollback_query.ts
app/modules/search/actions/commands/apply_search_index_activation_command.ts
app/modules/search/actions/commands/apply_search_index_rollback_command.ts
commands/search_index_rollback.ts
app/modules/search/tests/backend/unit/versioned_search_index_lifecycle.spec.ts
app/modules/search/tests/backend/integration/search_index_activation.spec.ts
```

- [~] **RED:** activation generation now has a real fenced preview/apply command boundary and
  routing-state token; mapping fingerprint, context/taxonomy/projection/enrichment
  mismatch, incomplete secondary-label coverage, permission leak, benchmark blocker, event gap, or
  incompatible saved view/alert.
- [~] **RED:** preview returns exact candidate/active aliases, generation metadata, blockers, lock
  version, and an expected-state token; apply fails when the observed token or alias state
  changed and demotes the prior active ledger row before promoting the candidate. Saved-view /
  alert compatibility and full metadata gate coverage remain open.
- [~] **RED:** a real reconcile command now selects exactly one PostgreSQL-active generation,
  holds a target advisory lock through a transaction-scoped repository, repairs/adopts alias
  routing, and is idempotent. The opt-in fault hook and focused crash replay tests pass (`22/22`
  activation/reconcile/fence assertions); process-boundary crash tests and full rollback
  choreography remain open.
- [ ] **RED:** rollback rejects unreadable schema, reused canonical meaning, non-replayable data, or
      incompatible criteria; compatible views survive and incompatible views/alerts pause for repair.
- [ ] Implement atomic alias swap plus recoverable cross-system choreography; retain prior generation
      for the configured rollback window and never destructively downgrade saved criteria.
- [ ] Run lifecycle/admin/rollback tests, Search compatibility suites, typecheck/lint, and
      detect-changes.

**Expected outputs:** fenced preview/apply activation and rollback; recoverable logical workflow even
without a PostgreSQL/Elasticsearch distributed transaction.

**Abnormal cases:** alias points to multiple backing indices; candidate deleted between preview and
apply; empty candidate; stale plan token; cleanup removes rollback target early; taxonomy changes
during validation; PIT/cursor references retired generation; alert run overlaps cutover.

**Acceptance gate:** injected-crash tests converge to exactly one routed active generation, and both
forward activation and rollback preserve permissions, versions, and repairable saved criteria.

#### WP-23C2 — Projection administration API and operator UI

- [~] **WP-23C2 overall status** — the admin controller/API boundary, route registration,
  inventory-only HTML page, lifecycle-state component surface, authenticated inspect route, and
  projection transition sidecar are present and verified. The page now has a real activation
  preview/apply callback path when a ready ledger generation is supplied; rollback mutation and
  reconcile remain disabled in the browser until their target/compatibility confirmation flows
  exist. Crash choreography, authenticated mutation role-play, runtime axe/resilience, and
  RP-FST-10 remain open.

**Dependencies:** WP-23C.  
**Exclusive write set:**

```text
app/modules/http/controllers/admin_search_projection_controller.ts
app/modules/http/tests/backend/integration/admin_search_projection_api.spec.ts
inertia/apps/admin/modules/search_projections/**
inertia/apps/admin/tests/modules/search_projections/**
```

- [~] **RED:** controller/API boundary tests cover generation list, cleanup/rollback, activation
  preview/apply, reconcile, fail-closed authorization, and unsupported-operation behavior; the
  targeted projection/controller/authorization suite passes `18/18`, authenticated inspect route
  plus reconcile integration passes `8/8`, activation boundary passes `6/6`, and authenticated
  Chromium inspect/a11y role-play passes `2/2`. Rebuild/abort, crash choreography, authenticated
  mutation HTTP/UI role-play, and rollback compatibility remain open.
- [~] **RED:** component tests cover all seven lifecycle states, checkpoint lag, blockers, stale
  preview and keyboard/status semantics (`3/3`); activation client/state wiring now carries the
  server lock version and is exercised by the real page callback path. The current production
  page still honestly renders inventory without lifecycle evidence. Runtime axe, mutation browser
  role-play, rollback/reconcile UI flows, and resilience remain open.
- [~] Implement the available operator workflow over WP-23B/C contracts; index credentials/raw ES
  DSL are not exposed and cleanup/rollback remain preview/fenced. Unsupported lifecycle actions
  return a safe `501` rather than being simulated.
- [~] Route registration and controller composition now exist for list/cleanup/activation/reconcile/
  rollback; the UI client has activation API boundary tests (`2/2`) and the presentation suite
  is `5/5`. Actions without safe browser contracts are disabled when callbacks are absent.
  Runtime axe/a11y, authenticated mutation happy paths, and WP-26E failure-injected RP-FST-10
  remain open.

**Expected output:** projection activation and rollback have a visible, fenced operator experience
whose state can be asserted and screenshot during role-play.  
**Abnormal cases:** candidate deleted during preview; alias changes externally; stale progress poll;
two admins act concurrently; operator loses permission; rollback window expired; browser reload during
reconcile.  
**Acceptance gate:** RP-FST-10 completes rebuild/block/repair/activate/reconcile/rollback without raw
provider access and backend audit proves exactly one active generation.

### WP-24 — Independent migration waves for existing filter contexts

- [ ] **WP-24 overall status**

**Worker profile:** one worker per migration ticket below. Never assign “migrate all filters” to one
worker.  
**Dependencies:** WP-14 plus WP-06/WP-11 for UI; Search-backed tickets also need WP-16/WP-23.  
**Parallelism:** tickets are parallel only when their routes, domain modules, shell UI, and tests are
disjoint. New contexts discovered by WP-00 receive a new WP-24 ticket before implementation.  
**Shared rule:** each ticket owns its domain context/permission provider, provider binding, page
adapter, and focused tests; it must not edit shared Filter contracts, shared primitives, root exports,
global i18n/config, or another shell.

- [ ] **WP-24-CLAIM-GATE:** before any child moves to `[~]`, WP-00 must copy an exact exclusive file
      set and executable command card from the inventory into that child entry in the release-train
      manifest. Broad directory guesses below are not claimable ownership; any overlap is serialized or
      reassigned by the coordinator.

#### Reusable checklist for every WP-24 ticket

The following is a copy template, not one shared status list. The coordinator copies it under every
concrete child ticket and prefixes all IDs with that child ID before assignment:

- **T01 — Inventory authority:** record current server query, client filtering, pagination,
  sort, URL, permission constraints, metadata coverage, and the exact behavior being replaced.
- **T02 — Impact:** run GitNexus impact for every edited symbol and stop for
  HIGH/CRITICAL coordinator review.
- **T03 — RED contract:** add context definition, permission, Filter AST, facet/count,
  pagination/cursor, URL compatibility, and error/degraded tests before production edits.
- **T04 — RED truth cases:** include filter-only, combined conditions, secondary labels,
  Any/All/None where meaningful, missing/unknown, selected-zero, permission-hidden data, and a
  result outside page one that must still be found.
- **T05 — Implement backend authority:** query the complete authorized population through
  the registered SQL or indexed executor; no browser filtering over a bounded page is authoritative.
- **T06 — Implement domain-composed UI:** reuse state/primitives but retain the surface's
  own density, language, filter order, instant/staged commit policy, and result presentation.
- **T07 — Compatibility:** preserve/translate old URLs and saved state for the named window;
  explicit sort and view mode remain presentation/sort, not fake active filters.
- **T08 — Verify:** run focused unit/contract/integration/component/E2E tests, typecheck,
  lint, and detect-changes; hand off before changing status.

#### WP-24A — Task/team operations list (SQL)

- [ ] **WP-24A overall status**
- [ ] **WP-24A-T01:** freeze current task/team authority, exact files, owner, SQL profile, URL, and
      operational permission/selection semantics.
- [ ] **WP-24A-T02:** run impacts and approve the exclusive write set.
- [ ] **WP-24A-T03:** RED context/permission/AST/facet/count/pagination/URL/error contract tests.
- [ ] **WP-24A-T04:** RED date/status/assignee/project/priority combinations, missing values,
      off-page result, stable pagination, bulk-selection reset, and permission-change cases.
- [ ] **WP-24A-T05:** implement complete-population SQL authority and context binding.
- [ ] **WP-24A-T06:** implement the task-owned UI composition and declared commit policy.
- [ ] **WP-24A-T07:** preserve legacy URL/saved state and keep sort/view/selection separate.
- [ ] **WP-24A-T08:** run focused backend/UI/E2E verification and handoff evidence.

**Expected output:** an operational SQL filter proving the platform is not Search-only.  
**Abnormal cases:** deleted assignee; archived project; bulk-selected row leaves result set; concurrent
status change; null due date; actor loses team membership; two filters imply an empty intersection.

#### WP-24B — Marketplace task discovery (indexed)

- [~] **WP-24B overall status** — existing marketplace route/query/indexed search behavior is
  verified but not yet a Filter Platform-complete context. Unit evidence: query 3/3 and request
  mapper 4/4. Real route integration: 30/30; live public task search: 1/1. GitNexus impacts
  for query/page-query/request-mapper/controllers returned MEDIUM/LOW only. Facets/count/cursor
  contract, full multi-label Any/All/None semantics, stale-index/degraded behavior, seeded
  side-effect/privacy evidence and release handoff remain. A bounded anonymous Chromium journey
  now proves public route access, real keyword application, canonical URL and server empty state.
- [~] **WP-24B-T01:** current user/org marketplace authority, indexed context, route ownership,
  sort/recommended behavior, metadata filters, and permission boundary are documented by the
  existing inventory and the route suite; exact exclusive child file set and final UI ownership
  freeze remain.
- [x] **WP-24B-T02:** GitNexus impacts ran for `GetMarketplaceTasksQuery` (MEDIUM, 7 callers),
      `GetMarketplaceTasksPageQuery` (MEDIUM, 4 callers), `MarketplaceTaskRequestMapper` (LOW),
      and both marketplace task controllers (MEDIUM). No HIGH/CRITICAL result; no production edit
      was made in this audit slice.
- [~] **WP-24B-T03:** request-mapper unit (4/4), route response/pagination integration (30/30),
  and live public indexed search (1/1) exist; dedicated Filter discovery/facet/count/cursor/
  URL/degraded contract coverage remains incomplete.
- [~] **WP-24B-T04:** metadata/skill-category integration and a new HTTP truth case for filter-only
  off-page pagination pass (30 route cases). All secondary labels,
  Any/All/None, selected-zero, stale-index and degraded cases remain. The Chromium role-play
  `marketplace_filter_only_roleplay.spec.ts` adds one real UI keyword/empty-state checkpoint.
- [ ] **WP-24B-T05:** implement indexed backend authority and exact multi-label bindings.
- [ ] **WP-24B-T06:** implement one declared commit policy per responsive mode and server-backed UI.
- [ ] **WP-24B-T07:** migrate old URLs while keeping sort/view outside eligibility chips.
- [ ] **WP-24B-T08:** run user/org backend/component/mobile E2E and handoff evidence.

**Expected output:** filter-only and text-plus-filter marketplace browsing with rich multi-label
facets and stable URL/cursor behavior.  
**Abnormal cases:** legacy singleton classification coverage; closed/private task; selected retired
skill; high-cardinality technology tags; index stale; result assigned while open; no keyword but many
filters; old URL contains unsupported sort/filter.

#### WP-24C — Talent discovery (indexed)

- [ ] **WP-24C overall status**
- [ ] **WP-24C-T01:** freeze talent data/permission/fairness authority, exact files, public-evidence
      sources, indexed profile, metadata coverage, URL, and current single-skill behavior.
- [ ] **WP-24C-T02:** run impacts and approve reader/builder/index/UI ownership.
- [ ] **WP-24C-T03:** RED context, permission, nested skill/proficiency, facet/count/cursor/URL and
      degraded contract tests.
- [ ] **WP-24C-T04:** RED secondary expertise, multiple histories, private/disputed/suggested evidence,
      off-page match, selected-zero, missing confidence, and stale projection cases.
- [ ] **WP-24C-T05:** implement verified/public multi-value projection and indexed authority.
- [ ] **WP-24C-T06:** replace hardcoded/single-skill UI with domain-driven server-backed controls.
- [ ] **WP-24C-T07:** migrate URL/saved-view state and preserve explicit sort/view.
- [ ] **WP-24C-T08:** run privacy/fairness/backend/component/E2E verification and handoff evidence.

**Expected output:** a trustworthy talent-market discovery experience in which rich metadata improves
recall without exposing private work history or pretending uncertain evidence is fact.  
**Abnormal cases:** public history becomes private; reviewed skill is disputed; profile goes inactive;
missing confidence; nested skill/proficiency cross-match; proxy/sensitive field requested; incomplete
projection; multiple histories with overlapping tags.

#### WP-24D — User, organization, project, and admin directory tables (SQL tickets)

- [ ] **WP-24D overall status**
- [ ] Mark WP-24D only as a coordinator decomposition epic; never assign this aggregate heading to a
      production worker or include it directly in the release-train dependency set.
- [ ] Split this group into one coordinator ticket per concrete directory/shell after WP-00; each
      gets copied T01-T08 checkboxes, an independent context ID, owner, route/file set, tests, expected
      output, abnormal cases, and completion gate.
- [ ] Put only concrete WP-24D child IDs—not `WP-24D`—in the release-train manifest, after each
      directory's permission, fields, cardinality, pagination, URL, and commit behavior are documented.
- [ ] Require every child to use common primitives/state without forcing administrative controls,
      member/project/public directories into one identical UI.

**Expected output:** independent directory migrations with shared semantics and domain-specific
composition; no cross-shell alias import from common code.  
**Abnormal cases:** organization boundary changes; soft-deleted member; duplicate display name;
restricted email; unknown role; archived project; page becomes empty after deletion; selection and
bulk action state across filter changes.

#### WP-24E — User and organization audit filters (SQL tickets)

- [ ] **WP-24E overall status**
- [ ] **WP-24E-T01:** create separate user/org child IDs with exact routes/files, actor visibility,
      retention, detail pivots, URL namespaces, and server-versus-local authority.
- [ ] **WP-24E-T02:** run impacts and approve disjoint user/org write sets.
- [ ] **WP-24E-T03:** RED context/permission/facet/count/pagination/URL/degraded tests per child.
- [ ] **WP-24E-T04:** RED actor/action/resource/date, high-cardinality search, off-page, selected
      detail disappearance, Back/Forward, permission revocation, and live-event cases.
- [ ] **WP-24E-T05:** implement complete-population SQL authority for each selected child.
- [ ] **WP-24E-T06:** compose audit-specific UI and distinguish local investigation pivots.
- [ ] **WP-24E-T07:** preserve each URL/detail namespace and explicit live/presentation state.
- [ ] **WP-24E-T08:** run child-specific backend/component/E2E and handoff evidence.

**Expected output:** consistent Filter semantics across audit surfaces without merging their
authorization models.  
**Abnormal cases:** retained event references deleted actor/resource; live event arrives during
review; export spans more data than visible page; actor label restricted; date timezone boundary;
permission revoked after URL restoration.

#### WP-24F — Notification quick filters (bounded/simple context)

- [ ] **WP-24F overall status**
- [ ] **WP-24F-T01:** freeze notification query authority/files/permission/pagination/realtime state and
      decide whether this is a registered context or bounded adapter; record why.
- [ ] **WP-24F-T02:** run impacts and approve the exclusive inbox write set.
- [ ] **WP-24F-T03:** RED query/permission/count/cursor/state/degraded contract tests.
- [ ] **WP-24F-T04:** RED unread/type/date, off-page, mark-read race, realtime insert, empty inbox,
      expiry, cross-org, cursor invalidation, and URL/deep-link cases.
- [ ] **WP-24F-T05:** implement complete authorized inbox authority and honest counts.
- [ ] **WP-24F-T06:** preserve quick low-density UI rather than forcing a full workbench.
- [ ] **WP-24F-T07:** preserve supported URL/state while separating realtime presentation.
- [ ] **WP-24F-T08:** run focused backend/component/realtime/E2E and handoff evidence.

**Expected output:** semantically correct quick filters with UI proportional to the problem.  
**Abnormal cases:** unread count races; item deleted/expired; event type retired; cursor invalidated;
cross-org notification; offline mark-read; realtime insert changes first page.

#### WP-24G — Inventory-derived future contexts

- [ ] **WP-24G overall status**
- [ ] Treat WP-24G as a coordinator backlog epic, never a production-worker assignment or unresolved
      dependency in WP-26/WP-27A.
- [ ] For every remaining surface in the WP-00 inventory, create a child ticket using WP-24-T01 to
      WP-24-T08 with copied checkboxes, exact write set, output, abnormal cases, and acceptance; do not
      silently omit reports, exports, admin consoles, or filters embedded in dialogs.
- [ ] Prioritize by `user impact x current incorrectness x permission risk x reuse value`, then
      subtract migration cost; record scores and prerequisites rather than choosing by page visibility.
- [ ] Keep low-value/local presentation controls outside the platform when they do not query a
      resource population; record the decision to avoid architectural overreach.

**Expected output:** a finite, scored migration backlog whose boundary is the inventory—not Board,
Marketplace, or any other example named during design.  
**Abnormal cases:** hidden filter in export/report path; two pages share route but not permissions;
browser-only filter appears correct on small fixtures; no stable domain owner; data lacks required
metadata; backend provider cannot support authoritative facets.

**WP-24 acceptance gate:** no child ticket is complete until the reusable checklist is complete, its
old behavior has a compatibility/retirement decision, and tests prove complete-population semantics
for at least one result outside the original first page.

### WP-25 — Constrained natural-language assisted authoring

- [ ] **WP-25 overall status**

**Worker profile:** one backend assistance worker and one disjoint frontend assistant worker.  
**Dependencies:** WP-01, WP-04, WP-19, WP-20, WP-21, WP-23. WP-25 completion means implemented,
tested, and disabled—not production-enabled.  
**Parallelism:** implementation may start behind a disabled capability flag after typed contracts are
stable; it cannot become the only authoring path.  
**Exclusive write set:**

```text
app/modules/filtering/public_contracts/filter_assisted_authoring.ts
app/modules/filtering/actions/ports/outbound/filter_authoring_assistant.ts
app/modules/filtering/actions/commands/propose_filter_from_natural_language_command.ts
app/modules/filtering/domain/filter_authoring_proposal.ts
app/modules/filtering/infra/assistants/configured_filter_authoring_assistant.ts
app/modules/filtering/tests/backend/unit/filter_assisted_authoring.spec.ts
app/modules/filtering/tests/backend/contract/filter_authoring_assistant.contract.spec.ts
inertia/apps/shared/filtering/assisted_authoring/**
inertia/apps/shared/filtering/tests/assisted_authoring/**
```

- [ ] Define a Filter-owned request/response contract: authorized context definition plus user text
      in; candidate AST, residual retrieval text, ambiguities, unsupported intent, confidence class,
      provider/version, and safety diagnostics out. Search may host a provider but cannot own this AST.
- [ ] **RED:** fake-provider tests cover valid proposal, no-keyword filter-only intent, partial
      interpretation, multiple plausible fields/values, hallucinated field/operator/value, protected
      trait, unavailable context, stale schema/taxonomy version, malformed output, timeout, cancellation,
      quota/rate limit, and provider outage.
- [ ] **RED:** injection tests treat instructions in user text, field labels, taxonomy labels,
      aliases, and retrieved examples as untrusted data; raw provider DSL, principal, hidden fields,
      secrets, tool calls, and arbitrary URLs/code are rejected.
- [ ] **RED:** deterministic post-validation re-authorizes every field/value/operator, enforces AST
      complexity/preference limits, resolves canonical refs, and never silently drops an invalid clause
      to broaden results.
- [ ] **RED:** UI tests require an editable visual preview with highlighted uncertainty,
      approve/edit/reject, per-clause removal, manual-builder fallback, keyboard/screen-reader flow, and
      explicit Apply; a proposal never executes automatically.
- [ ] Implement provider adapter behind timeout, size/rate limits, feature flag, privacy-safe
      telemetry, and fake provider for all deterministic tests. Do not persist raw prompts/responses by
      default; document any approved retention separately.
- [ ] Measure proposal validity, correction rate, unsupported rate, rejection rate, latency, and
      false-broadening violations in shadow mode before enabling; content correctness remains human
      confirmed rather than treated as deterministic TDD.
- [ ] Run unit/contract/component/security tests, typecheck/lint, and detect-changes. Release remains
      off when no provider is configured or any no-broadening/security gate fails.
- [ ] Hand the disabled candidate and shadow-measurement recipe to WP-27A/WP-26. Only WP-27B may enable it
      after WP-26 evidence; this enablement is not part of WP-25 completion and therefore creates no
      dependency cycle.

**Expected outputs:** optional natural-language-to-typed-criteria assistance that produces the same
editable AST as every other authoring mode; deterministic validation and a complete manual fallback;
no direct model/provider execution against PostgreSQL or Elasticsearch.

**Abnormal cases:** prompt injection in taxonomy label; Vietnamese/English code-switching; ambiguous
date/timezone; negation scope; “not X unless Y”; unsupported relation; private field guessed by the
user; outdated term alias; provider returns syntactically valid but semantically broader AST; request
cancelled while proposal arrives; user edits context mid-request; very long input; accessibility
announcement exposes rejected sensitive text.

**Acceptance gate:** shadow evidence records zero unauthorized-field or silent-broadening violations,
every accepted proposal passes WP-04 authorization/validation again, and the product remains fully
usable with the capability disabled.

### WP-26 — Observability, security, performance, and resilience gates

- [ ] **WP-26 overall status**

**Worker profile:** quality/security/performance worker; may split tests, benchmarks, and UI E2E into
disjoint subworkers while one owner publishes the gate report.  
**Dependencies:** WP-08, WP-13, WP-14, WP-16, WP-21, WP-22, WP-23, WP-27A and every WP-24 ticket
selected for the first release. Include WP-25 only when assisted authoring is a candidate for this
release; test it while disabled/shadowed. WP-27A supplies merged routes/composition with every
capability still disabled by default; WP-26 never depends on cutover WP-27B.  
**Parallelism:** test-only subpackages may run in parallel; no worker weakens an existing gate to make
new code pass.  
**Combined reserved scope:** files are divided into non-overlapping subpackage write sets below. Only
the report owner may edit the evidence document.

```text
WP-26A: app/modules/filtering/observability/**
WP-26B: permission/correctness fixtures, metrics, and backend tests listed below
WP-26C: scripts/filtering/performance/** and scripts/search/*filter_benchmark*
WP-26D: failure-injection and abuse backend tests
WP-26E: initial/WP-25 role-play E2E, screenshot helpers/validator, and experience-review evidence
WP-26F: initial/WP-25 release-gate evidence plus matrix status/reference closure after WP-00 handoff
```

#### WP-26A — Privacy-safe observability

- [ ] **WP-26A overall status**

**Exclusive write set:** `app/modules/filtering/observability/**` and its new unit tests under
`app/modules/filtering/tests/backend/unit/observability/**`.

- [ ] **RED:** events include request/session ID, context/schema/taxonomy/projection/ranking versions,
      canonical criteria hash, executor, result/facet latency, count relation, partial/degraded/timeout,
      zero-result, coverage, migration, alert, activation, and rollback status.
- [ ] **RED:** events/errors contain no raw query, criteria values, taxonomy aliases, cursor, provider
      DSL, hidden field/value, protected trait, result body, prompt, or secret; control characters and
      nested error causes are redacted.
- [ ] Implement one privacy-reviewed event factory and document cardinality/sampling rules so hashes,
      IDs, field keys, and diagnostic codes do not explode metric dimensions.
- [ ] Verify log fixtures, structured event schema, error redaction, typecheck/lint, and detect-changes.

**Expected output:** one versioned, privacy-safe observability vocabulary that can correlate a journey
without recording the user's query/criteria/provider payload.  
**Abnormal cases:** nested provider error leaks request body; control characters bypass redaction;
high-cardinality IDs enter metric labels; sampling hides a security/failure event; stale schema emits
unknown fields.  
**Acceptance gate:** redaction fixtures contain zero raw sensitive canaries and every required matrix
backend/audit record can cite safe request/version/hash diagnostics.

#### WP-26B — Correctness, metadata-recall, and leakage suites

- [ ] **WP-26B overall status**

**Exclusive write set:**

```text
app/modules/filtering/tests/backend/contract/filter_permission_leakage.contract.spec.ts
app/modules/search/tests/backend/integration/search_filter_permission_leakage.spec.ts
app/modules/search/tests/backend/fixtures/filter_quality_population.ts
app/modules/search/domain/search_filter_quality_metrics.ts
app/modules/search/tests/backend/unit/search_filter_quality_metrics.spec.ts
```

- [ ] Build deterministic fixtures with public/private/org-isolated entities, unique secret values,
      missing/known-empty metadata, multiple primary/secondary labels, nested skill levels, hierarchy,
      retired terms, and off-page matches.
- [ ] Test hits, true total, constrained/self-excluding facet, missing bucket, facet value search,
      suggestion, recovery, explanation, saved-view re-authorization, alert delivery, and effective
      context definition for anonymous/user/org member/manager/admin principals.
- [ ] Enforce `eligible ID set = 100%`, `exact facet counts = 100%`, `secondary-label recall = 100%`,
      and `permission leakage violations = 0` on deterministic fixtures; approximate totals are scored as
      approximate and never compared as exact.
- [ ] Add mutation/property cases for AST nesting/order/canonicalization and differential SQL versus
      Elasticsearch execution over the same bounded fixture population.
- [ ] Run the unit/contract/integration suites repeatedly with randomized harmless ordering; any
      nondeterminism becomes a release blocker with a minimal reproduction seed.

**Expected output:** a deterministic correctness corpus proving complete authorized populations,
metadata recall, exact facets and SQL/reference/Elasticsearch parity.  
**Abnormal cases:** fixture accidentally makes hidden/public populations distinguishable; reference
executor shares compiler code with system under test; approximate count compared as exact; random
ordering changes a tie; secondary-label match exists only outside the candidate window.  
**Acceptance gate:** eligible IDs, exact facets and secondary-label recall are 100% on the frozen
corpus, leakage violations are zero and every failure reports a reproducible seed.

#### WP-26C — Performance and capacity model

- [ ] **WP-26C overall status**

**Exclusive write set:**

```text
scripts/filtering/performance/**
scripts/search/search_filter_benchmark_corpus.ts
scripts/search/run_search_filter_benchmark.ts
```

- [ ] Freeze runner/service facts with every report: CPU/RAM limits, Elasticsearch heap/search thread
      count, PostgreSQL version/settings, index generation/document count, cold/warm state, and commit.
- [ ] Generate matrix fixtures at the feasible subset of `1k`, `10k`, and `100k` entities; facet
      cardinality `10/100/1,000/10,000`; selected values `0/1/10/100`; AST conditions
      `1/10/context maximum`; concurrency `1/2/4/8`; report unsupported cells rather than fabricating
      numbers.
- [ ] Measure validation/canonicalization, result query, facet query, suggestion/value search, saved
      view load/migration, projection rebuild/catch-up, and alert batch separately at p50/p95/p99 with
      error/timeout/degraded rates.
- [ ] Record cold and warm runs separately and use at least 30 measured samples per stable latency
      cell after warm-up; publish median of repeated benchmark runs plus raw JSON artifact.
- [ ] Set the first absolute product SLA only after the representative baseline is approved. Until
      then enforce correctness/security absolutely and use a provisional regression gate of no more than
      20% p95/p99 degradation on the same runner, with confidence/noise notes; never lower an existing
      Search gate because current concurrent p95 fails.
- [ ] Verify PostgreSQL query plans/indexes for worst combinations, Elasticsearch bucket/query
      circuit-breaker behavior, payload size, browser render/update cost, and memory under repeated
      filter changes.

**Capacity calculations to include in the evidence:**

```text
candidate cells = dataset sizes x cardinalities x selected counts x AST sizes x concurrency
measured cells  = all feasible representative combinations, not every Cartesian cell
samples/cell    >= 30 after warm-up for an enforced latency comparison
alert throughput required = enabled alerts / allowed evaluation window
projection catch-up margin = producer peak rate - sustained consumer rate (must stay > 0)
facet payload estimate = bucket count x average encoded bucket bytes + response overhead
```

The test Elasticsearch plane currently has a deliberately small resource envelope; concurrency
above its search-thread capacity is a saturation test, not proof that a single request is broken.
The report must distinguish service cold start from request latency.

**Expected output:** reproducible raw JSON and an approved capacity model that separates semantic
correctness, cold start, warm latency, saturation and resource-envelope limitations.  
**Abnormal cases:** noisy/shared runner; infeasible Cartesian cell; 256 MiB test heap saturates by
design; facet circuit breaker; cache warmth changes; sample count too small; projection producer peak
exceeds sustained consumer throughput.  
**Acceptance gate:** every enforced comparison has environment facts and at least 30 post-warm-up
samples, no unexplained p95/p99 regression exceeds the approved threshold, and unsupported cells are
reported rather than inferred.

#### WP-26D — Failure injection and abuse

- [ ] **WP-26D overall status**

**Exclusive write set:**

```text
app/modules/filtering/tests/backend/integration/filter_failure_injection.spec.ts
app/modules/search/tests/backend/integration/search_filter_failure_injection.spec.ts
```

- [ ] Inject Elasticsearch down/timeout/partial shard/mapping mismatch/PIT expiry/alias cutover,
      PostgreSQL timeout/deadlock, taxonomy provider outage, stale projection, outbox gap, corrupt saved
      criteria, alert delivery failure, and worker crash; assert fail-closed/no silent broadening.
- [ ] Test SQL injection, Elasticsearch DSL/script injection, qualifier/parser injection, oversized
      AST/set/text, pathological Boolean depth, expensive facet enumeration, cursor tampering/replay,
      IDOR on saved views, cross-org grants, CSRF/rate limiting, timing/count/error enumeration, and
      assisted-authoring prompt injection when WP-25 is in the frozen release manifest. If WP-25 is
      deferred, record that case as `not_applicable_deferred` with the manifest link rather than
      creating a hidden dependency.
- [ ] Run full confidence, benchmark, migration rehearsal, and repeated flaky-test detection; publish
      commands, failures, short excerpts, and ownership without hiding pre-existing red baselines.

**Expected output:** reproducible failure/abuse evidence that every unavailable, corrupt, concurrent
or hostile path fails closed or enters an explicit bounded degraded state.  
**Abnormal cases:** fault hook does not actually reach the provider; browser/API is mocked into the
desired error; retry hides race; injection payload is normalized away before the asserted boundary;
pre-existing red baseline is misclassified as a pass.  
**Acceptance gate:** every selected negative-path ID has one observed injected failure, expected safe
outcome, backend/audit record and owner; no silent broadening, leakage or retry-only pass remains.

#### WP-26E — Role-play E2E, screenshot, and experience evidence

- [~] **WP-26E overall status** — the machine-readable validator implementation and its runnable
  Japa unit suite are green (`14/14`); the separate script fixture is outside the standard Japa
  glob (`NO TESTS EXECUTED`), so that command is not evidence of coverage. The
  current CLI input manifest is invalid, so this does not close release evidence. One real Chromium
  marketplace role-play produces a post-assertion screenshot. Full seeded journeys,
  cross-browser/mobile/accessibility runs, backend/audit joins, reviewer sign-off and release
  closure remain open.

**Dependencies:** WP-15, WP-17, WP-18, WP-21, WP-22, WP-23, WP-27A and every concrete WP-24 child in
the release-train manifest; RP-FST-14 applies only when WP-25 is selected. WP-28/WP-29 advanced
journeys belong to WP-30 and cannot reopen or block this initial evidence package.  
**Parallelism:** one role-play owner per shell suite; evidence helper/validator ownership is exclusive
and coordinator-controlled.  
**Exclusive write set:**

```text
inertia/apps/user/tests/e2e/filter_search_taxonomy/marketplace_filter_only_roleplay.spec.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/search_degraded_recovery_roleplay.spec.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/mobile_filter_state_roleplay.spec.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/saved_view_roleplay.spec.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/filter_alert_roleplay.spec.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/filter_builder_qualifier_roleplay.spec.ts
inertia/apps/user/tests/e2e/filter_search_taxonomy/filter_assisted_authoring_roleplay.spec.ts
inertia/apps/org/tests/e2e/filter_search_taxonomy/talent_discovery_roleplay.spec.ts
inertia/apps/admin/tests/e2e/filter_search_taxonomy/audit_filter_roleplay.spec.ts
inertia/apps/admin/tests/e2e/filter_search_taxonomy/taxonomy_repair_roleplay.spec.ts
inertia/apps/admin/tests/e2e/filter_search_taxonomy/projection_cutover_roleplay.spec.ts
inertia/apps/user/tests/shared/e2e/filter_search_taxonomy_evidence.ts
inertia/apps/org/tests/shared/e2e/filter_search_taxonomy_evidence.ts
inertia/apps/admin/tests/shared/e2e/filter_search_taxonomy_evidence.ts
scripts/filtering/validate_filter_search_test_matrix.ts
docs/12-evidence/filter-search-experience-review-2026-08-01.md
```

- [~] Implement the evidence helper/manifest validator and tag every test with canonical
  master/detailed/RP matrix IDs. The validator core and Japa unit suite `14/14` are green, but the
  release manifest, artifact joins, test tagging, and full role-play evidence remain open. The
  validator joins the release manifest, matrix and artifact
  manifests; rejects missing required/observed layer evidence, empty detailed/negative/backend/
  reviewer references, non-unique evidence/closure ownership, unmatched seed/actor/context/run,
  unapproved applicability overrides, missing screenshots/conditional visual-mode provenance/
  hash/ACL/retention, invalid `baseline_regression` versus `evidence_only` fields, unknown shorthand
  IDs and orphan artifacts.
- [ ] **RED:** each initial/WP-25 RP-FST journey selected by the manifest initially fails on its first missing semantic/visual/
      side-effect proof—not because services, auth or seed infrastructure are absent.
- [ ] Execute core filter/search/save/share/subscribe/repair actions through the UI with real
      PostgreSQL/Redis/Elasticsearch test services; testing hooks seed prerequisites or inject faults
      only and cannot return the desired UI result directly.
- [ ] Assert actor/route/criteria/result/count/diagnostic before screenshot, then capture the mandatory
      desktop/mobile checkpoints and backend/audit evidence defined by the test matrix.
- [ ] Run keyboard/screen-reader semantics, focus, 200%/400% zoom, reduced motion, RTL/long labels,
      Vietnamese IME, 390×844 mobile, slow/offline network, cancellation and Back/Forward role-play
      cases; visual evidence cannot replace accessibility assertions.
- [ ] Fail on unexplained page errors, console errors, network failures, 5xx, stale-response wins,
      leaked values, missing manifest fields, false-pass patterns or retry-only success.
- [ ] Run selected journeys on Chromium plus required Firefox/WebKit/mobile projects, then have a
      reviewer outside implementation sign the screenshot sequence and experience questions.
- [ ] Publish screenshots, manifests, traces/videos on failure, network/console summaries and
      journey-bound backend/audit evidence; update matrix rows only through WP-26F closure authority.

**Expected output:** cross-layer feature proof from the user's point of view—not merely green isolated
tests—including deterministic role-play, reviewed visible states and verified backend consequences.  
**Abnormal cases:** seed drift; stale auth/session; screenshot captures private data; dynamic content
causes false visual diff; service is mocked accidentally; test action bypassed through API; browser
retry hides race; mobile-only clipping; screenshot exists before assertion; reviewer cannot understand
the sequence without developer explanation.  
**Acceptance gate:** every initial/WP-25 selected P0 `TC-FST` scenario and applicable `RP-FST`
journey has the full required evidence bundle; screenshots alone and unit/integration alone are
explicitly insufficient. Advanced `TC-FST-030/031` status is untouched until WP-30.

#### WP-26F — Release-gate evidence assembly

- [ ] **WP-26F overall status**

**Dependencies:** WP-26A, WP-26B, WP-26C, WP-26D, WP-26E.  
**Exclusive write set after WP-00's frozen-baseline handoff:**

```text
docs/12-evidence/filter-search-release-gates-2026-08-01.md
docs/superpowers/plans/2026-08-01-filter-search-taxonomy-test-matrix.md
```

Only initial/WP-25 status checkboxes and their immutable evidence references may change in the matrix
during this package; `TC-FST-030/031` and `RP-FST-13/15` are reserved for WP-30C. Coverage semantics,
required layers or scenario text require reopening WP-00 governance and a new reviewed baseline.

- [ ] Verify every input artifact names commit, environment, command, sample/seed, timestamp, owner,
      and result; reject missing or incomparable evidence instead of inferring GREEN.
- [ ] Assemble the correctness/leakage matrix, benchmark/capacity report, failure/accessibility matrix,
      blockers, approved thresholds, and the frozen release-train manifest without editing source
      metrics or waiving failed gates.
- [ ] Have domain, security, performance, accessibility, and operations owners sign their rows; record
      disagreements/blockers with package ID and required rerun.
- [ ] Act as the initial-release matrix closure authority: verify the unique `evidenceOwner`, selected
      applicability and full joined bundle before changing an initial/WP-25 master/RP status to `[x]`;
      contributors cannot close their own row and advanced rows remain untouched for WP-30C.
- [ ] Run link/path and Markdown format checks; hand the immutable evidence hash to WP-27B.

**Expected outputs:** one reproducible evidence report containing environment facts, correctness and
leakage scores, benchmark JSON links, query plans, failure matrix, accessibility results, blocker
owners, and approved thresholds.

**Abnormal cases:** CI runner variance; clock skew; service cold start counted as query time; test
fixture too small for cardinality; approximate count mistaken for exact; protected value leaks only
through suggestion/error/timing; provider recovery returns stale response after cancellation; browser
memory grows with every URL entry; benchmark workload exceeds the 256 MiB test heap by design.

**Acceptance gate:** correctness/leakage gates are absolute, every failure mode has a tested explicit
outcome, no unexplained performance regression exceeds the approved threshold, and all release
blockers have an owner rather than a waived test.

### WP-27 — Pre-gate integration and compatibility cutover

- [ ] **WP-27 overall status**

**Worker profile:** two serial coordinator packages. WP-27A assembles the disabled-by-default merged
application before E2E; WP-27B performs evidence-controlled cutover only after WP-26 is green. This
split prevents a route/composition dependency cycle and keeps the role-play plane production-like.  
**Parallelism:** WP-27A and WP-27B are serial integration owners; no feature worker edits their shared
hotspots while either package is `[~]`.

#### WP-27A — Pre-gate route, composition, migration, and shell assembly

- [ ] **WP-27A overall status**

**Dependencies:** WP-22, WP-23, WP-15/WP-17/WP-18, and every selected WP-24 first-release ticket;
WP-25 is included only when its implementation is selected, still disabled/shadow-only.  
**Exclusive write set:**

```text
app/composition/**filter**
app/composition/**search**
app/composition/tests/filter_search_platform_composition.spec.ts
start/routes/**
tests/backend/integration/filter_search_route_registration.spec.ts
adonisrc.ts
database/migration-checksums.json
package.json
inertia/apps/*/app.ts
inertia/apps/*/i18n/**
```

- [ ] Run GitNexus impact on every exact composition/route/shell symbol before editing; HIGH/CRITICAL
      pauses this integration package for coordinator review.
- [ ] Rebase/merge package commits in dependency order, resolve only contract/integration conflicts,
      and rerun each package's focused green command immediately after its merge.
- [ ] **RED:** composition/route tests fail until alerts, taxonomy governance, projection operations,
      selected contexts and optional assisted authoring are reachable by the correct actor through the
      real application; wrong-role and disabled-capability requests remain denied/unavailable.
- [ ] Register commands, routes, provider bindings, shared exports, shell initialization and i18n once;
      all release capabilities remain independently disabled by default, while the test manifest may
      enable its isolated tenant/context.
- [ ] Update the checksum manifest only after initial-release migrations through `20260801066000` are
      final. Post-baseline migrations `067000/067500/068000` remain WP-28E/WP-29C-owned.
- [ ] Rehearse clean migration and upgrade from the supported production schema; verify compatible
      readers and rollback/forward-fix notes before exposing the merged app to WP-26E.
- [ ] Run composition/route tests, shell build/typecheck/i18n checks and a read-only authenticated route
      smoke for every RP-FST surface; then run `gitnexus detect-changes`.

**Expected output:** a merged, routable, disabled-by-default candidate on which WP-26 can run real
cross-module tests without worker-local routes, stubs or source edits.  
**Abnormal cases:** duplicate route/provider registration; one shell omits export/translation; migration
checksum drift; old app reads new schema; optional provider absent; disabled flag accidentally exposes
UI; auth/CSRF middleware order changes; package merge invalidates a previously green focused test.  
**Acceptance gate:** every selected role-play route and composition binding exists and is testable in
the isolated test manifest, production defaults remain disabled, migrations rehearse cleanly, and
WP-26E has no dependency on WP-27B.

#### WP-27B — Evidence-controlled canary, cutover, rollback, and final documentation

- [ ] **WP-27B overall status**

**Dependencies:** WP-27A and WP-26F.  
**Exclusive write set:**

```text
docs/09-operations/search-filter-rollout-runbook.md
docs/09-operations/search-enterprise-readiness.md
docs/12-evidence/filter-search-cutover-2026-08-01.md
```

- [ ] **RED/canary:** shadow V2 executes copied authorized requests without changing user results;
      compare eligible IDs, totals, facets, permissions, latency and diagnostics with reference/legacy
      behavior only where semantics genuinely overlap.
- [ ] Operate the independently reversible flags registered by WP-27A by
      context/tenant/principal cohort; one global Filter/Search/alert/projection/assistance flag is
      forbidden. A source defect reopens its owning package instead of being patched inside WP-27B.
- [ ] Use the initial canary schedule unless WP-26 evidence approves a stricter one: shadow for at
      least seven consecutive days and the representative query/principal matrix; then 5%, 25% and 50%
      cohorts for at least 48 hours each; then 100% for seven days before declaring stable. Low traffic
      supplements duration with deterministic/manual corpus coverage and never shortens it.
- [ ] During canary, gate on zero permission leaks, agreed correctness/metadata coverage, error and
      degraded rate, p95/p99 delta, zero-result delta, repair-required views, projection lag, alert
      duplicate/miss rate and support feedback.
- [ ] Freeze numeric promotion thresholds from WP-26 before shadow starts: deterministic correctness,
      exact facets and secondary-label recall stay 100%; permission leakage stays zero; no unexplained
      p95/p99 regression exceeds 20% on the same runner; every other product metric gets a baseline,
      allowed delta, minimum sample, owner and stop/rollback action.
- [ ] Freeze writes only for a bounded incompatible activation window; pause affected alerts, activate
      with a fenced plan, reconcile PostgreSQL state and unpause only compatible subscriptions.
- [ ] Exercise rollback at each canary stage: route flag, context registration, Search alias,
      projection worker, alert worker and assisted authoring. Preserve newer criteria/taxonomy history;
      use forward repair where downgrade would be destructive.
- [ ] Keep legacy GET/query parameters/adapters for a bounded compatibility window, emit privacy-safe
      usage and create a later removal ticket. Removal eligibility is the later of 30 days after 100%
      cutover or 14 consecutive days with at least 99.9% eligible traffic on the new path and no critical
      legacy consumer.
- [ ] Retain the previous Search generation for at least 14 days and longer than the maximum
      cursor/session TTL, alert interval, observed outbox lag and incident-detection window.
- [ ] Publish the operator runbook for preview, migrate, validate, activate, reconcile, pause,
      rollback, replay, DLQ repair, stale projection, provider outage and emergency disablement.
- [ ] Run `pnpm run test:full-confidence`, approved benchmarks, migration rehearsals, architecture
      checks, focused E2E for every enabled context and read-only `gitnexus detect-changes`; investigate
      every unexpected symbol/flow rather than editing production code in this package.
- [ ] Obtain product/domain/security/operations approval for the final matrix and mark packages `[x]`
      only after immutable evidence links and remaining risks are recorded.

**Expected outputs:** staged per-context cutover, bounded compatibility/deprecation windows, reversible
flags, searchable operational evidence, runbooks and a separate legacy-removal backlog.  
**Abnormal cases:** canary actor changes organization; legacy and V2 semantics are incomparable; alias
swap succeeds but deploy fails; rollback target lacks taxonomy ref; shadow doubles provider load;
flag cache is stale; alert sends during cutover; telemetry leaks values; emergency context disablement
is needed.  
**Acceptance gate:** every enabled context can be independently disabled or rolled back, WP-26
evidence is green, no data/criteria/history is lost and legacy removal remains a separate
evidence-based decision.

### WP-28 — Measured advanced retrieval, ranking, and experimentation

- [ ] **WP-28 overall status**

**Worker profile:** four independent domain packages—deterministic ranking, semantic retrieval,
relevance rules, and experimentation—followed by one serial integration package.  
**Dependencies:** WP-16, WP-21, WP-23, WP-26; production exposure waits for the WP-27B initial-release
baseline so gains are measured against a stable authoritative system.  
**Parallelism:** WP-28A/WP-28B/WP-28C may develop behind disabled modes; WP-28D consumes their frozen
ranking versions and evidence; WP-28E alone owns routes/composition/config/checksum/UI integration.  
**Shared rule:** no ranking feature may change strict eligibility, mandatory permission constraints,
facet population, or exact identifier behavior.

#### WP-28A — Structured rank features and diversity

- [ ] **WP-28A overall status**

**Exclusive write set:**

```text
app/modules/search/domain/search_rank_feature.ts
app/modules/search/domain/search_diversity_policy.ts
app/modules/search/infra/ranking/structured_ranker.ts
app/modules/search/infra/ranking/diversity_ranker.ts
app/modules/search/tests/backend/unit/structured_ranker.spec.ts
app/modules/search/tests/backend/unit/diversity_ranker.spec.ts
scripts/search/advanced_relevance_judgments.ts
```

- [ ] Define versioned, domain-owned feature contracts for freshness, trust/evidence, completion,
      availability, and bounded business rules; document direction, normalization, missing-data default,
      cap, provenance, and fairness review for every feature.
- [ ] **RED:** deterministic fixtures prove strict filters are unchanged, preference/business boosts
      are capped, explicit user sort wins, missing/unknown does not receive an accidental boost, and exact
      identifier matches cannot be buried by popularity/freshness.
- [ ] **RED:** diversity tests cap source/entity/org domination only inside relevance-tied windows,
      preserve stable pagination, and do not use hidden/protected traits or penalize a small cohort by
      proxy.
- [ ] Implement versioned feature and diversity stages under new Search ranking files, with per-hit
      privacy-safe explanation and an instant fallback to the prior ranking version.
- [ ] Extend judged corpus with freshness/diversity/fairness cases; require no Recall/MRR/nDCG guardrail
      regression outside the pre-approved trade-off and no eligibility/facet changes.
- [ ] Run the two focused unit files through `bin/test.ts unit`, the approved Search benchmark,
      typecheck/lint, and detect-changes; attach the ranking-version comparison artifact.

**Expected output:** explainable structured ranking and diversity that can be disabled independently.  
**Abnormal cases:** feature clock skew; missing timestamp; popularity feedback loop; sparse source;
new entity with no behavior; one organization owns most relevant results; stable cursor crosses a
ranking-version change; rule expires mid-session.

#### WP-28B — Hybrid semantic retrieval and bounded reranking pilot

- [ ] **WP-28B overall status**

**Exclusive write set:**

```text
app/modules/search/public_contracts/search_embedding_provider.ts
app/modules/search/public_contracts/search_reranker.ts
app/modules/search/domain/hybrid_retrieval_plan.ts
app/modules/search/infra/semantic/**
app/modules/search/tests/backend/contract/search_embedding_provider.contract.spec.ts
app/modules/search/tests/backend/unit/hybrid_retrieval_plan.spec.ts
app/modules/search/tests/backend/integration/hybrid_search_pilot.spec.ts
scripts/search/hybrid_search_evaluation.ts
```

- [ ] Create provider-neutral embedding/reranker ports, model/index version metadata, allowed fields,
      vector dimensionality/normalization, retention/privacy policy, and an explicit task/talent pilot
      hypothesis; do not vectorize protected/private text.
- [ ] **RED:** contract tests cover lexical-only, semantic-only, hybrid RRF, unavailable model/vector
      store, dimension/version mismatch, missing embedding, multilingual/diacritic query, exact ID/quoted
      phrase, duplicate candidate, filter-first eligibility, timeout, and cancellation.
- [ ] **RED:** security tests cover adversarial embedding text, vector inversion/membership risks,
      cross-tenant nearest neighbors, poisoned document, prompt-like content, oversized input, stale
      embedding after privacy deletion, and forbidden-field provenance.
- [ ] Build offline candidate embeddings and a candidate index generation through WP-23 lifecycle;
      retrieve semantic candidates only for supported contexts and fuse with lexical ranks using a frozen
      RRF policy.
- [ ] Rerank only a bounded top window under a separate timeout/budget; timeout or invalid response
      returns the pre-rerank order and explicit degraded metadata, never an empty/broader result set.
- [ ] Evaluate Recall@K, MRR, nDCG, exact-ID/phrase regressions, Vietnamese variants, latency/cost,
      fairness slices, and no-relevant-result queries before a canary; publish negative as well as positive
      results.
- [ ] Run focused contract/unit tests, isolated Elasticsearch/model-fake integration, the direct
      hybrid evaluation script, typecheck/lint, and detect-changes; real-provider smoke tests are separate
      governed evidence, never a replacement for deterministic fakes.

**Expected output:** an optional, versioned hybrid mode and bounded reranker with lexical fallback and
reproducible offline evidence.  
**Abnormal cases:** model provider changes output silently; task/talent vector schemas differ; query
contains secret; document removed but vector remains; filter leaves no semantic candidates; semantic
and lexical sets barely overlap; reranker hallucinates ID; model quota exhausted; model version rolls
back while cursor/session is active.

#### WP-28C — Previewable relevance rules

- [ ] **WP-28C overall status**

**Exclusive write set:**

```text
database/migrations/20260801067000_create_search_relevance_rules.ts
app/modules/search/domain/search_relevance_rule.ts
app/modules/search/actions/ports/outbound/search_relevance_rule_repository.ts
app/modules/search/actions/queries/preview_search_relevance_rule_query.ts
app/modules/search/actions/commands/apply_search_relevance_rule_command.ts
app/modules/search/actions/commands/disable_search_relevance_rule_command.ts
app/modules/search/infra/repositories/postgres_search_relevance_rule_repository.ts
app/modules/search/tests/backend/unit/search_relevance_rule.spec.ts
app/modules/search/tests/backend/integration/search_relevance_rule_workflow.spec.ts
```

- [ ] Define audited, time-bounded pin/exclude/boost/bury rules with context/scope, priority, start/end,
      owner, reason, approval, expected-state token, ranking version, and rollback state.
- [ ] **RED:** preview compares organic versus proposed order/metrics on authorized fixtures; conflicting
      rules, expired rule, deleted target, permission-hidden target, stale preview, and rule that alters
      strict eligibility fail deterministically.
- [ ] Implement preview/apply/disable/expire workflow under Search-owned rule files and the reserved
      migration; coordinator verifies the timestamp again before the worker starts and owns the final
      checksum manifest.
- [ ] Require dual control for high-impact rules and emit privacy-safe audit/observability; UI/API
      composition remains WP-28E's responsibility to keep this domain package independent.
- [ ] Run migration verify/clean-test, focused unit/integration tests, typecheck/lint, and
      detect-changes; WP-28E applies the migration checksum update.

**Expected output:** operators can understand and reverse relevance changes without editing raw
Elasticsearch DSL.  
**Abnormal cases:** two pins target the same position; rule overlaps taxonomy merge; target becomes
private; operator loses role; emergency disable; time-zone boundary; legacy ranking version cannot
interpret rule.

#### WP-28D — Offline/online experiment framework

- [ ] **WP-28D overall status**

**Exclusive write set:**

```text
database/migrations/20260801067500_create_search_experiments.ts
app/modules/search/domain/search_experiment.ts
app/modules/search/domain/search_experiment_assignment.ts
app/modules/search/domain/search_experiment_metrics.ts
app/modules/search/actions/ports/outbound/search_experiment_assignment_provider.ts
app/modules/search/actions/ports/outbound/search_experiment_repository.ts
app/modules/search/actions/commands/record_search_experiment_event_command.ts
app/modules/search/infra/repositories/postgres_search_experiment_repository.ts
app/modules/search/tests/backend/unit/search_experiment_assignment.spec.ts
app/modules/search/tests/backend/unit/search_experiment_metrics.spec.ts
app/modules/search/tests/backend/integration/search_experiment_attribution.spec.ts
scripts/search/experiments/**
docs/12-evidence/search-ranking-experiment-template.md
```

- [ ] Freeze judged-query sets, relevance labels/provenance, evaluation code, traffic eligibility,
      randomization unit, exposure logging, guardrails, minimum sample calculation, stop conditions, and
      privacy/retention before starting an experiment.
- [ ] **RED:** assignment is stable per chosen unit, mutually exclusive experiments do not overlap,
      bots/internal/test traffic is excluded, missing exposure cannot count as conversion, late events
      respect window, and rollback does not corrupt attribution.
- [ ] **RED:** durable attribution persists assignment and exposure before accepting a conversion;
      duplicate/late/out-of-order events, retention expiry, consent deletion, event-schema change,
      worker retry, and experiment disablement remain idempotent and auditable.
- [ ] Implement offline comparison plus A/B or interleaving assignment behind ranking versions; keep
      Search usable when the experiment service is unavailable.
- [ ] Implement the repository/event command with privacy-minimized IDs, event version, attribution
      window, and retention state; WP-28E owns runtime event/composition hookup.
- [ ] Calculate required sample with the metric baseline, minimum detectable effect, alpha, power,
      variance/design effect, allocation, and expected eligible traffic; if the result is impractical,
      keep the change offline/shadow rather than reading noisy clicks as truth.
- [ ] Gate rollout on relevance gain plus latency, zero-result, permission, fairness, abandonment, and
      successful-action guardrails; sparse clicks are supporting evidence, not ground truth.
- [ ] Run deterministic assignment/metric tests, offline evaluator twice for reproducibility,
      typecheck/lint, and detect-changes; attach sample-size inputs and raw output artifact.

**Expected output:** reproducible, privacy-reviewed evidence for or against every ranking change.  
**Abnormal cases:** novelty effect; sample ratio mismatch; repeated users/devices; cross-org spillover;
seasonality; multiple comparisons; metric logging changes mid-test; harmful slice hidden by aggregate;
interleaving bias; experiment stopped early after a favorable fluctuation.

#### WP-28E — Advanced relevance integration checkpoint

- [ ] **WP-28E overall status**

**Dependencies:** WP-28A, WP-28B, WP-28C, WP-28D.  
**Parallelism:** serial integration owner; no other worker edits the files below.  
**Exclusive write set:**

```text
app/composition/search_advanced_relevance_composition.ts
app/composition/search_ui_events_composition.ts
app/modules/http/controllers/admin_search_relevance_controller.ts
app/modules/http/controllers/search_experiment_event_controller.ts
app/modules/http/tests/backend/integration/admin_search_relevance_api.spec.ts
app/modules/http/tests/backend/integration/search_experiment_event_api.spec.ts
start/routes/admin.ts
start/routes/api.ts
database/migration-checksums.json
inertia/apps/admin/modules/search_relevance/**
inertia/apps/admin/tests/modules/search_relevance/**
package.json
```

- [ ] **RED:** HTTP/composition tests cover authorized preview/apply/disable rules, dual approval,
      experiment exposure/conversion ingestion, IDOR/cross-org attempts, idempotency, and disabled
      Search fallback.
- [ ] **RED:** admin UI tests cover organic-versus-proposed comparison, blockers, approval/expiry,
      experiment sample/guardrail display, keyboard/accessibility, stale plan, and emergency disable.
- [ ] Wire rankers/rules/experiment attribution behind independent disabled flags; a missing provider
      or experiment repository must select the stable baseline ranking, not fail Search startup.
- [ ] Merge migrations `067000` then `067500`, update the checksum manifest once, run clean/upgrade
      migration rehearsal, and register direct benchmark/evaluator commands.
- [ ] Run focused backend/admin tests, full Search compatibility, security checks, benchmark, E2E,
      typecheck/lint, and detect-changes before enabling any canary.

**Expected output:** the previously domain-only relevance capabilities have an authorized,
previewable operator workflow and durable online attribution with a single owned integration point.  
**Abnormal cases:** composition deploy without migration; exposure endpoint replay; rule approved while
ranking version changes; experiment service down; flag cache stale; operator session loses role;
manifest checksum drift.  
**Acceptance gate:** operators can preview, approve, measure, disable, and audit a ranking change
end-to-end without raw DSL, and all post-WP-27B migrations are registered/rehearsed.

**WP-28 acceptance gate:** WP-28E is complete and hands a disabled candidate to WP-30A; no advanced
ranker ships without a frozen ranking version, deterministic eligibility equivalence, offline evidence,
fallback, canary/experiment plan, and explicit fairness, latency, privacy, and cost guardrails. Only
WP-30D may start its production cohort after WP-30C closure.

### WP-29 — Privacy-bounded adaptive and organization-specific discovery

- [ ] **WP-29 overall status**

**Worker profile:** privacy/fairness/search-policy workers split WP-29A and WP-29B by write set, then a
serial WP-29C integration owner.  
**Dependencies:** WP-28, stable privacy-safe event quality from WP-26, and approved governance. WP-25
is independent and optional; natural-language authoring is not a prerequisite for adaptive ranking or
organization vocabulary.  
**Parallelism:** shadow/offline only until each subpackage passes its own gate; neither is required for
the initial WP-27B release.

#### WP-29A — Behavioral reranking and bounded personalization

- [ ] **WP-29A overall status**

**Exclusive write set:**

```text
app/modules/search/public_contracts/search_personalization_provider.ts
app/modules/search/domain/search_personalization_policy.ts
app/modules/search/infra/ranking/bounded_personalization_ranker.ts
app/modules/search/tests/backend/unit/search_personalization_policy.spec.ts
app/modules/search/tests/backend/unit/bounded_personalization_ranker.spec.ts
app/modules/search/tests/backend/integration/search_personalization_privacy.spec.ts
inertia/apps/shared/search/personalization/**
inertia/apps/shared/search/tests/personalization/**
```

- [ ] Define allowed events, purpose, consent/legal basis, retention, minimum cohort/support threshold,
      decay, opt-out/reset, user-visible explanation, and forbidden sensitive/proxy features before
      creating a personalized feature.
- [ ] **RED:** cold start, sparse behavior, opt-out, reset/deletion, shared device, cross-org account,
      malicious click farming, bot traffic, feedback loop, stale event, changed consent, and protected
      cohort tests all fall back to non-personalized ranking safely.
- [ ] **RED:** personalization cannot add an ineligible result, change facet totals, infer/show hidden
      traits, override exact IDs/explicit sort, or make a saved/shared URL produce an unexplained private
      ordering without a declared session/user policy.
- [ ] Implement a bounded feature port and shadow scorer with per-feature caps, minimum support,
      decay, fallback, versioning, privacy budget/retention enforcement, and “Why this result?”/reset
      controls.
- [ ] Evaluate utility and harm by authorized slices; require offline plus controlled online evidence
      and an independent privacy/fairness review before any canary.
- [ ] Run focused unit/privacy integration/component tests, benchmark slice, typecheck/lint, and
      detect-changes; attach opt-out/deletion rehearsal evidence.

**Expected output:** optional personalization that improves ordering only, is inspectable/resettable,
and disappears cleanly when consent/data/provider is unavailable.  
**Abnormal cases:** account merge; erased user events remain in aggregate; cohort too small; behavior
reveals employer/project intent; user changes organization; two users share browser session; event
poisoning; popular-item loop harms new entities.

#### WP-29B — Organization vocabulary and ranking policy

- [ ] **WP-29B overall status**

**Exclusive write set:**

```text
database/migrations/20260801068000_create_organization_search_vocabularies_and_policies.ts
app/modules/organizations/search/organization_search_vocabulary.ts
app/modules/organizations/search/organization_search_policy.ts
app/modules/organizations/search/organization_search_contributor.ts
app/modules/organizations/tests/backend/unit/organization_search_vocabulary.spec.ts
app/modules/organizations/tests/backend/integration/organization_search_policy.spec.ts
app/modules/search/infra/ranking/organization_policy_ranker.ts
app/modules/search/tests/backend/integration/organization_search_isolation.spec.ts
```

- [ ] Define org-owned reviewed aliases/vocabulary and bounded ranking policy as contributions through
      Taxonomy/Search ports; canonical global identity remains domain-owned and org data is scoped by
      principal/context.
- [ ] **RED:** alias resolution, collision/ambiguity, locale, inactive term, org switch, shared link,
      cross-org cache, policy priority/conflict, approval/expiry, and no-org fallback are deterministic.
- [ ] **RED:** an org alias/value/policy cannot appear in another org's effective context, suggestion,
      facet, explanation, telemetry, embedding neighbor, saved view, or alert.
- [ ] Implement versioned reviewed vocabulary and previewable bounded policy without copying global
      catalogs or accepting raw provider DSL; reuse WP-23 migration/repair and WP-28C audit/rollback.
- [ ] Evaluate organization-specific quality with minimum sample/privacy thresholds and global
      fairness/latency guardrails; default to global ranking when evidence is insufficient.
- [ ] Run migration verify, organization unit/integration and cross-tenant isolation tests, Search
      benchmark slice, typecheck/lint, and detect-changes; WP-29C owns composition and checksum.

**Expected output:** safe organization terminology and policy customization without fragmenting
canonical taxonomy or tenant isolation.  
**Abnormal cases:** user belongs to multiple orgs; org deleted/merged; alias shadows global exact ID;
policy owner leaves; term split; cache key omits org/version; org-specific embedding trained on private
text; shared view opened outside org.

#### WP-29C — Adaptive-policy integration checkpoint

- [ ] **WP-29C overall status**

**Dependencies:** WP-29A, WP-29B.  
**Parallelism:** serial integration owner after WP-28E; no other worker edits shared hotspots.  
**Exclusive write set:**

```text
app/composition/search_adaptive_policy_composition.ts
app/modules/http/controllers/search_personalization_controller.ts
app/modules/http/controllers/admin_organization_search_policy_controller.ts
app/modules/http/tests/backend/integration/search_personalization_api.spec.ts
app/modules/http/tests/backend/integration/admin_organization_search_policy_api.spec.ts
start/routes/admin.ts
start/routes/api.ts
database/migration-checksums.json
inertia/apps/admin/modules/organization_search_policy/**
inertia/apps/admin/tests/modules/organization_search_policy/**
inertia/apps/user/tests/modules/search/personalization_integration.test.ts
```

- [ ] **RED:** composition/HTTP tests cover opt-out/reset, no-provider/global fallback, org switch,
      multi-org explicit context, policy preview/approval/disable, cross-tenant IDOR/cache isolation,
      consent deletion, and disabled-flag behavior.
- [ ] **RED:** admin/user UI tests cover explanation/reset, reviewed aliases, ambiguity repair,
      approval/expiry, accessibility, stale version, and emergency global fallback.
- [ ] Bind WP-29A/WP-29B contributions behind separate flags and server-derived principal/org scope;
      neither client input nor cache key may choose an unauthorized policy/feature profile.
- [ ] Merge migration `068000`, update the checksum manifest, and rehearse clean/upgrade plus old-app
      compatibility after the already-registered WP-28 migrations.
- [ ] Run privacy deletion/opt-out, cross-tenant isolation, Search compatibility, admin UI/E2E,
      benchmark, typecheck/lint, and detect-changes before canary.

**Expected output:** an owned end-to-end integration path for adaptive ranking and organization policy,
including all post-baseline migration/manifest work.  
**Abnormal cases:** old app starts after `068000`; user changes current org mid-session; personalization
provider down; vocabulary cache stale; policy owner revoked; reset races with event ingestion; flag
rollback leaves newer rows.  
**Acceptance gate:** global ranking remains a one-action fallback, opt-out/deletion is proven, tenant
isolation is zero-violation, and migration/checksum rehearsal is complete.

**WP-29 acceptance gate:** opt-out/global fallback is complete, eligibility/facets remain identical,
tenant isolation has zero violations, WP-29C hands a disabled candidate to WP-30B, every adaptive
signal is governed/versioned/explainable, and online rollout has precomputed sample and stop rules.
Only WP-30D may start its production cohort after WP-30C closure.

### WP-30 — Advanced/adaptive role-play evidence, closure, and cutover

- [ ] **WP-30 overall status**

**Worker profile:** one docs-only manifest coordinator, two disjoint role-play/evidence workers, one
serial matrix-closure worker and one post-closure canary operator. This is a new advanced release
train; it does not reopen completed WP-26E/F or make WP-29 mandatory for a WP-28-only release.  
**Shared rule:** WP-30A/B prove release readiness using deterministic offline/pre-production shadow
traffic and real test PostgreSQL/Redis/Elasticsearch. WP-30D alone operates production cohorts after
closure; production canary results are not a circular prerequisite for readiness.

#### WP-30P — Freeze the advanced release manifest

- [ ] **WP-30P overall status**

**Dependencies:** WP-27B and an approved decision to pursue WP-28 alone or WP-28 plus WP-29. This is
a docs/data control package; it may run in parallel with WP-28 implementation.  
**Exclusive write set:**

```text
docs/12-evidence/filter-search-advanced-release-manifest-2026-08-01.json
```

**Required schema:**

```text
releaseId, baselineCommit, selectedCapabilities, deferredCapabilities,
scenarioRecords[{scenarioId, journeyId, applicability, requiredLayers,
evidenceOwner, closureAuthority}], requiredPackages, requiredBrowsers,
requiredViewports, evidenceEnvironment, createdAt, approvedBy
```

- [ ] Enumerate canonical IDs explicitly: WP-28 selection requires `TC-FST-030`/`RP-FST-13` owned by
      WP-30A/C; WP-29 selection additionally requires `TC-FST-031`/`RP-FST-15` owned by WP-30B/C.
- [ ] Record WP-29 as exactly `required` or `deferred` with reason/approver. Never infer its selection
      from whether a branch, provider, migration or test file happens to exist.
- [ ] Freeze exact dependency closure, browser/viewport matrix, environment facts and evidence policy;
      A/B/C/D consume this file read-only and cannot add a capability opportunistically.
- [ ] Run the matrix/manifest schema validator in docs-only RED→GREEN mode: it first fails for every
      absent/ambiguous owner/applicability/dependency field, then passes the completed frozen manifest.

**Expected output:** one immutable, machine-readable advanced release intent and dependency set with
a single owner/path before evidence workers are assigned.  
**Abnormal cases:** WP-29 left implicit; shorthand IDs; baseline commit changes; same scenario has two
evidence owners; closure authority omitted; selected capability lacks dependency/browser evidence;
approver changes after freeze.  
**Acceptance gate:** manifest schema is green, hash/approvals are recorded and the coordinator has
assigned exact A/B/C/D dependencies; later scope change creates a new manifest revision and invalidates
in-progress evidence rather than editing it silently.

#### WP-30A — WP-28 relevance/experiment role-play and evidence

- [ ] **WP-30A overall status**

**Dependencies:** WP-30P, WP-28E, and the frozen WP-26 evidence helper/validator contract.  
**Exclusive write set:**

```text
inertia/apps/admin/tests/e2e/filter_search_taxonomy/relevance_experiment_roleplay.spec.ts
docs/12-evidence/filter-search-advanced-relevance-experience-2026-08-01.md
```

- [ ] Verify the read-only advanced manifest selects `TC-FST-030`/`RP-FST-13` with `WP-30A` as unique
      evidence owner and WP-30C as closure authority; bind detailed/negative evidence in this package's
      report without editing the manifest.
- [ ] **RED:** RP-FST-13 fails at the first missing preview/approval, eligibility/facet equivalence,
      ranking-version, exposure, fallback, screenshot, backend/audit or independent-review proof.
- [ ] Execute rule preview/approval, deterministic treatment Search and independent rule/model/
      experiment disablement through UI; use fault hooks only for exogenous provider/service failure.
- [ ] Compare frozen baseline versus advanced mode over the same authorized fixture and shadow corpus;
      strict eligible IDs/facets remain identical while rank/order/explanation/version may differ.
- [ ] Capture semantic-first `evidence_only` screenshots, backend/audit hashes and safe browser health
      evidence across required browsers/viewports; have a reviewer outside WP-28 sign the sequence.
- [ ] Run the exact Playwright file, Search compatibility/security/performance evidence and matrix
      validator; publish reproducible command/environment/seed/commit facts.

**Expected output:** a complete, independently reviewable WP-28 evidence bundle proving advanced
relevance is previewable, measurable, bounded and independently reversible.  
**Abnormal cases:** rule target becomes private; ranking version changes after preview; model/reranker
times out; missing exposure; experiment service unavailable; exact identifier reorders; shadow corpus
has no relevant results; screenshot captures private explanation data.  
**Acceptance gate:** `TC-FST-030`/`RP-FST-13` evidence is complete but remains `[~]` until WP-30C
validates and closes it; WP-29 evidence is not required.

#### WP-30B — WP-29 personalization/organization-policy role-play and evidence

- [ ] **WP-30B overall status**

**Dependencies:** WP-30P, WP-29C, and the frozen WP-26 evidence helper/validator contract.  
**Exclusive write set:**

```text
inertia/apps/user/tests/e2e/filter_search_taxonomy/personalization_policy_roleplay.spec.ts
docs/12-evidence/filter-search-adaptive-policy-experience-2026-08-01.md
```

- [ ] Verify the read-only advanced manifest selects `TC-FST-031`/`RP-FST-15` with `WP-30B` as unique
      evidence owner and WP-30C as closure authority; bind detailed/negative evidence in this package's
      report without editing the manifest.
- [ ] **RED:** RP-FST-15 fails at the first missing explanation, eligibility/facet equivalence,
      opt-out/reset/deletion fence, organization isolation, global fallback, screenshot, backend/audit
      or independent-review proof.
- [ ] Execute user explanation/reset/opt-out and clean-session organization switching through UI;
      approved hooks may seed deterministic treatment/events or fail a provider but cannot return the
      desired UI state.
- [ ] Prove current consent and organization win over stale in-flight response/event/cursor/cache;
      compare global and adaptive eligible IDs/facets exactly and scan every artifact for canaries.
- [ ] Capture semantic-first evidence across required browsers/viewports, join consent/deletion/
      assignment/policy-version backend records, and obtain privacy/fairness/product review.
- [ ] Run the exact Playwright file, privacy deletion/isolation/Search compatibility suites and matrix
      validator; publish reproducible command/environment/seed/commit facts.

**Expected output:** a complete WP-29 evidence bundle proving personalization is understandable and
erasable, organization policy is isolated and global ranking is always recoverable.  
**Abnormal cases:** reset races event ingestion; user changes organization mid-request; shared
browser/session; provider down; policy cache omits org/version; deleted events remain in feature
state; small cohort leaks behavior; global fallback still carries personalized cursor.  
**Acceptance gate:** `TC-FST-031`/`RP-FST-15` evidence is complete but remains `[~]` until WP-30C
validates and closes it.

#### WP-30C — Advanced matrix closure and release-readiness evidence

- [ ] **WP-30C overall status**

**Dependencies:** WP-30P and WP-30A; add WP-30B only when the frozen advanced release manifest selects
WP-29. The manifest stores this exact dependency set before assignment.  
**Exclusive write set after WP-26F handoff:**

```text
docs/superpowers/plans/2026-08-01-filter-search-taxonomy-test-matrix.md
docs/12-evidence/filter-search-advanced-release-gates-2026-08-01.md
```

- [ ] Read and hash-verify the WP-30P manifest, then join it with matrix, layer evidence, role-play artifacts, backend/audit hashes,
      negative paths and reviewer records; reject missing/mismatched run/seed/actor/context evidence.
- [ ] Verify `TC-FST-030` is independent from WP-29 and `TC-FST-031` is selected only with WP-29;
      deferred rows stay `[ ]` with approved applicability records.
- [ ] As the sole advanced closure authority, change only selected advanced master/RP status checkboxes
      and immutable evidence references. Scenario semantics/layers require a new governed baseline.
- [ ] Publish correctness/security/performance/privacy/fairness/readiness decisions and immutable hash;
      no production cohort result is fabricated or required before this readiness gate.

**Expected output:** one machine-verifiable advanced release-readiness report and correctly closed
WP-28-only or WP-28+WP-29 matrix rows.  
**Abnormal cases:** evidence from different commit/run; WP-29 accidentally required for WP-28; missing
reviewer; eligibility/facet mismatch hidden by ranking metric; deferred row marked `[x]`; evidence-only
screenshot supplied a brittle pixel baseline.  
**Acceptance gate:** every selected advanced row has a full proof bundle and every unselected row stays
explicitly deferred; only then may WP-30D start production canary.

#### WP-30D — Advanced cohort canary, rollback, and final handoff

- [ ] **WP-30D overall status**

**Dependencies:** WP-30C.  
**Exclusive write set:**

```text
docs/09-operations/search-advanced-rollout-runbook.md
docs/12-evidence/filter-search-advanced-cutover-2026-08-01.md
```

- [ ] Operate WP-28 rule/hybrid/experiment flags and, when selected, WP-29 personalization/org-policy
      flags independently; no source edit is allowed in this package.
- [ ] Freeze cohort unit, sample/stop/rollback thresholds and guardrails before traffic. Start with the
      smallest approved cohort after shadow readiness; increase only after duration/sample and zero
      leakage/eligibility/facet gates pass.
- [ ] Monitor relevance/success, zero-result, latency/cost, sample-ratio, fairness/privacy slices,
      opt-out/reset, tenant isolation and support feedback without reading sparse/noisy wins as truth.
- [ ] Exercise one-action global fallback and per-capability rollback at every stage; preserve
      attribution/audit and ensure stale cursor/cache/event cannot retain disabled policy.
- [ ] Publish cohort facts, stop/rollback decisions and final approvals; a failed canary returns to
      frozen global ranking and opens an owning package rather than weakening matrix evidence.

**Expected output:** evidence-controlled advanced rollout with independent disablement and a complete
rollback/audit trail.  
**Abnormal cases:** sample-ratio mismatch; cohort changes organization; model/rule/policy flag cache
stale; opt-out during exposure; privacy/fairness slice harm; provider outage; rollback leaves a newer
cursor/cache; support emergency disablement.  
**Acceptance gate:** approved cohort stages complete without eligibility/facet/leakage violations,
global fallback rehearsal passes and advanced rollout remains reversible.

## 9. Wave integration gates

- [ ] **GATE-00 — Baseline ready:** WP-00 complete; dirty work owned; specs/plan frozen; failures and
      migration numbers recorded.
- [ ] **GATE-01 — Semantic contracts frozen:** WP-01/WP-02/WP-03 complete; canonical fixtures and
      Search metadata truth are approved; no worker may fork the AST/taxonomy identity model.
- [ ] **GATE-02 — Platform core ready:** WP-04/WP-05/WP-06/WP-07 complete; context, permission,
      executor, saved-view, URL, and taxonomy-provider contracts pass pure/contract suites.
- [ ] **GATE-03 — Providers and pilots ready:** WP-08 through WP-13 and WP-16 complete; SQL and indexed
      executors pass common semantics; Search capability is ready for final composition.
- [ ] **GATE-04 — End-to-end pilots ready:** WP-14/WP-15/WP-17/WP-18 complete; two deliberately
      different pilots prove shared semantics and domain-composed UI.
- [ ] **GATE-05 — Advanced implementation ready:** selected WP-19 through WP-25 packages meet their
      implementation/test gates behind disabled flags; optional packages are explicitly deferred, not
      half-wired. This gate does not authorize production traffic.
- [ ] **GATE-06 — Release evidence ready:** WP-27A and WP-26 are green, every concrete WP-24 child in the frozen
      release-train manifest is complete, and every blocker has an owner and resolution—no silent waiver.
      Every selected P0 test-matrix row and applicable role-play/screenshot journey is `[x]`; WP-25
      shadow evidence is included only when it is an enablement candidate.
- [ ] **GATE-07 — Cutover complete:** WP-27B canary/rollback/evidence/docs complete; legacy removal
      remains a separately scheduled ticket. WP-27B is the first package allowed to enable WP-25.
- [ ] **GATE-08 — Advanced relevance approved:** when pursued, WP-28 proves eligibility equivalence,
      measurable offline gain, fallback, privacy/fairness/cost guardrails, and valid experiment design;
      this is implementation readiness, not matrix closure or production enablement.
- [ ] **GATE-09 — Adaptive policy approved:** when pursued, WP-29 proves consent/retention/opt-out,
      tenant isolation, global fallback, minimum evidence, and no eligibility/facet mutation; it may be
      explicitly deferred for a WP-28-only release.
- [ ] **GATE-10 — Advanced evidence ready:** WP-30P/WP-30A and, when selected, WP-30B are green;
      WP-30C has closed exactly `TC-FST-030`/`RP-FST-13` and optional
      `TC-FST-031`/`RP-FST-15` with full joined evidence. No production cohort is required before this
      gate.
- [ ] **GATE-11 — Advanced cutover complete:** WP-30D cohort/rollback evidence is approved; every
      enabled rule/model/experiment/personalization/organization policy remains independently
      reversible to global ranking.

No later required gate may be marked complete while an earlier required gate is incomplete. A
conditional gate explicitly deferred in the frozen release manifest—such as GATE-09 for WP-28-only—
does not block the next selected gate and may not be marked `[x]`. A package can be merged behind a
disabled flag before its wave gate, but cannot receive production traffic.

## 10. Worker handoff template

Every worker returns this template to the coordinator; the coordinator owns all status changes:

```markdown
- [ ] Package ID and working-tree change-set identifier; SHA only after explicit user authorization
- [ ] STARTED/TO-DATE/BLOCKED/DONE status
- [ ] Exact files changed; confirmation that exclusive write set was respected
- [ ] `gitnexus impact` commands and risk levels before edits
- [ ] RED command, intended failing test, and short expected failure
- [ ] GREEN commands and summarized results
- [ ] Edge cases covered; deferred cases with owner/gate
- [ ] Affected TC-FST/detailed matrix IDs, layers supplied, remaining evidence owner
- [ ] Applicable RP-FST checkpoints, screenshot/backend artifact paths and experience-review status
- [ ] Migration, compatibility, feature-flag, and rollback notes
- [ ] `gitnexus detect-changes` summary and unexpected flows, if any
- [ ] `git diff --cached --name-only` is empty; no `git add` or `git commit` was run
- [ ] Expected output demonstrated with test/evidence link
- [ ] Follow-up dependency requests; no out-of-scope edits hidden in the change set
```

## 11. Risk and abnormal-condition register

| Risk                                          | Detection trigger                                     | Required response                                                               | Release owner              |
| --------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| Browser filters partial data                  | Off-page fixture changes result                       | Move authority to registered executor; retain only presentation filters locally | Context worker             |
| Missing secondary tags/skills                 | Secondary-label recall below 100%                     | Block projection/context activation; repair reader/builder/mapping and rebuild  | Domain + Search projection |
| Singleton data presented as multi-label truth | Coverage shows one source column                      | Label `legacy_single_value`; do not advertise complete multi-label support      | Domain owner               |
| Permission leakage                            | Hidden hit/count/facet/suggestion/error/timing signal | Block release; fix mandatory constraints before optimization                    | Security gate owner        |
| SQL/ES semantic drift                         | Differential fixture ID/count mismatch                | Fix adapter or narrow advertised capability; never silently drop clause         | Executor owner             |
| Taxonomy split ambiguity                      | More than one valid replacement                       | Mark criteria `requires_repair`, pause alert, retain obsolete ref               | Taxonomy owner             |
| Projection rebuild gap                        | Event/checkpoint/completeness mismatch                | Block alias activation; replay or forward repair                                | Search operations          |
| Approximate count treated as exact            | Provider returns `gte/unknown`                        | Preserve relation in API/UI/metrics; do not show false precision                | Executor + UI              |
| High-cardinality facet overload               | Latency/payload/circuit-breaker gate                  | Use bounded search/composite paging; cap request with diagnostic                | Context + provider         |
| Cursor/version mismatch                       | Signature/hash/generation/schema differs              | Fail with stable stale-cursor diagnostic; never restart silently                | Executor owner             |
| Degraded fallback broadens access             | Mandatory/user criteria not supported                 | Fail closed or explicit partial/no-result; no broad fallback                    | Search owner               |
| Worker edit collision                         | File outside exclusive set or shared hotspot          | Stop package, return dependency request, coordinator resolves                   | Coordinator                |
| Migration/manifest collision                  | Duplicate timestamp/checksum drift                    | Stop migration workers; renumber centrally before merge                         | Coordinator                |
| Assisted-authoring hallucination/injection    | Invalid/protected/broader candidate                   | Reject proposal, preserve manual flow, log privacy-safe code                    | Assistance owner           |
| Benchmark noise mistaken for regression       | Runner/env/sample facts differ                        | Rerun same environment; report confidence and raw artifact                      | Performance owner          |
| Rollback destroys newer semantics             | Old reader cannot understand criteria/taxonomy        | Pause affected capability and forward-fix; retain history                       | Release owner              |

## 12. Final expected deliverables

- [ ] A provider-neutral Filter Platform that executes filter-only or text-plus-filter criteria over
      complete authorized populations.
- [ ] A Search-owned discovery wrapper and Elasticsearch executor with exact multi-label metadata,
      contextual facets, stable cursors, explicit degradation, and durable versioned projections.
- [ ] Domain-owned taxonomy/metadata providers with provenance, lifecycle, versioning, completeness,
      migration preview/repair, and no fake universal catalog.
- [ ] Shared frontend state and accessible primitives composed differently for each domain, including
      URL restoration, basic/advanced authoring, saved views, and optional assistance.
- [ ] One operational SQL pilot and one indexed discovery pilot, followed by independently assignable
      inventory-derived migration tickets.
- [ ] Durable alerts, release/cutover/rollback tooling, privacy-safe observability, correctness and
      no-leakage evidence, performance capacity report, and operator runbooks.
- [ ] A traceable cross-layer test matrix plus role-play E2E/screenshot evidence that a reviewer can
      understand without implementation context.
- [ ] Optional post-baseline packages for structured/hybrid ranking, relevance rules, experiments,
      personalization, and organization policy, each independently gated and reversible.

## 13. Final release acceptance checklist

- [ ] Filter works without a keyword where the context permits browsing.
- [ ] Search text, strict eligibility, preferences, sort, facets, and presentation remain distinct.
- [ ] Any/All/None/Exactly/At-least-N and explicit unknown semantics pass shared SQL/Search fixtures.
- [ ] A resource with tens or hundreds of legitimate labels retains every secondary label through
      source, projection, execution, facets, saved criteria, URL, and UI chips.
- [ ] Hits, totals, facets, value search, suggestions, explanations, saved views, and alerts reveal no
      unauthorized entity, field, value, or distinguishing diagnostic.
- [ ] Selected zero-count/retired values remain inspectable; exact/approximate/unknown counts are not
      conflated.
- [ ] User/org/admin shells reuse common behavior without shared code importing shell aliases or
      forcing identical layouts.
- [ ] Saved views survive compatible schema/taxonomy changes; ambiguous changes are repairable and
      alerts pause safely.
- [ ] Projection rebuild/replay/activation/rollback survives injected crashes and converges to one
      correct active generation without losing live updates/deletes.
- [ ] URL refresh, Back/Forward, new tab, mobile staged flow, keyboard/screen-reader, high zoom, IME,
      cancellation, and offline/degraded states pass focused E2E/component evidence.
- [ ] Every selected P0 `TC-FST` scenario has its full evidence bundle and every applicable `RP-FST`
      journey runs core actions through UI, asserts semantics before screenshots, verifies backend side
      effects and passes independent experience review.
- [ ] Deterministic fixtures achieve 100% eligible-ID correctness, 100% exact facet correctness,
      100% secondary-label recall, and zero permission leakage.
- [ ] Performance report states environment, sample count, cardinality/concurrency matrix, p50/p95/p99,
      cold/warm separation, throughput margin, and approved regression/SLA gates.
- [ ] Every enabled context/capability has a reversible flag or activation plan, rollback/forward-fix
      runbook, compatibility window, owner, and measurable retirement criterion.
- [ ] Every work package has RED/GREEN evidence, expected output, abnormal-case coverage,
      detect-changes summary, and no unexplained files outside its exclusive write set.
- [ ] Any enabled advanced/adaptive ranking version has deterministic eligibility equivalence,
      measured quality evidence, a prior-version fallback, privacy/fairness/cost limits, and a valid
      experiment or canary stop rule.

## 14. Coordinator audit — canonical task metadata to Search (2026-08-09)

- [x] Audited the production chain: `LucidTaskSearchDocumentReader` →
      `TaskSearchDocumentBuilder` → `TaskSearchIndexRepository` → Elasticsearch mapping.
- [x] Audited the independently composed canonical chain:
      `LucidTaskMetadataAssignmentSourceReader` → `TaskMetadataAssignmentProvider`.
- [x] Verified the real version source: `skill_taxonomy_revision` is read by
      `LucidTaxonomyVersionReader` for `skills`.
- [x] Added the bounded source-of-version registry
      `task_metadata_taxonomy_revisions` for `business-domains`, `problem-categories`,
      `task-types`, and `technologies`. It has no seed rows or invented term data; the reader
      returns a version only for a published positive registry row and maps source unavailability
      to the stable provider-unavailable error.
- [~] The four namespaces still lack authoritative term catalogs, aliases, hierarchy/lifecycle
  records, and a governed publication command. Legacy task scalar/JSONB values remain source
  inputs only and must not be treated as a completed canonical catalog.
- [x] Verified the current Search contract has no canonical assignments, taxonomy/enrichment
      versions, provenance, review state, completeness diagnostics, or source revision.
- [~] **WP-03/WP-07B canonical Search adoption** — provider/source-reader tests and composition are
  green, but production Search still reads legacy task columns. Keep `[~]` until an additive
  projection contract, strict mapping, fail-closed unsupported-version behavior, and layered
  provider → projection → Elasticsearch → rebuild → browser evidence exist.
- [~] **Namespace version completion** — the authoritative revision-registry schema and reader
  slice is complete and verified, but no namespace is promoted until its owning catalog
  publishes a real revision; term sources/readers and governed publication remain open.
- [~] **Release status** — no package is promoted from this audit. The release manifest remains
  invalid/stale and joined role-play/evidence closure is still required.

## 17. Additive Search canonical metadata contract slice (2026-08-09)

- [x] Added a pure provider-result projection that preserves canonical `namespace:termId` refs,
      namespace partitions, assignment provenance/review states, and deterministic taxonomy-version
      fields without mixing free-form tags into canonical identity.
- [x] Added optional Search document fields and strict Elasticsearch mappings for that envelope.
- [x] Targeted evidence: projection `3/3`, Task Search builder `3/3`, index mapping/lifecycle `2/2`,
      targeted ESLint pass.
- [x] Production wiring now injects `taskMetadataAssignmentProvider` into
      `LucidTaskSearchDocumentReader` and requests only the supported `skills` namespace with the
      task authorization boundary. Targeted integration evidence is `12/12`, including the real
      production composition and an explicitly composed provider.
- [~] The aggregate remains open: unsupported namespace versions are still deliberately absent,
  and provider → projection → Elasticsearch rebuild → HTTP/browser verification is not yet a
  complete release evidence bundle.

## 18. Task metadata namespace revision registry slice (2026-08-09)

- [x] Added `database/migrations/20260809110000_create_task_metadata_taxonomy_revisions.ts` with
      namespace allow-list, positive revision and lowercase SHA-256 fingerprint constraints,
      publication timestamps, and intentionally no seed rows.
- [x] Extended `LucidTaxonomyVersionReader` to read the four task metadata namespaces from that
      registry, preserve `skills` ownership, and fail closed when a row/source is unavailable or
      a namespace is unsupported.
- [x] Targeted evidence: version reader integration `4/4`, Lucid task source integration `3/3`,
      provider unit `7/7`, provider conformance `3/3`, and focused ESLint pass.
- [~] This closes only the version-source registry slice. It does not create term identities,
  aliases, hierarchy/lifecycle governance, assignment migration, or Search rebuild/HTTP/browser
  evidence; the aggregate taxonomy/Search work therefore remains partial.

## 16. Fresh release/evidence closure audit (2026-08-09)

The release registry is human-readable and remains `[~]`; it is not a substitute for the
machine-readable validator manifest. Fresh checks confirm:

- validator unit coverage: the latest runnable wrapper passes `17/17` (the earlier `14/14` run is
  historical evidence before execution metadata validation was added);
- fixture command: `NO TESTS EXECUTED` because the fixture directory is outside the standard Japa
  glob;
- both legacy JSON inputs (`test-matrix.json` and `implementation-plan.json`) exit `1` with
  `manifest_invalid`;
- frozen hashes for the plan, matrix and surface inventory differ from the current worktree and are
  not silently replaced.

No status was promoted from these checks. WP-26E remains `[~]`, WP-26F remains `[ ]`, and WP-27A/
WP-27B remain open until real artifact joins, migration/schema approval, and independent review are
available. This correction records evidence boundaries only; it does not create release evidence.

## 15. Verification correction — Search a11y and release validator (2026-08-09)

- [x] Found and corrected a real Search Center accessibility mismatch: degradation and partial
      Discovery status regions now have the localized Vietnamese accessible names required by the
      component contract; the test expectation was aligned with the active `vi` resource instead of
      accepting the stale English copy.
- [x] Component verification: Search Center suite `9/9`.
- [x] Backend Search Discovery verification: mapper `2/2`, controller `2/2`.
- [x] Matrix validator verification: `tests/unit/filter_search_test_matrix_validator.spec.ts`
      `14/14`; targeted ESLint and `git diff --check` pass.
- [x] Current `pnpm run typecheck` recheck reported `tsc --noEmit` pass and Svelte-check `0
  errors, 0 warnings` after the transient unrelated-worktree failures cleared.
- [~] Release validator remains open: the legacy `docs/12-evidence/test-matrix.json` and
  `implementation-plan.json` are rejected as `manifest_invalid`; no machine-readable FST
  release manifest with artifact joins exists yet.
- [~] Frozen-hash checkpoint remains stale for the platform plan, test matrix, and surface
  inventory. Do not silently replace hashes; re-freeze requires coordinator approval and a
  migration/schema gate that is currently still pending.
- [x] Chromium rerun of the keyword-only and combined/cursor role-play files is green: `2 passed`
      with one worker. The run exercised real seed setup, Search Center q-only presentation, strict
      combined criteria, preference ranking, cursor pagination, tampered-cursor rejection, and
      recovery. This closes only the bounded browser evidence slice; aggregate RP/TC rows still
      require their other layers.
- [x] The earlier `E_ROW_NOT_FOUND` seed failure was rechecked on the current server and did not
      reproduce; do not retain it as a current browser blocker. Keep the historical failure visible
      only as an audit note if needed, not as the current status.

## 16. Release closure audit (2026-08-09)

- [~] Release train inventory currently covers 31 `TC-FST` IDs (28 required, 3 deferred) and 15
  `RP-FST` IDs (12 required, 3 deferred), but required rows do not yet have complete
  `closureRecordId`, backend/audit joins, screenshot provenance, and independent review records.
- [~] `docs/12-evidence/test-matrix.json` and `implementation-plan.json` are legacy schemas and
  both fail the current release validator with `manifest_invalid`; they must not be relabeled as
  the new release manifest.
- [ ] Do not generate synthetic closure/artifact IDs. The machine-readable release manifest can be
      frozen only after real artifact production, ownership assignment, and coordinator approval.
- [~] Migration/schema gate remains open: two migrations are pending and schema-dump approval/
  checksum reconciliation is not complete. WP-26F/WP-27A/WP-27B therefore remain open.

## 17. Search V2 bounded accessibility slice (2026-08-09)

- [x] Added `aria-pressed` state semantics to Search Center domain and field filter controls in
      `inertia/apps/shared/search/components/search_filters.svelte`.
- [x] Added a focused component assertion covering active/inactive domain and field controls;
      Search page suite is now `10/10`.
- [x] Extended the existing authenticated browser fixture (without duplicating q-only submission)
      to assert the real Search Center filter region exposes the active `All` state, transitions
      to the `Tasks` state through the UI, and preserves the state after the real Inertia route
      navigation. Chromium role-play observed `1/1` before the current webserver import failure;
      the fresh rerun is blocked before test execution.
- [~] This closes only filter-control semantics and one real route transition. It does not close
  runtime axe, keyboard traversal across the complete page, screen-reader review, combined
  Discovery UI transport, cursor UI, cancellation/order races, or the aggregate WP-17/RP-FST-02.

## 19. Search V2 task vertical page/cursor adoption slice (2026-08-09)

- [x] Added a focused Search Page request contract for an opaque cursor (trimmed, bounded to the
      provider contract, and rejected when malformed) without exposing provider DSL or decoding it
      in the frontend.
- [x] The Search Page now routes `type=task` requests with no field label through the canonical task
      Discovery vertical. It selects `tasks.discovery.public` without a current organization and
      `tasks.discovery.member` inside an organization, preserving server-owned authorization
      composition. q-only and intentionally empty task browse requests are both supported.
- [x] The task page forwards the opaque cursor, projects only server-owned Discovery presentation,
      keeps a compatibility-shaped Inertia envelope for existing summary props, and renders an
      accessible next-page action whose URL retains the task scope and cursor.
- [x] RED/GREEN evidence: task page controller `3/3`, cursor mapper `3/3`, existing all-domain
      Discovery page controller `3/3`, Search UI/shell `14/14`; real task Discovery integration
      `9/9` (filter-only multi-label, exact facets, complete totals, cursor page two, and stale/
      expired cursor diagnostics); targeted ESLint, typecheck (`tsc` plus Svelte-check `0/0`), and
      `git diff --check` pass.
- [~] WP-16/WP-17 remain partial: this adopts only the task vertical's page bridge. Structured
  filter controls/criteria, all-domain blended structured Discovery, cancellation/order races,
  full browser/axe/keyboard evidence, and release artifact joins remain open. No WP-18, WP-24B,
  taxonomy, or release status was promoted by this slice.

## 19. Search Page cursor bridge slice (2026-08-09)

- [x] Search Page request mapping trims and validates opaque cursors up to 8,192 characters,
      rejects malformed values, and forwards valid cursors into the canonical Discovery criteria.
- [x] Search Center exposes an accessible Next-page action and preserves the cursor in the
      shell-aware shareable URL. Targeted evidence: request mapper `3/3`, task Discovery controller
      `2/2`, migration controller `3/3`, and combined Search Center/shell UI `14/14`.
- [x] Targeted ESLint, Prettier, and `git diff --check` pass.
- [~] No fresh browser journey currently proves clicking Next against a real Discovery response,
  previous-cursor behavior, tamper/expiry recovery through UI, or screenshot/backend joins.
  Cursor-related matrix/RP rows and WP-17/WP-18 therefore remain partial.

## 20. Saved-view membership revocation and marketplace Any/All slices (2026-08-09)

- [x] WP-18 bounded security slice: sharing an organization grant now re-checks the actor's
      current approved membership instead of trusting a stale `principal.organizationId`. RED was
      reproduced, then the authorization fix passed saved-view security `4/4` and the existing
      saved-view integration regression `8/8`; targeted ESLint passed.
- [x] WP-24B bounded marketplace slice: skill filters now carry server-owned `skill_match` (`any`
      or `all`) semantics through request mapping, task query, SQL relation predicates, cache-key
      separation, page props, and the multi-select UI. Targeted mapper `5/5`, task query `9/9`,
      Marketplace component `4/4`, and marketplace route integration `32/32` pass.
- [x] Targeted ESLint, Svelte-check (`0 errors/0 warnings`), Prettier for changed TypeScript, and
      `git diff --check` pass for these slices.
- [~] WP-18 still lacks conflict/share/repair browser journeys, audit/screenshot joins and full
  release evidence. WP-24B still lacks full indexed authority/parity, browser/AX/performance
  evidence, and complete migration/cutover proof. The three original blockers were repaired
  with minimal setup/import/transaction-constructor fixes and the two affected integration
  files pass `4/4`; a later pre-existing Skills/Talent relocation wave currently makes the
  repository-wide `tsc` red on missing moved-module paths, so no aggregate gate is promoted.

## 21. Privacy-safe observability bounded slice (2026-08-09)

- [x] Added a versioned `filter-observability.v1` event contract and factory that records bounded
      correlation/version/latency/result/lifecycle metadata, hashes canonical criteria, derives
      outcome, and keeps metric dimensions low-cardinality.
- [x] RED/GREEN evidence: the dedicated Japa unit suite passes `4/4`; redaction assertions cover
      raw query/criteria values, aliases, cursors, provider DSL, hidden/protected values, result
      bodies, prompts, secrets, control characters, and nested causes. Targeted ESLint and
      `git diff --check` pass.
- [~] WP-26A remains partial: the factory is not yet wired into filter runtime/logger emission,
  and integration/log-fixture, sampling/cardinality policy, audit and release evidence remain
  open. No observability or release gate is promoted from this bounded unit slice.

## 22. Observability runtime wiring and Talent discovery foundation (2026-08-09)

- [x] WP-26A bounded runtime wiring now supplies an optional `FilterObservabilitySink` with a no-op
      default. `ExecuteFilterQuery` emits factory-built redacted events for success, degraded/partial,
      and failure outcomes; sink/factory failures are best-effort and cannot alter query semantics.
- [x] RED/GREEN evidence reported by the bounded worker: observability `3/3`, existing ExecuteFilter
      Query regression `13/13`, targeted ESLint/Prettier and `git diff --check` pass. A local
      `exactOptionalPropertyTypes` failure in the failure path was corrected by omitting an undefined
      definition property rather than widening the contract.
- [~] WP-26A still lacks runtime logger integration, sampling/cardinality policy, integration/log
  fixtures, audit joins and release evidence; no aggregate gate is promoted.
- [x] WP-24C bounded Talent foundation adds explicit indexed bindings for secondary metadata,
      public anonymous context/cursor capabilities, active+searchable permission predicates,
      allowlisted hit mapping, and a real `searchPublicApi` executor/index wiring path; its targeted
      contract suite passes `8/8` across context denial, permission, mapping, strict index mapping,
      executor compatibility, and wiring cases.
- [~] WP-24C is not closed: the current worktree's Skills/Taxonomy/Marketplace relocation prevents
  a fresh Japa boot (`notification_feed_composition.js`/moved adapter module missing), and no
  real Talent Elasticsearch route, facet/cursor integration, browser/AX or release evidence is
  established. The Talent bindings remain `[~]`, not `[x]`.

## 23. Talent Elasticsearch integration and correctness foundation (2026-08-09)

- [x] Talent permission bindings were corrected after the first real integration exposed a
      fail-closed `FILTER_PERMISSION_INVALID`: server-owned active/searchable fields now have
      internal boolean bindings while remaining absent from selectable context fields.
- [x] Real Elasticsearch Talent discovery integration passes `7/7` with filter-only secondary
      metadata, exact selected facet/total semantics, exclusion from hits/totals/facets for
      inactive/non-searchable records, opaque cursor page two, and stale/expired diagnostics.
      Targeted Talent unit/integration ESLint and `git diff --check` pass.
- [~] WP-24C remains partial: no browser/AX/fairness/privacy role-play, projection rebuild/cutover,
  performance evidence or release artifact joins exist.
- [x] WP-26B bounded correctness foundation passes unit metrics `4/4` plus leakage contract `2/2`;
      deterministic fixtures cover anonymous/user/org visibility, exact eligible IDs/facets,
      secondary-label recall, approximate-total relation honesty and hidden-ID leakage detection.
- [~] WP-26B remains partial because SQL/reference/Elasticsearch differential execution, repeated
  randomized runs, full metadata-recall corpus and release evidence are not yet wired.

## 24. Differential and role-play gate audit (2026-08-09)

- [x] WP-26B bounded reference↔Elasticsearch differential slice now has a shared test-only harness
      and passes `1/1` against a real Elasticsearch index. It proves exact eligible IDs, exact
      facets/totals and secondary-label parity for anonymous and organization principals; targeted
      package verification totals `19/19`, targeted ESLint and `git diff --check` pass.
- [~] WP-26B remains partial because no SQL-equivalent executor/differential run, randomized
  repeated corpus, full metadata-recall/leakage matrix or release evidence is present.
- [~] WP-24C Talent role-play adds a real UI action, Inertia response/backend-consequence assertion,
  and evidence capture-after-assertion helper. The first legacy offset-directory journey is
  bounded; the canonical cursor/secondary metadata journey remains an explicit RED blocker.
  Playwright server boot is currently blocked by malformed imports from the unrelated relocation
  wave, so no screenshot or browser pass is claimed.

## 25. Observability sampling and production sink bounded slice (2026-08-09)

- [x] Added an explicit sampling policy: failure and timeout events are never sampled out; success and
      degraded events use a deterministic rate in `[0, 1]`, with invalid rates/random values rejected.
- [x] Added an explicit log-payload allowlist. Structured logs retain bounded correlation/version/result/
      status/hash metadata but do not spread the event object or copy criteria, cursor, provider DSL,
      hidden values, or result payload fields.
- [x] Injected the shared logger sink into the composed admin, task-discovery, and talent-discovery
      `ExecuteFilterQuery` instances. Sink/logger failure remains best-effort and cannot alter query
      semantics through the existing runtime boundary.
- [x] Fresh targeted RED/GREEN evidence: the combined observability unit command passes `13/13`, covering
      factory redaction, runtime success/degraded/failure events, sampling invariants, allowlisted log
      payload, and logger sink behavior. Targeted ESLint, Prettier, and `git diff --check` pass.
- [~] WP-26A remains partial: no real composed route/integration log fixture, audit-log join, complete
  taxonomy/projection/ranking/session/trace lifecycle population, full nested-schema hardening, or
  release manifest/owner evidence has been established. No aggregate release gate is promoted.

## 26. Saved-view serial verification audit (2026-08-09)

- [x] Re-ran the saved-view contract suite in isolation after a deliberately parallel contract+
      integration run produced contaminated failures. The isolated HTTP contract is GREEN at `10/10`.
- [x] Re-ran the saved-view integration package serially (security plus persistence/mutation suites);
      it is GREEN at `12/12`, including optimistic locking, independent semantic/presentation patches,
      transactional grants, membership revocation, inaccessible/private views, alert repair state, and
      no-result-snapshot persistence checks.
- [x] Classified the earlier `9/10` contract and `1/12` integration failures as verification-harness
      contamination: two Japa processes shared the same test database/server while both executed setup
      and cleanup. No production fix was made from that false signal.
- [~] WP-18 remains partial: browser create/share/conflict/repair journeys, clean-session shared-view
  evidence, full HTTP mutation/idempotency matrix, audit/screenshot joins, and release evidence are
  still absent. Unit/integration GREEN does not promote the saved-view aggregate to `[x]`.

## 27. SQL pilot serial verification audit (2026-08-09)

- [x] Fresh serial targeted verification passes `19/19`: audit context unit `4/4`, SQL compiler unit
      `5/5`, PostgreSQL executor integration `4/4`, SQL/reference differential contract `4/4`, and
      capability/authorization conformance contract `2/2`.
- [x] The evidence covers exact full totals/facets, missing actors, inclusive date boundaries, stable
      ties, nested Boolean/exclusion parity, authorization denial/expiry/failure/revocation, bound
      malicious values, and redacted JSON/network/user-agent non-recovery.
- [~] WP-10 remains partial exactly as specified: the shared WP-08 conformance fixture still demands
  unsupported preference/relation capabilities, no browser/visual/AX role-play or release evidence
  is present, and the legacy audit route is intentionally not changed by this pilot.

## 28. Shared filter UI serial verification audit (2026-08-09)

- [x] Fresh targeted Vitest run of `inertia/apps/shared/filtering/tests` passes `14/14` files and
      `77/77` tests with one worker. This covers shared state/reactivity, URL codec/navigation,
      primitives, drawer behavior, accessibility assertions, expression builder, alerts and saved-view
      client/state behavior.
- [~] WP-11/WP-06 remain partial: this is component/state evidence only; browser keyboard/screen-reader
  journeys, mobile focus trap, live-region sequence, visual review and consumer-shell integration
  remain unproven. No master role-play or release row is promoted from Vitest alone.

## 29. Bounded WP-11A / WP-16-UI-A keyboard and semantic contract (2026-08-09)

- [x] Added the disjoint frontend contract suite
      `inertia/apps/shared/filtering/tests/wp11a_wp16_ui_accessibility.test.ts` with seven cases:
      combobox Arrow/Home/End/Enter/Escape navigation, combobox/listbox ID relationship, drawer
      Escape and async-Apply focus restoration, live-region loading/partial/error transitions,
      Search Center pressed filter state, opaque next cursor navigation, and no-result announcement.
- [x] TDD RED was observed after the full batch was written: `6/7` passed and the intended failure
      showed Search Center no-result content had no status/live-region semantics. The initial locator
      mismatch was corrected in the test before treating the remaining failure as product RED.
- [x] After the bounded `SearchCenter` change, the combined targeted frontend run passed `9 files / 47
  tests`; this includes the new batch plus existing shared filtering, drawer, lifecycle, Search
      Center and user/org combobox suites. No Adonis route was booted and no full suite was run.
- [x] Targeted ESLint and `git diff --check` pass. Prettier passes for the new TypeScript test;
      Prettier cannot parse the touched `.svelte` file because this repository currently lacks a
      Svelte Prettier parser/plugin, so that check is explicitly not claimed as green.
- [~] WP-11/WP-16 remain aggregate partial: this bounded jsdom semantic evidence does not prove
  browser Tab traversal, real accessibility-tree/AT behavior, axe, 320/390px or 200/400% zoom,
  RTL/long-label layout, cancellation/order races, cross-shell composition, visual regression,
  or release/audit joins.

## 30. Current cross-layer and release audit (2026-08-09)

- [x] The bounded WP-11A/WP-16-UI-A wave is verified at the intended layer: seven-case TDD batch
      reached `7/7`, and the combined targeted frontend regression reached `9 files / 47 tests`.
      Targeted ESLint, TypeScript Prettier and `git diff --check` passed; Svelte Prettier remains
      unavailable because this repository lacks the required parser/plugin.
- [x] Fresh role-play execution booted the application and passed `3/4` marketplace/search-center
      journeys. The remaining Search Center journey failed in seed setup; subsequent serial boot
      checks exposed stale/missing imports in the concurrent organization/sprint relocation wave.
      This is recorded as an environment/integration blocker, not as UI feature evidence.
- [~] Organization relocation still has seven stale import paths and an independent unresolved
  `move_task_to_sprint_command.js` boot dependency; these shared changes must stabilize before
  rerunning the browser gate. No full suite or full lint was run.
- [ ] WP-26F release closure is not complete: the available legacy JSON inputs are `manifest_invalid`,
      no complete machine-readable release manifest/artifact-owner/closure record is present, and
      frozen hashes for the plan/matrix/surface inventory require an explicit re-freeze decision.
- [~] WP-26E, release registry, WP-11 and WP-16 remain aggregate partial. Missing evidence includes
  browser AX/AT/axe, visual/mobile/zoom/RTL, cross-shell composition, cancellation/order races,
  audit/reviewer joins and release artifacts.

## 31. Taxonomy revision and real role-play recovery slice (2026-08-09)

- [x] Root-caused the Search seed `500 E_INTERNAL_ERROR` to `LucidTaxonomyVersionReader`: the
      skills registry owns `category_fingerprint`, while the reader selected/validated the unrelated
      `source_fingerprint` field. The reader now aliases each registry's owned fingerprint to one
      internal field without inventing versions.
- [x] Added the skills-registry integration regression and verified the taxonomy reader suite `5/5`.
      The focused marketplace seed contract now passes `4/4`, proving the real seed can reindex a
      task without an application.
- [x] Search Center q-only browser role-play passes `1/1` after the taxonomy fix, including the
      seeded result and visible Search Center journey.
- [x] Fixed the shared mobile drawer width boundary (`box-sizing`, viewport max-width and body
      min-inline-size) after the browser role-play exposed real horizontal overflow; the isolated
      mobile drawer role-play passes `1/1`.
- [~] The combined four-case browser batch still has an Apply-path failure: the second mobile Apply
  request produces a global error toast that intercepts the button. A direct server-rendered
  `difficulty=easy` contract has been added but awaits a stable run because the concurrent admin
  relocation keeps changing import paths during server startup. No force-click or silent fallback
  is accepted as closure evidence.
- [~] WP-11/WP-16 remain aggregate partial: browser evidence is improving but visual, AX/AT/axe,
  full cross-shell, mobile/zoom/RTL and release joins are not complete.

## 32. Browser role-play correction and release audit refresh (2026-08-09)

- [x] Re-ran the focused browser batch serially after the taxonomy reader and mobile drawer fixes:
      marketplace keyword, mobile staged Apply/Cancel, browser Back, and Search Center q-only all
      pass (`4/4`). The mobile Apply case dismisses the expected anonymous-shell authentication toast
      before clicking; it does not use `force` and still asserts the server-rendered `difficulty=easy`
      URL.
- [x] `node ace list` boots successfully at the verification point; targeted backend contracts remain
      green: taxonomy reader `5/5`, marketplace seed safety `4/4`, and the combined backend batch
      `42/42` (including marketplace routes `33/33`).
- [~] The browser result improves the cross-layer evidence but does not close WP-11/WP-16: AX/AT/axe,
  visual review, zoom/RTL, cross-shell composition, cancellation/order races and release joins are
  still missing.
- [~] WP-26E remains partial: validator unit suite is `16/16`, but the release registry lacks complete
  manifest/artifact-owner/closure/reviewer joins and the required accessibility/visual evidence.
- [ ] WP-26F remains open: both legacy JSON inputs are `manifest_invalid`; no approved machine-readable
      release closure or frozen-hash re-freeze has been evidenced.

## 33. Real filter observability runtime fixture (2026-08-09)

- [x] Added a serial integration fixture at
      `app/modules/filtering/tests/backend/integration/filter_observability_runtime.spec.ts` that
      exercises the real authenticated HTTP route, PostgreSQL executor, composed logger sink, and
      process logger through an in-memory `LoggerSink`.
- [x] The fixture covers a real success and a real invalid-field failure: integration `2/2`, with
      schema/event-name/level assertions, criteria hash shape, no raw criteria/provider DSL/result
      body, and redacted failure diagnostics. The intended RED was observed first when logger
      sanitization serialized `cause_count` as a string; the assertion now documents that transport
      contract.
- [x] Existing observability unit regression remains green at `6/6`; targeted ESLint and
      `git diff --check` pass for the new fixture.
- [~] WP-26A remains aggregate partial: taxonomy/projection/ranking version population, trace/session
      propagation, audit-log persistence/join, retention/operational review and release artifact
      ownership are still absent. This fixture closes only the runtime HTTP→executor→logger layer.

## 34. Saved-view capability gating correction (2026-08-09)

- [x] Added a RED contract proving that a context with `sharedViews: false` and `alerts: false` must
      not expose Share or Alert actions from the shared Saved View menu. The initial focused run was
      `6/7` with the intended alert-button failure.
- [x] Added explicit optional capability inputs to `SavedViewMenu`; sharing now also respects the
      saved view's `canShare` flag, and alert status/dialog controls are omitted when alerts are not
      supported. Admin Audit now passes both capabilities as disabled.
- [x] Focused UI verification is green: alert/menu plus Admin Audit component suites `10/10`, saved
      view client/state suite `5/5`, targeted ESLint and `git diff --check` pass.
- [~] WP-18 remains partial: private save/list/select/apply browser round-trip, presentation
      application, conflict/repair, clean-session evidence, audit/screenshot joins and release
      ownership are still unproven. The production capability contradiction is corrected, but no
      browser closure is claimed from component tests alone.

## 35. Admin Audit saved-view context alignment (2026-08-09)

- [x] Added a focused RED assertion that the Admin Audit Saved View client must list views under
      the backend-owned `audit.admin.investigation` context. The pre-fix request used the UI-only
      `admin.audit_logs` key and therefore could not round-trip through the registered context.
- [x] Corrected both the saved-view `contextKey` and `FilterCriteria.context` in the Admin Audit
      page to the canonical backend key. No provider or persistence fallback was invented.
- [x] Focused UI regression is green: Admin Audit, Saved View alert/capability, and client/state
      suites pass `16/16`; targeted ESLint and `git diff --check` pass.
- [~] WP-18 remains partial: a real browser save/list/select/apply journey, presentation-state
      application, conflict/repair and audit/release joins still require separate evidence.

## 36. Release and browser closure audit refresh (2026-08-09)

- [~] WP-18 capability/context defects are corrected and focused UI evidence is green, but no new
      browser save/list/select/apply artifact was produced in this wave. Presentation, conflict,
      repair and clean-session evidence remain `[~]`/open.
- [x] Release validator bounded logic remains green at `17/17` focused tests; this proves validator
      behavior only, not release readiness.
- [ ] WP-26F remains open: neither legacy JSON input is a valid current manifest, and no real
      `closureRecordId`, artifact ownership, backend/audit join, screenshot provenance, reviewer
      sign-off or approved immutable hash handoff exists.
- [ ] WP-27A remains open: dedicated composition/route registration tests and clean/upgrade migration
      rehearsal evidence are not present. No synthetic release IDs are introduced.

## 37. WP-27A route registration bounded slice (2026-08-09)

- [x] Added `tests/integration/filter_search_route_registration.spec.ts` as an executable merged-app
      route smoke. It proves anonymous denial and authorized reachability for the canonical Admin
      Filter context, saved-view listing, and Filter query → PostgreSQL executor, plus malformed
      Search Discovery reaching its controller boundary.
- [x] Focused integration verification passes `4/4`; targeted ESLint and `git diff --check` pass.
- [x] Corrected an evidence trap in the claim card: the planned `tests/backend/integration` path is
      not included by `bin/test.ts`'s integration glob and produced `NO TESTS EXECUTED`; the runnable
      test lives under `tests/integration` instead. No silent non-executed evidence is counted.
- [~] WP-27A remains partial: full selected-route/shell composition, feature-flag disabled defaults,
      migration checksum/clean-upgrade rehearsal, i18n/build checks and RP surface smoke are still
      open.

## 38. WP-24C organization Talent context bounded slice (2026-08-09)

- [x] Ran GitNexus impact for `TalentDiscoveryFilterContextProvider`,
      `TalentDiscoveryPermissionProvider`, `SearchDiscoveryQuery`, `OrgTalentsPageController`,
      `GetRecruitingTalentDirectoryWorkspaceQuery`, and `PostgresTalentDirectoryPageReader`; all
      returned MEDIUM risk, with no HIGH/CRITICAL result.
- [x] Added `talents.discovery.organization` as a separate canonical context. It requires a
      non-empty user ID, organization ID, and server-resolved `org_owner` or `org_admin` role;
      `org_member` remains denied to match the existing recruiting-directory policy. This was
      tightened after audit found that accepting `org_member` would widen the direct API beyond
      the current `/org/talents` access policy.
- [x] Added a distinct organization authorization version while preserving the mandatory
      `active` + `searchable` fail-closed privacy constraint and hiding permission fields from
      caller-selectable fields.
- [~] TDD RED/GREEN evidence before the authorization tightening was context/permission unit
      `9/9` and real Elasticsearch application integration `6/6`, including organization
      principal, exact total, facet, opaque cursor, and exclusion from hits/diagnostics of private,
      inactive, and non-searchable records. The tightened owner/admin-only rerun is currently
      blocked by concurrent relocation imports outside this slice; targeted ESLint and
      `git diff --check` pass.
- [~] WP-24C remains aggregate partial. `/org/talents` still uses SQL offset pagination and
      hard-coded controls; its seed does not yet reindex canonical Talent documents; workspace/UI
      mapping, HTTP/Inertia response, component behavior, browser role-play, fairness/privacy
      evidence and release joins remain open. This slice does not claim that migration.

## 39. WP-24C canonical Talent pre-wiring mapper slice (2026-08-09)

- [x] Added `talent_discovery_request_builder.ts` to translate the supported legacy recruiter
      inputs into the canonical organization Talent context: text, multi-value skills/domains/
      task-types/problem-categories/technologies, trust/completed thresholds, explicit supported
      sorts, facets, and opaque cursors.
- [x] Unsupported legacy controls (`task_id`, skill categories, role/domain tags, saved state,
      name sort, and page offsets without a cursor) fail explicitly instead of being silently
      dropped. This preserves an honest migration boundary while the index contract is incomplete.
- [x] Added `SearchTalentDiscoveryReaderAdapter` with server-resolved owner/admin validation;
      anonymous, org member, and missing-organization contexts fail before the Search API is
      called.
- [~] TDD verification was green for the new slice at `5/5` before the final explicit-relevance
      rejection assertion was added. The current mapper and adapter smoke imports pass, targeted
      ESLint and `git diff --check` pass, but the exact Japa batch rerun is currently blocked by a
      concurrent Filter Saved View relocation import. Existing real Talent Elasticsearch application
      evidence remains `6/6` after the owner/admin fixture correction.
- [~] This is pre-wiring only. No controller/composition/UI/seed change has been made yet;
      `/org/talents` remains SQL offset-based and the HTTP/server-session Talent route, Inertia
      cursor response, component/browser privacy/fairness evidence and release joins remain open.

## 40. Search Discovery Filter error boundary correction (2026-08-09)

- [x] Ran GitNexus impact for `SearchDiscoveryApiController` (MEDIUM, 5 callers) before editing.
- [x] Search Discovery now maps `FilterContextResolutionError` and
      `FilterExecutionError('FILTER_CONTEXT_UNAVAILABLE')` through the shared filter HTTP problem
      boundary, returning the indistinguishable unauthorized response instead of leaking an
      internal 500 for an unauthorized Talent organization context.
- [~] Added the controller unit assertion and a direct controller smoke check; targeted ESLint and
      `git diff --check` pass. The standard Japa rerun remains blocked by the concurrent relocation
      wave currently removing/moving the Saved Filter View domain import.
- [~] This closes only the HTTP error boundary. It does not prove authenticated owner/admin Talent
      HTTP success, member denial through the real session resolver, Elasticsearch HTTP response,
      Inertia migration, or browser privacy evidence.

## 41. WP-24C Talent outbound seam (2026-08-09)

- [x] Added the explicit `TalentDiscoveryReader` outbound port and `TalentDiscoveryReaderInput`
      contract so the pre-wiring adapter has a stable application seam instead of an implicit
      concrete dependency.
- [x] Adapter now implements the port, preserves the server-resolved `HttpActionContext`, and
      targeted ESLint plus `git diff --check` pass for the port, adapter, and Search Discovery
      error-boundary slice.
- [~] This is still a seam-only change: factory composition, `/org/talents` controller/Inertia
      response, seed reindex, HTTP session role-play, browser privacy/fairness and release joins
      remain open. No completion claim is made for WP-24C.

## 42. Verification boundary after relocation wave (2026-08-09)

- [x] Re-ran the bounded static checks and a direct mapper/adapter smoke after the outbound-port
      change; both succeeded. The smoke asserts the canonical organization context and preservation
      of the server-resolved execution context.
- [~] The requested Japa batch cannot boot in the current worktree because unrelated relocation
      imports resolve to missing generated modules, currently including
      `app/modules/skills/actions/queries/get_active_skills_query.js` (the source exists under
      `skill-catalog`) and a moved Search Discovery query path. This is recorded as blocked
      verification, not a passing test result.
- [ ] No full test, full lint, release validation or hash re-freeze is attempted until the import
      topology is stable.

## 43. WP-24C canonical Talent HTTP role matrix and executor capability fix (2026-08-09)

- [x] Added `tests/integration/talent_search_discovery_http_role_matrix.spec.ts`, which creates a
      real Talent index fixture and exercises the canonical Search Discovery route through the
      real session/org resolver for owner, admin, member, anonymous, and missing-organization
      cases.
- [x] Found and fixed a real composition defect: `talentDiscoveryExecutor` omitted
      `TALENT_SEARCH_DISCOVERY_TEXT_FIELDS`, causing `FILTER_EXECUTOR_CAPABILITY_MISMATCH` for
      authenticated Talent requests even though the direct application integration was green.
- [x] Targeted layered verification passes `9/9`: Talent application privacy/facet/total/cursor
      integration `6/6` plus real HTTP role matrix `3/3`; targeted ESLint and `git diff --check`
      pass for the changed composition and test.
- [~] This proves the canonical Search HTTP boundary, not the `/org/talents` Inertia migration.
      Factory/controller wiring, Inertia cursor payload, UI component/browser role-play, seed
      reindex, fairness/visual/accessibility and release joins remain open.

## 44. WP-24C layered seam verification refresh (2026-08-09)

- [x] Focused unit batch passes `9/9`: request builder `3/3`, reader adapter `2/2`, and Search
      Discovery controller/error boundary `4/4`.
- [x] Focused integration batch passes `9/9`: canonical Talent application privacy/facet/total/
      cursor cases `6/6` and real HTTP session role matrix `3/3`.
- [~] The evidence now covers unit → composition → Elasticsearch application → HTTP/session, but
      the requested `/org/talents` controller/Inertia/UI/browser path is still not wired and no
      full-suite or release closure claim is made.

## 45. WP-24C `/org/talents` canonical server and cursor UI slice (2026-08-09)

- [x] Added `GetRecruitingTalentDiscoveryPageQuery` with a focused unit contract. It strips
      unsupported legacy controls, preserves the server-resolved context and opaque cursor, maps
      canonical hits/facets/search/authority into the Inertia view model, and provides explicit
      cursor pagination metadata.
- [x] Wired the query through `UserTalentQueryFactory`, composition, and
      `OrgTalentsPageController`; the real Inertia route now returns `pagination.mode = 'cursor'`,
      canonical `search`, and `authority` metadata. Targeted route integration remains green.
- [x] Updated the Talent component to use cursor pagination and to send only canonical filters in
      cursor mode; legacy offset consumers remain supported during the transition. Component
      suite passes `14/14`; `svelte-check` reports `0 errors/0 warnings`.
- [x] Synchronized the Talent context sort capability with the mapper (`trustScore` and
      `completedTasks`) and verified its unit contract `4/4` plus HTTP/Inertia `4/4`.
- [~] Browser role-play could not start because the configured web server command resolves to the
      missing `bin/server.js` in the relocation-dirty worktree. Browser artifact, seed/reindex
      proof, bookmark/explainability joins, accessibility/visual review and release joins remain
      open; no browser pass is claimed.

## 46. Current verification topology correction (2026-08-09)

- [x] The focused component verification remains current: Talent UI `14/14`, targeted ESLint and
      `git diff --check` pass; `svelte-check` completed with `0 errors/0 warnings`.
- [~] A fresh backend rerun is currently blocked before test setup by relocation imports, now
      including `app/modules/http/controllers/search-discovery/search-discovery/admin_search_projection_controller.js`;
      earlier bounded HTTP/Inertia `4/4` evidence is retained as bounded evidence, not promoted
      to a clean-worktree/full-suite claim.
- [ ] Full backend, browser, release validator and hash/reviewer closure remain intentionally
      deferred until relocation topology is stable.

## 47. Verification refresh: controller recovery, server boot and seed indexing (2026-08-09)

- [x] Recovered the missing `AdminSearchProjectionController` implementation that the relocation
      wave had replaced with a self-referential proxy. Its focused unit contract passes `7/7`,
      including authorization, inventory page mapping, cleanup/rollback/activation fencing and
      unsupported-operation fail-closed behavior.
- [x] Updated the configured `start` command to use the existing `bin/server.ts` entrypoint;
      a bounded boot check reached `started HTTP server on 0.0.0.0:3333`.
- [x] Updated the E2E seed route to reindex the created Talent after persistence, so the canonical
      Talent executor can validate real mappings instead of receiving an empty/unmapped index.
- [~] The first complete browser run exposed the pre-fix unmapped-index failure; a subsequent
      browser rerun was interrupted before a final reporter result was emitted. Browser success,
      privacy/fairness assertions, accessibility/visual evidence and release joins therefore remain
      unverified.
- [ ] Full backend, full lint, browser closure, `gitnexus detect-changes` and final reviewer/hash
      closure remain pending; no aggregate completion claim is made.

## 48. Fresh audit: canonical Inertia filter remains red (2026-08-09)

- [x] The E2E Talent index now reports all required `field_caps` after the test-owned reset and
      seed reindex; the historical unmapped-index failure is no longer the current diagnosis.
- [x] Browser startup and initial `/org/talents` render are operational. The focused role-play
      reaches the visible directory and exposes the canonical page state.
- [~] Canonical Inertia navigation with `business_domain=fintech` still returns HTTP `500`.
      Raw Search Discovery HTTP role cases pass, so the remaining failure is specifically in the
      Inertia/server projection path; the current error boundary exposes only a generic payload.
- [~] The role-play is now self-seeding per case and expects canonical cursor metadata, but its
      final browser pass remains unproven until the Inertia 500 is fixed.
- [~] The focused role matrix currently passes `3/5`: three HTTP role cases pass while the two
      Inertia assertions fail. The fixture now uses an owned generation name.
- [ ] Normal production build still fails on unrelated relocation imports; the ignore-errors build
      is diagnostic only. Full backend, lint, browser, release and reviewer closure remain open.

## 49. Boot repair continuation: relocation chain still incomplete (2026-08-09)

- [~] Focused backend runner progressed through authorization, accomplishments, reviews, Adonis
      providers and Redis configuration after bounded path repairs, but still stops before test
      setup on the self-referential `user_application_composition` relocation shim.
- [x] The failure is recorded as topology/boot evidence, not misclassified as a Talent search
      or Inertia behavior result.
- [ ] Fresh Inertia filter verification, browser role-play, full checks and release closure remain
      pending until the boot chain is loadable.

## 50. Boot repair continuation: Saved Filter repository implementation missing (2026-08-09)

- [x] Focused runner advanced past the earlier user/review/task/taxonomy/search/settings/admin
      relocation failures after bounded path and implementation recovery.
- [~] Boot now stops at the Saved Filter repository: both
      `app/modules/filtering/infra/repositories/postgres_filter_saved_view_repository.ts` and
      its `saved-filter-views/` counterpart are proxy remnants without a concrete repository
      implementation.
- [ ] Do not mark filtering or Talent route behavior green until the real repository is restored,
      then rerun the focused backend and Inertia checks.

## 51. Boot audit refinement: Saved Filter authorization is also proxy-only (2026-08-09)

- [x] The focused runner now reaches module instantiation rather than failing on earlier import
      resolution errors.
- [~] Both Saved Filter repository and Saved Filter authorization canonical paths currently
      resolve only to compatibility proxies; neither exposes the concrete runtime class required
      by filtering composition.
- [ ] Filtering composition, Inertia Talent navigation and the full verification gate remain
      unverified until those concrete implementations are restored.

## 52. Corrective verification: Talent Inertia/browser slice is green (2026-08-09)

- [x] Restored concrete Saved Filter repository/authorization paths; focused Saved Filter domain
      `11/11`, alert authorization `1/1` and security integration `4/4` pass.
- [x] Fixed the `/org/talents` relocation/import chain by registering the concrete recruiting
      access query and directory-options query in the Users application provider.
- [x] Fixed canonical request construction for a single taxonomy condition: a one-child `and`
      group was invalid under the filter contract and is now emitted as a direct condition.
- [x] Layered Talent verification is green: request-builder unit `4/4`, real HTTP/Inertia role
      matrix `5/5`, and Playwright Chromium roleplay `2/2`.
- [~] Browser startup on an isolated port still logs a separate seed relocation error for
      `commands/seed_data.ts` → missing `app/modules/cache/infra/redis_cache_store.js`; the
      browser roleplay nevertheless completed `2/2`. This is recorded as topology debt, not a
      release-pass claim.
- [ ] Full backend, full lint, production build, release validator, accessibility/visual matrix,
      artifact/hash and reviewer joins remain pending.

## 53. Corrective topology verification: rebuilt E2E artifact and serialized seed (2026-08-09)

- [x] Regenerated the E2E build artifact with `node ace build --ignore-ts-errors`; the emitted
      `build/commands/seed_data.js` now points to the relocated cache-runtime Redis adapter.
- [x] Made `/api/testing/seed-e2e` serialize the one-time Talent index reset so concurrent seed
      requests cannot reset the shared test index in parallel.
- [x] Reran the focused Chromium roleplay after the topology fix: `2/2` passed, with no stale
      Redis cache import error.
- [~] This proves only the bounded Talent route and test-seed slice. The normal production build
      still fails on the wider relocation/type-error backlog.
- [ ] Full backend/lint, clean production build, release manifest, AX/visual, artifact/hash and
      independent reviewer joins remain open.

## 54. Corrective verification: canonical Talent Inertia enrichment and final bounded gates (2026-08-09)

- [x] Fixed the remaining Inertia `500`: synthetic/non-UUID search-hit IDs used by the isolated
      integration fixture are valid discovery identities but cannot be sent to the UUID-only
      public-accomplishment repository; canonical page mapping now skips enrichment for those hits
      instead of failing the whole page.
- [x] Layered Talent verification is green after the fix: canonical query unit `1/1`, recruiting
      Result-boundary unit `3/3`, real HTTP/Inertia role matrix `5/5`, and focused Chromium roleplay
      `2/2`.
- [x] Normal production build is green: `pnpm build` completed successfully after the latest
      controller/query change.
- [ ] Full lint remains red in the wider relocation worktree: configuration lint passed, while
      backend/frontend lint still report unrelated import-order, type/style and existing frontend
      security findings. No global auto-fix was applied.
- [ ] Release validators remain blocked by invalid manifests: both implementation and test-matrix
      manifest checks report that the manifest lacks the required version/release/case structure.
- [ ] Full backend suite, accessibility/visual matrix, release evidence joins, artifact/hash audit
      and independent reviewer sign-off remain open; the bounded Talent slice is not an aggregate
      platform completion claim.

## 55. Corrective verification: leakage metric and live saved-view authorization binding (2026-08-09)

- [x] Closed a real WP-26B scoring defect: exact totals larger than the authorized reference
      population are now rejected instead of being accepted as a valid lower-bound relation.
      Added both a quality-metric regression and a hidden-population exact-total leakage contract.
- [x] Corrected the live filtering composition to bind the organization-aware saved-view
      authorization implementation. A regression now proves a non-member cannot create an
      organization-owned saved view through the actual composition root; the test was red before
      the import correction and green after it.
- [x] Fresh layered bundle passes `16/16`: quality unit `5`, leakage contract `3`, Elasticsearch
      differential integration `1`, observability runtime integration `2`, and saved-view security
      integration `5`.
- [x] `pnpm typecheck` passes, including `svelte-check` with `0` errors and `0` warnings.
- [ ] WP-26B still lacks the full frozen corpus (all required facets/suggestions/recovery/explanation
      permutations, repeated randomized runs and timing/count side-channel evidence); this slice is
      corrective evidence, not aggregate WP-26B closure.
- [ ] Full lint remains red in the wider relocation worktree; release manifest/artifact joins,
      accessibility/visual cross-browser evidence, and independent reviewer closure remain open.

## 56. Corrective verification: alert policy type boundary (2026-08-09)

- [x] Fixed a production TypeScript boundary in `FilterSavedViewsController`: `timezone` belongs
      to the alert command input and is intentionally excluded from its policy input, so it is no
      longer passed into the narrower policy object.
- [x] Filter alert policy unit suite passes `3/3`; normal `pnpm build` completes successfully after
      the correction.
- [x] Targeted ESLint for the corrected controller, composition and quality files passes. Full lint
      remains open only for the wider relocation/frontend backlog, not this corrected boundary.

## 57. Corrective verification: WP-26B leakage integration and role-play evidence identity (2026-08-09)

- [x] Added the previously missing real Elasticsearch permission-leakage integration slice. It
      checks anonymous and organization principals cannot receive a cross-tenant hit, hidden facet
      value, or incorrect exact total; the targeted integration test passes `1/1`.
- [x] Corrected Talent role-play evidence metadata from orphan `RP-FST-24` to the matrix-owned
      `RP-FST-03`; the focused Chromium role-play rerun passes `2/2` after the metadata correction.
- [~] This improves WP-26B and RP-FST-03 evidence, but does not close the full frozen corpus,
      all required role-play journeys, accessibility/visual review or release joins.

## 58. Audit correction: relocation runtime blockers and marketplace layered rerun (2026-08-09)

- [x] Repaired a malformed `start/routes/testing.ts` produced by the active relocation worktree
      (a mapper-path prefix had been prepended to every line), then corrected its relocated mapper
      import. The route file passes a direct syntax check and the marketplace test router compiles.
- [x] Corrected stale marketplace controller mapper imports and the Talent directory mapper imports;
      targeted controller lint passes.
- [x] Marketplace backend rerun improved from `3/33` to `24/33`: listing/filter/search pagination,
      application mutations, match-score APIs and authorization paths pass together.
- [x] Public marketplace listing now uses `optionalActionContextFromHttp`, matching its anonymous
      route contract; the previous authenticated-only context defect was exposed by the layered run.
- [ ] Nine marketplace page/Inertia cases still return `500` (`/marketplace/tasks`, talent/bookmark
      pages, application/review pages); they are not marked complete until the render/runtime cause
      is isolated and verified through backend plus browser tests.
- [ ] Current `pnpm typecheck` is red in the broader relocation worktree with widespread syntax
      errors across relocated files (including controllers/tests outside this slice); therefore no
      build or full-gate pass is claimed from this batch.

## 59. Corrective verification: marketplace, notification and Search Center runtime (2026-08-09)

- [x] Repaired the malformed `FilterAlertWorkCommand` closure and made its abort wait cleanup
      explicit; the previously blocked marketplace server now boots for the focused roleplays.
- [x] Fixed the Talent discovery authorization failure boundary so a member denial becomes the
      intended clean redirect instead of an Inertia `500`. Marketplace backend integration now
      passes `33/33`; the focused marketplace browser roleplay passes `3/3`.
- [x] Fixed relocated notification controller dependency injection and restored the canonical v1
      JSON controller. Notification API standardization contract passes `4/4`.
- [x] Removed the conflicting nested telemetry transport binding and restored controller injection;
      UI-events integration passes `1/1`.
- [x] Combined Chromium rerun for marketplace and Search Center passes `4/4` (`3/3` + `1/1`).
- [x] Targeted ESLint for the changed runtime slice passes.
- [~] A separate Talent adapter unit is still blocked during application boot by additional stale
      relocation imports in organization/search composition; this is topology debt, not evidence
      against the already-green marketplace/Search Center runtime slice.
- [ ] Full backend/lint/typecheck, valid release manifest, AX/visual matrix, artifact/hash joins,
      and independent reviewer sign-off remain open.

## 60. Corrective verification: Talent adapter boot topology (2026-08-09)

- [x] Repaired the remaining stale organization/search composition imports exposed by the
      standalone Talent adapter boot (`OrganizationInfraMapper`, `OrgAccessRepository`, search
      index repositories, and Talent discovery bindings).
- [x] Talent discovery reader adapter unit now passes `2/2`; targeted ESLint for the corrected
      topology files passes.
- [ ] These boot corrections do not change the still-open full backend/typecheck/lint gate,
      release manifest, AX/visual, artifact/hash, or reviewer-join requirements.

## 61. Verification checkpoint: shared filter UI and release audit (2026-08-09)

- [x] Batched shared Filter UI coverage passes `71/71` across 11 Vitest files, including
      accessibility semantics, drawer/navigation lifecycle, URL/state contracts, saved views,
      alerts and expression-builder behavior.
- [x] The authoritative matrix-validator wrapper passes `17/17`, including malformed manifests,
      joins, deferred rows, execution metadata, screenshot provenance and visual-mode invariants.
- [~] Release audit remains open: the current 31 master cases are `0 [x]`, `18 [~]`, `13 [ ]`;
      legacy JSON inputs remain invalid and no approved machine-readable manifest exists.
- [ ] Full backend/typecheck/lint, per-case RP/VS/AUD/SEC/RES/PERF joins, reviewer sign-off and
      hash re-freeze remain required before any aggregate completion claim.

## 63. Accessibility/visual/browser coverage audit (2026-08-09)

- [x] Fresh focused accessibility/component batch passes `23/23` across the shared filter
      accessibility suite, Marketplace staged-filter tests and Search page tests. This is bounded
      semantic/component evidence only; it does not close runtime AX.
- [x] Fresh Chromium run of the four existing FST role-play files passes `7/7` (Talent `2`,
      Marketplace `3`, Search Center `1`, combined Discovery `1`).
- [~] The same four files across Chromium, Firefox, WebKit, mobile Chrome and mobile Safari run
      `35` cases with `16` pass and `19` fail. Chromium had one health-check `ECONNRESET` and one
      mobile drawer horizontal-overflow failure; Firefox reproduced the overflow; mobile Chrome
      exposed missing `filters.business_domain` in the Talent Inertia response and lost opener focus
      after Marketplace Cancel.
- [ ] WebKit/mobile Safari are not executable on this host because Playwright reports missing
      `libavif16`/browser dependencies. This is an environment blocker, not a passing result.
- [ ] No runtime axe scan is available: neither `axe-core` nor `@axe-core/playwright` resolves from
      the project. Existing unit semantics therefore cannot be promoted to the matrix AX gate.
- [ ] Existing screenshots are evidence-only calls to `page.screenshot`; there is no valid release
      manifest, screenshot hash/ACL/reviewer join, approved baseline or visual diff gate. The current
      artifact inventory after the focused rerun contains only
      `test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/talent-filter-only.png`.
- [x] Corrected the Talent E2E screenshot metadata from orphan `rp-fst-24` to matrix-owned
      `rp-fst-03`; the focused Chromium rerun passes `2/2` and targeted ESLint exits `0`.
- [ ] AX/visual/browser aggregate closure remains open until the runtime failures, WebKit
      environment, axe tooling, manifest/baseline/reviewer joins and responsive journeys are
      addressed and rerun.

## 62. Backend master-matrix and full-gate audit (2026-08-09)

Fresh bounded evidence from the current worktree:

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Backend inventory | Filtering `44` specs (`31` unit, `4` contract, `9` integration); Search `72` (`56` unit, `2` contract, `14` integration); Taxonomy `11` (`8` unit, `3` integration) | `[~]` inventory only |
| Master matrix | `31` `TC-FST` rows: `0 [x]`, `18 [~]`, `13 [ ]` | `[~]` |
| Matrix validator | Japa wrapper `17/17` passes | `[x]` bounded |
| Search quality unit | `5/5` passes; provider/differential/security closure is still separate | `[x]` bounded |
| Taxonomy contract path | Direct contract-helper invocation returned `NO TESTS EXECUTED`; taxonomy integration/role-play evidence remains open | `[ ]` |
| Typecheck | `pnpm typecheck` exits `1` with missing relocation modules, malformed tests, unused injected controllers and result-boundary errors | `[ ]` |
| Build | `pnpm build` exits `1` during TypeScript compilation | `[ ]` |
| Backend lint | Backend-rest reports `64` errors; app lint did not reach a green aggregate in the bounded run | `[ ]` |
| Relocation blocker | Backend tests/composition import `#modules/search/infra/adapters/entity-search/*_search_index_repository`, but those files are absent; the relocation tree is concurrently owned/untracked, so no overlapping edit was made | `[~]` blocked |
| Release manifest | Validator returns `manifest_invalid` for `docs/12-evidence/test-matrix.json` | `[ ]` |
| Graph scope | `gitnexus detect-changes`: `changed 301`, `new 120`, `deleted 100` | `[~]` audit |

The missing search repository topology is an actionable backend blocker. It was deliberately not
patched in this pass because the entire search relocation write set is concurrently untracked/deleted
and ownership is not safe to infer. No production file was changed in this audit; no false GREEN claim
is recorded. The bounded green tests remain implementation evidence only.

## 64. Corrective verification: backend layered batch and controller boot (2026-08-09)

- [x] Fixed strict taxonomy validity validation: impossible calendar timestamps are now rejected
      instead of being normalized by JavaScript `Date.parse`.
- [x] Restored dependency injection on the relocated Search Events, Filter Contexts and Filter Query
      controllers; the three HTTP `500` failures were reproduced with debug logging and traced to
      missing `@inject()` decorators.
- [x] Fresh targeted regressions pass: taxonomy assignment `4/4`, Search UI telemetry `1/1`, and
      Filter/Search route registration `4/4`.
- [x] Fresh layered backend checkpoint passes `117/117`, spanning Filter unit/contract, Search unit/
      contract/integration, Taxonomy contract/unit, leakage/differential providers and real route
      composition.
- [x] The changed runtime slice has targeted ESLint coverage; debug logging was removed from the test
      runner after diagnosis.
- [ ] This does not close the full objective: typecheck/build/lint backlog, cross-browser/mobile AX,
      runtime axe, visual baseline/reviewer joins, release manifest and master-case closure remain open.

## 65. Corrective verification: responsive filter drawer and mobile browser evidence (2026-08-09)

- [x] Fixed a cross-browser focus race in the shared Filter Drawer by restoring the opener before
      caller-owned state updates can unmount/rerender the drawer. Shared drawer/component tests pass
      `17/17` in the focused rerun.
- [x] Fixed Firefox mobile horizontal overflow at the source: long native multi-select options and
      unbounded marketplace metadata badges were able to expand document width. The select is clipped
      by a bounded wrapper and card badges are shrink/wrap-safe.
- [x] Fresh browser evidence after the fix: Marketplace Chromium `3/3`, Firefox `3/3`, and mobile
      Chrome `3/3`; Talent mobile Chrome `2/2`.
- [x] Targeted ESLint for the changed shared drawer, marketplace filters/card and roleplay passes.
- [~] WebKit/mobile Safari remains unavailable on this host because Playwright dependencies are
      missing; runtime axe, visual baseline/hash/reviewer joins and full cross-browser closure remain.

## 66. Runtime axe gate and accessibility corrective fixes (2026-08-09)

- [x] Added direct dev dependencies `@axe-core/playwright` and `axe-core` and a focused runtime
      role-play covering Marketplace and Search Center.
- [x] Reproduced and fixed a real critical AX issue: the user and organization notification
      dropdown triggers now expose an accessible name.
- [x] Reproduced and fixed a serious contrast issue: disabled pagination controls no longer use
      opacity-based contrast loss and now expose `aria-disabled`.
- [x] Focused runtime axe gate passes `2/2` in Chromium with no critical/serious violations;
      targeted ESLint passes for the changed UI and E2E files.
- [x] Focused pagination/accessibility regression batch passes `13/13` (pagination, unified
      pagination and shared UI accessibility suites).
- [ ] This is bounded runtime AX evidence only. WebKit/mobile Safari, visual baseline/hash/reviewer
      joins, release manifest/master cases, and aggregate typecheck/build/full-lint remain open.

## 67. Cross-browser overflow correction, relocation audit and release re-audit (2026-08-09)

- [x] Reproduced the remaining Firefox mobile overflow instead of accepting the unverified
      containment patch. The actual source was a `svelte-sonner` toast root extending past the
      viewport; the user Toaster is now bounded to `calc(100vw - 2rem)`, and long native skill
      option labels are shortened for the mobile control.
- [x] Fresh Marketplace role-play passes `3/3` on Firefox, `3/3` on Chromium and `3/3` on mobile
      Chrome; focused Marketplace/shared UI tests pass `11/11`; targeted ESLint passes.
- [x] Fresh runtime axe passes `2/2` on Chromium after the responsive correction.
- [x] Relocation audit repaired 14 stale consumer/test imports and five organization mapper shims;
      targeted Japa tests pass `6/6`, with GitNexus impact MEDIUM and no HIGH/CRITICAL finding.
- [~] Full typecheck remains red at the repository level (`138` diagnostics across `91` files),
      but a targeted scan reports no remaining diagnostics under Filter/Search/Taxonomy. Build
      therefore remains open because it shares the repository TypeScript gate.
- [ ] Release re-audit confirms no master row can honestly move to `[x]`: master remains
      `0 [x] / 18 [~] / 13 [ ]`; required run metadata, screenshot hashes/ACL, backend/audit joins,
      reviewer sign-off and a valid release manifest are still absent. WebKit/mobile Safari and
      visual baseline closure remain unverified.

## 68. Mobile drawer visual-viewport correction (2026-08-09)

- [x] Reproduced the Mobile Chrome drawer failure with pointer-event evidence: the fixed drawer
      used the layout viewport (`940px`) while the visual viewport was `844px`, leaving the footer
      outside the touch area and causing the sort control to intercept clicks.
- [x] Corrected the shared drawer layout to a flex column with a bounded scroll body, stable footer
      stacking, and `100svh` sizing for the small mobile viewport.
- [x] Fresh Mobile Chrome staged-filter role-play passes `1/1`; the complete Marketplace role-play
      file passes `3/3` in `23.3s`. Targeted ESLint for the changed drawer and role-play passes.
- [~] This closes the newly reproduced Mobile Chrome drawer defect only; WebKit/mobile Safari,
      aggregate typecheck/build/full-lint, release manifest, visual hashes/ACL and reviewer joins
      remain open.

## 69. Taxonomy backend corpus execution (2026-08-09)

- [x] Replaced the earlier misleading direct-helper result (`NO TESTS EXECUTED`) with the
      configured Japa `--files` invocation over every taxonomy backend `*.spec.ts` file.
- [x] The batch executed unit, contract-conformance and integration layers: `42/42` tests passed,
      including provider permission/conformance, multi-label and hierarchy semantics, lifecycle,
      governance API authorization, version readers and migration fencing.
- [~] This strengthens taxonomy implementation evidence but does not close Search adoption,
      all Filter namespace projections, browser/WebKit coverage or release artifact/reviewer joins.

## 70. Filter backend corpus execution (2026-08-09)

- [x] Executed every configured Filter backend `*.spec.ts` file in one Japa batch with repeated
      `--files` arguments, rather than mistaking inventory or helper imports for executed suites.
- [x] Unit, contract and integration layers passed `227/227`, including authorization, exact-total
      leakage, canonical AST semantics, provider conformance, saved views, alerts and taxonomy
      consumer coordination.
- [~] This is bounded Filter implementation evidence; Search corpus, cross-product projections,
      release evidence joins, full repository gates and browser coverage remain open.

## 71. Search backend corpus and compatibility route correction (2026-08-09)

- [x] The first Search corpus batch exposed one real integration gap: authenticated compatibility
      `POST /api/search/query` returned `404`; the failure was not hidden or downgraded.
- [x] Added the compatibility route in the existing `/api` session-or-bearer contract group and
      delegated it to the canonical Search Discovery request/controller path.
- [x] Targeted HTTP file passed `9/9`; the complete Search backend corpus then passed `266/266`
      across unit, contract and integration layers, including cursor recovery, privacy/leakage,
      differential provider parity, projection lifecycle and Talent discovery.
- [~] Search implementation corpus is green, but cross-domain adoption, release manifest/evidence
      joins, browser/WebKit closure and aggregate repository gates remain open.

## 72. Aggregate backend and repository gate recheck (2026-08-09)

- [x] Fresh backend corpus evidence is now `42/42` Taxonomy + `227/227` Filter + `266/266`
      Search = `535/535` passing tests across unit, contract and integration layers.
- [x] Fresh `pnpm typecheck` passes, including `svelte-check found 0 errors and 0 warnings`.
- [x] Fresh `pnpm build` completes successfully through asset build and TypeScript compilation.
- [x] Full lint was actually executed at the checkpoint; config lint passes and the changed route,
      shared drawer and role-play files pass targeted ESLint.
- [~] Full lint remains red in broad relocation/legacy scopes (backend app/rest and unrelated
      frontend files); this is recorded as an aggregate quality debt, not hidden behind targeted
      lint. WebKit/mobile Safari still cannot launch because the host lacks `libavif16`.
- [ ] Release closure remains open: required role-play journeys, release manifest/artifact joins,
      visual hashes/ACL, reviewer sign-off and master-case closure are not yet evidenced.

## 73. Chromium role-play checkpoint after aggregate repairs (2026-08-09)

- [x] Fresh Chromium batch across all currently implemented Filter/Search/Talent role-play files
      passes `7/7` (Talent `2`, Marketplace `3`, Search Center `1`, combined Search Discovery `1`).
- [~] This confirms the implemented browser slice after the compatibility route and mobile drawer
      repairs; it does not manufacture evidence for the ten required role-play journeys that have
      no implementation, nor for WebKit/mobile Safari.

## 74. Additional mobile-state and Search recovery role-play slices (2026-08-09)

- [~] Added RP-FST-05 mobile dirty-draft role-play with real seed/login/UI actions. Chromium and
      Mobile Chrome each pass the committed/dirty/Back/Cancel/rehydration path; degraded/offline
      execution is explicitly recorded as an evidence gap because no approved fault control exists.
- [~] Added RP-FST-09 Search recovery role-play. Healthy exact totals/facets, cursor tamper
      rejection and fresh-request recovery pass on Chromium; the provider-degradation case is
      explicitly skipped for the same missing approved fault-control reason.
- [x] Targeted ESLint passes for both new role-play files and the bounded lint fixes; the bounded
      Filter/Search/Taxonomy lint count improved from `1077` to `1072` errors.
- [ ] These slices do not close RP-FST-05/RP-FST-09, because their required degraded/offline paths,
      release artifacts and reviewer joins are still absent.

## 75. RP-FST-03/06/07 completion audit (2026-08-09)

- [~] RP-FST-03 existing Talent role-play passes `2/2` on Chromium, but the overall journey remains
      incomplete: the UI/seed lacks multi-skill/proficiency, secondary-label facets, privacy fixture
      population and deterministic cursor traversal.
- [ ] RP-FST-06 remains blocked evidence: saved-view share cannot select/submit grant targets and
      conflict recovery is not surfaced in the UI. Existing saved-view UI/client tests pass `12/12`.
- [ ] RP-FST-07 remains blocked evidence: taxonomy admin preview/apply exists, but owner repair does
      not select replacement C/D mappings and alert resume is not connected to the repair UI. Admin
      UI tests pass `4/4`; governance integration passes `5/5`.
- [ ] No role-play file was created for RP-FST-06/07 because doing so would assert controls that do
      not exist. These gaps require product/UI/seed work before browser evidence can be valid.

## 71. Direct Filter/Search/Taxonomy TypeScript and build audit (2026-08-09)

- [x] Fresh exact `pnpm typecheck` passes: `tsc --noEmit` followed by `svelte-check`, with
      `svelte-check found 0 errors and 0 warnings`.
- [x] Fresh `pnpm build` passes through Vite asset generation, TypeScript compilation and Adonis
      production output.
- [x] A transient compiler failure observed during the audit was traced to a concurrently running
      architecture test's temporary `app/modules/__exception_guard_probe/actions/probe.ts`; the
      probe was cleaned up by its test and was outside Filter/Search/Taxonomy. No production symbol
      was edited, so no GitNexus impact approval was required for this audit.
- [x] One batched targeted backend run covering Filter canonicalization/context/expression/validation,
      Search discovery/global search/Elasticsearch filter compilation and Taxonomy assignment passes
      `79/79`.
- [~] This closes the current direct TypeScript/build gate for the scoped platform only. Full lint,
      cross-browser/WebKit evidence, release manifest, visual hashes/ACL, reviewer joins and master
      release-case closure remain open.

## 76. RP-FST-06/07 capability implementation and layered verification (2026-08-09)

- [x] Saved-view sharing now carries the selected organization/team scope, requires an explicit
      authorized target in the UI, and exposes reload-then-reapply recovery for optimistic conflicts.
- [x] Taxonomy saved-view repair now requires explicit replacement mapping for every taxonomy term;
      the owner flow revalidates first and exposes a separate paused-alert resume action.
- [x] Shared UI/client batch passes `18/18` (saved-view client/state/sharing plus repair/alert menu
      coverage); saved-view HTTP contract passes `10/10`, including the repair-before-resume rule.
- [x] Targeted ESLint passes for all changed shared filtering components/state/client/tests; the
      follow-up `pnpm typecheck` passes with Svelte `0 errors / 0 warnings`; `pnpm build` passes.
- [~] RP-FST-06/07 are implemented but not release-closed: no approved browser role-play currently
      drives these flows end-to-end, and release manifest/screenshot/hash/ACL/reviewer joins remain
      absent. The matrix must not promote either journey to `[x]` yet.

## 77. Multiagent RP-FST-06/07 and Search saved-view verification (2026-08-09)

- [x] Added the Search-owned `search.blended.global` filter-context provider with authenticated
      private saved views only; shared-view and alert affordances are explicitly disabled for this
      context. Provider/composition unit evidence passes `2/2`; the HTTP contract passes `2/2`.
- [x] Independent targeted saved-view/alert backend verification passes `27/27` assertions and
      the saved-view HTTP contract passes `12/12`; an additional alert client/state slice passes
      `3/3`.
- [x] RP-FST-07 Chromium governance boundary passes `1/1` on an isolated port, proving a stale
      taxonomy split revision is rejected with `409 stale_taxonomy_migration_plan` through the
      real admin UI/API path.
- [~] RP-FST-06 browser role-play found and corrected a real test-state bug: Duplicate keeps the
      saved-view menu open, so the helper now opens it idempotently. The subsequent rerun was
      affected by shared seed/database contention from a concurrently running integration batch;
      no Chromium pass is claimed until an isolated rerun succeeds.
- [~] RP-FST-07 remains partial: the browser slice proves stale-plan governance only; no valid
      deterministic fixture yet proves owner mapping, saved-view repair/revalidation and paused
      alert resume as one browser journey.
- [ ] Release closure remains open: full role-play matrix, WebKit/Safari, valid manifest,
      screenshot/hash/ACL joins, full-lint debt and reviewer sign-off are absent.

## 78. RP-FST-06 isolated browser and Search contract correction (2026-08-09)

- [x] RP-FST-06 saved-view Chromium role-play passes `1/1` on isolated port `3353`, covering
      real Search Center save, pin, default, duplicate and unsupported-sharing affordance hiding.
      The role-play uses a real marketplace seed and real saved-view HTTP requests.
- [x] Corrected two verification defects exposed by execution: the browser role-play now uses the
      existing Search seed/login path, and the Search contract authenticates the list request before
      applying its query string. Search saved-view HTTP contract now passes `2/2`.
- [~] RP-FST-06 is not release-complete: the browser slice does not yet prove organization/team
      sharing, clean-session read-only access, optimistic conflict recovery or permission revoke.
- [~] The concurrent broad integration batch ended with `1304 passed, 11 failed, 38 skipped`; all
      reported failures were in Reviews/evidence architecture scopes, not Filter/Search/Taxonomy.
      This is recorded as repository evidence debt, not silently treated as a platform pass.
- [x] RP-FST-07 was rerun independently on port `3354` and passes Chromium `1/1` for the live
      stale taxonomy split governance boundary (`409 stale_taxonomy_migration_plan`).

## 79. Repository gate audit after role-play verification (2026-08-09)

- [x] Scoped frontend tests pass `18/18`; Search saved-view contract passes `2/2`; RP-FST-06
      Chromium passes `1/1`; RP-FST-07 Chromium passes `1/1`; `git diff --check` and GitNexus
      change detection complete (`21 changed`, `3 new`, `2 deleted` in the current index view).
- [ ] Full `pnpm typecheck` is not green: the first compiler error is outside this platform at
      `app/modules/auth/controllers/session-management/auth_landing_controller.ts:31`, where an
      Inertia render result is returned from a method typed `Promise<void>`. No unrelated auth
      production edit was made during this audit.
- [~] Full build cannot be claimed independently while the repository typecheck gate fails; full
      lint remains broad relocation/legacy debt. Filter/Search/Taxonomy evidence is therefore
      bounded, not release-complete.

## 80. Canonical multi-namespace task metadata projection (2026-08-09)

- [x] The production Task Search reader now requests all five canonical metadata namespaces:
      `business-domains`, `problem-categories`, `skills`, `task-types`, and `technologies`.
- [x] The Search projection preserves canonical term IDs/count, namespace partitions, taxonomy
      completeness, assignment schema version, source revisions, and enrichment versions. Strict
      Search index mappings and Discovery hit bindings declare the additive fields.
- [x] Layered verification passes: targeted ESLint; canonical projection/document/mapping/binding
      unit tests `12/12`; Search Discovery application plus task reader integration `21/21`; and
      provider/source/version suites previously recorded `9/9`, `3/3`, and `8/8`.
- [x] Repository TypeScript gate passes after the test fixture explicitly narrows canonical metadata:
      `pnpm typecheck` (`tsc --noEmit` and `svelte-check`, `0` errors/`0` warnings).
- [~] The production composition remains fail-closed when authoritative taxonomy revision rows are
      absent; the integration fixture seeds those registry rows explicitly. Release deployment must
      prove operator-published revision/fingerprint rows and any required populated Search generation.
- [~] Flat canonical term filtering is covered, but namespace-specific faceting/query semantics for
      the nested namespace partitions are not yet proven by an end-to-end Search index fixture.
- [ ] RP-FST-03 multi-skill/proficiency/privacy/cursor browser coverage, full RP-FST-06/07 closure,
      WebKit/Safari, release manifest, visual/hash/ACL joins, reviewer sign-off, and full-lint debt
      remain open. No release-case promotion is made from this slice alone.

## 81. Canonical namespace context and Talent multi-skill semantics (2026-08-09)

- [x] Added `taxonomy.canonicalTerms` to the Task Discovery semantic context. The field is now
      validated as a set field and is wired to the strict `canonical_term_ids` Elasticsearch binding.
- [x] Added a real Elasticsearch Search Discovery integration case proving namespaced canonical
      filtering and self-excluding facet output; the scoped Search Discovery integration now passes
      `10/10`.
- [x] Implemented Talent multi-skill selection in the organization UI as a native multi-select and
      changed the canonical request builder to emit `contains_all` for selected skills. Existing
      single-value taxonomy controls remain `contains_any`.
- [x] Layered Talent verification passes: UI component suite `15/15`, request/context/binding units
      `13/13`, Talent Search Elasticsearch integration `7/7`, targeted ESLint, and repository
      `pnpm typecheck` with Svelte `0 errors / 0 warnings`.
- [~] RP-FST-03 is improved but not release-complete: proficiency semantics, secondary expertise
      facets, privacy/disputed fixtures, deterministic cursor traversal, and a fresh browser journey
      using two real seeded skills remain unproved.
- [~] Talent production documents still do not expose the full canonical namespace/provenance
      projection, and the blended Search context remains text-only; these are separate adoption gaps.
- [ ] Release manifest, visual/hash/ACL joins, reviewer sign-off, WebKit/Safari and full-lint debt
      remain open. No master case is promoted solely from this implementation slice.

## 82. Release manifest audit after multi-skill implementation (2026-08-09)

- [x] Audited both legacy evidence inputs with the authoritative validator. Neither
      `docs/12-evidence/test-matrix.json` nor `docs/12-evidence/implementation-plan.json` satisfies
      the v1 release-manifest schema; both fail with the expected missing-version/release/cases error.
- [x] The validator's own unit suite passes `17/17`. The fixture suite was also checked and reported
      `NO TESTS EXECUTED`, so it is not counted as behavioral evidence.
- [ ] No release manifest was fabricated from legacy JSON. A valid manifest requires real case
      records, execution metadata, artifact hashes, screenshot joins, ownership and reviewer sign-off.
      The matrix remains `0 [x] / 18 [~] / 13 [ ]` until those joins exist.

## 83. RP-FST-03 multi-skill browser closure slice (2026-08-09)

- [x] The canonical recruiting page now loads active skill options through the existing directory
      options provider; the previous hard-coded `availableSkills: []` was a real browser blocker.
- [x] The E2E seed supports an explicit `multiSkill: true` mode that creates two reviewed L7 skills,
      attaches them to the seeded talent, reindexes the talent, and returns the actual skill IDs.
      Default seed behavior remains unchanged.
- [x] Corrected a second real boundary defect found by browser execution: canonical Inertia skill
      arrays were serialized so the server received only one value. The canonical payload now uses
      the comma-separated format consumed by the request mapper.
- [x] Fresh Chromium role-play file passes `3/3`, including the new real seed → multi-select →
      Inertia response path. The first attempt failed at the empty options list and the second failed
      at one-value serialization; neither failure was hidden.
- [x] Supporting verification passes: Talent page UI `15/15`, page-query unit `2/2`, Talent request
      and context units, production Talent Search integration `9/9`, and `pnpm typecheck` with
      Svelte `0 errors / 0 warnings`; targeted ESLint passes.
- [~] RP-FST-03 remains partial: the browser slice proves two-skill selection and server criteria,
      but not proficiency/availability controls, same-object cross-match decoys in the browser seed,
      disputed/private evidence population, or deterministic cursor traversal across multiple results.
- [ ] Full release manifest/artifact joins, visual/hash/ACL evidence, reviewer sign-off, WebKit/Safari
      and broad full-lint debt remain open.

## 84. Talent canonical projection and blended-context audit (2026-08-09)

- [x] Multiagent audit traced the production Talent projection from reader → builder → projection
      command → index repository → Discovery executor. Existing raw skill and accomplishment arrays
      are wired and tested, but the audit did not treat that wiring as canonical taxonomy completion.
- [~] Talent Search still drops skill taxonomy category/ancestor/alias/version and assignment
      provenance/review state at the reader boundary. The smallest complete next slice is skill
      taxonomy only; business domains, task types, problem categories and technologies must remain
      separate raw/free-form fields until authoritative providers exist.
- [~] The Talent page exposes taxonomy-shaped fields sourced from public accomplishments, but there
      is no provider-backed canonical version/provenance for those non-skill values. No canonical IDs
      or versions are invented to make the matrix look green.
- [x] Blended Search remains explicitly text-only and fail-closed for structured filters/facets;
      the audit confirms this is safer than claiming exact cross-source totals without authoritative
      permission-visible populations. Task/Talent vertical paths remain separately verified.
- [ ] A complete Talent skill canonical projection still needs provider/version/ancestor fields,
      real reader→builder composition tests, production-built Search documents in integration, and
      canonical HTTP facet evidence before that scope can move to `[x]`.

## 85. Talent skill-only canonical projection slice (2026-08-09)

- [x] Extended the Search-owned Talent skill record with optional canonical reference, category
      references, reviewed aliases, taxonomy version, and assignment provenance/review state.
- [x] The production Talent reader now loads the authoritative Skills taxonomy snapshot when
      composed for Search, retains only matching `skills:*` terms, and keeps unresolved assignments
      fail-closed (`canonical_*_known: false`) rather than deriving IDs from labels or accomplishments.
- [x] The builder, strict index mapping, Discovery bindings and allowlisted hit document now carry
      canonical skill IDs, category refs, aliases text, taxonomy versions and assignment metadata.
- [x] Targeted verification passes: Talent builder unit `3/3`, Discovery binding unit `3/3`,
      targeted ESLint, `pnpm typecheck`, and Svelte `0 errors / 0 warnings`.
- [~] A canonical HTTP filter case was added to the Search Discovery integration scope, but the
      real reader→builder→Elasticsearch composition seam is still absent and the integration suite
      could not execute in this workspace because the datastore safety guard detected that the
      configured Elasticsearch test endpoint is not physically separate from development. No
      integration pass is claimed.
- [~] This slice is intentionally skill-only. Proficiency/availability, privacy/dispute population,
      full cursor journey, blended structured context, release manifest/artifact joins, WebKit/Safari,
      reviewer sign-off and full-lint closure remain open.

## 86. Talent availability projection and date filtering (2026-08-09)

- [x] Preserved the source `profile_settings.available_from` value through the Talent reader and
      Search builder as an additive `available_from` date field; missing values remain missing and
      are not converted into a false date.
- [x] Added strict Elasticsearch date mapping, allowlisted `talent.availableFrom` Discovery field,
      contextual date operators/faceting, and canonical request support for `available_before`.
- [x] Added the organization UI date control and round-trip query state, while leaving unsupported
      saved-state/task-ranking controls unchanged.
- [x] Layered targeted verification passes: builder `4/4`, Discovery binding `3/3`, Discovery
      context `4/4`, request builder `4/4`, request mapper `2/2`, UI component suite `15/15`,
      targeted ESLint, and repository `pnpm typecheck` with Svelte `0 errors / 0 warnings`.
- [~] The real Elasticsearch integration case for date filtering is present in the existing
      integration fixture but cannot be executed until the test endpoint is physically isolated
      from development; no integration pass is claimed here.
- [~] Proficiency-level filtering/faceting, dispute-aware population, saved state, full cursor
  browser journey, blended structured context and release evidence remain open.

## 87. Talent same-object proficiency filtering slice (2026-08-09)

- [x] Added nested `skill_evidence` so proficiency remains attached to its owning skill; flat
  skill/proficiency arrays are not treated as sufficient cross-match protection.
- [x] Added strict nested mapping, Discovery relation bindings and relation-aware filter
  validation/orchestration for `related_matches`; unknown evidence fails closed through
  `skill_evidence_known`.
- [x] Added canonical `min_proficiency` request mapping, UI controls and cursor-preserving
  page-query passthrough without reviving unsupported legacy controls.
- [x] Layered verification passes: builder `5/5`, validator `15/15`, executor `13/13`, request
  builder `4/4`, page query `2/2`, bindings `3/3`, context `4/4`, UI `15/15`, Talent Discovery
  integration `10/10`, Search Discovery regression `10/10`, typecheck, targeted ESLint and diff check.
- [~] The integration proves same-object semantics with a controlled Elasticsearch fixture, but
  does not yet prove the complete persisted reader → builder → projection composition for
  proficiency evidence.
- [~] Browser RP-FST-03 still lacks a fresh proficiency/availability journey, browser cross-match
  decoy seed, disputed/private evidence fixture and multi-page cursor proof.
- [ ] Full lint debt, WebKit/Safari dependency closure, release manifest/artifact/hash/ACL joins
  and reviewer sign-off remain open.

## 89. Talent browser filter round-trip probe (2026-08-09)

- [x] Added a bounded RP-FST-03 browser case that seeds an availability date and submits two
  skills plus minimum proficiency and availability through the visible UI.
- [x] The case asserts the actual Inertia response contract (`filters`, cursor mode) and URL,
  rather than treating URL mutation alone as feature proof.
- [~] Existing reused-server Chromium evidence remains `3/4` after the new case: controls and
  URL state are present, but the response observed by that server omitted the two new filter
  props. A fresh isolated server could not authenticate the testing user because its seed/migration
  setup returned `500 E_INVARIANT_VIOLATION`; no browser pass is claimed.
- [~] The browser seed now accepts `availableFrom`, but no browser same-object decoy, privacy/
  dispute fixture, facet assertion or multi-page/stale-cursor journey has closed yet.
- [ ] WebKit/mobile Safari, full lint, release manifest/artifact/hash/ACL joins and reviewer
  sign-off remain open.

## 88. Persisted Talent composition closure slice (2026-08-09)

- [x] Audit found and fixed a real reader-boundary defect: proficiency was read and normalized,
  then dropped while mapping the reader's internal skill records into the public Search reader
  contract. Builder-only tests could not detect this loss.
- [x] Added persisted integration evidence using real User/Skill/UserSkill/profile-settings rows:
  production reader → builder → index document now preserves reviewed proficiency evidence and
  availability, and the test composes the real taxonomy reader.
- [x] Added production API evidence: `searchPublicApi.resetTalentIndex()` followed by real
  `reindexTalentDocument()` for a strong talent and a cross-match decoy, then
  `searchPublicApi.discover()` with nested same-object proficiency filtering returns only the
  correct persisted talent and maps its availability date.
- [x] Fresh verification passes: Talent Search Engine integration `3/3`, targeted ESLint,
  `pnpm typecheck` with Svelte `0 errors / 0 warnings`, and `git diff --check`.
- [~] This closes the persisted Talent projection/discovery seam for proficiency and availability,
  but canonical taxonomy IDs/categories are not asserted from a release-populated taxonomy row in
  this test, and browser RP-FST-03 still lacks equivalent persisted decoy/privacy/cursor proof.
- [ ] Full lint debt, WebKit/Safari dependency closure, release manifest/artifact/hash/ACL joins
  and reviewer sign-off remain open.

## 90. Talent persisted browser closure and facet/cursor boundary fixes (2026-08-09)

- [x] Added deterministic `seedTalentDiscoveryRoleplay` data: two reviewed strong matches, one
      reviewed proficiency decoy and one non-searchable privacy decoy. The route reindexes the
      persisted records and returns their IDs/counts as test prerequisites.
- [x] Added the RP-FST-03 browser assertion for same-object minimum proficiency, privacy exclusion,
      exact total, response filtering and native cursor traversal. The full role-play file passes
      Chromium `5/5`; no decoy appears in the response or the second page.
- [x] Fixed a real production boundary defect where numeric Elasticsearch date facet keys were
      rejected. Date bindings now normalize finite epoch-millisecond keys to canonical ISO values;
      opaque composite cursor keys remain unchanged. The focused facet/compiler unit passes `5/5`.
- [x] Fixed cursor URL construction to preserve `per_page`, which is part of cursor identity. The
      focused Talent UI suite passes `16/16`; the admin Search Projection suite passes `4/4` after
      correcting the Ready-row activation preview capability guard.
- [x] Final scoped verification: backend facet unit `5/5`, admin/Talent Vitest `20/20`, Talent
      Chromium role-play `5/5`, targeted ESLint exit `0`, and relevant `git diff --check` exit `0`.
- [~] RP-FST-03/TC-FST-012 is now bounded evidence, not release-complete: disputed/suggested
      population, facet assertions, combined availability journey, screenshots/visual joins,
      cross-session isolation, WebKit/Safari, release manifest and reviewer sign-off remain open.
- [~] The repository remains intentionally uncommitted and unstaged; GitNexus `detect-changes`
      was rerun, but its index-based counts include the pre-existing dirty worktree and omit
      untracked files from the `new` count.

## 91. RP-FST-06 saved-view authorization and Search Center closure slice (2026-08-09)

- [x] Corrected organization-target authorization for private saved views: an approved member
      can share with the current organization, while nonmembers, stale grants and revoked
      membership fail closed without criteria leakage.
- [x] Hardened testing seed cleanup to delete saved views and dependent grants/alerts/migration
      rows before users and organizations; the safety integration passes `5/5`.
- [x] Wired Search Center to the shared-view capability and current-organization target, then
      covered the controller, blended context and authenticated saved-view HTTP contracts (`2/2`
      each).
- [x] Read-only shared-view rendering now hides update, pin, default and delete mutations while
      retaining duplicate-as-copy; the focused Search/alert Vitest batch passes `22/22`.
- [x] The isolated RP-FST-06 Chromium role-play passes `2/2`, covering real Search Center save,
      pin/default/duplicate, organization sharing, clean-session read-only access, optimistic
      conflict/reapply and permission revoke.
- [~] This is bounded implementation evidence, not release closure: full RP screenshot/audit/hash/
      ACL/reviewer joins, WebKit/Safari, valid manifest and broad repository gates remain open.

## 92. RP-FST-07 browser-surface correction (2026-08-10)

- [x] The stale taxonomy governance role-play remains a valid bounded slice: real admin UI/API
      Chromium evidence passes `1/1` and rejects stale version evidence with
      `409 stale_taxonomy_migration_plan`.
- [x] Removed the speculative owner journey that targeted `/org/tasks/board` for a Search Center
      `Saved views menu` and referenced a repair seed endpoint that did not exist. This prevents a
      structurally invalid test from being counted as a product failure or a false pass.
- [~] RP-FST-07 owner mapping, saved-view revalidation and paused-alert resume now have a bounded
      owner slice through `/search?type=task`; the task Search Center uses `tasks.discovery.member`
      with alerts enabled for the authenticated organization scope. Governed split application and
      complete release evidence remain open.

## Current snapshot — RP-FST-07 owner continuation (2026-08-10)

- [~] Current matrix count is `0 [x] / 31 [~] / 0 [ ]` across 31 master cases; older audit
      sections preserve their historical counts and are superseded by the latest matrix snapshot.
- [x] Search page controller and shared Search Center now select the saved-view context from the
      active search domain: task searches use `tasks.discovery.member`, `contextOwner: tasks`, and
      alerts/shared views for an authenticated organization member; the global context keeps alerts
      disabled.
- [x] Added the test-only `POST /api/testing/seed-taxonomy-repair-roleplay` transition. It accepts
      only validated test inputs, binds the target to the seeded owner token, preserves a valid
      semantic checksum, marks the view `requires_repair`, and pauses the linked alert atomically.
- [x] Focused evidence passes: Search controller `2/2`, testing-route safety `8/8`, user/shared UI
      Vitest `22/22`, and targeted ESLint after the final route/type correction.
- [~] Isolated RP-FST-07 owner Chromium passes `1/1` through real save, subscribe, repair,
      revalidate and explicit alert resume. The stale-governance admin case independently passes
      `1/1`; a later combined-file run timed out in the dirty relocation worker/DB environment and
      is not promoted as a `2/2` claim.
- [x] Hardened the Filter consumer coordinator boundary: candidate saved views are discovered from
      the persisted taxonomy-reference projection, not caller-supplied IDs/mappings. Child receipts
      are idempotent on `(saved_view_id, planToken, input_checksum)`; deterministic rename and
      split-repair paths are covered by focused Filter unit evidence `6/6`, PostgreSQL
      coordination integration `2/2`, and production taxonomy/filter ESLint exit `0`.
- [~] Added a dedicated `filter_taxonomy_migration_runs` child ledger with a parent-plan FK,
      persisted completed IDs/cursor, durable `scan_pass` (`initial`/`final_rescan`), CAS lock and terminal repair diagnostic. The taxonomy
      governance apply path now checks the parent lock/version before invoking the Filter child,
      ignores client-supplied consumer items, publishes only after the child reports `completed`,
      and leaves the parent `planned` on `applying` or `requires_repair`. Focused governance unit
      evidence is `9/9`; the saved-view schema, coordination integration and governance API slices
      are green (`8/8`, `2/2`, `5/5`). Unsupported persisted impact keys now fail closed before
      publication. The coordinator's durable final-rescan/repair-resume unit
      is now `6/6`, the focused Filter integration remains `2/2`, and production
      implementation/migration lint is clean. Initial cursor exhaustion now checkpoints
      `applying + final_rescan`; completion is allowed only after a stable final pass. Child run
      snapshots are now loaded inside the same transaction, with parent→child row locks before
      candidate mutation and CAS checkpointing. The PostgreSQL coordination integration now passes
      `2/2`: it runs two initial coordinator calls concurrently and also proves transaction
      rollback/retry after a simulated worker exception, preserving an external edit made after
      rollback.
- [~] The durable final-rescan closes the bounded cursor-exhaustion/restart handoff. Saved-view
      coordination now reads the candidate row with a transaction-scoped `FOR UPDATE` lock;
      focused repository unit evidence is `2/2`, and the external-mutation lock integration is
      `1/1`. This does not yet close process-kill or multi-worker crash recovery around external
      mutation, unsupported
      assignment/projection/index consumers, screenshots, audit/replay, cross-browser,
      release-manifest or reviewer joins.

## Current snapshot — RP-FST-03 cursor/PIT lifetime alignment (2026-08-10)

- [x] Fixed a production lifetime mismatch: the configured signed cursor TTL is five minutes while
      the executor previously defaulted Elasticsearch PIT requests to `keep_alive: '1m'`. The
      executor now derives its default PIT lease from `ElasticsearchCursorCodec.ttlMs`, rounded up
      to whole seconds; explicit `pitKeepAlive` callers remain supported as deliberate overrides.
- [x] TDD regression evidence is green: the focused executor unit passes `4/4`, the cursor codec
      unit passes `2/2`, and scoped ESLint for the changed executor/codec/test files exits `0`.
- [x] The isolated real-data Chromium Talent role-play file reruns `5/5` in `17.1s`, including
      the native cursor traversal that previously exposed `SEARCH_CURSOR_EXPIRED`. No browser
      interception or in-process provider fake is used by this role-play.
- [~] RP-FST-03/TC-FST-012 remains bounded rather than release-complete: disputed/suggested
      populations, visual/AX/hash/ACL joins, WebKit/Safari, real network/shard PIT faults,
      cross-session isolation and manifest/reviewer evidence remain open. The master matrix stays
      `0 [x] / 31 [~] / 0 [ ]`.

## Current snapshot — RP-FST-04 Admin Audit browser slice (2026-08-10)

- [x] Added a dedicated real-surface role-play for the Admin Audit SQL investigation. It seeds
      more than one page of real audit events, keeps the target off the initial page, stages action/
      actor/date criteria without changing committed URL/results, then applies through the visible
      admin UI.
- [x] Isolated Chromium RP-FST-04 passes `1/1` in `13.9s`; the target is found through the server/
      SQL path, the detail panel preserves request/trace metadata, and the canonical API response
      independently returns the same target and filters. Scoped ESLint exits `0`.
- [~] TC-FST-011/RP-FST-04 remains bounded: canonical screenshot path/hash/ACL and audit joins,
      responsive/AX, cross-browser, full staged UX matrix and release-manifest/reviewer evidence
      remain open. The master matrix stays `0 [x] / 31 [~] / 0 [ ]`.

## Current snapshot — RP-FST-09 recovery boundary (2026-08-10)

- [~] The real suite is `inertia/apps/user/tests/e2e/filter_search_taxonomy/search_degraded_recovery_roleplay.spec.ts`.
- [x] The Chromium suite passes `3/3`: healthy exact totals/facets, an opaque cursor, tampered
      cursor rejection, fresh-request recovery, alias-integrity fail-closed/recovery, and PIT
      expiry/fresh-request recovery. The alias-integrity case uses the token-bound `POST /api/testing/seed-search-alias-integrity-fault-roleplay`
      control to add/remove a real second Elasticsearch alias backing generation; this proves the
      application fail-closed boundary, not a network outage or shard failure. Browser response
      interception and an in-process fake provider are not used.
- [x] Focused testing-route safety passes `8/8`, and the three-scope RP-FST-09 lint batch passes
      with exit `0`.
- [x] The bounded PIT slice advances the shared test clock beyond the configured TTL and asserts
      `SEARCH_CURSOR_EXPIRED`, then restores the clock and proves fresh-request recovery. It does
      not claim a real network PIT fault or UI Next/screenshot evidence.
- [x] Alias-integrity fixture safety now uses a fixed fault slot and process-local serialized
      controller; unit coverage `3/3` proves concurrent-enable exclusion, idempotent orphan cleanup
      and retention after an alias update commits before the client error. Route safety now passes
      `8/8`, including owner-scoped clock teardown and alias cleanup ownership, and the RP-FST-09 Chromium suite remains `3/3`.
- [x] RP-FST-09 now retains each marketplace seed timestamp and calls owner-scoped seed cleanup in
      `finally` for healthy, alias-fault and PIT cases. Cleanup releases a matching alias fault or
      cursor-clock fixture before deleting seeded rows; the safety integration is now `8/8`, the
      Chromium suite remains `3/3`, and normal failure paths no longer intentionally leak DB/search
      or process-local fault state. Process crash and cross-worker ownership remain outside this
      bounded teardown.
- [x] The task-scoped Search page fallback now exposes a safe compatibility-mode/source-unavailable
      diagnostic. Focused backend controller evidence passes `3/3`, Search Center UI evidence
      passes `14/14`, and the degraded browser assertion passes within the RP-FST-09 Chromium
      suite; the browser uses the real task alias fault control and no response interception.
- [~] Search Center navigation now cancels the previous search visit and guards stale cancel
      callbacks with a monotonic sequence. Focused Vitest evidence passes `16/16`, including a
      real Inertia/http late-response contract where the older response cannot replace the newer
      page; the targeted Search Center ESLint batch passes `0`. Browser-level race execution is
      not claimed.
- [ ] Browser-level late-response race evidence, real network/shard fault evidence, UI cursor screenshots,
      multi-worker/process-crash fixture cleanup, audit/visual/release joins and cross-browser
      evidence remain open.

## Current snapshot — TC-FST-004/006 semantic boundaries (2026-08-10)

- [~] TC-FST-004 empty text plus empty filter is bounded by Filter/Search unit and controller
      evidence `31/31`: context-owned browse, default-filter and reject behavior are explicit,
      and Search delegates the policy. Full SQL/ES, API/UI, role-play, visual and security
      evidence remains open.
- [~] TC-FST-006 multi-label set semantics are bounded by a reference → real PostgreSQL → real
      Elasticsearch differential contract `1/1` and domain/Elasticsearch compiler unit evidence
      `21/21` for Any, All, None, Exactly and At-least-N on duplicate/case-variant labels. Invalid
      or zero N, unknown/hidden values, nested expressions and the remaining API/UI/role-play/
      visual/auth-population layers remain open.
- [~] TC-FST-005 secondary-label recall is bounded by real Elasticsearch/SearchDiscovery evidence
      `1/1` for skill, tag and classification labels, including hit projection, selected facet
      counts and saved semantic criteria round-trip. Dedicated differential, PostgreSQL/API,
      UI/role-play/visual and broad permission/population coverage remain open.
- [~] TC-FST-010 self-excluding facets are bounded by real Elasticsearch integration `2/2` and
      compiler unit `5/5`: supported subtrees preserve tenant/status scope and mixed
      non-extractable expressions return a capability diagnostic rather than invented counts.
      PostgreSQL/API/UI/role-play/visual/security and deeper expression variants remain open.
- [~] TC-FST-007 missing, known-empty, unknown and hidden multi-value states are bounded by
      contract evidence `3/3` and Elasticsearch compiler unit `13/13`; boolean/zero values are
      preserved without string coercion and explicit state policy remains fail-closed. Full
      PostgreSQL/Elasticsearch parity, facet/total/timing leakage, API/UI/RP/VS/SEC coverage
      remains open.
- [~] TC-FST-008 selected-zero facet behavior is bounded by real Elasticsearch/SearchDiscovery
      evidence `1/1`: selected value remains inspectable with exact zero count, authoritative
      facet metadata, unchanged canonical filter and zero total, without counting a private value.
- [~] TC-FST-011 admin audit SQL is bounded by dedicated off-page integration `1/1`, combined
      executor evidence `5/5`, URL/detail frontend evidence `8/8`, and isolated RP-FST-04 Chromium
      `1/1` for staged Apply/off-page SQL/detail/API behavior; canonical visual/AX, responsive,
      cross-browser and release joins remain open.
- [~] FTM-004 selected-facet retention is bounded by contract evidence `1/1` plus compiler unit
      `5/5`: a value absent from the current bucket page remains selected with exact zero count.
      Real ES/SQL, UI chip/browser, permission/hidden and unknown-count variants remain open.
- [~] TC-FST-009 high-cardinality facet paging is bounded by real Elasticsearch integration `1/1`
      and compiler unit `5/5`; selected values are retained without duplicate facet entries across
      pages. SQL parity, UI/RP/VS and dedicated performance evidence remain open.
- [~] TC-FST-013 Marketplace/Talent domain separation is bounded by focused Vitest evidence `4/4`
      for shared search/taxonomy/multi-select/commit primitives with intentionally distinct
      composition and wording. RP/VS, runtime AX and manual responsive/visual review remain open.
- [~] TC-FST-029 ambiguous/adversarial authoring is bounded by unit `2/2` plus contract `1/1`:
      editable uncertain preview, mandatory manual-builder fallback and `autoExecute: false`.
      UI/RP/VS/AX and end-to-end security/provider validation remain open.
- [~] TC-FST-030 relevance experiment safety is bounded by contract `3/3` and SearchDiscovery
      integration `1/1` for preview/shadow, explicit ranking version and fail-safe fallback on
      malformed candidates or eligibility/facet/authorization changes. Production runner/sampling,
      real provider/API/UI/RP/VS/SEC/PERF/SHD and MAN evidence remain open.
- [~] TC-FST-031 personalization/organization policy is bounded by unit `7/7` plus contract `2/2`
      for global fallback, consent/reset/opt-out, organization isolation and bounded explanations
      without organization-ID leakage. Persistence/deletion rehearsal, provider/API/UI/RP/VS/SEC/
      RES/SHD and MAN evidence remain open.

## Current snapshot — Talent canonical metadata round-trip (2026-08-10)

- [x] Talent Discovery now preserves the additive taxonomy envelope from the strict Elasticsearch
      source: approved alias text, taxonomy versions, assignment provenance/review states and
      nested skill evidence, while retaining the existing canonical IDs/categories and excluding
      unrelated source fields.
- [x] Focused evidence passes: Search binding/context unit `7/7`, Talent Discovery application plus
      production Talent engine integration `13/13`, and targeted Search/Talent ESLint exit `0`.
- [~] This closes the reader/builder/index/Discovery response metadata round-trip at the bounded
      contract level; complete HTTP/browser rendering, visual/AX, privacy/fairness, rebuild/cutover,
      cross-browser and release-manifest evidence remain open.

## Current snapshot — release artifact result gate (2026-08-10)

- [x] The machine-readable matrix validator now accepts only the runtime result enum
      `passed|failed|skipped` and rejects any other value. A `required` case can reference only
      artifacts with `result: passed`; `failed` and `skipped` remain valid only as non-closure
      execution states, while deferred cases are not forced to have passed evidence.
- [x] Focused validator evidence passes `43/43` (`23/23` wrapper plus `20/20` fixture); the
      validator and wrapper ESLint batch pass with exit `0`, including a required `releaseManifestId`
      join and exact case-required-layer mapping for every artifact kind.
- [~] This hardens the release gate but does not create or promote a release manifest. The current
      worktree still lacks authoritative per-case artifact joins, immutable execution metadata,
      reviewer sign-off and valid screenshot/hash evidence for full release closure.

## Current snapshot — TC-FST-024 cursor fail-closed recovery (2026-08-10)

- [x] Invalid, expired and stale Discovery cursors render an empty fail-closed page and never
      invoke legacy global-search fallback.
- [x] Search Center exposes a visible cursor-unavailable state; the fresh-search action removes
      `cursor` and does not silently auto-restart.
- [x] Focused verification passes: Search page controller `3/3`, Search Center `18/18`, and the
      shell-aware URL batch `20/20`; scoped ESLint and TypeScript Prettier checks exit `0`.
- [~] Real browser cursor-expiry journey, screenshots, runtime AX, resilience, cross-browser,
      manifest and reviewer joins remain open.

The shared Filter Platform lifecycle remains at `26/26` unit/component evidence. Because no current
production surface instantiates `FilterStateController`, browser/Inertia wiring and legacy flat-URL
migration are not claimed or implemented as an unowned adapter; TC-FST-014 stays partial.

## Current snapshot — consumer/recovery continuation (2026-08-10)

- [x] TC-FST-014 has a bounded existing-consumer slice: Marketplace focused Vitest passes `6/6`,
      covering legacy flat-query readability, explicit history push (`replace: false`) and props
      rehydration without unsolicited navigation. This does not create a `FilterStateController`
      consumer or approve a Search flat-URL migration.
- [x] TC-FST-023/024 Search degraded recovery now has controller `4/4` and Search Center `20/20`:
      cursor requests combined with source unavailable, timeout or stale-index diagnostics fail
      closed, never invoke legacy fallback, and expose a query/filter-preserving retry without the
      cursor.
- [x] TC-FST-027 expression-builder canonical rehydration is covered by the focused expression,
      model and qualifier batch `8/8`; a changed canonical `expression`/`preferences` prop signature
      replaces the local builder state.
- [x] RP-FST-09 Chromium now passes `5/5`. The added UI cases use a task-scoped cursor, advance the
      approved test clock or enable the approved alias fault, assert the real Search Center
      fail-closed/compatibility state, click fresh retry, and verify `cursor` is removed.
- [~] These are bounded implementation/browser slices only. Network/shard failures, browser race
      timing, cross-browser/WebKit, runtime AX, canonical screenshot/hash/ACL/audit/reviewer joins,
      valid release manifest and the shared-controller migration remain open. The master matrix
      remains `0 [x] / 31 [~] / 0 [ ]`.

## Current snapshot — Search Center q-only and cursor navigation (2026-08-10)

- [x] TC-FST-002 q-only Search Center role-play passes Chromium `1/1`: the user enters a keyword
      through the real Search Center, reaches canonical `/search?q=...` history without `type`,
      `field` or `cursor`, receives authoritative Discovery results and no legacy result mode.
- [x] TC-FST-024 task cursor navigation role-play passes Chromium `1/1`: a same-organization
      fixture contains 25 searchable tasks, the real Next control retains `type=task` and the
      opaque cursor, changes the page from 24 results to 1, and disappears at the boundary.
- [x] The test-only marketplace fixture now has a validated bounded `searchTaskCount` input from
      1 through 32 and reindexes every generated task, keeping the role-play in one permission
      scope without creating 25 independent organizations.
- [~] Evidence remains bounded to Chromium/UI/role-play. Cross-browser/WebKit, visual/AX,
      resilience, release-manifest, screenshot/hash/ACL/audit and reviewer joins remain open.
      TC-FST-028 remains unimplemented at the production seam because typed count-preview and
      permission-revalidated relaxation apply/undo contracts are not yet defined. The master
      matrix remains `0 [x] / 31 [~] / 0 [ ]`.

## Current snapshot — secondary-label, selected-zero, and AST boundary slices (2026-08-10)

- [x] TC-FST-005 has a bounded real Chromium Search Center role-play `1/1`: one authorized task
      is recalled through its secondary skill label, secondary tag, and secondary classification,
      each via canonical `q` plus `type=task` and a real Discovery result card.
- [x] TC-FST-008 has a focused UI component test `1/1`: a selected facet with `count=0` and
      `countRelation=exact` remains visible with `aria-selected=true` and stays selected after
      another facet value is added.
- [x] AST-002 has focused orchestration evidence `15/15`: an expression beyond the declared
      depth limit is rejected before executor cost estimation or execution.
- [~] These are bounded slices only. TC-FST-009 remains blocked at the UI contract because the
      frontend has no facet `nextCursor`/load-more seam; PostgreSQL/API/differential, saved semantic
      round-trip, visual/AX, cross-browser, resilience and release joins remain open. The master
      matrix remains `0 [x] / 31 [~] / 0 [ ]`.

## Current snapshot — Talent public-evidence recruiter journey (2026-08-10)

- [x] TC-FST-012 existing Chromium role-play passes `1/1` through `/org/talents`: the recruiter
      submits two seeded skill IDs with `min_proficiency=l7`, receives the matching talent and
      public verified accomplishment evidence, and the rendered card excludes private source,
      task and reviewer facts.
- [~] This strengthens the real multi-skill/proficiency/privacy boundary only. Disputed evidence,
      fairness, cross-session isolation, full visual/AX, cross-browser and release joins remain
      open. TC-FST-025/026 still require live replay, durable crash recovery and ledger-aware
      rollback contracts; TC-FST-029 still has no production proposal/manual-fallback wiring.

## Reduced implementation tranche / Definition of Done (2026-08-10)

- [~] This checkpoint covers implementation at an owned production seam, focused
      unit/contract/integration evidence, and truthful Chromium role-play where a real seam exists.
      Focused lint/format checks are batched after the code wave; it does not satisfy the full
      package DoD or promote a master row to `[x]`.
- [~] Release-level gates are intentionally deferred: WebKit/Firefox, full visual/runtime AX,
      network/shard and process-crash resilience, authoritative release manifest, immutable
      artifact joins, screenshot/hash/ACL/audit evidence, reviewer sign-off, and full-repository
      typecheck/lint/build/security/performance closure.
- [~] Missing production contracts are not fabricated: TC-FST-009, browser portions of
      TC-FST-020/021, TC-FST-025/026, TC-FST-028 and TC-FST-029 remain deferred until their owners
      provide real seams. The master matrix stays `0 [x] / 31 [~] / 0 [ ]` because it reports
      release-gate closure, not this tranche's implementation progress.
- [x] Final bounded verification passes backend unit `44/44`, UI component tests `13/13`,
      Chromium Search Center role-play `3/3`, focused ESLint exit `0`, and code/test Prettier exit
      `0`; no full repository suite, build or release validator run was used for this checkpoint.
