# Task To Verified Accomplishment — Test Matrix And Role-Play Evidence Plan

## Product correction — 2026-08-10 (authoritative)

The primary acceptance flow is:

```text
Creator defines complete Task → A performs work → A moves Task to Done → B accepts or rejects
```

Completion Report and evidence are optional profile-governance artifacts. Tests must prove that A
can move the Task to Done without creating, submitting or uploading either artifact. Any report or
evidence test is a separate optional-governance scenario and must never be used as a Done gate.
Tests that assert the opposite are obsolete requirements and must be rewritten, not satisfied by
changing production behavior back to an assignee-submission workflow.

> **Release principle:** không một Unit test, Integration test, Component test hay E2E test đơn lẻ
> nào đủ chứng minh feature đúng. Một flow chỉ được chấp nhận khi các lớp test bổ sung cho nhau và
> chốt bằng trải nghiệm nhập vai người dùng có assertion, screenshot checkpoints, provenance audit và
> negative-path evidence.

**Related documents:**

- [Master Product And Technical Design](../specs/2026-08-01-task-to-verified-accomplishment-design.md)
- [Multi-Worker TDD Implementation Plan](./2026-08-01-task-to-verified-accomplishment-implementation.md)
- [Filter, Search, and Taxonomy Platform Plan](./2026-08-01-filter-search-taxonomy-platform.md)

### Coordinator checkpoint — 2026-08-10 continuation (authoritative focused evidence)

- `[~]` Project authoring context selector/read contract: projection `2/2`, query `4/4`, controller
  boundary `1/1`, Work Package catalog integration `3/3`, and authoring-context HTTP integration
  `7/7`; user/org form suites remain green with selector rendering. The contract proves tenant
  scoping, existing project-view authorization, stable ordering, archived omission, explicit
  no-active-version state and privacy allowlisting. It does not close AR-012/AR-013 because resolved
  inheritance preview, browser role-play, AX and audit layers remain required.
- `[~]` Native Completion Report response privacy boundary: response mapper `3/3` and HTTP boundary
  `3/3` prove empty `null`, owner editor DTO hydration, malformed canonical fail-closed behavior,
  and the same allowlist for draft/submit POST responses. Database-backed native POST → GET
  persistence integration is `5/5`; raw `canonicalPayload`, snake_case child rows and
  retention/tombstone metadata remain excluded. Native assignee UI now consumes this boundary for
  assignment-pinned briefs; reviewer access, upload, attribution and resilience remain open.
- `[~]` Optional Completion Report governance lifecycle: command unit `4/4`, HTTP contract `4/4`, factory
  wiring `7/7`, and the database-backed persistence role-play `5/5` now use the canonical
  assignment-scoped start path. The path creates/reuses an optional draft `task_submissions` parent
  and pins task/assignee/exact snapshot identity; it is not required for A to move the Task to Done.
  Reviewer access
  policy, contributor attribution, upload, privacy and resilience remain open; legacy fallback stays
  available for tasks without an assignment-pinned brief.
- `[~]` Structured Completion Report payload adapter: shared frontend mapper tests pass `6/6` for
  criterion/evidence/manifest/contributor mapping, incomplete Draft representation and rejection of
  evidence IDs outside the pinned assignment contract. Existing report edits preserve the server-
  authoritative owner/contributor IDs on evidence and replace only the current reporter claim;
  this remains focused UI evidence only and does not promote CR/RP rows.
- `[~]` Native Completion Report authoring UI migration: the shared Svelte editor loads/starts the
  assignment-scoped report, requires explicit actual role/ownership/autonomy and deliverable
  selections, keeps expected contract data separate from actual outcomes, maps criteria/evidence/
  contributor claims through the pinned payload adapter, and exposes Draft/Submit actions. It
  omits untouched criteria/claims, supports N/A/deviation fields, and fails closed for restricted
  or incomplete briefs. User panel coverage is `10/10`, org panel coverage is `8/8`, payload
  coverage is `6/6`; en/vi resources mirror the new stale-recovery keys. Canonical backend autonomy
  values are now used and submit also requires an explicit actual autonomy. Focused
  ESLint and TS/JSON Prettier checks are green. The dedicated native browser role-play is `1/1`:
  it covers pending → native start → exact acknowledgement → Draft revision 1 → Submit revision 2,
  rehydrates the sibling form after acknowledgement, and proves the hydrated native surface never
  calls the legacy submission endpoint. The resolved-brief cache-key regression suite is `5/5` and
  includes acknowledgement state; the backend response mapper also excludes contributor
  `outcomeData`. The legacy editor remains the explicit fallback for unpinned tasks. Upload
  lifecycle, retry/access control, broader RP, reviewer UI, AX, privacy and resilience gates remain
  open. The focused task i18n source/integrity guard now passes `36/36` after en/vi catalog parity
  and marketplace filter key routing were restored.
- `[~]` Native Completion Report attribution preservation: the shared editor now rehydrates all
  persisted contributor claims and evidence attribution fields, while keeping the current reporter
  claim as the only editable claim in this bounded slice. Payload plus user/org submission/execution
  brief regression coverage is `5 files / 39 tests: PASS`; arbitrary collaborator editing and
  governed attribution correction remain open. Normalized Evidence Contract requirement and
  multi-deliverable target persistence is covered separately below.
- `[~]` Resolved-brief stale assignment recovery: user/org execution-brief components pass `19/19`
  focused tests for restricted stale projections and acknowledgement/clarification `409` conflicts.
  The stale state hides the old contract and controls, exposes an accessible reload action, and
  keeps the interaction pending until the host reload callback (or browser fallback) runs. Detail
  panel/context-card parents now issue a task-only Inertia reload with preserved state/scroll, and a
  fresh projection clears the stale state. Focused material-change diff/re-ack coverage now passes
  `19/19` and renders changed paths before the acknowledgement action; full browser role-play, AX
  audit and resilience gates remain open.
- `[~]` Reviewer evidence boundary: org/user observation panels pass `8/8` and `9/9` after filtering
  finalizable evidence to the selected claim's `evidence_refs`. The production reviewer package
  route/access adapter and explicit editor response allowlist are now covered by focused evidence
  `23/23` plus database-backed route role-play `5/5`; native confirm/narrow/reject role-play is `3/3`.
  Existing observation persistence/context coverage is `13/13`. Shared reviewer observation copy now
  routes through the user/org translation caller with en/vi parity/source coverage; focused reviewer
  component/package/i18n evidence is `4 files / 13 passed / 42 skipped` under the targeted filter.
  Governed quorum/finalization, audit/correction/dispute governance and full UI/RP coverage remain
  open.
- `[~]` Reviewer attribution display: the shared native reviewer panel now renders persisted
  contributor reference, role, ownership, autonomy, status, contribution statement and evidence
  refs as read-only facts. A focused shared-panel regression passes `1/1`; no collaborator picker,
  identity-name projection or attribution correction authority is introduced.
- `[~]` Native reviewer authorization boundary: the observation-context reader makes active native
  session assignments authoritative and fails closed for outsiders/waived assignments even when a
  legacy reviewer row exists; the native assignment role also wins over a conflicting legacy role.
  Legacy fallback is limited to sessions with no native assignment rows. Focused policy evidence is
  `5/5`; this does not advance quorum/finalization or dispute rows.
- `[~]` Native finalization-readiness evaluator: the policy-neutral pure domain slice now reports
  current versus stale observation revisions, provenance/report/claim/evidence drift, evidence
  sufficiency/access blockers, invalid lifecycle state and conflicting current dispositions. Its
  focused unit evidence is `8/8`; final capability observations also surface missing evidence and
  confidence as explicit readiness blockers. The result is deliberately `finalizationAuthorized: false` with
  `policyStatus: not_evaluated`. No query/controller/HTTP boundary consumes it yet. This is blocker
  visibility only, not quorum, tie-break, correction, dispute-freeze or finalization authority.
- `[~]` Native observation audit receipt: the create path now writes one redacted, metadata-only
  `review_observation.created` audit event in the same transaction as the initial observation
  revision, and idempotent retries do not duplicate it. Focused command coverage is `6/6`; real
  persistence/audit coverage is `10/10`. This records persistence provenance only and does not grant
  finalization, quorum, correction or dispute authority.
- `[~]` Public Profile/Search taxonomy disclosure audit: the live anonymous Talent Search context
  still permits canonical skill/category refs, aliases, taxonomy versions, assignment provenance/
  review state and skill-evidence metadata to influence or cross the public boundary. The reader
  now excludes explicitly non-public taxonomy terms (and terms with non-public/unresolved parents),
  but there is still no term-level publication/privacy allowlist or actor × action × data-class
  matrix. This is containment evidence only; do not mark PS-005/PS-017 or TC-TVA-015–017 green
  until the public path is policy-allowlisted or comprehensively fail-closed.
- The current full backend TypeScript check is not marked green here: the dirty tree still reports
  unrelated taxonomy/filtering module drift. Focused tests and `svelte-check` are recorded separately
  and do not replace the full release gate.

## 1. Quy ước trạng thái và test layers

Mỗi scenario/case có đúng một trạng thái:

- `[ ]` — chưa làm hoặc chưa có đủ evidence;
- `[~]` — đang implement/run/review;
- `[x]` — tất cả required layers và evidence gates đã pass.

| Code   | Test layer                    | Chứng minh được                                            | Không tự chứng minh được                  |
| ------ | ----------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `U`    | Unit/domain                   | Rule, truth table, transition, canonicalization            | Wiring, DB, browser journey               |
| `CT`   | Contract/conformance          | DTO/event/schema/adapter không drift                       | Transaction và UX đúng                    |
| `IT`   | Integration                   | Migration, repository, transaction, outbox, permission     | Người dùng nhìn/hiểu đúng UI              |
| `UI`   | Component/Vitest              | State, validation, accessibility semantics, rendering      | Real navigation/session/backend           |
| `RP`   | Playwright role-play E2E      | Actor dùng UI thật qua nhiều màn hình/session              | Nội bộ rule đã cover hết permutations     |
| `VS`   | Visual screenshot checkpoint  | Trạng thái người dùng thực sự nhìn thấy, layout, hierarchy | Data/side effect đúng nếu thiếu assertion |
| `AX`   | Accessibility                 | Keyboard, focus, role/name, text equivalent                | Business state/backend integrity          |
| `SEC`  | Security/privacy              | Cross-tenant, disclosure, no-leakage                       | Usability và happy path                   |
| `AUD`  | Audit/provenance              | Source IDs, immutable chain, lifecycle history             | UI comprehension                          |
| `RES`  | Resilience/concurrency        | Retry, replay, crash, timeout, stale version               | Visual correctness                        |
| `PERF` | Performance/load              | p95/p99, query/index/rebuild capacity                      | Semantic correctness                      |
| `MAN`  | Structured exploratory review | Cognitive load, wording, screenshot review                 | Repeatable automated regression           |

`Required layers` là tập tối thiểu. Worker có thể thêm layer, không được tự bỏ layer. Nếu một layer
không phù hợp, phải ghi `N/A` với lý do và QA owner phê duyệt; không để trống.

### Coordinator checkpoint — 2026-08-09

#### Final verification recheck — 2026-08-09

- [x] Unit: latest full rerun `2406 passed (2406)`. The TVA-scoped accomplishment unit batch
      remains `105/105`; the full architecture and namespace recheck is green.
- [x] Contract: latest full run `168 passed (168)` after the Skills/task API contract recheck.
- [~] Integration: latest dedicated-database run `1259 passed / 8 failed / 38 skipped (1305)`. The
  eight failures are order-dependent auth/session, cleanup and policy failures; each affected file
  passes in isolation, so the full run is not release evidence. The marketplace keyword-search
  fixture explicitly reindexes after its model-level metadata mutation. The skipped cases are
  opt-in Redis/cache drills.
- [~] Checkpoint re-run after the namespace/Ioc/Redis/marketplace fixes: `1287 passed / 27 failed /
38 skipped (1352)`. Admin/users/auth DI, Redis API/transport, marketplace architecture contracts,
  and the account placeholder now pass; review/dispute, sprint/backlog, task-requirement projection,
  one cache-role status, and two controller outlier checks remain open.
- [~] Checkpoint 4: `1313 passed / 2 failed / 38 skipped (1353)`. Review-confirmed event contracts,
  sprint/assignment routes, and task requirement invalidation are green; remaining full-run issues
  are two controller outliers plus one order-dependent inherited-evidence `403` (focused `9/9` pass).
- [x] Final backend checkpoint: full unit `2406/2406`, full contract `168/168`, and full safe
      integration `1315 passed / 0 failed / 38 skipped (1353)` after the controller-boundary and
      inherited-evidence fixes. Redis/cache skips are opt-in drills; this does not close the separate
      UI/E2E/VS/MAN/AUD/RES/PERF/migration release rows.
- [x] Integration isolation regression slice: cleanup/session regression unit `2/2`; the affected
      auth, UI-events, organization, current-organization mutation and assignment-contract files pass
      together `68/68` after clearing memory-backed sessions. This does not replace the final full run.
- [x] UI: latest runnable run `215 files / 756 tests passed`.
- [x] Policy E2E: `2 passed`; critical role-play E2E: `19 passed`.
- [x] Native reviewer claim-verification role-play: `3 passed`; the fixture uses production
      application commands to create the pinned snapshot, native start parent, exact assignment
      acknowledgement, submitted Completion Report, claim and evidence, then submits a real reviewer
      observation and captures a screenshot.
- [x] Architecture gates: the TVA-scoped boundary/schema gates and full backend architecture suite
      pass within the current `2406/2406` unit run. This closes architecture checks only, not master
      role-play/release acceptance.
- [x] Sequential architecture recheck: auth-layer, module placement/domain boundary, port taxonomy,
      public contracts, exception and validation gates pass after removing a cross-module request-mapper
      dependency and correcting the auth mapper boundary rule.
- [x] Typecheck: `svelte-check --tsconfig ./inertia/tsconfig.json` and backend `tsc --noEmit`
      pass in the current namespace/result-contract recheck.
      pass after the namespace/result-contract refactor recheck. This closes type correctness only;
      it does not close the multi-layer release gates.
- [~] Migration ledger: dedicated test-database verification is now `104 completed / 0 pending /
0 corrupt`; release schema-dump owner approval and checksum reconciliation remain blockers.
- [~] Legacy backfill slice: classifier/reader focused unit wave is `11/11` and durable checkpoint/
  writer integration is `2/2`; this proves dry-run, cursor/tenant fencing, conservative
  classification, retrospective-only writes, idempotent storage and no invented legacy provenance.
  Rollout dependency/rollback policy unit is `3/3`; the profile dual-read counter query suite is
  `4/4`; its adapter contract test is `1/1` and emits count-only redacted operational observations,
  and the profile rollback regression is `1/1`; operator-state composition mapping is `2/2`.
  Release migration registration, operator rollout drill, persisted comparison evidence and
  end-to-end rollback evidence are still missing.
- [x] Cutover architecture recheck: consumer-owned Users cutover port; module-domain, module-layer,
      port-taxonomy, public-contract-surface and side-effect gates pass.
- [~] Master scenarios and TC/RP rows remain incomplete until dedicated RP-01–RP-08 evidence,
  screenshot checkpoints, provenance/audit/privacy assertions and resilience/release gates exist.

Focused refactor/contract wave (2026-08-09): `[x]` 19/19 unit tests pass across notification,
organization, review, skills, sprint, talent-discovery, filtering-observability, publication and
legacy-rollout contracts; focused TypeScript/Svelte checks and the affected ESLint wave pass. The module-domain
boundary, port-taxonomy and public-contract-surface checks also pass. These are focused evidence
only and do not advance the full UI/E2E/privacy/release gates.

Filtering verification wave (2026-08-09): `[~]` filtering ran sequentially against the current
namespace-refactored tree: `153/153` unit, `46/46` contract and `23/23` integration tests pass;
affected ESLint, module-layer/domain-boundary/public-contract/port-taxonomy/
side-effect/auth-layer gates pass. The HTTP contract includes saved-view lifecycle, alert lifecycle,
cross-tenant authorization and migration-repair behavior. Parallel database execution was discarded
as evidence because teardown interference caused false failures; only the sequential rerun counts.

Talent discovery integration recheck (2026-08-09): `[x]` `4/4` proves anonymous filter-only search,
secondary labels, exact totals/facets, private/inactive/non-searchable exclusion and opaque cursor
staleness/expiry diagnostics. This still does not prove the complete recruiter role-play, publication
privacy lifecycle, cache/log/trace leakage or RP-01–RP-08 evidence.

Accomplishment module wave (2026-08-09): `[x]` `105/105` unit, `44/44` integration and `1/1`
contract tests pass. The integration wave covers storage-only schema invariants, lifecycle CAS,
projection versioning/unpublish, publication privacy, durable legacy state, governed projection and
replay/concurrency behavior. This is module evidence; full cross-module/UI/privacy-release gates stay
open.

Backend unit/contract/integration evidence cho contracts, readiness, assignment, Completion Report,
review observations và accomplishment persistence đang ở `[~]`. Master scenarios vẫn `[ ]` cho tới
khi có đủ UI, role-play E2E, visible-state screenshot, accessibility, security/privacy, audit và
resilience evidence. Unit hoặc integration pass riêng lẻ không được nâng status scenario.

Native reviewer claim-verification recheck (2026-08-10): Chromium `3 passed` (confirm/narrow/reject); the browser submits real
confirm and narrow observations through page transport, asserts strict `409` success, verifies the
selected workflow and observations in the Inertia read model, reloads the board, and asserts governed
history/rationale plus screenshot. This advances WP-25 only to `[~]`; reject, quorum/correction,
privacy/audit and RP-01–RP-08 remain `[ ]`.

Talent-search public projection bridge recheck (2026-08-09): accomplishment public projection
adapter `1/1`, talent document builder `2/2`, typecheck and module/side-effect architecture gates
pass. The evidence proves only application-layer public vocabulary mapping and exclusion of reviewer
and disclosure fields; TC-TVA-015–017, WP-27 recruiter UI, index compatibility/lag and RP-01–RP-08
remain `[ ]`.

Recruiter directory UI recheck (2026-08-09): public demonstrated-work card assertion, page UI suite
and talent directory application integration pass; Chromium org talent role-play passes `5/5` and
writes `test-results/e2e-visual/talent-discovery/01-public-talent-directory.png`. This is partial
WP-27 evidence only: the role-play seed proves organization-scoped recruiter navigation and bookmark
behavior, not a full published TVA accomplishment projection or hidden-result privacy totals/facets.
TC-TVA-015–017 and RP-01–RP-08 remain `[ ]`.

Talent discovery filter/search role-play recheck (2026-08-09): the current Chromium spec passes
`3/3` sequentially against a healthy `suar_test` server (business-domain filter, canonical cursor/
secondary contract, and same-talent contains-all skill filter). The filter journey writes
`test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/talent-filter-only.png`.
The earlier failing run was caused by overlapping E2E server processes; it is excluded from product
failure evidence. This strengthens WP-27 only; accomplishment-backed recruiter RP, privacy totals/
facets, cache/log leakage and performance gates remain open.

Publication privacy boundary recheck (2026-08-09): publication preparation unit `3/3`, focused
ESLint and authenticated HTTP integration `4/4` pass. The application disclosure-policy port now
fails closed for canonical private/internal visibility; the HTTP slice proves a foreign actor cannot
publish another user's accomplishment, an unconfirmed request writes no publication consent fact,
and an owner can publish through the full HTTP boundary with a minimized audit event. This
strengthens WP-29 evidence but does not close the actor/data-class matrix, search totals/facets/cache/
log leakage, audit lifecycle, rich-content threats or full RP-01–RP-08 acceptance.

Publication audit lifecycle slice (2026-08-09): `[~]` publish/unpublish application commands now
write through an outbound audit port, and the HTTP publication route uses the sanitized audit
middleware. Focused command evidence is `4/4`; assertions cover publish/unpublish action, target,
version, source/lifecycle hashes, policy version, replay/change outcome and absence of sensitive
wording/evidence fields. Adapter-to-database integration now passes `2/2` against real
`audit_events`, covering redacted publish/unpublish persistence and a consecutive `prev_hash` →
`event_hash` chain assertion. This remains partial AUD/SEC evidence: the rest of the
accomplishment mutation lifecycle and complete cross-tenant/no-leak matrix are still `[ ]`.

Unpublish HTTP wiring recheck (2026-08-09): `[~]` the owner-only DELETE route, request mapper,
composition factory delegation and application-layer retirement command are now covered by mapper
unit `2/2`, publication command unit `5/5`, authenticated HTTP integration `8/8`, and HTTP contract
`2/2`. The HTTP suite proves owner retirement, foreign-owner denial, confirmation guard,
replay-safe behavior, redacted audit metadata and malformed-body rejection. Profile work-history
integration `4/4` additionally proves public output changes from one active item to zero after
unpublish while self output retains the item, including cache-generation invalidation. The
publication transaction now also stages one durable `search:talent-reindex-requested` row per
changed publication state; HTTP integration asserts the real pending outbox payload and
replay/no-op behavior. Search worker delivery to Elasticsearch and UI role-play/screenshot now pass
the focused lifecycle scenario `1/1`, including public-card removal after unpublish. Search-specific
processing receipts now pass listener unit `7/7`, revision/receipt integration `3/3`, and publication
integration `8/8`; measured tombstone SLO and the full privacy matrix remain `[ ]`; PS-006/WP-28/WP-29
therefore remain partial.

Publication Directory role-play recheck (2026-08-09): `[~]` a focused Chromium scenario executes
seed → owner publish → durable outbox drain → recruiter Directory assertion → owner unpublish →
recruiter assertion, with before/after screenshot capture; it passes `1/1`. The fix also hydrates
public-safe accomplishment summaries in the application query after Search returns the talent
identity. It also asserts anonymous public Search visibility before publication retirement and exact
removal afterward, with the private source marker absent from both payloads. This proves the focused
publication-to-Elasticsearch/UI lifecycle, but does not close the complete privacy totals/facets
matrix, measured tombstone SLO, startup worker evidence or the full RP journey.

Migration rehearsal refresh (2026-08-09): `[~]` the dedicated test database forward rehearsal now
reports `104 completed / 0 pending / 0 corrupt / 25 squashed`; all four previously unregistered
TVA migration sources and the forward constraint-removal migration are present in the ledger.
Taxonomy revision storage no longer adds the
namespace/revision/fingerprint business checks in PostgreSQL. Release verification still blocks on
schema-dump owner approval and checksum reconciliation, so migration/release cases remain partial.
The taxonomy application validation integration suite is `4/4`; schema dump regeneration remains
blocked by the missing `pg_dump` binary and still requires release-owner approval.

Search projection activation recheck (2026-08-09): application preview/apply unit `4/4`, integration
`1/1`, and admin projection UI `3/3` pass; stale preview tokens and lock-conflict repair are covered.
This advances WP-31 only to `[~]`; load, outage, rebuild, index-lag SLA and full release evidence remain
`[ ]`.

Profile evidence recheck (2026-08-09): Chromium profile role-play `8 passed` and covers empty,
retrospective and review-confirmed/high-confidence demonstrated-work cards, semantic tabs/focus, and
screenshots. WP-26 therefore remains `[~]`; pagination, filtering, detail/publication privacy and
recruiter journey remain `[ ]`.

Privacy/public snapshot recheck (2026-08-09): focused publication HTTP, public snapshot query and
snapshot publication integration suites pass `12/12`; private rows/tokens are excluded from public
artifacts and revoked/tokenless private snapshots fail closed. This is focused evidence only; the
full actor × data-class, search/counts/facets, log/cache and threat matrix remains open.

Search privacy recheck (2026-08-09): Talent discovery Elasticsearch integration is `5/5`; an exact
private accomplishment term produces zero hits and zero total, with no private identity or term in
facets/output. The same suite covers exact public totals/facets, non-searchable/inactive exclusion
and cursor diagnostics. This is IT/SEC supporting evidence only; PS-014 remains `[ ]` until the
provider projection, recruiter role-play/visual evidence and complete analytics/cache/log matrix
are verified.

Current release ledger recheck (2026-08-09): `migration:ledger-verify --connection=pg` reports
`104 completed / 0 pending / 0 corrupt / 25 squashed`; the three TVA migrations are now applied and
ledger-registered. Schema-dump owner approval and immutable checksum reconciliation remain blockers;
`pg_dump` is not available in this environment.

Cache resilience recheck (2026-08-09): cache invalidation unit/health passes `19/19`,
transactional/operator integration passes `17/17`, and real-Redis invalidation passes `3/3`;
dead-letter replay and operator audit are covered.
The E2E worker additionally reports a cache-invalidation dead-letter/operator-attention condition,
while direct current `suar_test` inspection reports no pending/leased/dead-letter rows; production
DLQ/runbook closure remains `[ ]` until the warning is reproduced, explained and drilled end-to-end.

Coordinator recheck 2026-08-09 (historical): translation integrity/source guards `45/45` pass; focused readiness,
coverage, profile snapshot/show, and sprint end-delivery/start UI suites pass after making assertions
locale-aware. The complete creator → assignee → reviewer → profile → recruiter browser journey is
still not proven.

Follow-up evidence: latest full `test:ui:runnable` completed with `215 files / 756 tests passed`.
This closes the runnable UI regression gate, but not the master role-play, screenshot,
provenance, privacy, or release-migration gates.

WP-17 durable orchestration backend hiện có receipt repository `5/5`, confirm-review `10/10` và
domain-event DLQ administration unit/integration `8/8 + 4/4` GREEN
sau khi migration `20260808010000` chuyển receipt lifecycle business enforcement về application
repository. Confirmation chỉ phát accomplishment identity khi native workflow và đúng một finalized
claim được resolver xác nhận; projector được gọi trong review transaction khi identity có mặt. Đây
vẫn chỉ là IT/RES contract evidence; chưa chứng minh native accomplishment write, full
profile/provenance result, UI journey hoặc screenshot. Completed replay đã được kiểm tra trực tiếp:
`completed review-confirmed replay is a no-op` giữ nguyên receipt `completed`, audit count và
external-effect cursor sau lần xử lý thứ hai.

DLQ administration evidence proves bounded payload-free preview, exact-selector/operator binding,
confirmation and reason-digest audit, atomic replay with attempt history, and locked-row no-partial-
replay semantics. This is operational/resilience evidence; it does not upgrade the end-to-end
review/profile scenario by itself.

Profile aggregate preservation is separately proven by
`refresh_user_profile_aggregates_atomicity.spec.ts` integration `2/2`: a final source/aggregate
failure rolls back new work-history/performance/expertise writes, and same-user refreshes serialize
before reading source facts. The full review-confirmed-to-profile browser regression remains open.

Projector transaction integration `review_confirmed_accomplishment_projector_transaction.spec.ts`
pass `2/2`: rollback không để lại aggregate/children; commit ghi accomplishment, claim, evidence,
review-observation link và 3 lifecycle revisions; test thứ hai đi qua native task/snapshot/report/
review source reader và actual writer. Đây vẫn là integration proof, chưa phải full browser journey.

WP-24 UI slice hiện có user/org focused suite `8 files / 32 tests: PASS`, Svelte strict `0 errors / 0
warnings` và TypeScript compile PASS. Slice này chỉ chứng minh rendering/readiness và governance
tuỳ chọn ở component boundary; các hàng `CR-*` vẫn `[ ]` cho tới khi có API integration, full
criterion/evidence/contributor semantics, role-play E2E, accessibility/security/resilience và
semantic assertion trước screenshot.

Native Completion Report boundary follow-up (2026-08-09): canonical v1 draft/submit routes are now
wired through the native immutable commands. Focused backend coverage passes `5 files / 27 tests`,
including route-assignment binding, partial Draft mapping, Result boundaries and submit readiness;
focused ESLint and `git diff --check` pass. This does not promote CR-001–CR-018: database-backed HTTP
integration, UI structured-payload adoption, upload retry/access control, contributor attribution,
review package and resilience evidence remain required.

Native Completion Report hydration follow-up (2026-08-10): the owner-scoped GET boundary now loads
the latest immutable report fact bundle by assignment and returns an explicit empty state when no
native report exists. Unit query coverage is `3/3`, controller Result-boundary coverage `6/6`,
factory wiring `7/7`, and the database-backed persistence suite `4/4` includes criterion,
evidence-manifest, contributor-claim and evidence-mapping hydration. This is backend U/IT evidence
only; CR-001–CR-018 remain `[ ]` until the UI adopts the structured payload and the required HTTP,
role-play, upload, privacy, attribution and resilience layers pass.

Native Completion Report response-boundary follow-up (2026-08-10): explicit editor response mapper
and HTTP contract tests pass `3/3 + 3/3`; native draft/submit POST and GET use the same DTO. Empty
assignments return `data: null`; malformed canonical payloads fail closed; persistence-only fields
(`canonicalPayload`, child foreign keys, retention, tombstone and request hashes) are excluded.
Database-backed POST → GET persistence integration passes `5/5`; latest repository lookup has a
deterministic revision/id ordering tie-breaker. This remains backend U/IT evidence and does not
promote CR rows without structured UI migration, reviewer/access, upload, attribution and resilience
layers.

Native Completion Report start follow-up (2026-08-10): the assignee-only start command and route now
lock the assignment context, create/reuse the canonical parent, and return its safe ID plus exact
snapshot identity. Unit `4/4`, HTTP `4/4`, factory `7/7` and persistence integration `5/5` are green.
This proves bootstrap/idempotent parent lifecycle, not the structured user/org UI migration or the
full CR/RP acceptance layers.

Reviewer Completion Package follow-up (2026-08-10): the submitted-only reviewer read path now has
an exact access-identity precheck, a Reviews-backed assigned-reviewer/org-admin policy adapter, and
the canonical `GET /api/v1/task-completion-reports/:reportId/review-package` route. Its explicit
editor mapper omits canonical payload/request hashes, persistence foreign keys, URI/storage
locators, retention/tombstone metadata and unknown contract fields. Focused query/mapper/factory/
HTTP/Result-boundary evidence is `23/23`; the database-backed reviewer route role-play is `5/5`.
Existing review-observation domain/repository/context coverage is recorded as `13/13` and the
native browser role-play is `3/3`; remaining matrix gates are governed quorum/finalization,
audit/correction/dispute governance, and full UI/RP coverage.

Reviewer evidence attribution follow-up (2026-08-10): shared observation authoring now submits only
evidence already linked to the selected claim; org/user component suites pass `8/8` and `9/9`. The
submitted-only reviewer package access adapter and explicit response allowlist are covered by
focused `23/23` plus route role-play `5/5`; existing observation persistence/context coverage is
`13/13`, while governed quorum/finalization, audit/correction/dispute governance and full RP
coverage remain before RV/CR rows can advance.

Reviewer package consumer follow-up (2026-08-10): the user/org reviewer panels now switch from the
raw native Inertia context to the canonical review-package GET whenever the backend marks the native
package boundary. Frontend normalization rechecks report/task/assignment identity and excludes
unknown/URI-bearing fields; the UI renders the pinned contract, report revision, criterion
expected/actual/result rows and evidence-manifest count. Missing, malformed, denied or unavailable
packages fail closed and do not show observation authoring. Focused Vitest evidence is `4 files /
13 passed / 42 skipped`; the native reviewer Chromium role-play recheck passes `3/3` with the
package GET path exercised. This is boundary/UI evidence only and does not advance quorum,
finalization, audit, dispute or full role-play rows.

Native Completion Report acknowledgement/cache follow-up (2026-08-10): the dedicated Chromium
role-play passes `1/1` through pending assignment acknowledgement, native start, Draft revision 1,
and Submit revision 2, with a re-navigation proving the sibling native form receives the
acknowledged state and no legacy submission GET is emitted. The resolved-brief cache-key regression
suite passes `5/5` after including acknowledgement state in assignment-pinned cache identity. The
backend editor mapper additionally omits contributor `outcomeData`; its focused privacy assertion
passes. These checks harden the native boundary but do not advance the remaining CR/RP governance,
privacy, upload or resilience rows.

Native reviewer role-source follow-up (2026-08-10): the authorization unit remains `5/5` and now
asserts that a conflicting legacy reviewer role cannot override the active native assignment role.
This hardens provenance at the authorization boundary without choosing quorum, tie-break or
finalization policy.

Completion acknowledgement gate follow-up (2026-08-10): native submit now checks acknowledgement
on the exact historical assignment snapshot. Drafts remain writable while `pending` or
`clarification_requested`; submit returns stable `TVA.COMPLETION.ASSIGNMENT_ACKNOWLEDGEMENT_REQUIRED`
or `TVA.COMPLETION.ASSIGNMENT_CLARIFICATION_UNRESOLVED` and performs no write. The command unit
suite is `5/5`; the database-backed Completion Report persistence suite is `5/5` after acknowledging
the exact snapshot in the valid-submit fixture. This is a focused gate only and does not promote
CR-001–CR-018 without the remaining UI, reviewer, attribution, privacy and resilience layers.

Native Completion Report attribution follow-up (2026-08-10): the shared payload adapter now keeps
server-authoritative `ownerUserId` and `contributorUserIds` on existing evidence items. Rehydrating
the native user/org form keeps every persisted contributor claim and replaces only the current
reporter's claim when building a new revision. The focused payload/user/org batch passes `5 files /
39 tests`; this is preservation evidence, not a full collaborator editor or governed attribution
correction flow.

Resolved-brief stale recovery follow-up (2026-08-10): user/org execution-brief surfaces now treat
stale assignment projection and acknowledgement/clarification `409` responses as a recoverable
assignment conflict. The old contract and interaction controls are hidden, an accessible reload
action is exposed, and the focused user/org component pair passes `19/19`. Detail-panel/context-card
parents now wire a task-only Inertia reload with `preserveState`/`preserveScroll`; board/modal hosts
now pass a task-detail reload callback that refreshes the selected task instead of requesting a
nonexistent `task` partial from the board route. Fresh projection clears the execution-brief stale
state. Full browser draft-retention proof, snapshot-transition policy, AX and resilience evidence
remain open.

Task i18n parity follow-up (2026-08-10): en/vi resources now cover the talent availability and
proficiency labels, notification trigger, Search Discovery/cursor/pagination states and marketplace
skill-match labels. The focused task source and translation-integrity guards pass `36/36`; this
removes the catalog blocker without changing taxonomy/public disclosure policy.

Evidence Contract target persistence follow-up (2026-08-10): submitted native Completion Report
evidence manifests now retain every evidence-requirement and deliverable target in normalized JSON
arrays while keeping the legacy first-deliverable scalar readable. Command coverage is `6/6`, review
package mapper coverage is `1/1`, and schema/persistence integration is `6/6`. This closes only the
lossless target-storage slice; criterion/claim mapping governance, upload lifecycle and reviewer
workflow evidence remain open.

Capability observation invariant follow-up (2026-08-10): final capability observations now require
at least one evidence reference and a non-null confidence value; draft and `request_evidence`
observations remain authorable. The focused review-observation rule suite passes `8/8`. This enforces
the FR-TVA-019 data-presence invariant without inventing a numeric confidence threshold, quorum,
finalization authority or dispute/correction policy.

Material successor diff follow-up (2026-08-10): assignment-pinned resolved briefs now carry a safe
change summary for successor snapshots — change class, changed field paths, re-ack requirement and
successor marker. User/org execution-brief coverage is `19/19`, and the UI shows the changed paths
before the existing acknowledgement action. Internal snapshot hashes, previous snapshot IDs and
raw canonical envelopes remain excluded from this summary.

Finalization-readiness parity follow-up (2026-08-10): the policy-neutral readiness evaluator now
emits explicit capability evidence/confidence blockers for final confirm/refine/narrow/partial
verification, while keeping `finalizationAuthorized: false` and `policyStatus: not_evaluated`.
Focused readiness coverage is `8/8`; no threshold, quorum or finalization policy is inferred.

Native observation audit receipt follow-up (2026-08-10): native create now records a redacted,
metadata-only `review_observation.created` event atomically with the initial observation revision;
the idempotent retry path does not duplicate the receipt. Focused command coverage is `6/6` and
real persistence/audit coverage is `10/10`. This is provenance evidence only and does not advance
quorum, finalization, correction or dispute governance.

Current-revision projection fence follow-up (2026-08-10): the governed accomplishment source reader
now joins the observation anchor and requires the projected revision to equal
`review_observations.current_revision_number`, with both anchor and revision in `final` state. The
native projector integration suite is `3/3`, including a regression proving that an older `final`
revision is not projected after the current observation is frozen. This is a read-side consistency
fence; it does not define correction, dispute-resolution or finalization policy.

Public taxonomy term containment follow-up (2026-08-10): the talent-search document reader now
fails closed for taxonomy terms explicitly marked organization-private and for terms whose parents
are non-public or unresolved. The focused Talent Search integration suite is `4/4`, including a
public-term/private-term regression. This does not create the missing publication allowlist, actor ×
action × data-class matrix, public-safe DTO or redaction policy for the remaining search/profile
fields.

Project-detail fence privacy follow-up (2026-08-10): the mapper/query now expose the active-version
CAS fence only to actors allowed by `canUpdateProject`; regular project viewers retain readable
context content but receive a null fence. Mapper coverage is `6/6`, and the real viewer/editor
project-detail integration is `1/1`. This closes a privacy regression in the page projection only;
version history, full audit and role-play gates remain open.

Pinned taxonomy bridge follow-up (2026-08-09): assignment synchronization now pins the authorized
task metadata envelope — canonical assignments, free-form tags, namespace/enrichment versions, source
revision, completeness and diagnostics — into the immutable snapshot hash. Accomplishment source
projection reads task type/domain/problem/technology and complexity from that snapshot, with legacy
snapshots remaining readable. Focused provider/synchronization/projection coverage passes `24/24`,
targeted ESLint and `git diff --check` pass. This is IT/U evidence for immutable provenance only; the
full envelope is not yet exposed through the public accomplishment/Search document, secondary-label
facets, term-level visibility or the required privacy/cutover role-play.

Snapshot taxonomy validation follow-up (2026-08-09): `isTaskAssignmentSnapshotV1` now rejects
malformed optional taxonomy metadata, metadata-to-snapshot task mismatches, and non-task
completeness resources while preserving legacy snapshots without that field. Schema validation passes
`9/9`; the combined focused
assignment/taxonomy batch passes `33/33`; targeted ESLint and `git diff --check` pass. This is
contract-boundary evidence only and does not promote taxonomy Search/public disclosure or the
assignment audit/role-play rows.

Project Context active-read follow-up (2026-08-09): the user/org project-detail surfaces now consume
the active context through the authorized reader and emit a privacy-safe projection only. The
projection/API mapper suite passes `6/6`, the composition-backed project-detail integration passes
`1/1`, and the shared read-card/editor suite passes `6/6`; targeted ESLint, targeted `svelte-check`
`0/0` and `git diff --check` also pass. The permission-gated editor publishes initial/material
versions with the expected active-version fence, retains drafts on 409, exposes the remote version,
and covers reload success/failure callbacks. No actor/provenance/hash/structured-default fields cross
the page/API boundary. This supports AR-012 and the WP-21 read/publish/conflict slice only; Work
Package, inheritance, version history, AX/responsive role-play and full TC-TVA-006 remain `[ ]`.

Storage-boundary recheck 2026-08-09: TVA FK/CHECK business constraints were removed by applied
migrations `20260809020000` and `20260809030000`; the expanded accomplishment schema-hardening
integration is `6/6` and inspects all listed TVA storage tables, while task-completion persistence
`6/6` and review-observation persistence `9/9` pass with invalid/orphan raw storage explicitly
separated from application validation. This is IT/architecture evidence only; it does not upgrade
any TC/RP row without command-level negative tests, browser role-play, screenshots, provenance/
audit and privacy evidence.

Current release recheck: assignment repository `30/30`, assignment schema `6/6`, completion
schema `6/6`, and review persistence `9/9` pass. `svelte-check` remains clean, but full backend
typecheck is `[~]` because the latest `tsc --noEmit` still reports namespace/import and refactor
fixture errors after the Admin namespace changes;
Reviews namespace/boundary recheck now runs the complete Reviews unit set at `223/223`, including
canonical controller paths, Result-boundary mocks, runtime-port ownership and strict request
boolean validation. This is module-level unit evidence only; the full cross-module suite, browser
role-play, screenshots, provenance/privacy audit and release resilience evidence remain open.
full unit is currently `[~]` (`2398 passed / 6 failed`) because the Organizations feature-local
action namespace migration and one final composition path recheck remain open; schema-dump approval,
full cross-module role-play, screenshot review, provenance/privacy audit and release resilience
evidence also remain `[ ]`.

Đã bổ sung kiểm chứng role-play governance cho board/task-drawer: `task_submission_package.spec.ts`
được cập nhật để chứng minh A có thể chuyển task sang `Done` mà không cần report/evidence; outsider
vẫn không truy cập được task. Review board canonical flow
`inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts` pass `2/2` trên Chromium,
bao gồm owner → manager → worker accept và worker → admin dispute queue; screenshot được chụp sau
semantic assertions. Một test quorum cũ đi tới route/UI không tồn tại (`/reviews/:reviewSessionId`)
đã bị loại khỏi inventory, không được dùng làm evidence. Toàn bộ global `/work` surface đã được
dọn khỏi route, page, route constant và các test legacy liên quan; user phải chuyển
organization/project và thao tác qua task board.

Search/Filter/Taxonomy role-play và visual evidence được deferred theo chỉ đạo hiện tại; không dùng
chúng để đánh giá nhánh Task → Verified Accomplishment trong checkpoint này.

Verification update 2026-08-09:

- Unit baseline: latest full run `2189 passed`; accomplishment persistence/projector integration slices pass `34`
  tests; TypeScript/Svelte strict pass.
- Contract suite: latest full run `161 passed` after the legacy task-comment auth regression and
  notification teardown state were rechecked.
- Chromium supporting role-play: task authoring/submission `7 passed`; this does not satisfy RP-01–RP-08.
- No-false-pass policy: `2 passed` after replacing two `toBeTruthy()` assertions with strict boolean
  assertions.
- Component/UI suite is now `215 files / 756 tests passed`; migration release verification remains
  blocked (`101 completed / 3 pending / 0 corrupt / 25 squashed`) by three unregistered sources and
  schema-dump approval/checksum reconciliation.

Therefore every `TC-TVA-*`, `AR-*`, `AS-*`, `CR-*`, `RV-*`, `PS-*`, `OP-*` and `RP-*` master row
remains `[ ]` unless its required evidence bundle is complete; backend green evidence is recorded
only in the package ledgers below.

## 2. Proof model: khi nào một flow được coi là đúng

Một P0 user flow chỉ `[x]` khi có đủ evidence bundle:

- [ ] **PROOF-01 — Domain proof:** các rule/transition quan trọng có Unit truth tables.
- [ ] **PROOF-02 — Boundary proof:** request/response/event/projection có versioned Contract tests.
- [ ] **PROOF-03 — Persistence proof:** Integration test chứng minh transaction, snapshot, permission,
      idempotency và side effects.
- [~] **PROOF-04 — UI proof:** Completion Report component suite `4 files / 21 tests` pass cho
  readiness/evidence UX; full criterion/contributor UI proof còn thiếu.
- [~] **PROOF-05 — Journey proof:** board/task-drawer role-play pass `5/5` trên Chromium; full
  creator → assignee → reviewer → profile journey còn thiếu.
- [~] **PROOF-06 — Visible-state proof:** board readiness screenshot đã chụp sau semantic assertions;
  desktop screenshot bundle cho creator→reviewer→profile vẫn thiếu. Mobile UI không thuộc delivery này.
  bắt buộc.
- [ ] **PROOF-07 — Historical proof:** audit/query kiểm tra provenance/snapshot sau journey.
- [ ] **PROOF-08 — Negative proof:** ít nhất một failure/permission/concurrency path của flow pass.
- [x] **PROOF-09 — No-false-pass:** scanner `test:e2e:policy` pass `2/2`; không có offender ngoài
      policy scope sau khi sửa yếu tố `toBeTruthy`, optional branch count guard và `waitForTimeout`.
      assertion trong optional branch hoặc screenshot trước state assertion.
- [ ] **PROOF-10 — Artifact proof:** report chứa screenshots, Playwright trace khi retry/fail, concise
      console/network failure và test-data manifest.

Screenshot chỉ được tính evidence khi:

1. actor/session đã được assert;
2. route/heading/primary state đã được assert;
3. data dùng trong ảnh là deterministic và có unique scenario ID;
4. ảnh được chụp sau double `requestAnimationFrame` hoặc stable-state helper;
5. browser error list rỗng;
6. ảnh không chứa secret/token/private evidence ngoài scope;
7. screenshot name map được về scenario/checkpoint.

## 3. Actor, data-class, viewport và runtime matrix

### 3.1 Actor personas

| Persona         | Vai trò                             | Core journeys                                               |
| --------------- | ----------------------------------- | ----------------------------------------------------------- |
| `ACT-CREATOR`   | Project owner/task creator          | Context, Task authoring, readiness, assign, material change |
| `ACT-ASSIGNEE`  | Primary task owner A                | Resolved brief, work execution, status Done; no report gate |
| `ACT-CONTRIB`   | Secondary contributor               | Contributor claim/ownership confirmation                    |
| `ACT-REVIEWER`  | Assigned reviewer B                 | Task output/criteria acceptance or rejection; optional governance |
| `ACT-PEER`      | Second reviewer                     | Quorum/conflict/narrowing                                   |
| `ACT-REVIEWEE`  | User receiving accomplishment       | Confirm/dispute/publication                                 |
| `ACT-RECRUITER` | External or permitted talent viewer | Profile scan, talent search, explainability                 |
| `ACT-ORGADMIN`  | Disclosure/governance owner         | Policy, audit, correction/revocation                        |
| `ACT-FOREIGN`   | Actor from another tenant           | Cross-tenant denial/no-leak tests                           |
| `ACT-ANON`      | Anonymous public viewer             | Public snapshot only                                        |
| `ACT-SYSTEM`    | Outbox/projector/rebuild worker     | Retry/replay/tombstone/rebuild                              |

### 3.2 Data classifications

| Class          | Test data                                        | Public expectation                           |
| -------------- | ------------------------------------------------ | -------------------------------------------- |
| `PUBLIC`       | Publishable accomplishment summary               | Có thể vào public Profile/Search             |
| `INTERNAL`     | Org-visible Task/context                         | Không xuất hiện cho external recruiter       |
| `CONFIDENTIAL` | Restricted evidence/source wording               | Chỉ authorized reviewer thấy                 |
| `REDACTED`     | Public-safe projection derived from private work | Chỉ allowlisted summary, không source detail |
| `LEGACY`       | No locked Evidence Contract                      | Không được gắn native-verified label         |

### 3.3 Required runtime coverage

| Gate            | Browser/viewport                                      | Tần suất              |
| --------------- | ----------------------------------------------------- | --------------------- |
| PR P0           | Chromium Desktop                                      | Mỗi PR/merge gate     |
| Release P0      | Chromium Desktop                                      | Mỗi release candidate |
| Nightly matrix  | Chromium, Firefox, WebKit                             | Nightly/before demo   |
| Accessibility   | Chromium + keyboard/screen-reader semantics           | Mỗi P0 surface        |
| Visual evidence | Desktop 1440-ish viewport per major delivered surface | Mỗi role-play journey |

## 4. Master acceptance scenario matrix

`VS` trong bảng nghĩa là screenshot checkpoint bắt buộc, không chỉ screenshot khi test fail.

| Status | Scenario                                | Actor journey                                                   | Required layers                 | User-visible/observable proof                                                     | Primary owner                           |
| ------ | --------------------------------------- | --------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| [ ]    | TC-TVA-001 Link-only Draft              | Creator nhập title + link và Save Draft                         | U, CT, IT, UI, RP, VS           | Draft tồn tại; readiness liệt kê blocker; không có assignment/profile eligibility | WP-09, WP-11, WP-22, WP-32              |
| [ ]    | TC-TVA-002 Block direct assignment      | Creator thử Assign “Implement API, see Notion”                  | U, IT, UI, RP, VS, AUD          | UI/API cùng từ chối; scope/deliverable/acceptance blockers cụ thể; không tạo evidence blocker giả | WP-09, WP-13, WP-22, WP-32              |
| [ ]    | TC-TVA-003 Complete docs in Suar        | Creator paste/upload, map fields, review, confirm               | U, CT, IT, UI, RP, VS, AX       | Assignment-ready; structured contract đúng; link chỉ còn Supporting Reference     | WP-08, WP-11, WP-22, WP-32              |
| [ ]    | TC-TVA-004 Inaccessible source          | Assignee mở self-contained brief khi link yêu cầu auth          | IT, UI, RP, VS, AX, RES         | Critical content vẫn đọc được; chỉ reference marked inaccessible                  | WP-12, WP-23, WP-32                     |
| [ ]    | TC-TVA-005 Diagram lacks text           | Creator thêm critical image không caption                       | U, UI, RP, VS, AX               | Readiness blocker chỉ đúng section; focus tới text-summary field                  | WP-09, WP-21, WP-22, WP-32              |
| [ ]    | TC-TVA-006 Project inheritance          | Creator reuse pinned security/DoD context                       | U, CT, IT, UI, RP, VS, AUD      | Resolved preview hiện inherited source/version; snapshot pin exact version        | WP-07, WP-08, WP-13, WP-21–WP-23, WP-32 |
| [ ]    | TC-TVA-007 No artificial skill mix      | Creator chọn only relevant API capabilities                     | U, IT, UI, RP, VS               | Không bắt Soft Skill/Delivery; range/rubric đúng                                  | WP-10, WP-22, WP-32                     |
| [ ]    | TC-TVA-008 Material change              | Creator đổi design-only thành implementation sau ack            | U, CT, IT, UI, RP, VS, AUD, RES | Version 3, pending re-ack, diff rõ; reviewer vẫn mở version 2                     | WP-08, WP-13, WP-23, WP-32              |
| [ ]    | TC-TVA-009 Assignee can complete directly | A chuyển Task sang Done khi chưa có Completion/evidence       | U, IT, UI, RP, AUD               | Done thành công; không có Done gate giả; B vẫn nhận luồng nghiệm thu              | WP-13, WP-16, WP-22, WP-32              |
| [ ]    | TC-TVA-010 Optional governance report   | Creator bật governance sau khi A đã Done; report/evidence tùy chọn | U, CT, IT, UI, RP, VS        | Có thể tạo governance record; không thay đổi hoặc chặn status Done                | WP-14–WP-19, WP-24, WP-32               |
| [ ]    | TC-TVA-011 Reviewer B acceptance        | B accepts or rejects A's Done task using creator-defined criteria | U, IT, UI, RP, AUD          | B sees A/task/output context; accept/reject is separate from optional report/evidence | WP-15, WP-16, WP-25, WP-32 |
| [ ]    | TC-TVA-012 Reviewer narrows claim       | Reviewer accept implementation, reject primary design ownership | U, CT, IT, UI, RP, VS, AUD      | Candidate/detail/Profile không nói user led design                                | WP-15–WP-19, WP-25, WP-26, WP-32        |
| [ ]    | TC-TVA-013 Dispute freeze               | Reviewee dispute candidate                                      | U, IT, UI, RP, VS, AUD, RES     | Frozen state rõ; Profile/signals/search không update                              | WP-15–WP-20, WP-25–WP-27, WP-32         |
| [ ]    | TC-TVA-014 Historical immutability      | Edit current Task rồi rebuild                                   | U, CT, IT, RP, VS, AUD, RES     | Profile statement/provenance/hash không đổi; current task khác hiển thị riêng     | WP-12, WP-13, WP-18, WP-31, WP-32       |
| [ ]    | TC-TVA-015 Recruiter finds API designer | Recruiter search API design + primary owner                     | CT, IT, UI, RP, VS, SEC         | Match dựa accomplishment; explanation dẫn tới public-safe work                    | WP-19, WP-20, WP-26, WP-27, WP-32       |
| [ ]    | TC-TVA-016 Recruiter finds debugger     | Recruiter filter production + incident response                 | CT, IT, UI, RP, VS, SEC         | Action/environment/ownership/confidence, không title-only                         | WP-20, WP-27, WP-32                     |
| [ ]    | TC-TVA-017 Privacy-safe search          | External recruiter search term private                          | CT, IT, RP, VS, SEC, AUD        | Không candidate/facet/count/snippet/explanation leakage                           | WP-20, WP-27, WP-29, WP-32              |
| [ ]    | TC-TVA-018 Public text cannot inflate   | User đổi “contributed” thành “led architecture”                 | U, CT, IT, UI, RP, VS, SEC      | Publish rejected/correction shown; verified internal claim unchanged              | WP-15, WP-16, WP-19, WP-26, WP-32       |
| [ ]    | TC-TVA-019 Retrospective reconstruction | Authorized user reconstruct legacy work                         | U, IT, UI, RP, VS, AUD          | Retrospective/confidence label visible; not native verified                       | WP-18, WP-19, WP-26, WP-30, WP-32       |
| [ ]    | TC-TVA-020 Supporting link removed      | Reviewer opens locked package after source deletion             | IT, UI, RP, VS, AUD, RES        | Contract/evidence metadata readable; unavailable source noted                     | WP-12–WP-15, WP-23, WP-25, WP-32        |

## 5. Detailed behavior and exception matrix

### 5.1 Authoring, inheritance và readiness

| Status | ID     | Variation/failure                               | Expected result                                                        | Required layers      | Owner                      |
| ------ | ------ | ----------------------------------------------- | ---------------------------------------------------------------------- | -------------------- | -------------------------- |
| [ ]    | AR-001 | Empty title + empty body                        | Draft validation names title; no write if title is hard minimum        | U, IT, UI            | WP-11, WP-22               |
| [ ]    | AR-002 | Title-only Draft                                | Save allowed; all relevant readiness blockers remain                   | U, IT, UI, RP        | WP-09, WP-11, WP-22        |
| [ ]    | AR-003 | Title + public link only                        | Save Draft; link does not satisfy specification                        | U, IT, UI, RP, VS    | WP-09, WP-22               |
| [ ]    | AR-004 | Authenticated/expired link                      | Reference state unavailable; no automated authority claim              | U, IT, UI, RES       | WP-08, WP-12, WP-22        |
| [ ]    | AR-005 | Complete Suar content + dead link               | Readiness can pass if critical content is local; warning only          | U, IT, RP            | WP-09, WP-12               |
| [ ]    | AR-006 | Very long filler/placeholder text               | Still blocked for missing semantic sections                            | U, UI                | WP-09, WP-22               |
| [~]    | AR-007 | Rich text contains script/event handler         | Sanitized/rejected; no stored/rendered XSS                             | U, IT, UI, SEC       | WP-07, WP-11, WP-22, WP-29 |
| [ ]    | AR-008 | Critical image without alt/text summary         | Assignment blocker and accessible remediation                          | U, UI, RP, VS, AX    | WP-09, WP-22               |
| [ ]    | AR-009 | Decorative image without alt                    | Allowed if marked decorative; no false blocker                         | U, UI, AX            | WP-09, WP-22               |
| [ ]    | AR-010 | Unsupported/encrypted/oversized upload          | Safe error; Draft fields preserved; no false import                    | IT, UI, RP, RES, SEC | WP-11, WP-22, WP-29        |
| [ ]    | AR-011 | Paste/import mapping is uncertain               | Suggestion visibly uncertain; creator confirmation required            | U, UI, RP, VS        | WP-11, WP-22               |
| [~]    | AR-012 | Project Context only                            | Task inherits pinned visible version; provenance shown                 | U, CT, IT, UI        | WP-07, WP-08, WP-21, WP-22 |
| [~]    | AR-013 | Work Package override                           | Precedence deterministic; override reason/source visible               | U, CT, UI            | WP-08, WP-21, WP-22        |
| [ ]    | AR-014 | Empty Task override                             | Does not accidentally erase critical inherited field                   | U, IT                | WP-08, WP-11               |
| [ ]    | AR-015 | Cyclic/invalid inheritance IDs                  | Request rejected; no recursion/hang/partial version                    | U, IT, RES           | WP-07, WP-08               |
| [ ]    | AR-016 | Parent version archived after Draft             | Draft shows stale source; assign requires valid pinned snapshot policy | U, IT, UI            | WP-07–WP-09, WP-22         |
| [~]    | AR-017 | Cross-tenant Project/Work Package ID            | 404/deny without existence leak                                        | IT, SEC              | WP-07, WP-11, WP-29        |
| [ ]    | AR-018 | Concurrent autosave/manual save                 | One version wins; stale client gets conflict and retains input         | U, IT, UI, RP, RES   | WP-08, WP-11, WP-22        |
| [ ]    | AR-019 | Duplicate browser submit/retry                  | Idempotent one Task/version; UI resolves single result                 | IT, UI, RP, RES      | WP-11, WP-22               |
| [ ]    | AR-020 | Relevant skills are only Engineering/Technology | No forced category mix                                                 | U, IT, UI, RP        | WP-10, WP-22               |
| [ ]    | AR-021 | Zero skills on Operational-only Task            | Policy-specific allowed/blocked result is explicit                     | U, CT, UI            | WP-09, WP-10               |
| [ ]    | AR-022 | min > target or target > ceiling                | Field-level rejection; values not flattened                            | U, IT, UI            | WP-10, WP-22               |
| [ ]    | AR-023 | Draft navigation/refresh/offline                | Draft recovered; unsaved state warning; no duplicate                   | UI, RP, VS, RES      | WP-22                      |
| [ ]    | AR-024 | Keyboard-only desktop authoring                 | All delivered stages reachable; focus returns to blocker field         | UI, RP, VS, AX       | WP-22, WP-32               |

#### WP-11 backend evidence ledger (không thay thế master acceptance)

Các hàng dưới chỉ ghi layer đã có bằng chứng tự động. Master scenario/case phía trên tiếp tục `[ ]`
cho tới khi đủ toàn bộ required layers, đặc biệt UI, role-play (`RP`), visual screenshot (`VS`) và
accessibility (`AX`).

**Scope note — N/A, không phải hạng mục chưa hoàn thiện:**
`inertia/apps/user/tests/e2e/profile/profile_mobile_layout.spec.ts` là legacy mobile profile audit,
không thuộc Task→Verified Accomplishment và không được dùng làm acceptance evidence. Không triển khai
mobile UI, không thêm mobile checkpoint cho profile, và không dùng việc test này pass/fail để đánh dấu
WP-19/WP-26. Profile evidence trong gói này chỉ áp dụng cho desktop/current profile surface theo
đúng design.

**Backend evidence refresh (2026-08-09):** WP-07 Project Context/Work Package domain and public
fact boundary pass focused unit `16/16`, Project Context API integration `6/6`, Project Context fact
reader integration `2/2`, and Work Package repository/fact-reader integration `2/2`. Unconfirmed
Context/Work Package publications and executable rich markup are rejected before persistence or
post-commit effects. WP-09 deterministic readiness kernel passes `11/11`; WP-10 required-skill
semantics pass category rules `3/3`, persistence `2/2`, rubric API `1/1`, and semantic requirement
service integration `16/16`. These are backend ledger evidence only; master acceptance remains `[ ]`
until the required UI, role-play, visual, AX, security, audit, and resilience layers are proven.

**HTTP/event contract recheck (2026-08-09):** Project Context and Work Package publication routes
are reachable and authenticated: durable event schema/parser unit `11/11`, HTTP integration `6/6`,
and anonymous HTTP contract `2/2` pass. The event contract now accepts both change-event variants;
this is supporting backend evidence and does not promote TC-TVA-006/AR-012/AR-013 or the master
role-play rows to `[x]`.

**Project authoring context selector follow-up (2026-08-10):** the new tenant-scoped read contract
and explicit projection pass unit `2/2 + 4/4`, controller boundary `1/1`, Work Package catalog
integration `3/3`, and authoring-context HTTP integration `7/7`. The query reuses the existing
project-view authorization after tenant scoping. User/org authoring forms render loading/empty/error
states, reset stale pins on Project change and send `projectContextVersionId` /
`workPackageVersionId` in the authoring payload. Archived packages are omitted, unversioned active
packages are explicit, and internal provenance, hashes, structured internals and raw taxonomy are
absent. This advances AR-012/013/017 only to supporting `[~]` evidence; preview, full inheritance
precedence, RP/VS/AX/AUD and release gates stay open.

The resolved-brief follow-up adds focused coverage for supporting-reference availability and creator
Draft readiness in both user/org renderers (`2 files / 11 tests`): authenticated/unavailable references
are shown as secondary context, while the local contract remains visibly authoritative; Draft blockers
show their remediation hints. This is UI-layer evidence only and does not promote AR-005, AS-005 or
TC-TVA-020 until the required integration, role-play, audit and resilience layers are present.

**Authoring-surface parity follow-up (2026-08-09):** the org create-task form now renders the same
deterministic Readiness Card as the user form. The focused user/org form plus resolved-brief suite
passes `4 files / 15 tests`; this is component evidence for the readiness surface, not proof of
Assign gating, inheritance/import journeys, role-play, accessibility, audit or resilience cases.

**Assign-vs-draft preflight follow-up (2026-08-09):** focused user/org modal/form coverage passes
`4 files / 12 tests`: incomplete Publish remains disabled, while switching to `Save draft` keeps the
draft action enabled. Focused ESLint and `git diff --check` pass; backend readiness remains the final
authority and the broader assignment/import/recovery/AX/security/resilience rows remain open.

**Retry-safety follow-up (2026-08-09):** user/org create-task modal coverage passes `2 files / 10
tests` for a failed Draft request followed by an identical retry. The store freezes the idempotency
key, nested contract UUIDs and computed due date for one attempt, then invalidates that attempt on form
mutation or reset. Targeted ESLint and `git diff --check` pass. This is supporting evidence for AR-019;
server idempotency, refresh/offline recovery, autosave conflict retention and the required RP/RES layers
remain unchecked.

**Frontend evidence refresh (2026-08-09):** WP-23 resolved-brief renderer user/org parity passes
focused component tests `2 files / 7 tests` and focused lint; the full backend `tsc --noEmit` remains
open because of unrelated namespace/refactor errors. The
published authoring → assignee personal task board → resolved brief → acknowledgement role-play now
passes Chromium `1/1`; screenshot `05-assignee-acknowledged-brief.png` was captured. The HTTP
interaction boundary integration suite passes `30/30`, including durable clarification state and
rejection of acknowledgement while clarification is open. The project board
403 for an ordinary `project_member` is expected shared-workspace policy, so the assignee journey uses
the personal `/tasks` surface. The backend audience contract currently passes `4/4`. This remains
partial evidence: a dedicated contract-suite label, material-change diff/re-ack, AX/security and
resilience are still open.
`profile_mobile_layout.spec.ts` is explicitly **N/A/out-of-scope**, not an unfinished requirement; no
mobile UI is being implemented and this legacy audit must not block WP-19/WP-23/WP-26 acceptance.

The desktop Task authoring role-play `task_create_authoring_draft_roleplay.spec.ts` passes Chromium
`3/3` with one worker, including incomplete Draft save, link-only publish block, and evidence-enabled
publish → personal assignee route → resolved brief → acknowledge. The link-only blocked screenshot is
`test-results/e2e-visual/task-authoring-draft/link-only-readiness-blocked.png`. This is still
not whole-feature acceptance: material-change/re-ack, AX, security, resilience and release evidence
remain required.

Assignee completion browser recheck (2026-08-09): `task_submission_package.spec.ts` passes `5/5`
sequentially, including resolved brief/readiness, draft save, outsider denial, lock-after-submit,
real upload/submit and graceful not-found handling. This is supporting WP-24 evidence only; the
completion report is seeded in this suite and therefore cannot be counted as the unseeded RP-01 flow.

Runtime accessibility recheck (2026-08-09): `runtime_accessibility_roleplay.spec.ts` passes Chromium
`2/2` with axe-core for marketplace filters and Search Center, with no critical/serious violations.
The supporting testing-route safety integration is `4/4`; the seed now creates the four required
task-metadata taxonomy revision fixtures idempotently before search reindex. This is focused AX
evidence, not full RP/privacy/security acceptance.

Search regression recheck (2026-08-09): keyword-only Search Center and Saved View role-play pass
Chromium `2/2` sequentially after the fixture repair. This is supporting Search evidence only; full
privacy totals/facets, cutover and master RP gates remain open.

Mobile filter-state recheck (2026-08-09): combined Search/Filter Chromium checkpoint passes `6/6`;
marketplace filter-only is `3/3`, committed/draft Back/Cancel is `1/1`, and keyword-only Search
Center/Saved View are included. FilterDrawer + marketplace filter UI unit tests pass `10/10`; the
check covers no transient horizontal overflow, toast layering and focus restoration after Inertia or
browser-back navigation. This is supporting Search/AX evidence, not whole TVA acceptance.

Search Center consistency recheck (2026-08-09): the Discovery coverage regression unit passes `13/13`,
affected ESLint and `git diff --check` pass, and `svelte-check` reports `0 errors / 0 warnings`.
The keyword-only Chromium role-play passes `1/1`; visual inspection confirms that coverage totals,
domain counts, rendered Discovery card and top-signal state are mutually consistent. This remains
supporting Search evidence only and does not close privacy, cutover, master RP, performance/resilience
or release rows.

Focused affected-flow checkpoint: authoring `3/3`, submission `5/5`, reviewer observation `3/3`, and
talent discovery `3/3` pass together as Chromium `14/14` with one worker. This confirms the current
changes are stable in a controlled E2E server session; it does not promote the master RP rows.

Notification resilience checkpoint: worker/fanout/DLQ integration suites pass `16/16`, covering
lease fencing, retry/dead-letter, bounded replay/discard and audit rollback. This is supporting RES/
AUD evidence only; production operator rollout, load and full RP-01–RP-08 gates remain open.

**WP-08 evidence refresh (2026-08-09):** Task contract resolution unit `7/7`, specification/contract
persistence integration `8/8`, inheritance reader integration `1/1`, and historical reconstruction
integration `7/7` pass. The evidence covers precedence, empty-override behavior, circular/missing
inheritance, canonical hash/provenance, immutable successor rules, rich/structured mismatch paths,
draft non-readiness, transactional rollback, and pinned historical reads. These are backend
implementation proofs; TC-TVA-003/006/008 remain `[ ]` until the real authoring/assignment browser
journey, visible diff/acknowledgement, screenshot, AX/security and resilience layers are all proven.

**WP-22 evidence refresh (2026-08-09):** user/org authoring forms now render explicit mode/intent,
confirmation, specification text, structured scope/deliverables/acceptance/quality/constraint/
dependency fields and optional reference input. Focused component suites pass `2/2`; strict Svelte
check is `0 errors / 0 warnings`; focused lint passes. Seeded Chromium role-play
`task_create_authoring_draft_roleplay.spec.ts` passes `3/3` sequentially, including the link-only
publish block, incomplete draft save and evidence-enabled publish path, with screenshots captured and visually
inspected. The old fixed-account fixture lacked
organization statuses and is excluded from evidence. Evidence-enabled publish/assign, inheritance, recovery,
import, AX/security and resilience remain open, so related master acceptance rows stay `[ ]`.

The same seeded role-play previously passed operational publish `1/1`: it selects an assignee, fills the
complete Work Contract, adds one relevant technology capability, and verifies the created Task on the
board; publish-form and board screenshots were visually inspected. User/org frontend category-policy
regressions pass `2/2` and agree with backend `TC-TVA-007`: ordinary tasks do not inherit a global
four-category minimum. The current evidence-enabled path also passes `1/1` with a project rubric and
proficiency IDs; its form and board screenshots were visually inspected. A prior full-file rerun was
invalidated by local worker lease-loss/dead-letter attention; the isolated sequential rerun is current
evidence.
This does not prove reviewer/profile gates, inheritance, recovery, AX/security or resilience, so master
acceptance remains `[ ]`.

**Operational evidence refresh (2026-08-09):** the cache-invalidation worker drained the observed
backlog with `11312 processed`, `0 retried`, `0 dead-letter`, and `0 lease-lost`; final status is
`pending=0`, `leased=0`, `retryPending=0`, `deadLetter=0`. Notification projection report-only
reconciliation no longer crashes on a missing physical index, but correctly exposed the legacy
primary as incomplete (`missing=70`). A durable rebuild to
`suar_notifications_feed_v000002` then passed reconciliation with `scanned=70`,
`projected=70`, `missing=0`, `stale=0`, `extra=0`, `ahead=0`. An audited, exact-index alias repair
aligned the orphan alias with the DB-declared source; explicit promotion then succeeded. Final
status is read/write alias `suar_notifications_feed_v000002`, primary lag `0`, and a subsequent
report-only reconciliation passed `missing=0`, `stale=0`, `extra=0`, `ahead=0`. A stale reconcile
run was also closed instead of being resumed after its target ceased to be primary. Notification
outbox delivery backlog is now drained after the cutover (`pending=0`, `leased=0`,
`retryPending=0`, `processed=156`), but the bounded replay of historical DLQ rows produced
`NotificationPermanentDeliveryError` and leaves `deadLetter=118`. No DLQ rows were discarded;
operator disposition/recovery evidence remains open, so no broad `[x]` claim is made.

| Case                        | Backend layers proven | Automated evidence                                                                 | Layers still missing        |
| --------------------------- | --------------------- | ---------------------------------------------------------------------------------- | --------------------------- |
| TC-TVA-001 / AR-002         | U, CT, IT             | Title-only Draft, immutable Specification/readiness, HTTP response                 | UI, RP, VS                  |
| TC-TVA-003 backend slice    | U, CT, IT             | Complete local Work/Evidence Contract, authenticated reference warning, publish    | UI, RP, VS, AX              |
| AR-007                      | U                     | Script/event-handler and oversized local rich content rejected                     | IT stored-path, UI, SEC     |
| AR-014                      | U, IT                 | Empty task override does not erase inherited layer; exact pinned resolution        | —                           |
| AR-017                      | IT                    | Cross-tenant Project Context/Work Package pin denied without inherited data leak   | SEC adversarial suite       |
| AR-018                      | U, CT, IT, RES        | Head-row lock/CAS, stale `409`, transaction rollback, no leaked version/fence rows | UI input retention, RP      |
| AR-019                      | CT, IT, RES           | Create/update same-payload retry returns one Task/version and stable summary       | UI duplicate-submit journey |
| WP-11 audit confidentiality | U, IT                 | Audit stores version/state/finding codes only; spec/message/remediation absent     | SEC log review              |

#### WP-18/WP-19 backend evidence ledger (không thay thế master acceptance)

| Case                                    | Backend layers proven | Automated evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Layers still missing                              |
| --------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Historical assignment fact immutability | U, IT                 | `completed_assignment_profile_fact_exporter.spec.ts` 2/2: mutable/deleted current Task rows cannot rewrite snapshot-derived history; malformed legacy arrays fail closed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | RP, VS, AUD export                                |
| Work-history rebuild                    | IT                    | `work_history.spec.ts` 4/4: insert/update/retract/full rebuild; run sequentially because shared integration DB is not parallel-safe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | UI, RP, VS, AX                                    |
| Demonstrated-work profile scope         | U, IT, UI, RP, VS     | focused work-history unit `8/8` + Profile integration `4/4` prove authoritative verified projection precedence/public visibility, explicit active-public-projection gating, public removal after unpublish with self retention/cache invalidation, legacy fallback, user-predicate preservation, stable backend pagination/filtering and >100-row storage retrieval; Profile UI 2/2; conservative legacy-work role-play 2/2; authoritative verified-work role-play 2/2; dedicated desktop semantic/keyboard accessibility journey 1/1; populated legacy card/public snapshot visibly carry `Retrospective / limited`, while the verified card visibly carries `Review confirmed / high`; screenshots visually inspected | CT/API populated-card journey, UI pagination, SEC |
| Public snapshot provenance              | IT                    | `publish_user_profile_snapshot.spec.ts` 2/2 + `public_profile_snapshot_query.spec.ts` 7/7: public/private projection, version switch, token/revocation, conservative `retrospective` label and redaction of root/summary/highlight internal IDs; owner storage rows remain unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                    | UI, RP, VS, AX, SEC                               |

### 5.2 Assignment snapshot, acknowledgement và change control

| Status | ID     | Variation/failure                        | Expected result                                                       | Required layers            | Owner               |
| ------ | ------ | ---------------------------------------- | --------------------------------------------------------------------- | -------------------------- | ------------------- |
| [ ]    | AS-001 | Work readiness blocked                   | Assign rejected at domain/API/UI with same reason codes               | U, CT, IT, UI, RP          | WP-09, WP-13, WP-22 |
| [ ]    | AS-002 | Evidence governance absent               | Assign vẫn được nếu Work Contract đủ; không có evidence blocker giả | U, CT, IT, UI              | WP-09, WP-13        |
| [ ]    | AS-003 | Assignment-ready Task                    | Snapshot stores full resolved brief and source versions               | U, IT, AUD                 | WP-12, WP-13        |
| [ ]    | AS-004 | Project Context changes after assignment | Old snapshot unchanged; current context can be compared               | IT, RP, AUD                | WP-12, WP-13, WP-23 |
| [ ]    | AS-005 | Supporting link changes content          | Snapshot provenance/link metadata unchanged; no silent contract drift | IT, AUD, RES               | WP-13               |
| [ ]    | AS-006 | Assignee acknowledges twice/retry        | One acknowledgement fact; idempotent response                         | U, IT, UI, RES             | WP-13, WP-23        |
| [ ]    | AS-007 | Assignee requests clarification          | State/audit visible; no false acknowledgement                         | U, IT, UI, RP, VS          | WP-13, WP-23        |
| [ ]    | AS-008 | Editorial change                         | No re-ack if policy says non-material; history retained               | U, IT, UI                  | WP-13, WP-23        |
| [ ]    | AS-009 | Material scope change                    | New version + pending re-ack + clear diff                             | U, CT, IT, UI, RP, VS, AUD | WP-13, WP-23        |
| [ ]    | AS-010 | Material change during Review/Dispute    | No overwrite; governed new cycle or rejection                         | U, IT, RES, AUD            | WP-13, WP-15        |
| [ ]    | AS-011 | Reassign to another user                 | New actor acknowledgement required; old ownership preserved           | U, IT, UI, AUD             | WP-13, WP-23        |
| [ ]    | AS-012 | Assignee removed/deactivated             | Access revoked; snapshot/history not deleted                          | IT, SEC, AUD               | WP-13, WP-29        |
| [ ]    | AS-013 | Two concurrent assignments               | Invariant prevents conflicting active assignment                      | U, IT, RES                 | WP-13               |
| [ ]    | AS-014 | Legacy partial snapshot                  | Explicit legacy fallback/provenance; no crash/inflated proof          | CT, IT, UI, AUD            | WP-12, WP-13, WP-18 |

### 5.3 Completion Report, evidence và collaboration

| Status | ID     | Variation/failure                      | Expected result                                                                 | Required layers       | Owner                      |
| ------ | ------ | -------------------------------------- | ------------------------------------------------------------------------------- | --------------------- | -------------------------- |
| [ ]    | CR-001 | No report on completion               | A moves Task to Done without opening a report                                  | U, IT, UI, RP         | WP-13, WP-16, WP-22       |
| [ ]    | CR-002 | Optional report draft                | Governance report may be saved after Done; status remains Done                 | U, CT, IT, UI, RP, VS | WP-14, WP-24              |
| [ ]    | CR-003 | Optional evidence absent             | Reviewer can accept/reject from Task output/criteria; no upload blocker         | U, IT, UI, RP, VS     | WP-14, WP-15, WP-24       |
| [ ]    | CR-004 | Criterion marked N/A                   | Requires reason/policy; not silently skipped                                    | U, IT, UI             | WP-14, WP-24               |
| [ ]    | CR-005 | Evidence supports multiple criteria    | Many-to-many mapping retained without duplicate file                            | U, IT, UI             | WP-04, WP-14, WP-24        |
| [ ]    | CR-006 | Evidence URL expires before review     | Availability warning; retained metadata/hash/provenance                         | IT, UI, RP, RES       | WP-14, WP-25               |
| [ ]    | CR-007 | File upload succeeds, DB mapping fails | Retry/reconcile; no orphan shown as mapped evidence                             | IT, UI, RES           | WP-04, WP-14, WP-24        |
| [ ]    | CR-008 | DB commits, notification fails         | Submission durable; notification retries observably                             | IT, RES, AUD          | WP-14, WP-17               |
| [ ]    | CR-009 | Duplicate final submit                 | One locked revision/review intent                                               | IT, RP, RES           | WP-14, WP-24               |
| [ ]    | CR-010 | Evidence deleted after lock            | Governed tombstone/revision; no silent disappearance                            | U, IT, UI, AUD        | WP-14, WP-29               |
| [ ]    | CR-011 | Confidential evidence                  | Only eligible reviewers see metadata/content                                    | IT, UI, SEC           | WP-14, WP-24, WP-25, WP-29 |
| [ ]    | CR-012 | Malicious mime/file/url                | Rejected/quarantined; no execution/SSRF assumption                              | IT, SEC, RES          | WP-14, WP-29               |
| [ ]    | CR-013 | Two contributors                       | Separate claim and ownership statement per user                                 | U, IT, UI, RP, VS     | WP-14, WP-24               |
| [ ]    | CR-014 | Contributor rejects attribution        | Claim remains pending/removed by governed revision                              | U, IT, UI, AUD        | WP-14, WP-24               |
| [ ]    | CR-015 | One contributor claims all shared work | Reviewer sees conflict/ownership evidence requirement                           | U, UI, RP             | WP-14, WP-15, WP-25        |
| [ ]    | CR-016 | Task canceled after report Draft       | Draft retained per policy; cannot create verified output                        | U, IT, UI             | WP-14, WP-16               |
| [ ]    | CR-017 | Material change after work completed   | Completion references acknowledged version; deviation explicit                  | U, IT, UI, AUD        | WP-13, WP-14, WP-24        |
| [ ]    | CR-018 | Mobile/offline upload retry            | Progress and retry safe; no double evidence row                                 | UI, RP, VS, RES       | WP-24, WP-32               |

### 5.4 Review observations, disputes và accomplishment lifecycle

| Status | ID     | Variation/failure                           | Expected result                                                  | Required layers            | Owner                    |
| ------ | ------ | ------------------------------------------- | ---------------------------------------------------------------- | -------------------------- | ------------------------ |
| [ ]    | RV-001 | Deliverable accepted, capability not proven | Output may pass; capability claim remains unverified             | U, CT, IT, UI              | WP-15, WP-25             |
| [ ]    | RV-002 | Reviewer accepts exact claim                | Structured observation links claim/evidence/snapshot             | U, IT, AUD                 | WP-15                    |
| [ ]    | RV-003 | Reviewer narrows ownership                  | Accomplishment reflects narrower scope only                      | U, CT, IT, UI, RP, VS      | WP-15, WP-16, WP-25      |
| [ ]    | RV-004 | Reviewer rejects claim                      | No verified accomplishment for rejected claim                    | U, IT, UI, AUD             | WP-15, WP-16             |
| [ ]    | RV-005 | Reviewer lacks evidence access              | Cannot assert evidence reviewed; workflow blocks/escalates       | U, IT, UI, SEC             | WP-15, WP-25, WP-29      |
| [ ]    | RV-006 | Self-review/conflict of interest            | Reviewer ineligible; denial auditable                            | U, IT, SEC, AUD            | WP-15, WP-29             |
| [ ]    | RV-007 | Second reviewer required/missing            | Candidate remains pending, not verified                          | U, IT, UI, RP              | WP-15, WP-25             |
| [ ]    | RV-008 | Reviewers disagree                          | Conflict state/authority policy explicit; no averaging heuristic | U, IT, UI                  | WP-15, WP-25             |
| [ ]    | RV-009 | Dispute opened before confirmation          | Projection blocked/frozen                                        | U, IT, RES, AUD            | WP-15–WP-17              |
| [ ]    | RV-010 | Dispute after publish                       | Public/profile/search projection frozen/tombstoned per policy    | U, IT, RP, VS, SEC, AUD    | WP-16–WP-20, WP-25–WP-27 |
| [ ]    | RV-011 | Correction after resolution                 | New observation/accomplishment revision supersedes old           | U, CT, IT, AUD             | WP-15–WP-17              |
| [ ]    | RV-012 | Duplicate review-confirmed event            | One accomplishment and one signal set                            | U, IT, RES, AUD            | WP-16, WP-17             |
| [ ]    | RV-013 | Events delivered out of order               | Receipt/version policy defers/rejects safely                     | U, IT, RES                 | WP-17                    |
| [ ]    | RV-014 | Worker crashes at DB/external boundary      | Durable retry resumes without duplicate                          | IT, RES, AUD               | WP-17, WP-31             |
| [ ]    | RV-015 | Requirement target level high               | Does not copy target directly to verified profile                | U, IT, AUD                 | WP-10, WP-15, WP-16      |
| [ ]    | RV-016 | Assessment ceiling lower than claimed level | Signal impact capped with explanation                            | U, CT, IT, UI              | WP-15, WP-16, WP-26      |
| [ ]    | RV-017 | Operational-only Task completes/reviews     | No profile-eligible accomplishment                               | U, IT, RP                  | WP-16–WP-19              |
| [ ]    | RV-018 | Public wording broader than verified claim  | Reject/correct; internal fact unchanged                          | U, CT, IT, UI, RP, VS, SEC | WP-16, WP-19, WP-26      |
| [ ]    | RV-019 | User/org/source deleted                     | Lifecycle/tombstone/retention policy applies; audit survives     | U, IT, SEC, AUD            | WP-16, WP-29             |
| [ ]    | RV-020 | Projector rebuild                           | Same source facts produce same canonical hash/output             | U, IT, RES, AUD            | WP-16, WP-31             |

#### WP-16 backend evidence ledger (không thay thế master acceptance)

Các hàng master vẫn giữ `[ ]` cho tới khi đủ mọi layer bắt buộc, đặc biệt API composition, UI,
role-play, screenshot, security và audit evidence. Ledger này chỉ ghi phần backend đã được chứng minh
bằng test tự động.

| Case                 | Backend layers proven | Automated evidence                                                                                                                                                                                                                                                                                                                                                                                                        | Layers still missing                      |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| RV-003 / RV-004      | U                     | Reviewer-narrowed ownership projects partial bounded content; rejected/conflicted/draft/AI decision blocks                                                                                                                                                                                                                                                                                                                | CT, IT orchestration, UI, RP, VS          |
| RV-005 / RV-007      | U                     | Inaccessible/insufficient evidence and missing reviewer quorum block verification                                                                                                                                                                                                                                                                                                                                         | IT source adapter, UI, SEC                |
| RV-009 / RV-017      | U                     | Unresolved dispute and Operational-only/profile-ineligible work do not reach the writer                                                                                                                                                                                                                                                                                                                                   | IT race, RP, AUD                          |
| RV-012               | U, IT, RES            | Deterministic identity; exact replay; completed replay no-op (`confirm_review.spec.ts` 10/10); native projector replay returns the same aggregate/projection key with one aggregate and three lifecycle rows (`review_confirmed_accomplishment_projector_transaction.spec.ts` 2/2); child-provenance collision; eight concurrent attempts create one row; bounded DLQ replay unit/integration `8/8 + 4/4`                 | Durable event receipt in WP-17            |
| RV-013               | IT, RES               | Same-aggregate predecessor fencing, retry/lease recovery, dead-letter progression and review-confirmed payload ordering (`domain_event_outbox_recovery.spec.ts` 16/16); DLQ status/preview/replay preserves attempt history, redacts payloads and refuses locked partial replay (`domain_event_outbox_administration.spec.ts` unit `8/8`, integration `4/4`)                                                              | UI, RP, AUD, profile correction semantics |
| RV-015 / RV-016      | U                     | Requirement target is absent from proof; observed capability level is capped by authorized assessment ceiling                                                                                                                                                                                                                                                                                                             | CT, IT, UI, AUD                           |
| RV-020 / NFR-TVA-002 | U, IT, RES            | Same governed facts yield the same UUID/key/hash; mutable current Task title is absent from derivation                                                                                                                                                                                                                                                                                                                    | Full historical rebuild in WP-18          |
| FR-TVA-022 / NFR-001 | U, IT, AUD-shape      | Exact claim/evidence/observation links, restrictive same-aggregate FKs and append-only lifecycle revisions                                                                                                                                                                                                                                                                                                                | Production audit export                   |
| WP-16 domain gate    | U, IT                 | Lifecycle/projector/public-projection unit `19/19`; capability/content/projection-rule unit `29/29`; repository/lifecycle/public-projection/source-reader integration `20/20`; rebuild command unit `2/2` plus native rebuild/hash stability in `review_confirmed_accomplishment_projector_transaction.spec.ts` `2/2`; deterministic content, bounded claim derivation, capability provenance and public allowlist proven | RP, VS                                    |

#### Review UI evidence ledger (không thay thế master acceptance)

The canonical project-scoped task review board now has a real browser journey: owner submits,
manager submits, worker accepts and the dispute path reports to the admin/AI queue (`task_review_board_demo.spec.ts`,
Chromium `2/2`). The fixture explicitly seeds an assignment-pinned native workflow and reviewer
rows. Screenshots are stored under `test-results/e2e-visual/task-review-board/`.

The former org E2E `review_lifecycle_experience.spec.ts` was removed as invalid evidence: it called
deleted `/reviews/:reviewSessionId` and `/reviews/disputes/:disputeId` pages and returned 404. The
canonical board journey is the supported review UI surface; this does not mark the broader review
observation/dispute acceptance rows complete.

WP-25 vertical-slice recheck (2026-08-09): the org and user task-detail panels now expose the
server-projected assignment snapshot/report/claim/evidence context and a native observation form;
focused component tests pass `15/15`, `svelte-check` reports `0 errors / 0 warnings`, and related
backend context/detail integration passes `6/6`. Native reviewer browser role-play now passes `3/3`
(confirm, narrow, reject), with governed rationale rendered after the server response; the confirm
scenario also captures the provenance screenshot. This is supporting evidence only. Master rows
TC-TVA-012, RV-001–RV-020 and RP-01–RP-08 remain `[ ]` because quorum/conflict,
dispute/correction, privacy/audit, screenshots and full role-play provenance are not yet proven.

Additional regression recheck: task command/access suites pass `12/12`, focused type checks pass,
and authenticated Search Discovery Chromium role-play passes `1/1`. These results are unrelated
supporting gates; the existing task-review-board E2E still exercises only task-review messages and
dispute routing because its fixture has no native completion report/claim/evidence package, so it
must not be counted as reviewer claim-verification evidence.

The reviewer observation endpoint is now wired through the existing application command/factory;
the sequential native role-play passes `3/3` (confirm, narrow, reject), including durable history
after reload and the governed rationale/provenance screenshot. This remains supporting evidence:
quorum/conflict, dispute/correction, privacy/audit and full RP-01–RP-08 provenance are still open.

Native reviewer authorization recheck (2026-08-10): the assignment authorization policy passes `5/5`:
pending and submitted native assignments authorize, waived assignments and legacy-only outsider rows
do not, and legacy workflow rows remain a compatibility path only when the native session assignment
table is empty. This proves the access boundary, not governed quorum/finalization.

Talent discovery role-play evidence is partial: the visible org UI filter, canonical cursor/search
contract and same-talent contains-all skill selection pass when run sequentially in isolation. The
full three-test run was invalidated by the local E2E server exiting between tests, so WP-27 and the
master recruiter scenarios remain `[~]`/`[ ]` until a stable run plus privacy/facet/performance gates.

Recruiter directory/bookmark/publication recheck (2026-08-09): the canonical org talent directory
role-play
passes `5/5` with a full-page screenshot, and the legacy bookmark/workspace suite was corrected to
use the current organization fixture and public selectors, then passes `4/4`. This proves directory
and bookmark interaction. A follow-up owner-driven browser flow now creates consent/decision facts
through `POST /api/v1/accomplishments/:id/publication`, then the recruiter role-play asserts the
resulting `Public-safe`/`Verified` card and excludes the private source marker/task/reviewer/evidence
strings; that publication flow passes `1/1`. This still does not prove privacy-safe facets/totals,
index cutover, or the complete recruiter RP journey.

WP-25 UI parity recheck now passes `16/16`; the observation panel remains available after the
reviewer message is submitted, as required by the native authoring-context reader. AI callback
mapper boundary regression passes `4/4`; this is a separate compile/contract repair and does not
upgrade any TVA master row.

### 5.5 Profile, publication, Search và privacy

| Status | ID     | Variation/failure                     | Expected result                                                                                                                             | Required layers      | Owner                             |
| ------ | ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------- |
| [ ]    | PS-001 | User has no accomplishments           | Honest empty state; skills/history still usable                                                                                             | CT, UI, RP, VS       | WP-19, WP-26                      |
| [ ]    | PS-002 | User has only legacy work             | Separate legacy/retrospective labels; no verified badge                                                                                     | CT, IT, UI, RP, VS   | WP-18, WP-19, WP-26               |
| [ ]    | PS-003 | Verified API design work              | Card shows action/object/ownership/context/output/verification                                                                              | CT, IT, UI, RP, VS   | WP-19, WP-26                      |
| [ ]    | PS-004 | Multiple contributor roles            | Profile shows exact contribution, not entire team output                                                                                    | U, CT, UI, RP        | WP-16, WP-19, WP-26               |
| [ ]    | PS-005 | Private source/public-safe projection | Only approved summary shown; source detail absent from props                                                                                | CT, IT, UI, SEC      | WP-16, WP-19, WP-26, WP-29        |
| [ ]    | PS-006 | User unpublishes item                 | Public Profile/Search remove/tombstone within SLO                                                                                           | IT, RP, VS, SEC, RES | WP-19, WP-20, WP-26, WP-27, WP-31 |
| [ ]    | PS-007 | Accomplishment revoked/disputed       | Status/tombstone policy consistent across Profile/Search                                                                                    | CT, IT, UI, RP, VS   | WP-16, WP-19, WP-20, WP-26, WP-27 |
| [ ]    | PS-008 | Shared public snapshot is old         | Snapshot stays immutable/versioned; current Profile distinct                                                                                | CT, IT, UI, AUD      | WP-19, WP-26                      |
| [ ]    | PS-009 | Hundreds of accomplishments           | Pagination/sort stable; no duplicates; performance target                                                                                   | IT, UI, PERF         | WP-19, WP-26, WP-31               |
| [ ]    | PS-010 | Search API design + primary owner     | Verified work outranks title/skill-only baseline                                                                                            | CT, IT, RP, VS, PERF | WP-20, WP-27, WP-31               |
| [ ]    | PS-011 | Search database scaling               | Scale/context/ownership contribute explainably                                                                                              | CT, IT, RP, VS       | WP-20, WP-27                      |
| [ ]    | PS-012 | Search production debugging           | Environment/action/confidence match, not title-only                                                                                         | CT, IT, RP, VS       | WP-20, WP-27                      |
| [ ]    | PS-013 | Vietnamese/English alias              | Canonical taxonomy maps without false broadening                                                                                            | CT, IT, UI           | WP-20, WP-27 + Search plan        |
| [ ]    | PS-014 | Private exact-term search             | No candidate, total, facet, snippet or explanation leak                                                                                     | CT, IT, RP, VS, SEC  | WP-20, WP-27, WP-29               |
| [ ]    | PS-015 | Mixed public/private accomplishments  | Ranking/explanation use only viewer-authorized facts                                                                                        | IT, SEC              | WP-20, WP-29                      |
| [ ]    | PS-016 | Index lag after publish/unpublish     | UI status/lag behavior explicit; tombstone SLA measured                                                                                     | IT, UI, RES, PERF    | WP-20, WP-27, WP-31               |
| [ ]    | PS-017 | Search unavailable                    | Profile remains usable; retry/error does not leak query/private data                                                                        | IT, UI, RES, SEC     | WP-20, WP-27, WP-31               |
| [ ]    | PS-018 | Mobile recruiter scan                 | Card hierarchy/action/ownership readable; filters operable                                                                                  | UI, RP, VS, AX       | WP-26, WP-27, WP-32               |
| [ ]    | PS-019 | Public taxonomy policy absent         | No taxonomy refs/aliases/provenance/evidence metadata cross public boundary; fail-closed containment or approved term allowlist is explicit | CT, IT, SEC, AUD     | WP-20, WP-26, WP-27, WP-29        |

### 5.6 Legacy, operations, resilience và audit

| Status | ID     | Variation/failure                      | Expected result                                                   | Required layers | Owner               |
| ------ | ------ | -------------------------------------- | ----------------------------------------------------------------- | --------------- | ------------------- |
| [ ]    | OP-001 | Legacy row lacks snapshot              | Classified/quarantined or retrospective; no native verified claim | IT, AUD         | WP-18, WP-30        |
| [ ]    | OP-002 | Corrupt legacy JSON                    | Per-record failure report; job continues safely                   | IT, RES, AUD    | WP-30               |
| [ ]    | OP-003 | Backfill restarted                     | Resume from checkpoint; no duplicate accomplishment               | IT, RES         | WP-30               |
| [ ]    | OP-004 | Two backfill workers overlap           | Idempotent/locked processing                                      | IT, RES         | WP-30               |
| [ ]    | OP-005 | Current source changes during backfill | Exact source/version recorded; conflict visible                   | IT, RES, AUD    | WP-30               |
| [ ]    | OP-006 | Old and new app nodes coexist          | Versioned contracts/dual read/write stay compatible               | CT, IT, RES     | WP-01, WP-28, WP-30 |
| [ ]    | OP-007 | Feature flags partially enabled        | Invalid combinations rejected; no half-pipeline proof             | U, IT, RES      | WP-28, WP-30        |
| [ ]    | OP-008 | Rollback after immutable facts exist   | New reads disabled without deleting facts/audit                   | IT, RES, AUD    | WP-30               |
| [ ]    | OP-009 | Cache/Redis unavailable                | Authoring/review core remains correct or fails explicitly         | IT, RES         | WP-11, WP-17, WP-31 |
| [ ]    | OP-010 | Outbox/projector backlog               | Lag metric/alert; no lost/duplicate projection                    | IT, RES, PERF   | WP-17, WP-31        |
| [ ]    | OP-011 | Rebuild hash mismatch                  | Quarantine/alert; no silent overwrite                             | IT, RES, AUD    | WP-18, WP-31        |
| [ ]    | OP-012 | Trace/log error path                   | Sensitive bodies/URLs/tokens absent                               | IT, SEC, AUD    | WP-29, WP-31        |
| [ ]    | OP-013 | Rich snapshot/version explosion        | Retention/index/query performance measured                        | IT, PERF        | WP-03, WP-31        |
| [ ]    | OP-014 | Hot tenant/concurrent review confirms  | Lock/transaction throughput within approved SLO                   | IT, RES, PERF   | WP-17, WP-31        |

## 6. Mandatory role-play E2E journeys

### RP-01 — API design: native happy path from creator to recruiter

- [ ] Seed only organization, project, actors and taxonomy prerequisites; do not seed completed Task,
      Completion Report, Review or Accomplishment.
- [ ] Login as `ACT-CREATOR`; create Project Context and Work Package through UI.
- [ ] Start Task “Thiết kế API cho module đơn hàng đặt trước”; initially enter title + link.
- [ ] Assert blockers, then capture `01-creator-link-only-readiness-blocked.png`.
- [ ] Fill rich specification, Work/Evidence Contract, relevant capabilities and creator confirmation.
- [ ] Assert Assignment-ready, resolved inherited preview, then capture
      `02-creator-api-task-assignment-ready.png`.
- [ ] Assign `ACT-ASSIGNEE`; clear cookies/login as assignee; open resolved brief and acknowledge.
- [ ] Assert version/source/output/evidence expectations, then capture
      `03-assignee-api-resolved-brief-acknowledged.png`.
- [ ] Complete actual API design/implementation report through UI and map criteria/evidence.
- [ ] Capture `04-assignee-api-completion-coverage.png` after coverage assertions.
- [ ] Login as `ACT-REVIEWER`; verify criterion, ownership and capability observations through UI.
- [ ] Capture `05-reviewer-api-claim-verification.png` before governed confirmation.
- [ ] Login as reviewee; verify candidate/verified state and publish safe summary.
- [ ] Capture `06-user-api-accomplishment-detail.png` and `07-user-profile-demonstrated-work.png`.
- [ ] Login as `ACT-RECRUITER`; search API design + primary owner; assert explanation and open profile.
- [ ] Capture `08-recruiter-api-search-explanation.png` and
      `09-recruiter-api-profile-proof.png`.
- [ ] Audit exact assignment/contract/completion/review/accomplishment source IDs and ensure browser
      errors/network 5xx lists are empty.

### RP-02 — Database scaling: collaborative attribution

- [ ] Creator creates a Task with measurable before/after performance targets; enabling profile
      governance is optional and must not change the A → Done path.
- [ ] Primary assignee and contributor acknowledge roles.
- [ ] Both create separate ownership claims: schema/query design versus load testing/operations.
- [ ] Capture `01-two-contributors-completion-claims.png` after per-user assertions.
- [ ] Reviewer accepts contributor load-test claim but narrows primary ownership where appropriate.
- [ ] Capture `02-reviewer-database-scaling-attribution.png`.
- [ ] Publish two different public-safe accomplishments; ensure neither claims entire team result.
- [ ] Capture both Profile cards and recruiter result explanation.
- [ ] Search by database scaling + scale/context; verify action/ownership and benchmark facts.
- [ ] Audit no duplicated evidence becomes duplicated ownership.

### RP-03 — Production debugging: restricted evidence/public-safe output

- [ ] Create Task with internal incident context and confidential logs, plus local sanitized execution
      brief.
- [ ] Assignee can execute/review without opening external incident system.
- [ ] Reviewer sees allowed confidential evidence; recruiter cannot.
- [ ] Capture authorized review evidence state without exposing actual secret values.
- [ ] Publish redacted accomplishment “diagnosed production incident” within verified scope.
- [ ] Search as external recruiter; capture safe action/environment/confidence explanation.
- [ ] Search exact private incident/token terms; assert zero candidate/facet/count/snippet leakage.
- [ ] Capture `private-term-zero-leakage.png` with only safe query/result state.
- [ ] Inspect serialized page props, network responses, logs and index document for restricted fields.

### RP-04 — Readiness/accessibility negative journey

- [ ] Create link-only Draft and critical image-only flow.
- [ ] Attempt Assign through UI and direct API; both fail with same stable reason codes.
- [ ] Keyboard-navigate Readiness Card to missing section; focus lands on text-equivalent field.
- [ ] Capture the desktop blocked state. Mobile blocked-state coverage is out of scope because no
      mobile UI is delivered.
- [ ] Add accessible text and local critical content; leave source authenticated/unavailable.
- [ ] Assert readiness passes and assignee brief remains usable; capture final accessible state.

### RP-05 — Material change và historical immutability

- [ ] Assignee acknowledges version 2.
- [ ] Creator expands design-only scope to implementation; capture version diff/pending re-ack.
- [ ] Assignee cannot continue governed submission until re-acknowledgement.
- [ ] Complete/review version 3 and publish accomplishment.
- [ ] Edit current Task title/domain/skills after publication.
- [ ] Run rebuild through approved test hook/job, not a mocked projector.
- [ ] Assert canonical accomplishment statement/provenance/hash unchanged; capture historical detail
      alongside current Task change indication.

### RP-06 — Reviewer narrowing, dispute, correction

- [ ] User claims primary API design + implementation.
- [ ] Reviewer narrows to implementation contribution and submits rationale.
- [ ] Capture reviewer decision and user-visible narrowed candidate.
- [ ] User opens dispute; capture frozen Profile/accomplishment state.
- [ ] Search as recruiter and assert disputed claim is absent/frozen per policy.
- [ ] Resolve with corrected observation; replay duplicate events.
- [ ] Assert exactly one corrected/superseding accomplishment and correct audit chain.
- [ ] Capture corrected Profile and Search explanations.

### RP-07 — Publication, unpublish, privacy và tombstone

- [ ] Publish one public and retain one private accomplishment for same search terms.
- [ ] External recruiter sees only public fact; capture result and facet totals.
- [ ] Unpublish public fact through Profile UI.
- [ ] Await/observe projection status and search tombstone within configured test SLA.
- [ ] Assert candidate/count/facet/snippet/explanation no longer reveal either fact.
- [ ] Capture Profile publication status and safe zero-result recruiter state.
- [ ] Verify old public snapshot behavior follows immutable snapshot policy without leaking newly
      restricted content beyond approved policy.

### RP-08 — Legacy retrospective reconstruction

- [ ] Seed legacy Task/submission without locked Evidence Contract.
- [ ] Confirm old Profile remains available before migration.
- [ ] Run retrospective UI/workflow with authorized evidence/reviewer.
- [ ] Capture provenance warning and confidence limitation before confirmation.
- [ ] Publish retrospective item; capture Profile label distinct from native verified item.
- [ ] Search and assert confidence/provenance explanation; no native-prework label.
- [ ] Replay backfill/reconstruction and assert no duplicate.

## 7. Screenshot and visual evidence contract

### 7.1 Artifact location and naming

All success-path evidence goes under:

```text
test-results/e2e-visual/task-to-accomplishment/<journey-id>/
```

Name format:

```text
<two-digit-sequence>-<actor>-<surface>-<state>.png
```

Ví dụ:

```text
01-creator-task-authoring-readiness-blocked.png
02-creator-task-authoring-assignment-ready.png
03-assignee-task-detail-contract-acknowledged.png
04-assignee-completion-report-coverage-complete.png
05-reviewer-review-package-claim-narrowed.png
06-reviewee-profile-accomplishment-published.png
07-recruiter-search-result-match-explained.png
```

### 7.2 Screenshot checkpoint rules

- [ ] Semantic `expect(...)` assertions chạy trước screenshot.
- [ ] Screenshot chụp `main`, relevant locator hoặc viewport ổn định; tránh full-page khổng lồ nếu
      không cần chứng minh relationship toàn trang.
- [ ] Toast/menu/loading overlay không che state cần review.
- [ ] Actor identity/role, surface heading và primary state có thể xác định từ ảnh hoặc manifest.
- [ ] Không capture credentials, CSRF token, private URL, raw confidential evidence hoặc unrelated
      personal data.
- [ ] Mỗi delivered major surface có desktop screenshot. Không thêm mobile checkpoint cho
      authoring/task brief/completion/profile vì mobile UI không thuộc phạm vi delivery này; Search/
      Filter mobile evidence sẽ được định nghĩa trong wave deferred.
- [ ] Stable deterministic components có thêm `expect(locator).toHaveScreenshot()` visual regression;
      dynamic full journeys dùng evidence screenshot + semantic assertions để tránh brittle baseline.
- [ ] Screenshot manifest ghi scenario ID, actor, route, viewport, data classification, expected
      observation và source commit.
- [ ] QA reviewer kiểm tra ảnh như người dùng, không chỉ kiểm tra file tồn tại.

### 7.3 Role-play implementation rules

- [ ] API seed chỉ tạo prerequisites/actors. Core action đang kiểm tra phải đi qua UI.
- [ ] Mỗi lần đổi actor phải clear cookies/session và login lại; không mutate session thủ công.
- [ ] Dùng accessible role/name selectors; `data-testid` chỉ khi không có semantic selector hợp lý.
- [ ] Theo dõi `pageerror`, failed requests và unexpected HTTP 5xx; test fail nếu còn lỗi.
- [ ] Không dùng `waitForTimeout` làm readiness proof; chờ observable UI/network condition.
- [ ] Time/recency dùng frozen clock hoặc deterministic timestamps.
- [ ] Test cleanup/seed isolation không phụ thuộc execution order; unique scenario ID trong data.
- [ ] Không chụp screenshot rồi bỏ qua business assertion; không dùng screenshot existence làm pass.

## 8. Suggested automated spec ownership

| Suite                          | Proposed file                                                                                | Primary coverage                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| Creator authoring role-play    | `inertia/apps/org/tests/e2e/task_to_accomplishment/creator_authoring_roleplay.spec.ts`       | TC-001–008, RP-01/RP-04                |
| Assignee completion role-play  | `inertia/apps/user/tests/e2e/task_to_accomplishment/assignee_completion_roleplay.spec.ts`    | TC-004, TC-008–011, RP-01/RP-02        |
| Review lifecycle role-play     | `inertia/apps/org/tests/e2e/task_to_accomplishment/review_accomplishment_roleplay.spec.ts`   | TC-012–014, TC-018, RP-05/RP-06        |
| Profile proof role-play        | `inertia/apps/user/tests/e2e/task_to_accomplishment/profile_accomplishment_roleplay.spec.ts` | TC-009, TC-012–014, TC-018–019         |
| Talent discovery role-play     | `inertia/apps/org/tests/e2e/task_to_accomplishment/talent_discovery_roleplay.spec.ts`        | TC-015–017, RP-01–RP-03/RP-07          |
| Legacy/retrospective role-play | `inertia/apps/user/tests/e2e/task_to_accomplishment/retrospective_roleplay.spec.ts`          | TC-019, RP-08                          |
| Visual checkpoint helpers      | `inertia/apps/*/tests/shared/e2e/task_to_accomplishment_visual_helpers.ts`                   | Stable capture/manifest/browser errors |
| Seed prerequisites             | Testing-only endpoint/service with explicit TVA scenario contract                            | Actors/project/taxonomy only           |

Testing endpoints must be disabled outside test environment and must not implement the core user action
being proved.

## 9. Execution tiers and release gates

### Tier 0 — Worker focused loop

- [ ] Relevant `U/CT/IT/UI` cases for package pass.
- [ ] Worker records RED and GREEN commands.
- [ ] No matrix row becomes `[x]` if downstream RP/VS evidence is still missing.

### Tier 1 — Pull request gate

- [ ] Focused package tests.
- [ ] Affected contract/integration suites.
- [ ] Affected component suites.
- [ ] Chromium P0 role-play slice for changed flow.
- [ ] Screenshot artifacts uploaded/reviewable.
- [ ] `pnpm run test:e2e:policy` passes.

### Tier 2 — Integration wave gate

- [ ] Cross-module role-play flow from actual UI.
- [ ] Provenance/audit query after browser journey.
- [ ] Cross-tenant/privacy negative path.
- [ ] Duplicate/retry/concurrency case.
- [ ] Desktop screenshot checkpoints for the delivered surfaces; mobile is explicitly out of scope.

### Tier 3 — Release candidate

- [ ] TC-TVA-001–020 all `[x]`.
- [ ] RP-01–RP-08 all `[x]` or explicit product-approved deferral outside P0.
- [ ] Chromium/Firefox/WebKit matrix pass for required desktop journeys; mobile is not a release gate
      for this delivery.
- [ ] Screenshot manifest complete and manually reviewed by Product/QA owner.
- [ ] Full confidence, contract, E2E, typecheck, Svelte strict, lint, build pass.
- [ ] Privacy/index audit, rebuild hash comparison, performance SLO and rollback drill pass.
- [ ] Zero unexplained skip/flaky retry/false-pass pattern.

## 10. Matrix traceability and anti-drift rules

- [ ] Mỗi automated test name/tag chứa scenario/case ID, ví dụ
      `test('@tva @p0 TC-TVA-002 AR-003 ...')`.
- [ ] Mỗi case ID xuất hiện trong đúng một ownership manifest nhưng có thể được nhiều test layers
      reference.
- [ ] CI linter báo acceptance scenario thiếu required layer/test reference/screenshot manifest.
- [ ] Worker không tự đánh `[x]` master scenario; coordinator/QA cập nhật sau khi evidence bundle pass.
- [ ] Khi requirement/contract thay đổi, matrix update nằm cùng commit hoặc merge bị block.
- [ ] Deleted test không được xóa case silently; case chuyển owner hoặc ghi approved deprecation.
- [ ] Screenshot diff/evidence failure phải nêu actor, checkpoint và user-visible regression, không chỉ
      pixel percentage.
- [ ] Flaky test bị quarantine có owner/deadline và release impact; P0 journey không được “temporary
      skip” để release.

## 11. Reader/experience review checklist

Sau automation, một reviewer chưa tham gia implementation xem screenshot sequence và trả lời:

- [ ] Creator có hiểu vì sao Task chưa ready và phải sửa ở đâu không?
- [ ] Creator có nhìn thấy nội dung inherited và biết version/source không?
- [ ] Assignee có thể nói lại scope, output, acceptance và version mà không mở external link; biết
      evidence/report là optional governance nếu Task bật policy?
- [ ] Assignee có nhận ra material change và biết phải re-ack không?
- [ ] Reviewer có phân biệt expected work, actual work, evidence, ownership và capability observation?
- [ ] Reviewee có hiểu claim nào được accept/narrow/reject và vì sao?
- [ ] Recruiter có xác định được action, ownership, context, output và verification trong vài giây?
- [ ] Recruiter có hiểu vì sao search result match mà không thấy private data?
- [ ] Legacy/retrospective/public/private states có bị nhầm với native verified không?
- [ ] Mobile sequence có giữ đúng hierarchy và primary action không?

Nếu người đọc phải dựa vào giải thích miệng từ developer để trả lời, journey chưa pass experience gate
dù toàn bộ automated assertions đang xanh.

## 12. Matrix completion definition

- [ ] 100% FR/BR/NFR và TC-TVA-001–020 trace tới case/test/evidence owner.
- [ ] Mỗi P0 flow có ít nhất Unit/Contract/Integration/Component/Role-play E2E phù hợp, không thiếu
      chốt chặn do “layer khác đã test rồi”.
- [ ] RP-01–RP-08 có deterministic seed, semantic assertions, screenshots và provenance audit.
- [ ] Security/privacy cases prove absence from response, props, cache, logs, index, counts, facets,
      snippets và explanation.
- [ ] Concurrency/retry/replay/rebuild cases có failure injection thực, không chỉ mock happy result.
- [ ] Product/QA review screenshot sequence từ góc nhìn từng actor và chấp nhận trải nghiệm.
- [ ] Test artifacts đủ để một người không biết implementation vẫn hiểu flow nào đã chạy, state nào đã
      đạt và failure nào đã bị ngăn.
