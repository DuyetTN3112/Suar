# Filter/Search/Taxonomy Audit — 2026-08-08

## Scope and safety

Audited the three approved specs, the implementation plan, the test matrix, and the existing
Search/Filtering/Taxonomy code. The worktree was already dirty; no reset, checkout, staging, or
commit was performed. Existing changes outside this goal were preserved.

GitNexus CLI was used for status, query/context, impact, and detect-changes. One parallel query hit
the repository index lock; the CLI limitation was recorded and the remaining inspections used
serial CLI calls and targeted source inspection. `SearchCenter`, `SearchDiscoveryQuery`,
`ExecuteFilterQuery`, `FilterSavedViewClient`, `createSavedViewState`, and `SavedViewMenu` returned
MEDIUM impact; no HIGH/CRITICAL impact was encountered.

## Status ledger

| Package | Status | Evidence | Remaining gap |
| --- | --- | --- | --- |
| WP-00 | `[~]` | Worktree, ownership, GitNexus and focused baseline recorded | Complete inventory, immutable baseline, manifest and role-play ownership |
| WP-01–WP-16 | `[~]` | Existing plan notes and focused code/tests inspected | Their own downstream cross-layer gates remain open; no blanket promotion |
| WP-17 | `[~]` | Shared user/org wrappers; RED→GREEN test for server-authoritative results; user/org Search UI 10/10 | Real browser flow, cancellation/race, AX, screenshots, real-service evidence |
| WP-18 | `[~]` | Saved-view domain/repository/migration, client/state/UI slices; saved-view integration 7/7; authenticated HTTP create/list/duplicate/conflict/repair contract 5/5; UI client/state 5/5 | Full migration-chain orchestration, shared/team auth, browser/AX journey |
| WP-20 | `[~]` | Backend lexer/parser/serializer plus frontend AST visual projection/chips; backend 7 tests and frontend 2 tests GREEN | Search integration, live qualifier input, browser/AX evidence |
| WP-19 | `[~]` | AST builder model/component added; 5 focused UI/model tests GREEN; svelte-check 0 errors/warnings; focused ESLint GREEN | Full capability enforcement, preference editing, mobile/E2E and complete AX evidence |
| WP-21 | `[~]` | Privacy-filtered suggestion grouping, typed zero-result proposals/apply, and explicit explanation contract; 3 backend unit tests GREEN; focused lint/typecheck GREEN | Provider/result-count/permission wiring, frontend/a11y/browser evidence |
| WP-22 | `[~]` | Alert policy/lifecycle, migration, repository, delivery port, worker, internal create command, lifecycle API routes, task-context composition dispatch, and server-owned evaluator with membership/subscribe reauthorization added; evaluator 3/3, evaluator authorization PostgreSQL integration 1/1, worker 2/2, repository 1/1, saved-view API 7/7, composition context 1/1 GREEN; dedicated test migration applied | Real-ES successful create/run, notification adapter, UI, DST/clock stress, browser/AX/audit evidence |
| WP-23 | `[~]` | WP-23A1 deterministic preview/apply contracts, migration ledger, repository, and dedicated migration integration test; WP-23A2 criteria coordinator/repair pause port with transaction forwarding and PostgreSQL integration 1/1; WP-23B1 candidate-only lifecycle, durable ready/requires-repair rebuild orchestrator, and ready-only activation command; WP-23B2 durable invalidation contract/stager with PostgreSQL integration 2/2; taxonomy unit 9/9, consumer coordination unit 1/1, generation command unit 2/2, activation unit 2/2, Search lifecycle unit 11/11 GREEN | Authorized operator preview/apply, task producer hookups, replay consumer, failure injection, crash reconciliation, real Search service evidence, UI and role-play evidence |
| WP-24–WP-30 | `[ ]` | No complete implementation/evidence bundle found | Implement and verify each package independently |

## Commands and results

- `gitnexus status`: indexed, 195 changed / 40 new / 28 deleted files at audit start.
- `gitnexus detect-changes`: `changed: 5`, `new: 0`, `deleted: 0` relative to the index metadata.
- Filtering focused unit: 24 passed.
- Search focused unit: 16 passed.
- Saved-view integration: 7 passed.
- Saved-view HTTP contract: 2 passed (authenticated create/list against real DB; anonymous 401).
- After RED, saved-view HTTP contract: 4 passed (create/list, duplicate without alert/result state,
  stale-lock conflict mapping, anonymous 401).
- Saved-view repair contract: 1 additional case passed; a persisted `requires_repair` row only
  returns to `current` through an explicit semantic replacement and `repair: true`.
- Saved-view client/state UI suite: 5 passed.
- User/org Search UI: 10 passed after the regression fix.
- Repository typecheck: failed on existing dirty-worktree errors in task permission composition.
- Repository lint: failed with 152 errors and 1 warning across existing dirty changes; goal-related
  files also exposed pre-existing lint debt, so the repository gate remains RED.
- Full shared/filtering/user/org UI wave was interrupted after exceeding the practical runtime; it
  is not represented as passing evidence.

## WP-20 evidence

- GitNexus impact for the three new symbols: LOW, with no existing direct callers in the indexed
  baseline because the package was absent.
- Parser/round-trip unit tests: 7 passed.
- Existing Filter semantic unit suites: 30 passed.
- Existing Filter reference/fake SQL/fake Search contract suite: 30 passed.
- Focused ESLint for all WP-20 files: passed.
- Shared frontend Filter regression wave: 30/30 passed.
- Svelte-check: 0 errors, 0 warnings.
- Repository TypeScript check: passed in the final WP-20 wave; this does not replace browser and
  real-service evidence.

## Implemented change in this audit

`inertia/apps/shared/search/search_center.svelte` no longer derives `filteredResults` from the
bounded `results` prop. The component renders the server-authoritative page and uses filter controls
only to request a new URL. A user Search regression test proves a project-scoped response is not
silently filtered again in the browser; the test first failed and then passed after the change.

## WP-18 API evidence added

- Added the authenticated `/api/v1/filter-saved-views` create/list/show/update/delete/share route
  surface and composition bindings.
- The contract test proved the route is not merely registered: it persisted a canonical semantic
  view, excluded pagination from persisted semantic state, returned the canonical response, and
  listed it through authorization-backed repository queries.
- The implementation is intentionally still `[~]`: duplicate and stale-lock conflict mapping now
  have dedicated HTTP contract evidence, repair acknowledgement is wired, but full migration-chain
  orchestration is not wired and no
  browser/accessibility/real pilot evidence exists.

## WP-19 evidence added

- Added a controlled AST model with bounded max-depth/max-condition diagnostics, explicit invalid
  empty/one-child group diagnostics, separate preference state, immutable history, and keyboard
  equivalent add/remove/move/indent/outdent operations.
- Added a rendered recursive tree editor with field/operator options, visible diagnostics, separate
  ranking-preference messaging, and keyboard-operable controls.
- Evidence: model/component Vitest `5 passed`, focused ESLint passed, and Svelte-check `0 errors,
  0 warnings`. WP-19 remains `[~]` because browser/mobile/AX and full capability/preference editing
  evidence are not present.

## WP-21 evidence added

- Added provider-neutral Search assistance contracts and pure backend helpers for grouped suggestion
  filtering, low-count/sensitive suppression, typed exclusion/hierarchy/All→Any/minimum-match
  recovery proposals, AST application without source mutation, and explicit result explanation
  fields.
- Evidence: backend unit suite `3 passed`, focused ESLint and repository TypeScript pass.
- WP-21 remains `[~]`: no live suggestion/recovery provider, permission-bound result-count preview,
  WAI-ARIA frontend, or browser/privacy role-play evidence yet.

## WP-22 evidence added

- Added `filter_alert` domain policy/lifecycle contracts, durable migration/repository, delivery and
  evaluator ports, server-owned evaluator/principal resolution, fenced worker, and an authorized
  saved-view creation command. Unit evidence is `13 passed` across policy, lifecycle, worker,
  evaluator, and command suites; focused ESLint and repository
  TypeScript checks pass.
- The dedicated PostgreSQL test database was migrated through
  `20260801062000_create_filter_alerts`; repository integration evidence is `1 passed`, including
  atomic due claiming, lease/fence rejection, and completion watermark persistence. A raw-increment
  defect was caught by this integration test and fixed with parameterized SQL and `SKIP LOCKED`.
- The saved-view API contract now covers the seeded alert lifecycle (GET, pause, resume, and DELETE)
  through authenticated HTTP, plus fail-closed creation for an alerts-disabled context: `7 passed`.
- WP-22 remains `[~]`: task member contexts now advertise `alerts: true` through the real filtering
  composition dispatcher, while the audit context remains correctly disabled. The server-owned
  evaluator now resolves the current approved membership, rechecks subscription permission, runs
  the canonical saved-view query, hashes only bounded result identities, and fails closed for
  degraded/partial/approximate output. There is still no real-ES successful create/run contract,
  frontend subscription flow, notification adapter, DST/clock-control stress,
  browser/accessibility, or audit/side-effect role-play evidence. Creation correctly fails closed
  for the audit context because its declared alert capability is `false`.

## WP-23A1 evidence added

- Added provider-owned taxonomy change contracts for rename, alias changes, merge, retirement,
  reparent, and split. Preview produces a deterministic plan token, bounded consumer impact counts,
  and `compatible`/`migrated`/`requires_repair`/`blocked` outcomes without principals or hidden item
  details.
- Added chunked idempotent apply/fence logic and migration-run persistence at
  `20260801063000_create_taxonomy_migration_runs`. Evidence: taxonomy migration plan `3 passed`,
  existing taxonomy term suite `6 passed`, combined taxonomy unit wave `9 passed`, and dedicated
  PostgreSQL migration repository integration `1 passed`.
- WP-23A1 remains `[~]`: there is no authorized operator API/UI, provider-backed impact enumeration,
  or failure-injected crash/rollback evidence; WP-23A2 coordination is implemented separately and
  remains only partially integrated.

## WP-23A2 evidence added

- Added Filter-owned exact-reference semantic rewriting for scalar/set/hierarchy/relation values,
  preserving obsolete references for `requires_repair` and `blocked` mappings.
- Added checkpointed consumer coordination that pauses the alert before marking a saved view repair
  required/blocked, plus a PostgreSQL alert-pause adapter with transaction forwarding. Unit evidence
  is `1 passed`; the real PostgreSQL saved-view/alert/migration-run integration is `1 passed`; focused
  lint/typecheck checks pass for the new files.
- WP-23A2 remains `[~]`: retry/failure injection, migration-run composition binding, and
  permission-revocation role-play evidence remain.

## WP-23B1/C audit evidence

- Existing `VersionedSearchIndexLifecycle` and Search index administration code provide stable alias
  adoption, owned generation naming, atomic alias promotion, candidate count verification, stale alias
  fencing, foreign-backing rejection, and bounded cleanup/rollback guards.
- Evidence: `versioned_search_index_lifecycle.spec.ts` plus
  `search_index_administration_repository.spec.ts` are `12 passed`; focused ESLint passes. Domain-event
  outbox contract/lease evidence is `19 passed`.
- These packages remain `[~]`, not complete: the new durable generation/checkpoint ledger is verified
  only at repository level; source invalidation inventory, replay/catch-up composition, real
  Elasticsearch replay integration, PostgreSQL state choreography, and injected crash convergence
  evidence are still missing.

## WP-23B1 durable ledger evidence added

- Added `search_projection_generations` migration (`20260801064000`), generation state machine, and
  PostgreSQL repository with JSON taxonomy-version metadata and optimistic-lock transitions.
- Evidence: generation state unit suite `3 passed`, dedicated PostgreSQL repository integration `1
  passed`, focused ESLint/typecheck pass, and test database migration applied.
- Added a candidate-only lifecycle path so generation build/count verification does not activate the
  alias prematurely, plus a rebuild orchestrator that persists `building -> catching_up -> validating
  -> ready` or `requires_repair`. Evidence: orchestrator unit `2 passed`; lifecycle suite now `11
  passed`. This is not yet wired to invalidation replay or a real Elasticsearch generation run.
- Added a ready-only activation command that passes the expected alias state to the lifecycle and
  records `active`; activation/ledger conflict attempts are marked for repair. Activation command
  unit evidence is `2 passed`. Cross-system crash reconciliation and rollback integration remain
  intentionally open.

## WP-23A2 consumer coordination atomicity evidence added

- `CoordinateTaxonomyFilterConsumersCommand` now checkpoints the taxonomy migration run inside the
  same transaction as saved-view rewrites and alert pauses. A failed optimistic checkpoint raises a
  stable stale-plan error and rolls back the consumer mutations.
- Evidence: coordinator unit `1 passed`; real PostgreSQL consumer integration `1 passed`, covering
  repair preservation, alert pause, durable checkpoint, and checkpoint-CAS rollback; taxonomy
  migration repository integration `1 passed` after adding transaction-aware checkpointing.
- Composition now exposes `coordinateTaxonomyFilterConsumers` through `FilteringActionFactory`,
  backed by the PostgreSQL saved-view, alert-pause, and taxonomy migration adapters; composition unit
  evidence is `2 passed`. The saved-view HTTP contract is `7 passed`, including explicit owner repair
  recovery. WP-23A2 remains `[~]`: permission-revocation and stale plan-token role-play are not yet
  proven.
- The PostgreSQL alert-pause adapter now resolves the current alert through the caller transaction
  before its optimistic status update, eliminating an out-of-transaction read in the atomic consumer
  path. Alert repository integration remains GREEN (`1 passed`); the initial full contract run had a
  transient 500 while the worktree was being assembled, and a clean rerun passed `7/7` after removing
  diagnostic instrumentation.
- The evaluator authorization integration now proves a granted subscriber can evaluate once, then
  loses evaluation immediately after the grant is revoked; the query is not executed after revoke.
  This fixed a real authorization defect where `null !== undefined` treated a missing grant as
  authorized. Broader alert delivery/watermark and browser evidence remain open.

## WP-23B2 invalidation foundation evidence added

- Added `search_projection_entity_revisions` migration (`20260801065000`), provider-neutral
  invalidation contract, and PostgreSQL transaction-owned stager with deterministic changed-field
  ordering and source-revision dedupe.
- Evidence: real PostgreSQL integration `2 passed`, covering duplicate source revision, newer
  revision retention, and rollback of the invalidation with the source transaction. The generic
  fallback revision includes a mutation UUID because required-skill writes do not update the task
  timestamp; explicit source revisions retain same-revision dedupe semantics.
- The task-create, task-update, task-status, task-delete, and required-skill producer pilots are wired
  through the Tasks-owned port and composition adapter; real suites report `Create Task` `24 passed`,
  `Update Task` `12 passed`, delete standardization `4 passed`, task status `17 passed`, and task
  skill requirements `16 passed`. Required-skill add/update integration proves durable rows; remove/
  prefill, visibility/alternate paths, replay consumption, and dedicated required-skill rollback
  remain open, so WP-23B2 stays `[~]`.

## Release conclusion

This audit does not close the platform or any P0 role-play scenario. Unit/integration/UI evidence is
useful handoff evidence, not feature completion. The next work must add API/composition, real
provider, browser, negative/resilience, accessibility, screenshot, audit/side-effect, and
performance evidence before any `[x]` status is justified.
