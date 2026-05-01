# Task To Verified Accomplishment — Multi-Worker TDD Implementation Plan

## Product correction — 2026-08-10 (authoritative)

The delivery workflow is deliberately simpler than the optional accomplishment-governance
pipeline:

```text
Creator defines Task (scope, expected output, acceptance, constraints/dependencies, A and B)
  → A performs the work
  → A changes Task status to Done
  → B accepts or rejects the result
  → optional Completion Report/evidence governance for profile/accomplishment
```

Assignee A is never required to create, submit or upload a Completion Report/evidence package in
order to complete the Task. Completion Report, evidence manifest and contributor claims are
optional governance work after completion; they must not be used as an assignment gate, Done gate,
or reason to block the normal A → Done → B flow. Any work package below that describes report
submission as the assignee's completion path is superseded by this decision and must be interpreted
as optional profile-governance work.

> **Execution rule:** một worker chỉ claim một work package tại một thời điểm. Coordinator giữ
> quyền cập nhật trạng thái, shared contracts, migration numbering, integration hotspots và merge.
> Mọi thay đổi production phải đi qua GitNexus impact analysis và TDD Red–Green–Refactor.

**Mục tiêu:** biến chuỗi dữ liệu từ Task authoring đến Done, reviewer acceptance và — khi được bật —
Verified Work Accomplishment/Profile thành một pipeline có provenance bất biến. Task phải đủ chi
tiết để A thực hiện; Completion Report/evidence chỉ là lớp governance tùy chọn để giải thích công
việc đã được xác minh.

**Primary specification:**

- [Task To Verified Accomplishment — Master Product And Technical Design](../specs/2026-08-01-task-to-verified-accomplishment-design.md)

**Plan liên quan, không được giao việc trùng:**

- [Filter, Search, and Taxonomy Platform Implementation Plan](./2026-08-01-filter-search-taxonomy-platform.md)

**Required test evidence plan:**

- [Task To Verified Accomplishment — Test Matrix And Role-Play Evidence Plan](./2026-08-01-task-to-verified-accomplishment-test-matrix.md)

**Tech stack:** AdonisJS, TypeScript, Lucid/PostgreSQL, domain events/outbox, Svelte 5, Inertia,
Japa, Vitest, Playwright, Elasticsearch và hạ tầng search hiện tại.

### Coordinator checkpoint — 2026-08-10 continuation (authoritative for this wave)

- `[~]` **Project authoring context slice:** added a tenant-scoped
  `GET /api/v1/projects/:projectId/task-authoring-context` query/controller contract. The response
  explicitly allowlists the active Project Context title/summary/version and active Work Package
  selector fields; it excludes actor IDs, provenance, hashes, rich/structured internals, raw
  taxonomy and version tokens. The read is also gated by the existing project-view policy
  (owner/creator/org admin-or-owner/project member). Active packages are ordered by `key,id`;
  archived packages are omitted and packages without an active version remain visible as
  `no_active_version`.
- `[~]` **Frontend selector/pinning:** user/org authoring forms now load the read contract, expose
  loading/empty/error states, reset pins when the Project changes, and send
  `authoring.projectContextVersionId` / `authoring.workPackageVersionId`. This is selector/payload
  evidence only; resolved inheritance preview, version history, full role-play and accessibility
  evidence remain open.
- `[~]` **Native Completion Report read boundary:** the owner-scoped GET now maps the persisted fact
  bundle to `suar.task_completion_report_editor.v1`, supports an explicit `null` empty state,
  strips persistence/canonical/retention/tombstone fields, and fails closed for malformed canonical
  payloads. Native draft/submit POST responses now use the same editor allowlist; latest lookup has
  deterministic `revision DESC, id DESC` ordering. Submit-for-review additionally requires the
  exact pinned assignment snapshot to be acknowledged; pending/re-acknowledgement and open
  clarification states return stable completion blocker codes while Draft remains writable. The
  assignment-pinned assignee UI now consumes this boundary; unpinned tasks retain the legacy editor
  fallback, and no synthetic `task_submissions` parent is created outside the native start command.
- `[~]` **Optional Completion Report governance lifecycle:** the assignee-scoped
  `POST /api/v1/task-assignments/:assignmentId/completion-report/start` now locks the assignment
  contract context, creates or deterministically reuses an optional governance draft
  `task_submissions` parent, and returns the parent ID plus exact snapshot identity. This path is
  never required for A to move the Task to Done; it exists only when profile governance is enabled.
  Reviewer acceptance remains a separate B-controlled flow.
- `[~]` **Structured Completion Report payload adapter:** the shared frontend mapper now has a
  contract-focused TDD slice `4/4` covering exact snapshot identity, criterion expected/actual
  mapping, evidence manifest, contributor ownership, incomplete Drafts and fail-closed foreign
  evidence mappings. The mapper is now consumed by the shared assignment-pinned native editor used
  by both user and org panels; no CR/RP acceptance row is promoted from this focused slice alone.
- `[~]` **Native Completion Report authoring UI migration:** the shared Svelte editor now loads or
  starts the assignment-scoped report, requires explicit actual role/ownership/autonomy and actual
  deliverables, renders pinned expected criteria, captures actual outcomes/evidence mappings, and
  submits through the canonical draft/submit routes. Untouched criteria/claims are omitted, N/A and
  deviation fields are preserved, and restricted/incomplete briefs fail closed. Focused user panel
  coverage is `10/10`, org panel coverage is `8/8`, payload coverage is `6/6`, and en/vi resources
  mirror the native stale-recovery keys. The payload now uses the backend autonomy vocabulary and
  native submit requires explicit actual autonomy. Focused ESLint and TS/JSON Prettier checks are
  green. A dedicated Chromium role-play is now `1/1`: the seed leaves acknowledgement pending, the
  browser starts the assignment-scoped parent, acknowledges the exact pinned brief, navigates once
  to rehydrate the sibling native form, saves Draft revision 1 and submits immutable revision 2;
  the hydration guard proves no legacy submission GET is issued. The assignment resolved-brief
  cache key now includes acknowledgement state, with focused cache-key coverage `5/5`, so the
  post-acknowledgement UI cannot reuse a pending projection. The backend editor mapper also omits
  contributor `outcomeData`, with its focused privacy assertion green. Legacy fallback remains for
  unpinned tasks; upload lifecycle, attribution, reviewer UI, RP, AX, privacy and resilience gates
  remain open. The focused task i18n source/integrity guard now passes `36/36` after en/vi catalog
  parity and marketplace filter key routing were restored.
- `[~]` **Reviewer/privacy package slice:** the Completion Review Package now has a Reviews-backed
  resource access adapter, submitted-only gating before fact hydration, exact report/assignment
  identity checks, a production route
  `GET /api/v1/task-completion-reports/:reportId/review-package`, and an explicit
  `suar.task_completion_review_package_editor.v1` response allowlist. Assigned reviewers and
  approved organization owners/admins can read submitted packages; self-review, outsiders, missing
  sessions and draft reports fail closed. Focused unit evidence is `23/23` and the database-backed
  reviewer route role-play is `5/5`. Existing observation persistence/context coverage is `13/13`;
  governed quorum/finalization, audit receipts, correction/dispute governance and full reviewer UI
  migration remain open.
- `[~]` **Reviewer package frontend consumer:** user/org task-review panels now treat the native
  `reviewPackageAvailable` marker as a package-boundary switch, load the canonical review-package
  GET with report/task/assignment identity, normalize the response through a second allowlist, and
  render the exact assignment contract, report revision, criterion results and evidence-manifest
  availability. Native page context retains only review session/assignment/report identity and
  observations; missing, malformed or denied packages disable observation authoring instead of
  falling back to raw native facts. Legacy fixtures without the marker retain their compatibility
  context. Focused frontend evidence is `4 files / 13 passed / 42 skipped`; the native reviewer
  Chromium role-play recheck is `3/3` after the fixture was aligned to the native reviewer
  assignment boundary. Governance and full RP coverage remain open.
- `[~]` **Native reviewer assignment authorization:** the observation authoring context now treats
  active `review_session_reviewer_assignments` as authoritative whenever a session has native
  assignment rows. A legacy `task_review_reviewers` row cannot grant access to an outsider or a
  waived native reviewer, and the native assignment role is the sole role source in that path;
  legacy rows remain available only for pre-native sessions. The pure authorization policy is
  covered by `4/4` focused unit cases, including a conflicting legacy-role regression. This closes
  an authorization bypass boundary only; it does not establish quorum/finalization authority or
  correction/dispute policy.
- `[~]` **Taxonomy/public policy audit:** the Task-to-accomplishment taxonomy bridge remains internal
  provenance. A term-level publication/review allowlist is not present, so full public Profile/Search
  taxonomy disclosure remains blocked and is not inferred from the existing compatibility mapper.
  The talent-search reader now fails closed for explicitly non-public terms and non-public/unresolved
  parents; this is bounded containment, not a substitute for the missing allowlist or actor × action ×
  data-class policy matrix.
- `[~]` **Native review governance audit:** native reviewer authorization now uses the assignment
  boundary and rejects waived/outsider fallback, while observation persistence/CAS correction remains
  covered and native observations can persist `final`/`finalized_at`. A dedicated native
  finalization authority/orchestration boundary is still missing; quorum still partly reads legacy
  workflow counts, and no native command atomically authorizes correction or dispute freeze. Do not
  implement a guessed tie-break, reviewer authority or post-publication policy; O-005 decisions are
  required before a finalization vertical slice can be marked complete. A policy-neutral pure domain
  readiness evaluator now reports current/stale revisions, provenance/report/claim/evidence drift,
  evidence sufficiency/access, lifecycle and conflict blockers; its focused unit evidence is `8/8`
  and it always returns `finalizationAuthorized: false` / `policyStatus: not_evaluated`. No query,
  controller or HTTP boundary exists yet.
- `[~]` **Native Completion Report acknowledgement/cache refresh:** the focused browser role-play now
  covers the real pending → start → acknowledge → Draft → Submit path (`1/1`). The resolved-brief
  cache identity includes acknowledgement state (`5/5`) so acknowledgement cannot leave the native
  submit gate stale; the reviewer-facing backend editor mapper also excludes contributor
  `outcomeData` at the API boundary.
- `[~]` **Project-detail concurrency privacy:** the active Project Context page projection now returns
  its optimistic-concurrency fence only when `canUpdateProject` allows the actor to publish; a
  regular project viewer still receives readable context content but gets a null fence. The
  projection unit and project-detail integration cover editor/viewer behavior.
- Focused evidence in this continuation: Work Package projection `2/2`, query `4/4`, controller
  boundary `1/1`, catalog integration `3/3`, authoring-context HTTP integration `7/7`; native
  response mapper `3/3`, native HTTP boundary `3/3`, native POST → GET persistence integration
  `5/5`, assignment acknowledgement submit gate unit `5/5`, project-detail mapper `6/6`,
  viewer-fence integration `1/1`, existing submission boundary `6/6`, native reviewer assignment
  authorization `5/5`; frontend `svelte-check`
  `0 errors / 0 warnings`. The current full backend `tsc --noEmit`
  remains blocked by pre-existing dirty-tree taxonomy/filtering module drift, so no full typecheck
  green claim is made for this continuation.

## 1. Quy ước trạng thái

Mọi đầu việc dùng đúng một trong ba trạng thái:

- `[ ]` — chưa làm;
- `[~]` — đang làm;
- `[x]` — đã xong.

Chỉ coordinator sửa file plan. Worker báo `STARTED`, `BLOCKED` hoặc `DONE` kèm bằng chứng;
coordinator đổi trạng thái. Nếu bị block, package vẫn để `[~]` và thêm một dòng `BLOCKED:` nêu điều
kiện gỡ block. Không tạo trạng thái thứ tư.

Một package chỉ được `[x]` khi tất cả checkbox con, expected outputs, TDD gates, edge-case tests và
handoff đều hoàn thành. “Đã code” không đồng nghĩa “đã xong”.

### Coordinator checkpoint — 2026-08-09

| Package                         | Trạng thái  | Bằng chứng hiện có / điều kiện còn thiếu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WP-01–WP-06                     | `[~]`       | Contracts, persistence skeleton, review/accomplishment backend có focused unit/integration evidence; chưa đủ UI, role-play, screenshot, security/audit closure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| WP-07–WP-10                     | `[~]`       | Project context, resolution, readiness và assignment semantics có unit evidence; forward migration `20260809030000` đã gỡ FK/CHECK nghiệp vụ của TVA persistence, nhưng app-boundary và full role-play evidence vẫn còn phải đóng.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| WP-11                           | `[~]`       | Authoring pipeline và Completion Report persistence GREEN; schema `6/6` và review persistence `9/9` pass sau khi DB trở thành storage-only; chưa đủ các layer của master matrix.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| WP-12–WP-16                     | `[~]`       | Partial resolved-read, assignment, completion, review và accomplishment backend evidence; orchestration, UI, role-play, visual và release gates còn thiếu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| WP-21                           | `[~]`       | Context editor/work surface typecheck và focused UI tests GREEN; template/privacy/version-conflict/accessibility/role-play evidence còn thiếu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| WP-17                           | `[~]`       | Durable receipt/lock/retry backend GREEN: receipt repository 5/5, confirm-review 10/10, outbox recovery/order suite 16/16. Native identity resolver và native task/snapshot/report/review source reader đã được kiểm chứng; projector transaction integration 2/2 chứng minh rollback/commit và aggregate + claim/evidence/observation/lifecycle child writes. Completed replay đã có assertion no-op; profile assertions và toàn bộ UI/E2E/screenshot gates còn thiếu. Migration `20260808010000` chuyển receipt business CHECK/trigger enforcement về application repository. Cache worker đã xử lý `11312` rows sạch; notification projection rebuild target `suar_notifications_feed_v000002` đạt reconciliation `0/0/0/0` trên `70` rows, alias repair được audit và promotion đã hoàn tất; report-only reconcile sau cutover cũng `0/0/0/0`, lag `0`. Outbox pending/lease/retry backlog đã về `0`, nhưng bounded replay lịch sử tạo `NotificationPermanentDeliveryError`, còn `deadLetter=118`; chưa discard DLQ. Đây là blocker notification resilience/operator, không thay thế các UI/audit gates còn thiếu. |
| WP-18                           | `[~]`       | Immutable assignment-snapshot exporter/work-history regression và aggregate rebuild đã có evidence; profile/publication/UI/security layers còn thiếu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| WP-19                           | `[~]`       | Demonstrated-work profile read slice now prefers authoritative verified-accomplishment projections and keeps legacy rows retrospective; the Chromium authoritative verified UI journey and screenshots are verified; pagination, recruiter/security audit and full publication privacy remain thiếu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| WP-20, WP-22–WP-24, WP-26–WP-32 | `[~]`/`[ ]` | WP-20 đã có public accomplishment projection → talent document bridge và privacy-focused accomplishment evidence, nhưng live anonymous Talent Search vẫn carries canonical taxonomy refs/categories, aliases, taxonomy versions, assignment provenance/review-state và skill-evidence metadata without term-level publication/privacy policy. Đây là blocker disclosure chưa được giải quyết; safe containment sẽ disable anonymous Talent Search nhưng chưa tự ý áp dụng. Chưa có benchmark/cutover, privacy totals/facets, measured tombstone SLO và full RP journey. WP-22–WP-24 đã có implementation và browser/unit evidence partial; WP-26, WP-28–WP-32 chưa đủ evidence để hoàn tất.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| WP-25                           | `[~]`       | Đã có read-model provenance context (assignment snapshot/report/claim/evidence), reviewer claim-observation form dùng chung cho org/user shell, server-pinned hash hiển thị, disposition/rationale/evidence-sufficiency và focused UI `16/16`; backend context/detail integration `6/6`, native reviewer role-play confirm/narrow/reject `3/3` và screenshot pass. Còn thiếu quorum/conflict/dispute/correction, privacy/audit assertions và full RP-01–RP-08.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Không package nào trong checkpoint này được coi là `[x]`. TVA FK/CHECK business semantics đã có
forward migrations `20260809020000` (accomplishment) và `20260809030000` (project/task/completion/
review/assignment) để chuyển storage về application boundary; các command/repository và full
role-play/evidence gates vẫn phải được chứng minh trước release.

### Verification ledger — 2026-08-09

#### Coordinator recheck — 2026-08-09 (latest run)

- [x] `pnpm run typecheck`: `svelte-check --tsconfig ./inertia/tsconfig.json` and backend
      `tsc --noEmit` pass after the current namespace/result-contract refactor recheck. This closes
      type correctness only; it does not close the multi-layer release gates.
- [x] `pnpm run test:unit`: current full rerun `2406 passed (2406)` after aligning the
      Organizations layer-first taxonomy, cache ownership, sensitive-query paths and concrete Users
      controller route inventory; the full unit gate is green. This closes unit correctness only.
- [x] `pnpm run test:contract`: latest full run `168 passed (168)` after fixing Skills canonical
      DTO/status/scoping responses, task resolved-brief projection, task-status v1 route ownership and
      permission-controller DI. This closes the contract suite only.
- [~] `pnpm run test:integration:safe`: latest dedicated run `1259 passed / 8 failed / 38 skipped (1305)`.
  The eight failures are order-dependent auth/session, cleanup and policy failures; each affected
  file passes in isolation, so this is not release evidence. The marketplace keyword-search fixture
  remains green after explicitly reindexing its model-level metadata mutation. The 38 skips are
  opt-in Redis/cache drills.
- [~] Checkpoint re-run after the namespace/Ioc/Redis/marketplace fixes: `1287 passed / 27 failed /
38 skipped (1352)`. The resolved clusters include admin/users/auth controller DI, Redis control
  plane transport binding and API contracts, marketplace architecture paths/contracts, and the
  account-deletion placeholder. Remaining failures are concentrated in review/dispute event flows,
  sprint/backlog route availability, task requirement projection invalidation, one cache-role status
  assertion, and two controller-size architecture outliers; this is not release evidence yet.
- [~] Checkpoint 4 after sprint/assignment routes, requirement invalidation, and review-confirmed
  durable payload schema: `1313 passed / 2 failed / 38 skipped (1353)`. Remaining failures are the
  two controller-size outliers and one full-suite order-dependent inherited-evidence read (`403`),
  while its isolated focused file passes `9/9`. Master integration acceptance remains open.
- [x] Final backend checkpoint after repairing the two transport-boundary outliers and completing
      the inherited-evidence isolation fix: full unit `2406/2406`, full contract `168/168`, and full
      safe integration `1315 passed / 0 failed / 38 skipped (1353)`. The skips are opt-in Redis/cache
      drills; UI, E2E, screenshot, migration and release role-play gates remain governed by their own
      statuses below and are not implied by this backend checkpoint.
- [x] Integration-isolation wave: added regression coverage for tagged and untagged memory sessions;
      the affected auth/UI/create-organization/current-organization/task-assignment slice now passes
      `68/68` after cleanup destroys resolved memory sessions before fixture deletion. This is focused
      evidence only; the full dedicated integration suite must be rerun at the final checkpoint.
- [x] `pnpm run test:ui:runnable`: `215 files / 756 tests passed`.
- [x] `pnpm run test:e2e:policy`: `2 passed`.
- [x] `pnpm run test:e2e:critical`: `19 passed`.
- [~] Follow-up regression recheck: task command/access regressions `12 passed`; authenticated Search
  Discovery Chromium role-play `1 passed`. The historical focused typecheck passed, but the current
  full backend typecheck remains blocked by dirty-tree taxonomy/filtering drift; these remain
  supporting gates only and do not complete the TVA RP-01–RP-08 journey.
- [~] Talent discovery filter/search role-play recheck: current Chromium spec passes `3/3`
  sequentially against a healthy test server, covering visible business-domain filtering, canonical
  cursor/search metadata and same-talent contains-all skill selection; visual evidence is captured.
  This is supporting WP-27 evidence only and does not close accomplishment-backed recruiter privacy,
  facet, cache/log or performance gates.
- [~] WP-25 follow-up: org/user review-panel regression `16 passed`; AI callback mapper `4 passed`;
  the historical focused typecheck passed, but the current full backend typecheck remains blocked.
  Observation authoring remains available after a reviewer has submitted the message, matching the
  native authoring-context contract.
- [x] Backend architecture gates: side-effects, auth layers, module placement/domain boundary,
      port taxonomy, public contracts, exception boundaries and validation architecture pass in the
      full unit run `2406/2406`.
- [x] WP-25 focused recheck: org/user reviewer observation panels `16/16`; `svelte-check` `0 errors /
0 warnings`; review authoring-context and task-detail integration `6/6`; `git diff --check` pass.
- [x] WP-25 native role-play: dedicated testing seed creates Assignment Snapshot + submitted
      Completion Report + contributor Claim + available Evidence through application commands; Chromium
      reviewer flow `task_review_claim_observation_roleplay.spec.ts` passes `3/3` (confirm/narrow/reject)
      and writes the governed observation screenshot under `tmp/tva-e2e/task-review-observation/`.
- [x] WP-25 reviewer-type projection recheck: native sessions use the active assignment's
      `assignment_role` and `reviewer_type`; `task_review_reviewers.reviewer_role` remains a
      compatibility fallback only when the native assignment table is empty. The application does
      not read a non-existent reviewer-type DB column.
- [x] Test-runtime boundary recheck: memory-backed session state is cleared through the test
      cleanup boundary; the helper has no production-domain or database business logic. The
      historical focused-wave `pnpm exec tsc --noEmit` passed; the current full backend typecheck
      remains blocked by dirty-tree taxonomy/filtering drift. The full unit architecture gate is
      green in the current `2406/2406` run.
- [~] `node ace migration:ledger-verify --connection=pg`: current PostgreSQL reports `104 completed,
0 pending, 0 corrupt, 25 squashed` after applying the three TVA migrations and repairing the
  idempotent taxonomy migration. Schema-dump owner approval and checksum reconciliation still block
  release. No approval or checksum was fabricated.
- [~] Master RP/TC acceptance remains open: the available E2E set is not the complete RP-01–RP-08
  creator→assignee→reviewer→profile→recruiter/operator journey, and screenshot, provenance,
  privacy/audit, resilience and release evidence are still incomplete.

Các kết quả dưới đây là evidence mới của coordinator; chúng không tự nâng master package/scenario
status nếu downstream layer còn thiếu:

- `pnpm run test:unit`: latest verified full run `2406 passed (2406)`.
- Accomplishment integration slices: schema `7`, lifecycle `4`, source reader `1`, hardening `5`,
  repository `9`, public projection `6`, projector transaction `2` — tất cả pass.
- Previous coordinator typecheck evidence: TypeScript pass; `svelte-check` `0 errors / 0 warnings`.
  The later request-mapper additions and strict DTO boundary fixes are now covered by the latest
  green typecheck entry above.
- `pnpm run test:contract`: latest full rerun `168 passed (168)` sau khi sửa Skills/task contract
  regressions; không có test contract fail còn lại.
- Existing task authoring/submission Chromium role-play: `7 passed`; đây là supporting UI evidence,
  không phải RP-01–RP-08.
- [~] Assignee Completion Report browser recheck: `task_submission_package.spec.ts` passes `5/5`
  sequentially, covering resolved brief/readiness, draft save, outsider denial, lock-after-submit,
  real upload/submit and graceful not-found handling. This is supporting WP-24 evidence; it does not
  prove the creator→reviewer→profile→recruiter master journey.
- [x] Focused Chromium checkpoint after the latest authoring/review/route/test fixes: the four
      affected role-play files pass together `14/14` with one worker against a healthy `suar_test`
      server. This is a stability checkpoint, not full RP-01–RP-08 acceptance.
- [x] Notification resilience focused recheck: worker, fanout replay and outbox DLQ integration
      suites pass `16/16`, including lease fencing, retry/dead-letter, bounded replay/discard and audit
      rollback. This does not replace a production operator rollout/drill or close WP-17/WP-31.
- `pnpm run test:e2e:policy`: `2 passed` sau khi thay assertion yếu `toBeTruthy()` bằng `toBe(true)`.
- `pnpm run test:ui:runnable`: latest verified run `215 test files / 756 tests passed`.
  Trước đó có 4 translation-related failures; chúng đã được xử lý và full suite đã chạy tới
  summary hoàn chỉnh.
- Focused UI recheck after translation/resource fixes: i18n integrity/source guards `45/45` pass;
  task submission readiness/coverage, profile snapshot/show, and sprint end-delivery/start
  regressions pass. Đây vẫn chưa thay thế full creator → assignee → reviewer → profile → recruiter
  browser role-play.
- `node ace migration:ledger-verify --connection=pg`: `completed=99, pending=4, corrupt=0`; the
  publication, search-reconcile, taxonomy-revision and legacy-backfill sources are not recorded in
  the release ledger, and schema dump still needs database-owner/release-owner approval plus
  checksum reconciliation.
- Recheck sau migration (historical): `pnpm run typecheck` passed before the current dirty worktree
  lost 8 request-mapper modules; the latest result remains a release blocker.
- Storage/application boundary: migrations `20260809020000` và `20260809030000` đã apply local;
  task completion schema `6/6`, review persistence `9/9`, accomplishment schema/hardening/repository
  slices đều GREEN. Các test storage hiện xác nhận orphan/invalid raw rows có thể lưu; business
  rejection phải do command/repository, không do PostgreSQL FK/CHECK.
- Architecture gates: module-layer, public-contract-surface và module-domain-boundary đều pass ở
  lần chạy mới; không còn violation runtime được phát hiện. Điều này chỉ đóng architecture
  blocker, không đóng full TVA evidence bundle.
- `gitnexus detect-changes`: latest workspace scope `181 changed, 78 new, 1 deleted`; scope lớn hơn
  một package và Rust graph đang ở file-match fallback, nên không coi đây là isolated release diff.

Regression fix trong wave này: legacy `/api/tasks/*` task API dùng auth contract
`bearer-or-session`, khôi phục session-authenticated comment flow; focused contract RED là `401`
(`201` expected), GREEN là pass.

**Release blocker (refreshed 2026-08-09):** `node ace migration:ledger-verify --connection=pg`
now reports `completed=104, pending=0, corrupt=0, squashed=25`. The three previously pending TVA
migrations are applied and ledger-registered; the taxonomy migration is idempotent against a restored
schema. `pg_dump`/schema-dump approval and checksum reconciliation are still missing; no approval
was fabricated.
Không được tự tạo approval hoặc coi test DB migrate pass là release approval.

**Architecture audit note:** TVA tables covered by Project Context, Task Contract, Completion,
Review Observation, Assignment Contract và Accomplishment foundations hiện đã có forward migrations
để không còn FK/CHECK business constraints (`20260809020000`, `20260809030000`,
`20260809031000`); PK/UNIQUE storage identity/idempotency guards vẫn giữ.
Taxonomy/filter/search và domain-event allowlist còn các DB checks/triggers riêng, phải xử lý bằng
bounded migration/application proof trước khi claim architecture closure.

**Storage boundary evidence refresh (2026-08-09):** accomplishment schema hardening now passes
`6/6`, including an explicit query over all listed TVA storage tables proving no remaining
database-owned `FOREIGN KEY` or `CHECK` constraints; lifecycle/publication references remain raw
storage facts validated by application workflows. This strengthens the architecture evidence but
does not close the wider module, UI, privacy, audit or release gates.

**Current release ledger recheck (2026-08-09):** `node ace migration:ledger-verify --connection=pg`
reports `completed=104, pending=0, corrupt=0, squashed=25`; only
`schema_dump_approval_required` and `schema_dump_checksum_mismatch` remain. `pg_dump` is unavailable
in the environment, so no release approval or checksum has been fabricated.

## 2. Kiến trúc ownership đã khóa cho execution

| Bounded context       | Sở hữu canonical truth                                                                                                          | Không được sở hữu                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `projects`            | Project Context Version, Work Package và quyền truy cập context                                                                 | Review, profile claim                          |
| `tasks`               | Task Specification/Contract Version, resolved brief, assignment snapshot, acknowledgement, Completion Report, evidence manifest | Verified Accomplishment cuối cùng              |
| `reviews`             | Review Observation, reviewer decision, dispute/correction governance                                                            | Profile rendering, search document             |
| `accomplishments` mới | Verified Work Accomplishment, lifecycle, capability signal, public-safe projection                                              | Task mutable state, review session workflow    |
| `users`               | Profile read model, publication preference, profile snapshot                                                                    | Tự suy diễn accomplishment từ current Task     |
| `search`              | Index document/adapter/query cho public-safe accomplishment                                                                     | Canonical accomplishment hoặc privacy decision |

- [ ] **ARCH-01 — Giữ external link ở vai trò Supporting Reference.** Link không thay thế complete
      specification/contract và không làm Assignment-ready nếu nội dung Suar còn thiếu.
- [ ] **ARCH-02 — Giữ hai representation.** Rich specification dành cho con người; structured
      Work/Evidence Contract dành cho validation, review, projection và search.
- [ ] **ARCH-03 — Tách requirement khỏi proof.** Task requirement không được ghi thẳng vào Profile;
      chỉ actual completion + evidence + governed review mới tạo accomplishment.
- [ ] **ARCH-04 — Tạo bounded context `accomplishments`.** Đây là entity first-class và là biên chống
      coupling giữa Reviews, Users và Search.
- [ ] **ARCH-05 — Snapshot bất biến.** Historical rebuild phải đọc version/snapshot đã khóa, không join
      lại mutable `tasks` để tái tạo quá khứ.
- [ ] **ARCH-06 — Search chỉ consume projection.** Search plan hiện hữu sở hữu filter engine, taxonomy
      platform, faceting, ranking framework và index cutover; plan này chỉ cung cấp accomplishment
      semantics, public-safe document và acceptance corpus.

## 3. Multi-worker execution contract

- [ ] **COORD-01 — Một branch/worktree cho mỗi package.** Không cho hai worker sửa cùng working tree
      nếu exclusive write set có thể giao nhau.
- [ ] **COORD-02 — Claim ledger.** Trước khi làm, worker ghi package ID, owner, branch, base SHA, start
      time, exclusive write set và dependency SHA.
- [ ] **COORD-03 — Một production file chỉ có một owner trong một wave.** Worker được đọc mọi file
      nhưng chỉ sửa write set đã giao; thay đổi ngoài scope phải trả thành dependency request.
- [ ] **COORD-04 — Coordinator khóa contract trước khi fan-out.** Shared DTO/event/schema fixture không
      được các worker tự đổi. Thay đổi contract phải có version mới và migration note.
- [ ] **COORD-05 — Reserve integration hotspots.** Chỉ WP-28 được sửa `app/composition/**`,
      `start/routes/**`, shared barrel exports, provider registration và shared i18n catalog.
- [ ] **COORD-06 — Reserve current Search baseline.** Chỉ worker được chỉ định ở plan Search/Taxonomy
      được sửa các file Search đang dirty; WP-20/WP-27 chỉ làm trên baseline đã reconcile và commit.
- [ ] **COORD-07 — GitNexus trước production symbol.** Chạy `gitnexus impact <symbol>` trước khi sửa
      function/class/method. HIGH/CRITICAL phải dừng và báo coordinator. Không dùng GitNexus MCP.
- [ ] **COORD-08 — Ghi nhận giới hạn graph.** Rust CLI hiện báo call graph extraction chưa hoàn tất;
      worker phải bổ sung targeted source/test inspection và không coi `MEDIUM` là bảo đảm rủi ro thấp.
- [ ] **COORD-09 — Test-first evidence.** Worker lưu command RED, test hỏng và lý do hỏng dự kiến trước
      khi viết production code. Failure do DB/Redis/environment không được tính là RED hợp lệ.
- [ ] **COORD-10 — Commit package-atomic.** Handoff gồm commit SHA, changed files, RED/GREEN commands,
      `gitnexus detect-changes`, migration/rollback note, risk còn lại và package tiếp theo bị ảnh hưởng.
- [ ] **COORD-11 — Coordinator rebase rồi chạy lại.** Worker không tự merge; coordinator rebase lên
      integration branch, resolve contract drift tập trung và chạy lại focused tests.
- [ ] **COORD-12 — Không chạy formatter toàn repo.** Chỉ format exclusive write set để không chạm thay
      đổi của user hoặc worker khác.

### 3.1 Mẫu handoff bắt buộc

```text
Package: WP-xx
Status: DONE | BLOCKED
Base SHA / Commit SHA:
Changed files:
RED command + expected failure:
GREEN commands + results:
GitNexus impact symbols + risk:
GitNexus detect-changes summary:
Migration forward/rollback notes:
Expected outputs produced:
Known limitations / deferred edge cases:
Next dependency package(s):
```

## 4. Current-worktree safety gate

Tại thời điểm viết plan, các file dưới đây có thay đổi Search do user/worker khác sở hữu. Không được
reset, checkout, delete, overwrite hoặc format chúng trong work package của plan này:

```text
app/modules/search/actions/ports/outbound/task_search_document_reader.ts
app/modules/search/domain/task_search_document.ts
app/modules/search/infra/tasks/task_search_document_builder.ts
app/modules/search/infra/tasks/task_search_index_repository.ts
app/modules/search/tests/backend/unit/task_document_builder.spec.ts
app/modules/tasks/infra/adapters/lucid_task_search_document_reader.ts
app/modules/tasks/tests/backend/integration/task_search_document_reader.spec.ts
scripts/search/search_benchmark_corpus.ts
docs/superpowers/plans/2026-08-01-filter-search-taxonomy-platform.md
```

- [ ] **SAFE-01 — Freeze baseline.** Ghi `git status --short`, current branch/base SHA, dirty file owner
      và pre-existing failures trước khi tạo worker worktrees.
- [ ] **SAFE-02 — Commit docs baseline riêng.** Spec và plan phải có docs-only baseline commit để mọi
      worker cùng đọc một version.
- [ ] **SAFE-03 — Reconcile Search trước WP-20/WP-27.** Hai package đó bị block cho tới khi plan
      Search/Taxonomy xác nhận baseline commit và public contract có thể consume.
- [ ] **SAFE-04 — Migration allocator.** Coordinator cấp timestamp range/file name duy nhất trước khi
      worker tạo migration; worker không rename migration của package khác.

Migration slots đã reserve cho Wave A:

| Package | Reserved migration prefix | Owner boundary                    |
| ------- | ------------------------- | --------------------------------- |
| WP-02   | `20260801010000`          | Project Context/Work Package only |
| WP-03   | `20260801020000`          | Task Specification/Contract only  |
| WP-04   | `20260801030000`          | Completion Report/claims only     |
| WP-05   | `20260801040000`          | Review Observations only          |
| WP-06   | `20260801050000`          | Accomplishments only              |
| WP-11   | `20260801059000`          | Task authoring idempotency only   |

## 5. Product-decision gate trước khi code

Không cần dừng việc lập plan, nhưng không merge schema/behavior phụ thuộc các mục này trước khi owner
đánh dấu:

- [ ] **DEC-01 — Operational-only Task:** cho phép explicit opt-out; không tạo profile impact.
- [ ] **DEC-02 — Evidence-enabled default:** bật mặc định cho professional work.
- [ ] **DEC-03 — Work Package optional:** chỉ bắt buộc khi policy/template cụ thể yêu cầu.
- [ ] **DEC-04 — Material change:** creator và assignee đều phải re-confirm.
- [ ] **DEC-05 — Reviewer threshold:** second reviewer theo risk/capability ceiling, không hard-code
      cho mọi Task.
- [ ] **DEC-06 — Publication ownership:** user điều khiển publication; organization điều khiển
      disclosure policy.
- [ ] **DEC-07 — Retrospective confidence:** backfill có confidence/weight riêng và không masquerade
      thành native verified accomplishment.
- [ ] **DEC-08 — Rich binary retention:** policy theo data classification; không lưu binary vô hạn.
- [ ] **DEC-09 — Action/object taxonomy ownership:** Product + Search/Capability Governance.
- [ ] **DEC-10 — Performance SLO:** baseline và benchmark trước, sau đó khóa số ở WP-31.

Nếu owner chưa phản hồi, worker dùng recommended defaults của spec trong feature flag nội bộ nhưng
không bật production mặc định.

## 6. Definition of Done cho mọi package

- [ ] **DOD-01 — Scope:** implementation đúng spec và không lấn ownership module khác.
- [ ] **DOD-02 — Impact:** đã chạy GitNexus impact cho mọi production symbol bị sửa và ghi risk.
- [ ] **DOD-03 — RED:** focused test thất bại vì behavior còn thiếu.
- [ ] **DOD-04 — GREEN:** unit/contract/integration/UI test phù hợp đã pass.
- [ ] **DOD-05 — REFACTOR:** bỏ duplication và leakage nhưng không mở rộng scope.
- [ ] **DOD-06 — Edge cases:** các trường hợp bất thường của package có test hoặc deferred-risk entry
      với owner/gate cụ thể.
- [ ] **DOD-07 — Security/privacy:** authorization, confidentiality, tenant boundary và public-safe
      output đã được kiểm chứng.
- [ ] **DOD-08 — Idempotency/concurrency:** command/event/rebuild liên quan có duplicate, retry và
      concurrent-write tests.
- [ ] **DOD-09 — Compatibility:** legacy read/write không bị phá trước package cutover được chỉ định.
- [ ] **DOD-10 — Verification:** focused lint/typecheck pass; không có unrelated file changes.
- [ ] **DOD-11 — Graph:** `gitnexus detect-changes` chỉ ra đúng symbols/flows dự kiến.
- [ ] **DOD-12 — Handoff:** output, commands, SHA, rollback và known risks đã bàn giao.
- [ ] **DOD-13 — Test matrix:** affected TC/case IDs đã được update; package tests không được coi là
      chứng minh toàn flow nếu role-play E2E, screenshot, provenance hoặc negative-path gate còn thiếu.

## 7. TDD protocol bắt buộc

Mỗi package làm theo thứ tự sau:

1. `[ ]` **Specify:** viết behavior matrix và fixtures từ FR/BR/TC trong master spec.
2. `[ ]` **RED:** thêm test nhỏ nhất chứng minh behavior chưa tồn tại; chạy và lưu short failure.
3. `[ ]` **GREEN:** code tối thiểu làm focused test pass.
4. `[ ]` **REFACTOR:** làm rõ naming/boundary, giữ focused test xanh.
5. `[ ]` **REGRESSION:** chạy neighboring tests và legacy compatibility tests.
6. `[ ]` **ABNORMAL:** thêm ít nhất một permission, concurrency/idempotency, invalid-data hoặc
   partial-failure test phù hợp.
7. `[ ]` **VERIFY:** targeted lint/typecheck, `gitnexus detect-changes`, handoff.

### 7.1 Test ladder

1. Pure domain unit tests: readiness truth table, change classification, claim/lifecycle rules.
2. Contract tests: versioned public facts, API response schema, adapter conformance.
3. Integration tests: migrations, transactions, repositories, outbox, projection/rebuild.
4. Component tests: task form, resolved brief, completion, review, accomplishment card.
5. E2E tests: full creator → assignee → reviewer → recruiter journeys.
6. Security/performance tests: cross-tenant, restricted evidence, replay, rebuild, index lag, load.

Không có layer nào được thay thế layer khác. Unit + Integration xanh chỉ chứng minh rule và wiring ở
phạm vi của chúng; feature/flow vẫn chưa Done nếu role-play E2E, user-visible assertions, screenshot
checkpoints, provenance audit hoặc negative-path gates bắt buộc trong test matrix chưa pass.

### 7.2 Commands chuẩn

```bash
pnpm run test:unit --files=<focused-unit-spec>
pnpm run test:contract --files=<focused-contract-spec>
pnpm run test:integration --files=<focused-integration-spec>
pnpm run test:ui -- <focused-vitest-spec>
pnpm run test:e2e -- <focused-playwright-spec>
pnpm run typecheck
pnpm run check:svelte:strict
pnpm run lint
gitnexus detect-changes
```

Coordinator chạy sau từng wave:

```bash
pnpm run test:all:safe
pnpm run test:contract
pnpm run test:ui:runnable
pnpm run test:e2e:policy
pnpm run typecheck
pnpm run check:svelte:strict
pnpm run lint
```

Final release gate:

```bash
pnpm run test:full-confidence
pnpm run build
gitnexus detect-changes
```

## 8. Ước lượng, critical path và cách chia worker

Đây là estimate theo **ideal agent-day** (một worker tập trung, baseline ổn định), không phải deadline
cam kết:

| Nhóm                     | Packages        |             Estimate |
| ------------------------ | --------------- | -------------------: |
| Coordination/contracts   | WP-00–WP-01     |       2–3 agent-days |
| Persistence foundation   | WP-02–WP-06     |       4–6 agent-days |
| Backend/domain pipeline  | WP-07–WP-20     |     18–23 agent-days |
| Frontend vertical slices | WP-21–WP-27     |     11–15 agent-days |
| Integration/release      | WP-28–WP-32     |     12–16 agent-days |
| **Tổng**                 | **33 packages** | **47–63 agent-days** |

Tính theo 4 worker song song: `47–63 / 4 = 11.75–15.75 ideal days`. Nhân coordination/rebase factor
`1.35–1.5` thành khoảng `16–24 working days`, cộng `3–5 days` release buffer thành **19–29 working
days**. Vì contract, integration và E2E là chuỗi tuần tự, tăng từ 4 lên 8 worker không giảm một nửa;
estimate thực tế vẫn khoảng **15–21 working days**. Với cửa sổ demo một tháng, full scope khả thi nhưng
không có nhiều chỗ cho scope creep.

### 8.1 Milestone ưu tiên

- [ ] **M1 — Historical truth (P0):** WP-00–WP-13. Không làm Profile UI trước khi M1 pass immutable
      rebuild regression.
- [ ] **M2 — Evidence pipeline (P0):** WP-14–WP-18, WP-23–WP-25. Task thực tế đi qua Completion và
      Review để tạo accomplishment.
- [ ] **M3 — Demonstrated-work Profile (P0 demo):** WP-19, WP-26, WP-28. Recruiter đọc được action,
      ownership, context, output và verification.
- [ ] **M4 — Search discovery (P1):** WP-20, WP-27; phụ thuộc plan Search/Taxonomy.
- [ ] **M5 — Production rollout (P1):** WP-29–WP-32.

Nếu critical path trễ, giữ M1–M3; không bỏ provenance để đổi lấy UI. Search nâng cao, assisted import
và retrospective bulk backfill có thể sau demo nhưng native accomplishment path phải hoàn chỉnh.

### 8.2 Gợi ý phân lane cho worker agents

Worker vẫn claim từng package, không claim cả lane vĩnh viễn. Lane chỉ giúp coordinator tránh giao hai
package cùng đụng một bounded context.

| Lane                  | Chuỗi package phù hợp                                 | Ghi chú collision                                        |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Project context       | WP-02 → WP-07 → WP-21                                 | Không sửa Task routes/composition                        |
| Task specification    | WP-03 → WP-08 → WP-09 → WP-11 → WP-12 → WP-22 → WP-23 | Một worker/lần trong current Task authoring/detail files |
| Assignment/completion | WP-04 → WP-13 → WP-14 → WP-24                         | Handoff snapshot contract từ Task specification lane     |
| Review                | WP-05 → WP-15 → WP-25                                 | WP-17 chỉ bắt đầu sau handshake với Accomplishment lane  |
| Accomplishment        | WP-06 → WP-16 → WP-17                                 | Không tự sửa Users/Search consumers                      |
| Profile/history       | WP-18 → WP-19 → WP-26                                 | Chỉ mở sau immutable fact gate                           |
| Search                | WP-20 → WP-27                                         | Bị khóa bởi plan Search/Taxonomy và dirty baseline       |
| Integration/release   | WP-28 → WP-29 → WP-30 → WP-31 → WP-32                 | Một integration owner, không fan-out shared hotspots     |

Với **4 worker total**, chạy dynamic scheduling: sau WP-01, ba worker lấy ba persistence lane đầu,
worker thứ tư lấy Reviews rồi Accomplishments; package ngắn hoàn thành thì worker lấy WP còn trống theo
dependency, không chờ lane cũ. Với **8 worker**, có thể gán mỗi lane một worker nhưng integration/release
lane vẫn chỉ có một writer; worker rảnh chuyển sang review tests, fixtures và E2E preparation thay vì
cùng sửa hotspot.

## 9. Dependency và parallel-wave map

```text
WP-00 Baseline + decisions
└── WP-01 Locked contracts/fixtures
    ├── Wave A persistence (parallel): WP-02 | WP-03 | WP-04 | WP-05 | WP-06
    ├── Wave B domain/backend (parallel by module):
    │   ├── projects: WP-07
    │   ├── tasks: WP-08 → WP-09 → WP-11 → WP-12 → WP-13 → WP-14
    │   │                    └──── WP-10 ────┘
    │   ├── reviews: WP-15
    │   └── accomplishments: WP-16
    ├── Cross-domain integrity: WP-15 + WP-16 → WP-17 → WP-18
    ├── Read models: WP-18 → WP-19 → WP-20
    ├── Frontend after locked response fixtures (parallel):
    │   WP-21 | WP-22 | WP-23 | WP-24 | WP-25 | WP-26 | WP-27
    ├── Integration hotspot: WP-28
    └── Release: WP-29 → WP-30 → WP-31 → WP-32
```

WP-20 và WP-27 còn phụ thuộc Search plan WP-03/WP-12/WP-13/WP-16/WP-17/WP-26/WP-27 tương ứng.
Packages cùng wave chỉ thật sự parallel khi coordinator xác nhận exclusive write sets còn disjoint
sau rebase.

## 10. Package index

- [~] **WP-00 — Baseline, decisions, traceability và collision map**
- [~] **WP-01 — Locked cross-module contracts và golden fixtures**
- [~] **WP-02 — Project Context/Work Package persistence foundation**
- [~] **WP-03 — Task Specification/Contract version persistence**
- [~] **WP-04 — Completion Report/claim persistence**
- [~] **WP-05 — Review Observation persistence**
- [~] **WP-06 — Verified Accomplishment persistence/module skeleton**
- [~] **WP-07 — Project Context/Work Package domain và application backend**
- [~] **WP-08 — Task specification/contract versioning backend**
- [~] **WP-09 — Deterministic readiness kernel**
- [~] **WP-10 — Required-skill semantics correction**
- [~] **WP-11 — Task authoring command/query pipeline**
- [~] **WP-12 — Resolved brief và immutable task-detail reads**
- [~] **WP-13 — Assignment snapshot, acknowledgement và change control**
- [~] **WP-14 — Completion Report, criterion, evidence và contributor claims**
- [~] **WP-15 — Structured review observations và claim decisions**
- [~] **WP-16 — Verified Accomplishment domain/projector**
- [~] **WP-17 — Review-confirmed durable orchestration**
- [~] **WP-18 — Historical fact source và legacy work-history correction**
- [~] **WP-19 — Accomplishment-first Profile APIs/snapshots**
- [~] **WP-20 — Public-safe accomplishment Search adapter**
- [~] **WP-21 — Project Context/Work Package frontend**
- [~] **WP-22 — Primary Task authoring frontend**
- [~] **WP-23 — Resolved brief, acknowledgement và material-change frontend**
- [~] **WP-24 — Completion Report frontend**
- [~] **WP-25 — Review observation/claim verification frontend**
- [~] **WP-26 — Accomplishment-first Profile frontend**
- [~] **WP-27 — Talent discovery/search frontend integration**
- [~] **WP-28 — HTTP/routes/composition/outbox/i18n integration**
- [~] **WP-29 — Privacy, security, disclosure và audit hardening**
- [~] **WP-30 — Legacy migration, dual-read/projection và controlled cutover**
- [~] **WP-31 — Observability, performance, rebuild và resilience gates**
- [~] **WP-32 — E2E acceptance, release evidence và canonical documentation**

## 11. Detailed work packages

### WP-00 — Baseline, decisions, traceability và collision map

- [~] **WP-00 overall status**

**Ưu tiên/estimate:** P0, 0.5–1 agent-day.  
**Worker:** coordinator/integration owner.  
**Dependencies:** none. Chạy một mình.  
**Exclusive write set:** plan/spec status, `docs/12-evidence/task-to-accomplishment-baseline-2026-08-01.md`.
Không sửa production.

- [ ] Freeze current branch/base SHA, `git status --short`, dirty-file owners và pre-existing test
      failures; không “clean” worktree.
- [ ] Chốt DEC-01–DEC-10 hoặc ghi feature-flagged provisional default cho từng mục.
- [ ] Lập traceability matrix `FR/BR/TC → package → test file → release gate` cho toàn bộ 20
      acceptance scenarios trong spec; dùng test matrix bắt buộc đã link ở đầu plan làm source of
      truth.
- [ ] Inventory các create/detail/submission/review/profile/talent entry points bằng GitNexus CLI
      trước, sau đó targeted `rg` khi CLI không tìm đủ UI symbols.
- [ ] Đánh dấu shared collision files: composition, routes, public barrels, mirrored user/org UI,
      migrations, locale catalogs và Search dirty baseline.
- [ ] Chạy baseline focused tests cho create task, assignment drift, submission, review confirmation,
      work history, public profile snapshot và talent search.
- [ ] Ghi mỗi failure với failing file/test và short excerpt; không sửa lỗi ngoài scope.

**Expected outputs:** baseline evidence file; decision ledger; package/file ownership matrix; test
baseline; migration timestamp allocation; không có production diff.

**Abnormal cases phải xử lý:** GitNexus index stale/locked; test phụ thuộc Redis/Elasticsearch không
sẵn; dirty file không rõ owner; spec decision mâu thuẫn current policy; mirrored UI đã drift.

**Gate:** mọi worker nhận cùng docs baseline commit và collision map trước khi fan-out.

### WP-01 — Locked cross-module contracts và golden fixtures

- [~] **WP-01 overall status** — contracts và golden fixtures tồn tại dưới `app/modules/contracts/public_contracts/task_to_accomplishment/**`; 14 unit tests (schema validation, golden fixtures, compatibility/policy) GREEN. Vẫn `[~]`: chưa có role-play E2E, screenshot, hay bằng chứng trải nghiệm theo test matrix.

**Ưu tiên/estimate:** P0, 1–2 agent-days.  
**Dependencies:** WP-00 và decision ledger.  
**Parallelism:** chạy riêng; tất cả package backend/frontend consume output này.  
**Exclusive write set:** versioned public contracts/fixtures mới dưới
`app/modules/contracts/**`, `app/modules/accomplishments/public_contracts/**` và
`app/modules/testing/**/task_to_accomplishment*`; coordinator khóa sau merge.

- [ ] Viết golden JSON/TypeScript fixtures cho Project Context Version, Work Package, Task
      Specification Version, Task Contract Version, resolved contract, Assignment Snapshot,
      Completion Claim, Review Observation, Verified Work Accomplishment và public-safe projection.
- [ ] Khóa enums: evidence mode, readiness state, reference type/access, change class, claim status,
      verification status, accomplishment lifecycle, provenance/confidence và privacy class.
- [ ] Khóa ID/version/hash/timestamp conventions, nullable semantics và forward-compatible unknown
      field behavior.
- [ ] RED contract tests: missing required provenance, unknown breaking schema version, public
      projection chứa private field, requirement payload bị hiểu như verified result.
- [ ] GREEN schema parsers/type guards; không thêm domain business logic vào shared contracts.
- [ ] Thêm compatibility fixtures cho current task submission, current profile fact và legacy work
      history để các adapter có thể dual-read.
- [ ] Viết contract-change policy: additive change, version bump, deprecation window và fixture
      ownership.

**Expected outputs:** một bộ versioned contracts duy nhất cho mọi worker; golden fixtures dùng được
trong backend, UI mock và E2E seed; contract tests phát hiện schema drift.

**Abnormal cases:** unknown future enum; absent optional field; invalid UUID/date; duplicated IDs;
deep/oversized JSON; inconsistent version/hash; private reference lẫn trong public output; legacy
fixture thiếu provenance.

**Focused verification:** contract suite mới, `pnpm run typecheck`, targeted lint, detect-changes.

### WP-02 — Project Context/Work Package persistence foundation

- [~] **WP-02 overall status** — migration `20260801010000` đã tạo project context/work packages. Vẫn `[~]`: chưa có role-play E2E, screenshot, hay bằng chứng trải nghiệm theo test matrix.

**Ưu tiên/estimate:** P0, 0.75–1 agent-day.  
**Dependencies:** WP-01 contracts.  
**Parallel-safe với:** WP-03–WP-06.  
**Exclusive write set:** migration được cấp riêng; Project Context/Work Package models/repository
integration tests mới trong `app/modules/projects/**`. Không sửa routes/composition.

- [ ] RED migration/repository tests cho versioned project context, optional work package, active
      version pointer và immutable historical versions.
- [ ] Tạo tables/indexes cho context, versions, work packages, work-package versions và membership
      references theo naming convention hiện tại.
- [ ] Persist structured metadata, rich content, source provenance, privacy class, content hash,
      created-by/confirmed-by và version timestamps.
- [ ] Thêm optimistic version uniqueness và query indexes cho organization/project/active version.
- [ ] GREEN repository round-trip và rollback-safe migration tests.
- [ ] Test transaction failure không để active pointer trỏ vào version chưa tồn tại.

**Expected outputs:** schema có thể giữ shared context bất biến và Work Package optional; models/repo
primitives chưa expose HTTP.

**Abnormal cases:** project bị archive/delete; context version rỗng; duplicate version race; Work
Package trỏ sai project/org; invalid JSON; update active pointer concurrent; rollback giữa hai
insert; rich content vượt limit.

**Focused verification:** Project migration/repository integration specs và targeted typecheck/lint.

### WP-03 — Task Specification/Contract version persistence

- [~] **WP-03 overall status** — migration `20260801020000` đã tạo task specification/contract foundation. Vẫn `[~]`: chưa có role-play E2E, screenshot, hay bằng chứng trải nghiệm theo test matrix.

**Ưu tiên/estimate:** P0, 1–1.5 agent-days.  
**Dependencies:** WP-01.  
**Parallel-safe với:** WP-02, WP-04–WP-06.  
**Exclusive write set:** migration mới; Task specification/contract/reference/evidence requirement
models và repository tests mới trong `app/modules/tasks/**`.

- [ ] RED tests cho full Task Specification Version và Task Contract Version tách biệt nhưng cùng
      một immutable version envelope.
- [ ] Extend/evolve current `task_requirement_versions` mà không mất role/skill snapshots hiện tại;
      migration phải ghi rõ migrate-in-place hay companion tables.
- [ ] Persist rich specification, structured work contract, evidence contract, supporting
      references, inherited source versions, resolved payload/hash và creator confirmation.
- [ ] Persist readiness inputs/output riêng delivery status; giữ warning/blocker codes có thể audit.
- [ ] Tạo indexes cho task/version/current version, content hash, readiness và reference lookup.
- [ ] GREEN round-trip, old-row compatibility và rollback tests.
- [ ] Test immutable version không bị update sau assignment; correction tạo version mới.

**Expected outputs:** canonical storage chứa đủ thông tin ngang phần docs liên quan và đủ để reconstruct
resolved brief tại thời điểm bất kỳ.

**Abnormal cases:** link-only Draft; image-only rich content thiếu accessible text; inaccessible
authenticated link; same URL nhiều lần; cyclic/invalid inheritance; parent version bị archive;
oversized HTML/JSON; concurrent version creation; hash collision handling; legacy skill-only version.

**Focused verification:** task migration/repository integration specs, assignment drift regression.

### WP-04 — Completion Report/claim persistence

- [~] **WP-04 overall status** — migration `20260801030000` đã tạo completion report foundation. Vẫn `[~]`: chưa có role-play E2E, screenshot, hay bằng chứng trải nghiệm theo test matrix.

**Ưu tiên/estimate:** P0, 0.75–1 agent-day.  
**Dependencies:** WP-01.  
**Parallel-safe với:** WP-02, WP-03, WP-05, WP-06.  
**Exclusive write set:** migration mới và Completion Report/criterion/claim/evidence mapping models,
repository tests trong `app/modules/tasks/**`; không sửa current submission commands.

- [ ] RED tests cho one Completion Report per submission revision, per-criterion result, evidence
      manifest và per-contributor claim.
- [ ] Evolve current `task_submissions`/evidences bằng companion tables để giữ API compatibility.
- [ ] Persist expected-versus-actual mapping, deviations, limitations, test/validation results,
      outcome/impact statements, evidence hashes/access class và contributor ownership scope.
- [ ] Enforce application-level uniqueness/idempotency keys theo conventions hiện tại.
- [ ] GREEN transaction round-trip và orphan prevention tests.

**Expected outputs:** storage phân biệt rõ Task yêu cầu gì và user thực sự báo cáo đã làm gì; review có
thể truy vết mỗi claim về criterion/evidence/contributor.

**Abnormal cases:** submission retry; evidence upload thành công nhưng mapping fail; evidence bị xóa;
URL expired; criterion N/A; partial completion; cùng evidence support nhiều claims; contributor rời
org; duplicate contributor; confidential evidence; task cancel sau draft report.

**Focused verification:** task submission persistence/integration và duplicate submission specs.

### WP-05 — Review Observation persistence

- [~] **WP-05 overall status** — migration `20260801040000` đã tạo review observation foundation. Vẫn `[~]`: chưa có role-play E2E, screenshot, hay bằng chứng trải nghiệm theo test matrix.

**Ưu tiên/estimate:** P0, 0.5–1 agent-day.  
**Dependencies:** WP-01.  
**Parallel-safe với:** WP-02–WP-04, WP-06.  
**Exclusive write set:** review-observation migration/models/repository tests mới trong
`app/modules/reviews/**`.

- [ ] RED tests cho immutable observation revisions: criterion decision, claim decision, capability
      observation, ownership confidence, evidence sufficiency và public wording decision.
- [ ] Persist reviewer identity/role, review session/version, source snapshot IDs, policy version,
      rationale, timestamps, supersession/revocation và dispute freeze metadata.
- [ ] Index theo review/task/submission/claim/user/status; không duplicate truth vào users/search.
- [ ] GREEN round-trip, append-only và concurrent reviewer tests.

**Expected outputs:** review result là structured fact có provenance, không chỉ score/comment rời rạc.

**Abnormal cases:** reviewer tự review claim của mình; two reviewers disagree; second reviewer late;
dispute mở giữa transaction; observation correction; deleted reviewer; duplicate event/retry;
unsupported capability taxonomy version; rationale chứa sensitive data.

**Focused verification:** review repository integration, dispute/review confirmation regressions.

### WP-06 — Verified Accomplishment persistence/module skeleton

- [~] **WP-06 overall status** — module `app/modules/accomplishments/**` đã có domain/infra/public_contracts; migrations `20260801050000`/`050100`; architecture boundary test và 16 integration tests (schema + repository) GREEN. Vẫn `[~]`: chưa có role-play E2E, screenshot, hay bằng chứng trải nghiệm theo test matrix.

**Ưu tiên/estimate:** P0, 0.75–1.25 agent-day.  
**Dependencies:** WP-01.  
**Parallel-safe với:** WP-02–WP-05.  
**Exclusive write set:** module mới `app/modules/accomplishments/**` trừ composition/routes; migration
riêng; module-boundary/architecture tests.

- [ ] RED architecture test chứng minh module mới không import infra/model của tasks/reviews/users.
- [ ] Tạo schema cho accomplishments, source links, claim links, evidence references, capability
      signals, lifecycle revisions và public-safe projections.
- [ ] Persist action/object/domain/ownership/context/output/outcome/scale/verification/confidence,
      provenance chain và source snapshot hashes.
- [ ] Tạo unique projection key để duplicate/replayed review event không sinh record thứ hai.
- [ ] GREEN persistence, lifecycle append và public projection round-trip tests.

**Expected outputs:** bounded context độc lập sở hữu canonical demonstrated-work entity và có thể rebuild
từ immutable facts.

**Abnormal cases:** same review replay; multiple contributors; one claim supports multiple actions;
accomplishment superseded/revoked; user deleted/anonymized; source task private; public projection
absent; invalid lifecycle transition; partial transaction; taxonomy version unavailable.

**Focused verification:** module boundary, migration and accomplishment repository integration tests.

### WP-07 — Project Context/Work Package domain và application backend

- [~] **WP-07 overall status** — domain rules, application commands, public fact readers,
  optimistic version fencing, tenant/project authorization, immutable version persistence and cache
  invalidation are implemented and freshly verified by focused unit `16/16` plus project-context API
  integration `6/6`, public fact-reader integration `2/2` and Work Package repository/fact-reader
  integration `2/2`. Unconfirmed publications and executable markup now fail in the application layer
  before identity/version/outbox/cache side effects. Overall remains `[~]` because the real
  authoring/resolved-brief browser journey, screenshot, full accessibility/security evidence,
  cross-tenant non-disclosure and resolved-read query flow are not yet complete.

**Ưu tiên/estimate:** P0, 1–1.5 agent-days.  
**Dependencies:** WP-01, WP-02.  
**Parallel-safe với:** task/review/accomplishment backend packages.  
**Exclusive write set:** Project domain rules, commands/queries, ports, adapters, validators và tests;
không sửa HTTP/composition.

- [x] RED domain tests cho create/version/archive context, optional Work Package, project ownership và
      precedence inputs.
- [x] Implement commands/queries qua ports, authorization input rõ ràng và optimistic concurrency.
- [x] Expose public facts/read contracts thay vì cho Tasks import Project models/repositories.
- [x] Validate critical fields không được chỉ tồn tại trong reference link; sanitize rich content.
- [x] GREEN unit/contract/repository adapter tests.
- [x] Add cache invalidation fact hoặc version token để resolved Task reads biết context thay đổi.

**Expected outputs:** Tasks có thể consume versioned shared context qua public boundary; project creator
không phải copy lại nội dung chung cho từng Task.

**Abnormal cases:** user có project read nhưng không edit; cross-tenant Work Package ID; project
archived giữa save; concurrent editor conflict; parent context missing; active version rollback;
empty work package; inherited secret field; project cache stale.

**Focused verification:** project domain/unit/integration specs và module-boundary tests.

**HTTP/event-boundary recheck (2026-08-09):** `[x]` restored the canonical Project Context and
Work Package publication routes under `/api/v1`, added controller injection wiring, and registered
the `project:context:changed:v1` / `project:work-package:changed:v1` payloads in the durable event
schema/parser. Evidence is unit contract `11/11`, Project Context HTTP integration `6/6`, and
anonymous HTTP contract `2/2`; stale-version fencing, authorization, no-write-on-invalid-input,
rich-content rejection and route authentication are covered. This does not close resolved-read,
browser authoring, cross-tenant disclosure, or release gates.

### WP-08 — Task specification/contract versioning backend

- [~] **WP-08 overall status** — version envelope, canonical persistence, inheritance precedence,
  rich/structured parity, historical reconstruction and assignment immutability now have focused
  unit/integration evidence. Overall remains `[~]` because the full authoring/assignment browser
  role-play bundle (including visible diff/acknowledgement), screenshots, AX/security/resilience
  evidence and clean typecheck/public-contract gates are not yet proven.

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-01, WP-03, WP-07 public read contract.  
**Parallel-safe với:** WP-10, WP-15, WP-16.  
**Exclusive write set:** new Task version domain/services/repositories/tests; không sửa
`CreateTaskCommand`, routes, composition hoặc primary UI.

- [x] RED truth-table tests cho inheritance precedence: Task override → Work Package → Project
      Context → template default; critical information không được “hidden inheritance”.
- [x] Build version envelope, canonical serialization/content hash, resolved specification/contract
      builder và source provenance map.
- [x] Enforce immutable version after assignment; correction/update creates a new version.
- [x] Compare rich specification và structured fields; mismatch tạo blocker/warning code có field
      path, không dùng opaque score.
- [x] Support Draft incomplete/version save nhưng không tự coi Assignment-ready.
- [x] GREEN unit/repository integration và historical reconstruction tests — contract persistence
      `8/8`, inheritance reader `1/1`, resolution unit `7/7`, and historical reconstruction `7/7`
      pass. Full browser authoring/assignment role-play remains a separate acceptance gap.

**WP-08 evidence refresh (2026-08-09):** the five implementation slices above are supported by the
focused unit and integration runs recorded in the checklist. This does not promote WP-08 overall to
`[x]`: the required full authoring/assignment journey, visible diff/acknowledgement flow, screenshot,
AX/security/resilience bundle and clean public-contract/typecheck gates are still unproven.

**BLOCKED verification:** focused tests, ESLint, module-layer và exception gates pass; full `tsc` và
public-contract-surface gate đang bị chặn bởi các file Filtering/Taxonomy/Search thay đổi đồng thời
ngoài write set của WP-08. Giữ overall `[~]` cho tới khi baseline ngoài scope ổn định và hai gate được
chạy lại.

**Expected outputs:** service thuần xác định version hiện tại, resolved brief và provenance cho từng
field; mọi downstream package dùng cùng output.

**Abnormal cases:** circular inheritance; inherited field removed; empty override accidentally hides
parent; template version deleted; same logical content different key order; unsupported rich node;
reference authenticated/expired; concurrent edit; old version lacks new fields; content too large.

**Focused verification:** versioning unit specs, assignment drift regression, task requirement rubric
contract specs.

### WP-09 — Deterministic readiness kernel

- [~] **WP-09 overall status** — deterministic readiness kernel and task-authoring integration are
  implemented. Fresh focused kernel evidence is `11/11`, including independent work/evidence states,
  link-only and accessibility blockers, Operational-only eligibility, deterministic sorted findings,
  and contract conformance. Overall remains `[~]` because property-test coverage and the full authoring
  UI/role-play/screenshot/accessibility bundle are still missing.

**Ưu tiên/estimate:** P0, 1–1.5 agent-days.  
**Dependencies:** WP-01, WP-08 resolved contract.  
**Parallel-safe với:** WP-10 và non-Task modules; không song song với WP-11 nếu cùng files.  
**Exclusive write set:** new Task readiness domain/types/tests; không sửa create/status commands.

- [x] RED table-driven tests cho Work Readiness và Evidence Readiness tách biệt delivery status.
- [x] Encode assignment blockers: missing outcome/scope/deliverable/acceptance/dependencies/constraints,
      link-only core content, inaccessible critical info, non-text critical diagram và creator chưa
      confirm.
- [x] Encode evidence blockers: evidence mode, criterion verification method, expected evidence,
      reviewer route và privacy class.
- [x] Warning/blocker có stable code, severity, field/source path và remediation hint; kết quả
      deterministic với cùng canonical input/policy version.
- [x] GREEN truth tables cho Operational-only và Evidence-enabled mode.
- [~] Add property tests/fixtures bảo đảm link presence không làm readiness tăng nếu nội dung cốt lõi
  vẫn thiếu; deterministic fixture coverage đã có, formal property suite còn thiếu.

**Expected outputs:** `ReadinessResult` explainable, versioned và tái sử dụng ở backend gate, UI card,
audit và analytics; không dùng một percentage mơ hồ làm authority.

**Abnormal cases:** whitespace/placeholder text; very long but semantically empty copy; duplicated
criterion; no relevant skills; N/A evidence; inaccessible link; image without alt/transcript;
inherited blocker; policy version missing; Operational-only bị publish nhầm.

**Focused verification:** readiness unit/property tests và contract fixture conformance.

### WP-10 — Required-skill semantics correction

- [~] **WP-10 overall status** — semantic min/target/ceiling/rubric persistence and category-policy
  behavior are implemented. Fresh evidence: category rules `3/3`, persistence support `2/2`, rubric
  API `1/1`, and skill-requirement service `16/16` integration tests; GitNexus impact was run for
  category rules, `persistTaskRequiredSkills`, and readiness callers (MEDIUM each). Overall remains
  `[~]` because the complete legacy adapter rollout and authoring UI/role-play evidence are still open.

**Ưu tiên/estimate:** P0, 1–1.5 agent-days.  
**Dependencies:** WP-01, WP-03.  
**Parallel-safe với:** WP-09 nếu write sets khóa chính xác.  
**Exclusive write set:** `task_required_skill_category_rules.ts`, required-skill domain/service,
persistence adapter và focused tests. Không sửa UI hoặc composition.

- [x] Chạy `gitnexus impact` cho category minimum rules và `persistTaskRequiredSkills`; báo risk trước
      khi edit.
- [x] RED tests chứng minh Task API design có thể yêu cầu đúng các capabilities liên quan mà không bị
      ép một skill ở cả Technology/Engineering/Soft Skill/Delivery.
- [x] Tách `min`, `target`, `ceiling` và rubric; không tự copy một selected level vào cả ba.
- [x] Giữ validator cho duplicate skill, invalid range, unknown taxonomy version và explicit policy
      template nếu organization thực sự yêu cầu category mix.
- [x] GREEN create/update/read compatibility tests và rubric API contracts.
- [x] Add migration/adapter behavior cho legacy rows đã bị flatten level. Chọn adapter fail-closed
      `legacy_flattened_unverified` thay vì migration phá hủy vì không thể phân biệt chắc chắn row
      legacy với một range bằng nhau được nhập có chủ ý.

**Expected outputs:** capability selection phản ánh công việc thật; không tạo fake breadth và không làm
sai downstream capability signals.

**Abnormal cases:** zero skills; manual/legacy level ID; min > target > ceiling; archived skill;
duplicate alias/canonical skill; taxonomy version drift; org policy contradicts task type; legacy
four-category row; empty rubric.

**Focused verification:** `task_skill_requirement_service.spec.ts`, create task integration,
requirement rubric contract và assignment drift tests.

### WP-11 — Task authoring command/query pipeline

- [~] **WP-11 overall status**

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-07–WP-10.  
**Parallel-safe với:** WP-15, WP-16; serial với WP-12 nếu shared query files.  
**Exclusive write set:** `CreateTaskDTO` evolution, create/update/version application commands,
validators, response mappers và focused tests; routes/composition/UI excluded.

- [x] Chạy impact cho `CreateTaskCommand`, internal transaction/preconditions/post-commit và DTO state
      builder; nếu blast radius tăng HIGH phải dừng merge.
- [x] RED create/update tests cho complete specification, Work/Evidence Contract, references,
      inheritance, mode, confirmation và readiness response.
- [x] Persist các rich fields hiện model hỗ trợ nhưng modal payload đang bỏ quên:
      `expected_deliverables`, `measurable_outcomes`, `impact_scope`, `environment`,
      `collaboration_type`, `complexity_notes`, `autonomy_level`, `estimated_users_affected`.
- [x] Save Draft dù incomplete; block assign/publish workflow bằng readiness authority, không block
      basic draft creation.
- [x] Add idempotency key và optimistic version conflict response cho autosave/manual retry.
- [x] Keep old create payload compatible qua explicit legacy adapter/defaults; không silently mark
      legacy create as evidence-ready.
- [x] GREEN unit/integration/contract tests; audit event chứa version/readiness nhưng không chứa full
      confidential content.

**Expected outputs:** một application pipeline nhận đầy đủ Task, tạo immutable version, trả readiness
explanation và giữ legacy clients hoạt động.

**Abnormal cases:** duplicate submit; browser retry; stale version; cross-org project/work package;
creator loses permission mid-transaction; reference fetch unavailable; unsupported attachment;
malicious rich HTML; oversize body; event staging fails; post-commit notification fails; title-only
Draft; attempted direct assignment while blocked.

**Focused verification:** create task unit/integration/contracts, role prefill và notification
atomicity regressions.

**Completion evidence (2026-08-01):**

- RED được ghi nhận cho missing `persistVersion`, stale writer rơi vào DB unique error, authoring-only
  bị ghi giả vào Task row, response replay mất authoring summary và invalid change-class taxonomy.
- GREEN: `create_task_authoring_pipeline.spec.ts` (Draft/publish initial + Draft/publish version),
  `task_request_mapper.spec.ts`, create/update command + transaction support specs,
  `lucid_task_authoring_create_persistence.spec.ts`, `create_task.spec.ts`, `update_task.spec.ts` và
  `task_authoring_api.contract.spec.ts`.
- HTTP contract chứng minh camelCase create/update, stable idempotent replay response và stale head
  trả `409` mà không để Specification/idempotency row rác.
- Focused ESLint sạch; backend `tsc --noEmit` từng pass sau WP-11. Các lần full gate sau đó có thể bị
  chặn bởi work-in-progress Filtering/Taxonomy metadata-assignment ngoài exclusive write set WP-11.
- Master matrix vẫn `[ ]`: WP-22 hiện mới có draft role-play/screenshot; publish/assignment,
  accessibility, security, resilience và full end-to-end feature evidence còn thiếu. Backend
  completion không được dùng để tuyên bố end-to-end feature complete.

### WP-12 — Resolved brief và immutable task-detail reads

- [~] **WP-12 overall status**

**Ưu tiên/estimate:** P0, 1–1.5 agent-days.  
**Dependencies:** WP-07–WP-11.  
**Parallel-safe với:** non-Task module packages; không song song với WP-11 nếu query mapper overlap.  
**Exclusive write set:** resolved-task query/service/read repository, task detail response types và
focused tests; frontend/routes/composition excluded.

- [x] Chạy impact cho `GetTaskDetailQuery`, task detail repository và response mapper.
- [ ] RED contract tests: resolved brief trả source/provenance cho từng section, explicit override,
      readiness blockers, evidence contract và supporting references nhưng không bắt client tự merge.
- [~] Build immutable `ResolvedTaskContractV1` từ exact Task/Work Package/Project versions đã chọn;
  current detail chỉ dùng active versions khi chưa có assignment snapshot.
- [~] Provide separate creator-edit view và assignee/reviewer resolved view; không leak internal
  confirmation/audit fields cho unauthorized actor.
- [ ] Preserve accessibility text cho diagram/image và expose unsupported-content warning.
- [x] GREEN read repository/contract/cache tests; cache key phải gồm resolved version hash và actor
      access scope.

**Completion evidence (partial, refreshed 2026-08-08):** current immutable bundle/history readers validate
schema, version linkage và canonical hashes; creator/assignee/public projections are access-scoped;
field provenance is persisted separately from the Contract payload; cache keys partition tenant,
audience và immutable resolved hash. Focused unit/integration/contract tests pass; resolved-brief
contract is 4/4 with explicit 10s per-test budgets, including pinned historical and stale-assignee
fail-closed cases. Remaining before `[x]`: explicit reviewer/restricted-source grant matrix,
unsupported-content accessibility proof and full UI/role-play/screenshot evidence.

**Expected outputs:** assignee mở Task và đọc được một execution brief self-contained, có phân biệt nội
dung inherited/overridden/reference và đủ để thực hiện mà không cần external link.

**Abnormal cases:** parent version missing; reference restricted; actor sees project but not secret
work package; cache from another tenant; assignment points old version; unsupported rich node; task
deleted/archived; current context changed; public/marketplace actor; partial legacy snapshot.

**Focused verification:** task detail contract/integration, marketplace access và cache isolation
tests.

### WP-13 — Assignment snapshot, acknowledgement và change control

- [~] **WP-13 overall status**

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-03, WP-09, WP-12.  
**Parallel-safe với:** WP-15, WP-16.  
**Exclusive write set:** assignment snapshot model/repository evolution, acknowledgement/change
request commands/rules/tests; assignment routes/UI/composition excluded.

- [x] Chạy impact cho `CreateTaskAssignmentSnapshotCommand` và assignment snapshot rules/model.
- [~] RED tests: assignment bị block nếu Work/Evidence readiness chưa pass; snapshot chứa toàn bộ
  resolved specification/contract/provenance, không chỉ role/skills/acceptance.
- [~] Persist acknowledgement by assignee, clarification request, acknowledged version/hash và
  timestamps.
- [~] Implement deterministic change classification: editorial, non-material, material; material
  change tạo version/snapshot mới và yêu cầu re-ack theo DEC-04.
- [~] Keep old snapshots readable; không mutate snapshot cũ khi Project/Task/reference thay đổi.
- [~] Add optimistic locking, idempotency và audit facts cho assign/reassign/re-ack.
- [x] GREEN assignment drift, concurrent assignment và workflow regression tests.

**TDD evidence refreshed (2026-08-08):** canonical snapshot/readiness kernel, deterministic change
classifier and acknowledgement/clarification/successor rules are GREEN at unit level (29 focused
tests). Repository/drift integration is green, and fresh `task_create_update_assignment_sync.spec.ts`
is 6/6 including notification rollback, failed reassignment rollback and concurrent serialization.
UI/role-play/audit-export layers remain required before WP-13 can be marked complete.

**Snapshot taxonomy validation follow-up (2026-08-09):** `isTaskAssignmentSnapshotV1` now validates
the optional pinned taxonomy envelope when present — snapshot-task/entity binding, task-scoped
assignment/free-tag/completeness resources, assignment provenance/review, version maps, diagnostics,
provider revisions and bounded confidence — while keeping
pre-taxonomy snapshots and explicit `null` metadata backward-compatible. Focused schema validation
is `9/9`; the combined assignment/taxonomy batch is `33/33`, with targeted ESLint and
`git diff --check` clean. This hardens the contract boundary only; it does not close assignment
audit-export, UI, role-play or public taxonomy disclosure gates.

**Completion acknowledgement gate follow-up (2026-08-10):** native `submit_for_review` now checks
the acknowledgement state on the exact historical snapshot selected by `assignmentSnapshotId` and
`assignmentSnapshotHash`. A pending/re-acknowledgement snapshot returns
`TVA.COMPLETION.ASSIGNMENT_ACKNOWLEDGEMENT_REQUIRED`; an open clarification returns
`TVA.COMPLETION.ASSIGNMENT_CLARIFICATION_UNRESOLVED`; Draft persistence remains allowed. The
command unit suite is `5/5`, and the database-backed Completion Report persistence suite is `5/5`
with its valid-submit fixture acknowledging the exact snapshot through the production command.
UI disclosure, full assignment change role-play, audit export and release gates remain open.

**Expected outputs:** một Work & Evidence Contract “đã ký nhận” tại assignment, có version chain và
không bị current Task edits làm drift.

**Abnormal cases:** two users assigned concurrently; assignee removed; reassign after acknowledgement;
material change while in progress/review/dispute; reference content changes without Task version;
creator unavailable; acknowledgement retry; task canceled; legacy snapshot missing fields; direct DB
status transition; clarification unresolved.

**Focused verification:** `assignment_drift_regression.spec.ts`, assign task integration, snapshot and
workflow unit tests.

### WP-14 — Completion Report, criterion, evidence và contributor claims

- [~] **WP-14 overall status**

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-04, WP-12, WP-13.  
**Parallel-safe với:** review/accomplishment packages cho tới public contract integration.  
**Exclusive write set:** completion-report domain/commands/queries/repository adapters/tests;
submission UI/routes/composition excluded.

- [ ] Chạy impact cho `SubmitTaskSubmissionCommand`, add/delete evidence và lock commands.
- [ ] RED tests cho completion summary, actual deliverables, deviations/limitations, per-criterion
      result, evidence mapping, validation results, outcomes và per-contributor ownership.
- [ ] Build review package from assignment snapshot + completion report; tuyệt đối không đọc current
      mutable Task để thay requirement tại review time.
- [ ] Validate required criterion/evidence coverage theo Evidence Contract; cho phép Draft/partial
      save nhưng block submit-for-review nếu thiếu blocker.
- [ ] Hash/version evidence metadata; record availability/access state mà không giả nội dung private
      đã được verifier đọc.
- [ ] Keep existing submission endpoints compatible qua adapter; preserve lock and duplicate-submit
      semantics.
- [x] GREEN transaction, duplicate, evidence deletion, notification atomicity và contract tests.

Evidence refreshed 2026-08-08: duplicate submission/evidence validation 3/3 and notification
atomicity 2/2, in addition to completion-report persistence/schema/access suites. Upload retry,
malware/unsupported-mime and UI/role-play/visual evidence remain open.

Bounded attribution preservation follow-up (2026-08-10): the native frontend payload/editor slice
now preserves all hydrated contributor claims and each evidence item's server-authoritative owner
and contributor IDs when creating a later report revision. Only the current reporter claim is
replaced; no arbitrary collaborator editor or governed correction policy is inferred. Focused
payload/user/org coverage is `5 files / 39 tests: PASS`.

Evidence Contract target persistence follow-up (2026-08-10): submitted report child facts now retain
all `evidenceRequirementIds` and `deliverableIds` as normalized manifest arrays, with the legacy
`related_deliverable_id` retained as a compatibility projection. The reviewer package mapper and
Lucid model expose these arrays without exposing private locators. Focused command/mapper evidence
is `6/6 + 1/1`, and schema integration is `6/6`; this does not close upload, criterion/claim
governance or reviewer workflow acceptance.

**Expected outputs:** reviewer nhận package phân biệt rõ expected versus actual và biết claim nào thuộc
contributor nào, được support bởi criterion/evidence nào.

**Abnormal cases:** file upload succeeds/DB fails; DB commits/notification fails; duplicate submit;
late evidence after lock; deleted/expired URL; malware/unsupported mime; evidence reused; criterion
N/A; partial failure; contributor rejects attribution; user left org; confidential output; task
materially changed after work; offline retry.

**Focused verification:** task submission unit/integration/contracts, duplicate and notification
atomicity specs.

### WP-15 — Structured review observations và claim decisions

- [~] **WP-15 overall status**

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-01, WP-05, WP-14 review-package contract.  
**Parallel-safe với:** WP-16 cho tới projector contract handshake.  
**Exclusive write set:** review-observation domain/services/validators/repositories/tests; confirmation
orchestration/routes/UI excluded.

- [ ] RED domain tests cho criterion decision, claim accept/narrow/reject, ownership share,
      capability observation, evidence sufficiency, rationale và public-safe wording.
- [ ] Enforce reviewer eligibility/conflict rules và policy-driven second reviewer/quorum.
- [ ] Distinguish “deliverable accepted” from “capability claim verified”; một Task complete không tự
      động chứng minh mọi requested skill.
- [ ] Support conflicting observations, consensus/authoritative decision, correction, supersession và
      dispute freeze without destructive update.
- [ ] Validate reviewer không thể mở rộng public claim vượt actual claim/evidence.
- [x] GREEN domain/repository/integration tests và current review workflow regressions.

Evidence refreshed 2026-08-08: review-observation unit 11/11, persistence/workflow integration
13/13, boundary 1/1 and confirm-review integration 9/9. Canonical task review board role-play
now passes 2/2 after the E2E seed was corrected to create the assignment-pinned native workflow
and reviewer rows; screenshots are written under `test-results/e2e-visual/task-review-board/`.
Full observation/dispute correction and public accomplishment UI evidence remains open. The former
`inertia/apps/org/tests/e2e/reviews/review_lifecycle_experience.spec.ts` was removed because both
flows targeted deleted `/reviews/:id` and `/reviews/disputes/:id` pages and failed with 404; it was
not valid product evidence.

**Capability observation invariant follow-up (2026-08-10):** `validateReviewObservation` now blocks
final capability confirmations/refinements/narrowing/partial verification when `evidenceRefs` is
empty or `confidence` is null, using stable `TVA.REVIEW.OBSERVATION.CAPABILITY_*_REQUIRED` codes.
Draft and `request_evidence` dispositions remain authorable. Focused rule coverage is `8/8`; no
numeric confidence threshold, quorum, finalization authority or dispute/correction policy is inferred
by this slice.

**Finalization-readiness parity follow-up (2026-08-10):** the policy-neutral readiness evaluator now
emits explicit `TVA.REVIEW.FINALIZATION.CAPABILITY_EVIDENCE_REQUIRED` and
`TVA.REVIEW.FINALIZATION.CAPABILITY_CONFIDENCE_REQUIRED` blockers for final capability verification.
Focused coverage is `8/8`; it remains deliberately unauthorized with `policyStatus: not_evaluated`.

**Native observation audit receipt follow-up (2026-08-10):** the native observation create path now
passes the authenticated review context into persistence and writes one redacted,
metadata-only `review_observation.created` audit event in the same transaction as the initial
revision. Idempotent retries return the existing revision without another audit row. Focused
command coverage is `6/6`; real persistence/audit coverage is `10/10`. The receipt records
provenance of persistence only and does not infer finalization, quorum, correction or dispute
authority.

**Current-revision projection fence follow-up (2026-08-10):** the governed accomplishment source
reader now joins each revision to its observation anchor and requires
`revision_number = current_revision_number`, with both rows in `final` state. The native projector
integration suite is `3/3`, including a frozen-current-revision regression that rejects projection
from an older `final` revision. This is a read-side consistency fence only; correction, dispute
resolution and finalization policy remain open.

**Public taxonomy term containment follow-up (2026-08-10):** the talent-search document reader now
filters organization-private terms and terms with non-public or unresolved parents before building
the public/shared skill projection. The focused Talent Search integration suite is `4/4`. The slice
does not define the missing publication allowlist, public-safe DTO, actor × action × data-class matrix
or remaining Profile/Search redaction policy.

**Expected outputs:** review tạo structured observations đủ để projector quyết định accomplishment
chứ không phải parse comment/score bằng heuristic.

**Abnormal cases:** self-review; reviewer collusion/conflict; reviewer lacks evidence access; split
decision; second reviewer missing; dispute opens at confirm; correction after publish; duplicate
observation; contributor-specific partial reject; taxonomy retired; sensitive rationale; AI
suggestion submitted without human confirmation.

**Focused verification:** confirm review, eligibility, dispute, review fact exporter và task review
board tests.

### WP-16 — Verified Accomplishment domain/projector

- [~] **WP-16 overall status** — projector/domain unit `19/19`, supporting rule unit `29/29`,
  integration `20/20`, rebuild command `2/2` và native rebuild/hash `2/2` GREEN. Vẫn `[~]`: chưa
  có accomplishment role-play E2E/screenshot và full observation/dispute UI evidence theo matrix.

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-01, WP-06, WP-14 claim fact, WP-15 observation contract.  
**Parallel-safe với:** WP-17 preparation, không sửa review orchestration.  
**Exclusive write set:** `app/modules/accomplishments/domain/**`, actions/ports/repositories/projector
tests; routes/composition excluded.

- [x] RED lifecycle tests: draft candidate → verified → published/unpublished → disputed/frozen →
      corrected/superseded/revoked; invalid transitions bị reject.
- [x] Project accomplishment chỉ khi optional governance có claim ownership, evidence sufficiency
      và governed review gate pass; rejected/disputed/Operational-only Task không tạo verified public
      fact. Đây không phải điều kiện để Task chuyển Done.
- [x] Derive action/object/domain/context/ownership/output/outcome/scale/verification from actual
      claims/observations và snapshots; requirement chỉ là context, không phải asserted result.
- [x] Generate capability signals có source accomplishment, observation, context, confidence và
      policy version; không overwrite user skill level trực tiếp.
- [x] Create public-safe projection bằng allowlist + disclosure decision; wording không được rộng hơn
      verified claim.
- [x] Make projection idempotent/rebuildable theo source fact IDs + version hashes; the application
      `RebuildVerifiedAccomplishmentCommand` now runs the governed projector with an expected-hash
      guard, and the native PostgreSQL integration rebuilds without changing aggregate/hash.
- [~] GREEN domain/repository tests are green (`19` focused unit + `29` domain unit + `20`
  accomplishment integration tests); property-style order determinism and full UI/rebuild
  evidence are still open.

**Expected outputs:** canonical Verified Work Accomplishment chứng minh “đã làm việc gì”, có full
provenance, contributor ownership và public-safe form.

**Abnormal cases:** multiple accepted claims merge/split; one evidence supports several users;
review corrected; source revoked; duplicate/out-of-order event; user/org deleted; task title changed;
private output; empty public wording; taxonomy mapping ambiguous; project scale unavailable;
partial projector failure; rebuild on new policy version.

Evidence refreshed 2026-08-09: focused lifecycle/projector/public-projection unit tests `19/19`,
capability/content/projection-rule unit tests `29/29`, and repository/lifecycle/public-projection/
source-reader integration tests `20/20` pass. These prove lifecycle rejection, governed claim and
evidence gates, contributor-bounded derivation, capability provenance/capping, public allowlisting,
idempotent replay/collision handling, child immutability, concurrency CAS, and native rebuild hash
stability through `review_confirmed_accomplishment_projector_transaction.spec.ts` `2/2`. The new
rebuild command unit suite is `2/2`. WP-16 remains `[~]` because role-play E2E/visible screenshots
and full observation/dispute UI evidence are not yet complete.

**Focused verification:** accomplishment domain/unit, repository/integration, module-boundary and
rebuild determinism specs.

### WP-17 — Review-confirmed durable orchestration

- [~] **WP-17 overall status** — receipt/lock/retry và composition projector đã nối; native
  review-confirmed identity → accomplishment write đã có transaction proof `2/2`; completed
  duplicate/replay no-op đã có evidence; canonical review-board role-play is `2/2` with visual
  checkpoints, while profile evidence and complete observation/dispute UI coverage vẫn thiếu.

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-15, WP-16.  
**Parallel-safe với:** WP-18 test fixture preparation only.  
**Exclusive write set:** review-confirmed processing ports/adapters/command tests and new event/outbox
contracts; coordinator has registered the projector composition because the transaction boundary is
part of this package's correctness proof.

- [x] Chạy impact cho `ProcessReviewConfirmedEventCommand`, processing receipt, projection lock và
      review consumer ports; report integration risk cao dù CLI trả MEDIUM.
- [~] RED tests: receipt database phase, external retry và projector commit/rollback có evidence;
  native source-backed atomic write đã pass `2/2`; completed duplicate/replay no-op đã pass trong
  `confirm_review.spec.ts` (10/10), còn replay/order assertion khác vẫn thiếu.
- [x] Integrate projector trong durable database phase hoặc versioned outbox consumer có receipt/lock
      riêng; không thêm fragile post-commit side effect không theo dõi.
- [x] Native resolver fixture chứng minh confirmation chỉ mang identity khi có native workflow và
      đúng một finalized accomplishment claim; confirm-review integration pass `10/10`.
- [x] Real PostgreSQL projector transaction integration chứng minh rollback/commit của aggregate,
      claim/evidence/observation links và lifecycle revisions pass `1/1`.
- [x] Define event order/version semantics ở durable outbox: same-aggregate predecessor fencing,
      lease-expiry recovery, retry ordering và dead-letter progression pass trong
      `domain_event_outbox_recovery.spec.ts` (16/16); review-confirmed payload ordering cũng pass.
- [~] Preserve existing credibility/skill/performance/trust/profile refresh behavior; the profile
  aggregate atomicity integration is `2/2` (failure rollback and same-user concurrency lock), and
  confirm-review pipeline audit coverage remains present. Full projector-to-profile regression and
  browser evidence are still missing.
- [x] Add poison-message/dead-letter observability contract và replay command behavior; bounded
      preview/replay unit `8/8` and PostgreSQL administration integration `4/4` prove payload-safe
      metadata, exact-selector enforcement, operator binding, atomic replay, attempt history and
      locked-row no-partial-replay semantics.
- [~] GREEN atomicity, completed duplicate/replay no-op, partial external effect, retry,
  same-aggregate event-order, native accomplishment duplicate/replay identity and DLQ administration
  tests đã pass; canonical review-board UI role-play `2/2` and screenshots now pass; profile
  regression and complete observation/dispute UI journey còn thiếu.

**Expected outputs:** review confirmation tạo accomplishment một lần, có thể retry/replay/rebuild mà
không làm sai profile hoặc skill aggregates.

**Abnormal cases:** DB deadlock; receipt committed but effect not; event delivered twice/out of order;
projector schema newer/older; dispute races confirmation; user deleted; external profile/search down;
poison fact; lock timeout; transaction rollback; worker crash at every phase boundary.

**Focused verification:** review-confirmed receipt, projection revision, listener failure semantics,
confirm review and profile aggregate atomicity specs.

### WP-18 — Historical fact source và legacy work-history correction

- [~] **WP-18 overall status**

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-12–WP-17.  
**Parallel-safe với:** WP-21–WP-25 frontend mocks; serial với WP-19 read-model integration.  
**Exclusive write set:** completed-assignment fact queries/exporters, work-history build adapter,
legacy fact mapper and regression tests; profile UI/search excluded.

- [x] Chạy impact cho `BuildUserWorkHistoryCommand`, completed assignment fact queries/exporter và
      `GetUserWorkHistoryQuery`.
- [x] RED regression: sửa current Task title/description/skills/context sau completion không làm đổi
      historical rebuild output.
- [x] Replace mutable-task joins bằng exact assignment/submission/review snapshots; legacy fallback
      phải gắn provenance/confidence rõ.
- [~] Export accomplishments as first-class facts; keep current skill/performance aggregates for
  compatibility nhưng không coi chúng là accomplishment.
- [~] Populate knowledge artifacts/evidence summaries chỉ từ allowed verified sources; không để
  default empty nếu facts tồn tại.
- [x] Make rebuild deterministic/idempotent và record source schema/policy version.
- [x] GREEN work-history, exporter, aggregate refresh và historical drift tests.

**Expected outputs:** rebuild ở bất kỳ thời điểm nào cho cùng source facts tạo cùng historical result;
không còn bug join current mutable `tasks` làm đổi quá khứ.

**Abnormal cases:** legacy row không snapshot; corrupt JSON; missing review fact; duplicate assignment;
task/project/org deleted; user merged/deactivated; clock skew; old skill taxonomy; revoked
accomplishment; mixed native/backfilled data; partial rebuild; current profile newer than event.

**Focused verification:** `completed_assignment_profile_fact_exporter.spec.ts`, work history unit/
integration, refresh aggregate atomicity and drift regression specs.

### WP-19 — Accomplishment-first Profile APIs/snapshots

- [~] **WP-19 overall status**

**Ưu tiên/estimate:** P0 demo, 1.5–2 agent-days.  
**Dependencies:** WP-16–WP-18.  
**Parallel-safe với:** WP-20.  
**Exclusive write set:** users profile query/DTO/public snapshot schema/repository tests; frontend,
routes/composition excluded.

- [x] Chạy impact cho `GetUserWorkHistoryQuery`, `GetProfileShowPageQuery`,
      `PublishUserProfileSnapshotCommand` và public snapshot query.
- [~] RED contracts: profile API trả demonstrated-work list/detail với action, object, ownership,
  context, output, outcome/scale, verification/confidence và privacy-safe evidence summary.
- [x] Make current profile work-history query return actual task/accomplishment history, không chỉ
      organization/project memberships.
- [~] Version profile snapshot vNext; snapshot exact public accomplishment projections, publication
  choices và provenance labels.
- [x] Preserve legacy skill charts/reviews after accomplishment section; clearly label verified,
      imported/self-declared/retrospective confidence.
- [x] Support backend pagination/sort/filter without leaking private totals or public source IDs;
      focused Profile unit `8/8` covers stable pages/cache/filter/privacy and Profile integration
      covers the >100 storage-row boundary. UI pagination/performance acceptance remains open.
- [x] GREEN unit/integration/public snapshot/publish compatibility tests.

Evidence refreshed 2026-08-08: `get_user_work_history_query.spec.ts` unit 3/3 and integration 2/2
prove scope-separated demonstrated work, authoritative verified projection precedence, public
visibility, and preservation of the user predicate inside a transaction; `publish_user_profile_snapshot.spec.ts` integration 2/2
proves public/private highlights and immutable snapshot provenance labels; public snapshot query suite
7/7 and profile reverse-review integration 1/1 remain green. Current desktop Profile UI component
coverage is 2/2, conservative legacy-work role-play is 2/2, authoritative verified-work desktop
role-play is 2/2, and the dedicated desktop accessibility journey is 1/1. The populated card and
public snapshot now visibly label the seeded legacy row
`Retrospective / limited`; the UI no longer promotes a non-null quality score to `Review confirmed`.
Screenshots `profile-demonstrated-work.png`, `profile-demonstrated-work-populated.png`,
`profile-demonstrated-work-verified.png` and `profile-public-snapshot-populated.png` were captured
and visually inspected. Pagination, recruiter journey, formal accessibility audit beyond the
semantic/keyboard journey, and full evidence-summary publication remain open. Mobile UI is not a
product surface in this delivery: `profile_mobile_layout.spec.ts` is a legacy audit and is explicitly
**N/A/out-of-scope**, not an unfinished requirement; it must not be implemented or used as acceptance
evidence.

Coordinator follow-up 2026-08-09: the backend pagination/privacy wave passes `11/11` focused unit
tests across work history, public snapshot controller and recruiter Search adapter; Profile
work-history integration now passes `4/4`, including active-public-projection gating and
public-after-unpublish removal with self retention/cache invalidation; public snapshot privacy
integration passes `7/7` and omits root, summary and work-highlight internal IDs while owner
storage rows remain unchanged. Publication unpublish is covered separately by mapper `2/2`,
command `4/4`, authenticated HTTP `8/8` and anonymous contract `2/2`. Search reindex/outbox,
UI pagination/performance and full privacy/role-play evidence remain open.

**Expected outputs:** Profile read contract trả lời được recruiter question “người này đã từng thiết kế
API/scale database/debug production chưa, ở vai trò nào, bằng chứng được xác minh ra sao?”.

**Abnormal cases:** no accomplishments; only legacy history; unpublished/revoked/disputed item;
private org/task; profile link snapshot cũ; user changes publication after snapshot; deleted evidence;
multiple contributor roles; long sensitive wording; pagination race; cross-tenant viewer; cache stale.

**Focused verification:** profile/work-history/public snapshot unit/integration, publication and
discoverability tests.

### WP-20 — Public-safe accomplishment Search adapter

- [~] **WP-20 overall status**

**Ưu tiên/estimate:** P1, 1–1.5 agent-days.  
**Dependencies:** WP-16, WP-18, WP-19; Search plan baseline committed and relevant Search WPs locked.  
**Parallelism:** chỉ chạy khi coordinator xác nhận không đụng dirty Search files; coordinate với plan
Search/Taxonomy WP-03/WP-12/WP-13/WP-16/WP-26/WP-27.  
**Exclusive write set:** accomplishment public reader/adapter/new document fixtures và bridge contract;
Search engine/compiler/index cutover thuộc plan kia.

- [x] Chạy impact cho talent search document reader/builders sau khi Search baseline reconcile; GitNexus
      báo MEDIUM risk cho `TalentSearchDocumentBuilder`, `LucidTalentSearchDocumentReader` và
      `searchPublicApi`.
- [~] RED document tests cho API design, database scaling và production debugging: action/object,
  domain, ownership, scale, recency, repetition, verification/confidence và public-safe snippets.
- [x] Export only published public-safe projections; private evidence/source/title không vào document,
      logs, facets hoặc diagnostics.
- [x] Attach schema/taxonomy version và stable source ID để Search plan có idempotent reindex/cutover.
- [x] Define deletion/unpublish/revoke behavior through active-public projection reads; inactive rows
      are excluded and the existing accomplishment document builder returns `null` for tombstoning.
- [~] GREEN document/reader privacy and adapter contract tests; focused accomplishment tests, talent
  builder tests (`2/2`) và adapter privacy test (`1/1`) pass, nhưng benchmark/cutover compatibility
  và full search integration vẫn còn thiếu.

**Expected outputs:** provider-neutral accomplishment search document và benchmark corpus; không tự
implement duplicate filter/ranking/index framework.

**Abnormal cases:** private accomplishment accidentally cached; stale public projection; unpublish
during reindex; duplicate source; alias/taxonomy drift; no evidence snippet; recruiter query language
variant; revoked item remains indexed; user hidden; zero/huge scale; Elasticsearch unavailable.

**Focused verification:** new accomplishment document tests plus Search privacy/index compatibility
tests trên committed baseline.

**Evidence refresh (2026-08-09):** `TalentPublicAccomplishmentReaderAdapter` consumes only the
application-owned `AccomplishmentPublicProjectionReader` contract. `LucidTalentSearchDocumentReader`
receives that public vocabulary through composition, and `TalentSearchDocumentBuilder` maps public
action/object/domain/category/task-type and safe summaries into `accomplishments_text`; reviewer,
verification-method and disclosure fields are not copied. Typecheck, module-domain-boundary and
side-effect gates pass. Talent discovery Elasticsearch integration is now `5/5`, including an exact
private accomplishment term returning zero hits/total and no private facet/output leakage. WP-20
remains `[~]` until provider-neutral benchmark, index compatibility, unpublish lag and recruiter
UI/search role-play evidence are complete.

**Public taxonomy disclosure audit (2026-08-10):** `[~]` the accomplishment vocabulary is
public-safe, but the same Talent Search document also carries user-skill taxonomy and evidence
metadata that is not covered by a term-level publication/privacy allowlist. The public hit mapper
and discovery context therefore cannot be treated as a complete disclosure boundary: candidate
ranking, facets, counts and response fields require the same policy. No policy-neutral implementation
may guess which terms, aliases, proficiency states or provenance are public. The safe containment
alternative is to reject `talents.discovery.public` until a product-approved allowlist exists; this
would be product-breaking and remains intentionally unimplemented pending approval.

**Native review governance audit (2026-08-10):** `[~]` observation persistence is not the same as
governed finalization. Native observations can already be posted as `final` and persist
`finalized_at`, but there is no dedicated native finalization authority/orchestration boundary;
quorum is partly recomputed from legacy workflow state, and correction/dispute freeze/audit receipts
do not yet have an atomic native path. The existing reviewer role-play remains useful evidence for
authoring, not proof of the finalization contract. O-005 policy decisions (minimum-reviewer mapping,
conflict authority/tie-break, reviewee acceptance timing, correction authority and post-publication
dispute behavior) remain open.

**Pinned taxonomy bridge (2026-08-09):** assignment synchronization now asks the task metadata
provider for the authorized task and pins the full assignment-scoped envelope — canonical assignments,
free-form tags, taxonomy/enrichment versions, source revision, completeness and diagnostics — into the
immutable Assignment Snapshot hash. Legacy snapshots remain readable without the optional field.
Accomplishment projection now derives backward-compatible task type, business domain, problem category,
technology and complexity values from that snapshot rather than the mutable Task row. Focused task
metadata/provider, synchronization and accomplishment projection tests pass `24/24`; targeted ESLint
and `git diff --check` pass. This closes the immutable source/pinning slice only; the full envelope is
not yet carried through the public accomplishment/Search document, secondary-label facets remain open,
and term-level visibility/public taxonomy governance, benchmark/cutover and privacy-matrix evidence
remain required.

### WP-21 — Project Context/Work Package frontend

- [~] **WP-21 overall status**

**Ưu tiên/estimate:** P1, 1–1.5 agent-days.  
**Dependencies:** WP-01 UI fixtures, WP-07 response contract. Có thể build bằng mocked contract trước
WP-28.  
**Parallel-safe với:** WP-22–WP-27 nếu component/file ownership disjoint.  
**Exclusive write set:** new Project Context/Work Package Svelte components/stores/tests trong user và
org project modules; shared routes/i18n excluded.

- [~] RED component tests cho create/edit/version history, Work Package selector và inherited preview.
- [~] Build reusable context editor/viewer với rich content, privacy/access indication, permission-
  gated publish và optimistic version-conflict reload; section templates và full history UI vẫn mở.
- [ ] Show “dùng chung cho N Tasks” và explicit source/version; creator hiểu thay đổi shared context có
      ảnh hưởng Task draft nào nhưng không rewrite snapshot đã assigned.
- [ ] Provide accessible text requirement cho images/diagrams và warning nếu critical visual thiếu
      explanation.
- [ ] Mirror user/org surfaces bằng shared feature component hoặc proven parity fixture; không copy
      logic rồi drift.
- [~] GREEN component tests với locked active-version payload, permission gate và 409 conflict
  retention; full a11y/responsive/role-play bundle vẫn mở.

**Expected outputs:** creator nhập shared project/feature context một lần và reuse có chủ đích, giảm
mechanical copy nhưng vẫn phải review resolved content.

**Abnormal cases:** no permission; version conflict; project archived; work package deleted while
selected; huge rich content; upload failure; offline/retry; inherited secret; mobile keyboard; image
without accessible description; dirty form navigation.

**Focused verification:** new project context Vitest specs, strict Svelte check and targeted frontend
lint.

**Active-context read slice (2026-08-09):** `[~]` user and organization project-detail surfaces now
load the active `ProjectContextFactReader` through their respective query/composition paths. The
backend returns a privacy-safe page projection containing only active version/content fields;
actor IDs, source provenance, content hash, structured defaults and version token are not exposed.
The shared read card sanitizes rich content and has an explicit empty state; the permission-gated
editor can publish initial/material versions with `expectedActiveVersionId` fencing and reload the
active page projection after success. Focused evidence is the projection/API unit suite `6/6`,
project-detail integration `1/1`, shared card/editor tests `6/6`, targeted ESLint, targeted
`svelte-check` `0/0`, and `git diff --check`. The editor retains drafts across 409 responses,
surfaces the remote active version, supports explicit reload success/failure callbacks, and retries
with the refreshed active-version fence. The Work Package selector/read contract is now covered by
focused backend projection/query/catalog tests and user/org form rendering tests; version history,
inheritance preview, accessibility role-play and responsive bundle remain open.

**Project-detail fence privacy follow-up (2026-08-10):** the page mapper now accepts an explicit
concurrency-fence option, and `GetProjectDetailQuery` derives it from `canUpdateProject`. Authorized
editors retain `active_version_id` for CAS publication; project viewers receive the same readable
context without the internal editor fence. Focused mapper coverage is `6/6` and the real project
detail integration is `1/1`.

### WP-22 — Primary Task authoring frontend

- [~] **WP-22 overall status** — user/org create surfaces now expose explicit authoring mode/intent,
  creator confirmation, structured Work Contract fields and optional references; `svelte-check`
  `0/0`, focused component tests `2/2`, focused lint pass, and a seeded Chromium role-play can save
  an incomplete draft from the project board. Overall remains `[~]`: publish/assign, inheritance
  preview, readiness feedback, recovery, upload/import, AX/security/resilience remain open.

**Ưu tiên/estimate:** P0, 2–2.5 agent-days.  
**Dependencies:** WP-01 UI fixtures, WP-09 readiness, WP-10 skills, WP-11 API contract.  
**Parallel-safe với:** other frontend packages; owns all create-task files for this wave.  
**Exclusive write set:** primary user/org create-task modal/form/store/types and their tests. Task
detail/submission/profile/routes/shared i18n excluded.

- [x] Chạy impact cho backend symbols trước nếu UI worker cần DTO change; nếu không, gửi dependency
      request thay vì tự sửa backend.
- [~] RED current modal tests chứng minh payload phải gửi đủ fields đang bị bỏ quên và complete
  specification/evidence contract/reference/mode/confirmation.
- [~] Replace long flat form bằng staged authoring: Basics → Complete Specification → Work Contract →
  Evidence Contract → References → Review & Confirm; Draft save luôn sẵn.
- [~] Add Project Context/Work Package/template inheritance preview và explicit override; resolved
  review phải buộc creator đọc/confirm, không blind-copy.
- [~] Show deterministic Readiness Card với blockers/warnings/remediation; disable Assign chứ không
  disable Draft.

**Focused follow-up (2026-08-09):** org create-task authoring now has the same deterministic Readiness
Card already present on the user surface. The focused user/org form and resolved-brief checks pass
`4 files / 15 tests`; this closes the renderer/form parity slice only. Assign-button gating,
Project Context/Work Package inheritance, import mapping, and the full role-play/accessibility bundle
remain open, so WP-22 stays `[~]`.

**Assign-vs-draft preflight follow-up (2026-08-09):** both user/org create-task modals now expose a
deterministic UI preflight that keeps Publish and assign disabled until the local contract has the
required title/status/project/assignee, skills, specification, Work Contract, verification and
creator-confirmation fields. Switching the same form to `Save draft` keeps the draft action available
and omits the assignee from the draft payload. The focused user/org modal/form suite passes
`4 files / 12 tests`, with focused ESLint and `git diff --check` passing. This is a UI preflight only;
the backend readiness kernel remains authoritative, and inheritance/import/recovery, full role-play,
AX/security and resilience evidence remain open.

- [ ] Support paste/upload/import as mechanical assistance nhưng require field mapping confirmation;
      inaccessible/authenticated source không được tự coi imported successfully.
- [~] Remove artificial four-category requirement UI; support relevant capability/range/rubric. Frontend
  user/org rules now match the backend `relevant-capabilities-v1` default and label groups optional;
  focused regression tests and seeded Chromium publish role-play prove a technology-only requirement
  is not blocked. The role-play now also proves evidence-enabled publish with a project rubric and
  proficiency IDs; evidence-enabled reviewer/profile gates, inheritance and recovery remain open.
- [~] Ensure all rich visual information has text alternative; preserve keyboard behavior; mobile UI
  remains out of scope for this delivery.
- [~] GREEN user/org parity, payload, draft recovery, readiness and accessibility tests — component
  suites, strict Svelte checks, draft role-play, operational publish and evidence-enabled publish
  role-play pass; the desktop two-test Chromium file passes `2/2` with one worker. Recovery and
  full AX/security/resilience evidence remain open.

**WP-22 evidence refresh (2026-08-09):** explicit authoring controls and structured fields are now
present in both user/org form surfaces. Focused component suites pass `2/2`, strict Svelte check is
`0 errors / 0 warnings`, and focused ESLint passes. The seeded Chromium role-play
`task_create_authoring_draft_roleplay.spec.ts` now passes `3/3` sequentially: draft save, link-only
publish block, and evidence-enabled publish → personal assignee route → resolved brief → acknowledge.
A creator opens the project board,
selects `Save draft`, enters structured scope, saves an incomplete draft, and sees it on the board.
Screenshots `test-results/e2e-visual/task-authoring-draft/01-draft-authoring-form.png` and
`02-draft-saved-on-board.png` were captured after semantic assertions and visually inspected. The
old fixed-account fixture had no statuses because it targeted a legacy organization; it was not used
as product evidence. The same seeded Chromium flow now also passes the operational publish path
`1/1`: an assignee is selected, the complete Work Contract is entered, only a relevant technology
capability is added, and the task appears on the board; screenshots
`03-publish-relevant-capability-form.png` and `04-published-relevant-capability-board.png` were
visually inspected. Frontend category-policy regressions pass user/org `2/2` and align with backend
`TC-TVA-007`. The evidence-enabled screenshot pair `03-evidence-publish-form.png` and
`04-evidence-published-board.png` was visually inspected; the request passed with a project rubric,
proficiency IDs, assignee and reviewer role. A prior full-file rerun was invalidated because the
draft case hit the local worker lease-loss state; the isolated sequential rerun is current evidence.
Reviewer/profile gates, inheritance, recovery,
import, AX/security and resilience remain open.

**Retry-safety follow-up (2026-08-09):** user/org create-task stores now freeze the complete payload
for one create attempt. A network retry reuses the same idempotency key, nested criterion/deliverable/
evidence UUIDs and computed due date; form mutation or reset starts a new attempt. The focused user/org
modal suite passes `2 files / 10 tests`, including a failed draft request followed by an identical
retry; targeted ESLint and `git diff --check` pass. This closes the deterministic-payload slice of
AR-019 only. Durable server idempotency, refresh/offline recovery, autosave conflict retention,
inheritance/import and full AX/security/resilience evidence remain open.

**Expected outputs:** primary modal thật sự tạo được Task self-contained ngang phần docs liên quan;
creator không bị ép copy mù, nhưng không thể Assign bằng title + link.

**Abnormal cases:** link-only draft; pasted 100k text; paste contains malicious HTML/table/image;
upload encrypted/unsupported file; auth link; AI mapping uncertain; browser refresh; autosave conflict;
duplicate submit; slow network; project context changes mid-form; missing skill taxonomy; keyboard-only;
small screen; user/org component drift; title filled but form otherwise empty.

**Focused verification:** create task form/modal Vitest suites cả user/org, strict Svelte check, focused
frontend lint.

### WP-23 — Resolved brief, acknowledgement và material-change frontend

- [~] **WP-23 overall status** — Resolved brief projection hiện đã có frontend types và user/org
  renderer parity; focused component tests `2 files / 7 tests: PASS`, historical `tsc --noEmit` PASS và focused
  ESLint PASS. Renderer hiển thị assignment-pinned state, contract/spec, role/ownership,
  deliverables, acceptance, evidence requirements, inherited context và acknowledgement/clarification
  controls; restricted state không render contract/private content. Chromium role-play published
  authoring → assignee personal task board → resolved brief → acknowledge chạy `1/1 PASS`, có
  screenshot `05-assignee-acknowledged-brief.png` đã được tạo. HTTP integration boundary cho
  acknowledgement/clarification chạy `30/30 PASS`, bao gồm durable clarification state và chặn
  acknowledgement khi clarification còn mở. Project board trả 403 cho
  `project_member` thường là đúng policy vì đó là shared board toàn project; role-play dùng `/tasks`
  đúng boundary. Chưa đánh dấu `[x]`: chưa có dedicated contract-suite label, material-change
  diff/re-ack, AX/security/resilience và release/outbox/migration gates còn thiếu.

**Ưu tiên/estimate:** P0, 1–1.5 agent-days.  
**Dependencies:** WP-12/WP-13 response fixtures.  
**Parallel-safe với:** WP-21, WP-22, WP-24–WP-27.  
**Exclusive write set:** task detail/resolved brief/acknowledgement/change-request components, types and
tests in user/org task detail modules; creation/submission/review/profile files excluded.

- [~] RED detail tests cho resolved sections, source labels, version/hash, readiness, supporting
  references, acknowledgement state và change diff.
- [~] Present one coherent execution brief; default view không bắt assignee tự ghép Project/Work
  Package/Task tabs.
- [~] Add acknowledge, ask clarification, compare versions and re-ack material change flows. Acknowledge
  and clarification UI/API wiring plus user/org component tests exist; material-change diff/re-ack
  and HTTP boundary/role-play clarification evidence remain.
- [x] Distinguish reference availability from core information completeness; dead link là warning nếu
      Suar content đủ, blocker nếu critical information thực tế còn thiếu.
- [~] Surface accessible text beside critical visuals and privacy/access state for evidence/reference.
- [ ] GREEN user/org parity, AX and stale-version conflict tests trên product surface hiện hành.

**Expected outputs:** assignee biết chính xác phải làm gì, vì sao, output/acceptance nào cần có; nếu
governance bật thì biết evidence/report nào là optional,
đang làm theo version nào và thay đổi material nào cần xác nhận lại.

**Focused follow-up (2026-08-09):** user/org resolved-brief renderers now expose supporting
references as secondary context, show their availability state, and keep the local brief marked as
the authoritative execution contract. The focused component pair passes `2 files / 11 tests`, including
authenticated/unavailable references and Draft readiness blockers/remediation; this does not close the
broader AR-005/TC-TVA-020 role-play, audit, accessibility or resilience layers.

**Page payload preservation follow-up (2026-08-09):** the page response mapper now preserves the
resolved brief inside the serialized `task` payload for existing task-detail consumers. Focused
mapper coverage is `6/6`; this is a compatibility/wiring fix and does not claim native Completion
Report structured-payload adoption.

**Abnormal cases:** legacy snapshot; deleted reference; assignment reassigned; task canceled;
acknowledge double-click; clarification races creator edit; version diff huge; private inherited field;
no JS/navigation retry; cached old detail; unsupported rich node; screen reader reading order.

**Focused verification:** task detail panel/modal API/component tests cả user/org.

### WP-24 — Completion Report frontend

- [~] **WP-24 overall status** — User/org optional Completion Report governance form/panel hiện có
  coverage guide lấy từ assignment snapshot, governance readiness blockers, optional evidence submit UX, accessible alert/live regions
  và parity tests. Focused Vitest suite mới nhất chạy `8 files / 32 tests: PASS`; `check:svelte:strict`
  chạy `0 errors / 0 warnings`; board-based Chromium role-play chạy `5/5`. Chưa đủ để `[x]`: chưa có
  full API integration proof của criterion mapping/contributor claims/upload lifecycle, duplicate/lock/
  resilience coverage, accessibility audit và retained desktop screenshot evidence. Mobile UI is out of scope for
  this delivery. Global `/work` page,
  route constant, legacy E2E và legacy panel endpoint branch đã bị loại; task navigation chỉ qua
  organization/project context và board.

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-14 locked API fixtures.  
**Parallel-safe với:** other frontend packages.  
**Exclusive write set:** task submission/completion form/panel/view/types/tests cả user/org; review
components/routes/shared i18n excluded.

- [~] RED/UI tests cho optional governance readiness, evidence submit và non-persistent coverage guide đã có;
  actual deliverables, deviations/limitations, criterion result, evidence mapping,
  validation outcome và contributor claims.
- [~] Replace generic summary-only experience bằng guided Completion Report derived from exact
  assignment snapshot.
- [~] Show coverage guidance và block optional governance submit với explainable summary/evidence
  blockers; tuyệt đối không block Task Done; matrix `criterion → result → evidence` persistence còn thiếu.
- [ ] Add contributor ownership editor/confirmation without letting one contributor claim all shared
      work silently.
- [~] Preserve hydrated contributor claims and evidence attribution while editing an existing native
  report; this is a lossless-preservation slice, not the final collaborator ownership editor.
- [x] Preserve current board/drawer repo/PR/demo/file evidence conveniences and lock semantics;
      board-based Playwright flow pass `5/5` (save, outsider denial, submit/lock, upload-and-submit,
      invalid-task error). `/work` global task list intentionally remains removed by architecture/UX
      decision; no test may reintroduce it.
- [ ] Handle upload progress/retry/cancel and confidential evidence classification accessibly.
- [~] GREEN component/user-org parity tests (`8 files / 32 tests`), board-based Playwright E2E (`5/5`)
  and semantic readiness checkpoint; the dedicated native Completion Report browser role-play is
  `1/1` and has no legacy submission GET. Duplicate-submit beyond the Draft → Submit revision
  path, upload-error/retry, contributor claims, full structured report API and review/profile
  journey remain.

**Native Completion Report boundary follow-up (2026-08-09):** the canonical v1 API now exposes
`POST /api/v1/task-assignments/:assignmentId/completion-report` for draft persistence and
`POST /api/v1/task-assignments/:assignmentId/completion-report/submit` for submit-for-review. The
request mapper validates the route assignment binding, immutable snapshot hash shape, idempotency /
revision envelope and structured criterion/evidence/contributor fields; the controller uses the
native immutable commands through the application factory and returns stable Result failures. The
focused backend batch passes `5 files / 27 tests`, including partial Draft acceptance and submit
readiness rules, plus focused ESLint and `git diff --check`. This is route/unit evidence only; a
database-backed HTTP integration role-play, UI payload migration, upload lifecycle, reviewer access,
contributor attribution and resilience evidence remain open.

**Native Completion Report hydration follow-up (2026-08-10):** `GET
/api/v1/task-assignments/:assignmentId/completion-report` now resolves the latest immutable native
fact bundle by assignment, returns `null` when no native report exists, and keeps read access scoped
to the reporting assignee. The application factory and controller use a Result boundary; the Lucid
repository hydrates the report revision plus criterion results, evidence manifests, contributor
claims and evidence mappings. Focused evidence is query `3/3`, controller boundary `6/6`, factory
`7/7`, and persistence integration `4/4`; targeted ESLint and `git diff --check` pass. This only
establishes the backend draft round-trip boundary; legacy UI payload adoption, full HTTP role-play,
upload lifecycle, reviewer access, contributor attribution and resilience remain open.

**Native Completion Report HTTP/privacy follow-up (2026-08-10):** GET plus native draft/submit POST
responses now use `suar.task_completion_report_editor.v1`, an explicit allowlist with canonical
`report`/`evidenceManifest` fields, stable blocker codes and immutable identity needed by the owner
editor; malformed canonical payloads fail closed and no-report remains `data: null`. Focused mapper
and HTTP-contract evidence passes `3/3 + 3/3`; the database-backed POST → GET persistence integration
passes `5/5`. Submit also enforces exact-snapshot acknowledgement: pending/re-acknowledgement and
unresolved clarification are rejected with stable completion codes while Draft remains writable. The
repository adds a revision/id tie-breaker. Reviewer access, contributor attribution, upload
lifecycle and resilience are still required.

**Native Completion Report start follow-up (2026-08-10):** the new assignee-only start command and
`POST /api/v1/task-assignments/:assignmentId/completion-report/start` lock the assignment contract
context, reuse the latest assignment-scoped parent when present, and otherwise create a draft parent
pinned to the current snapshot/task/assignee identity. Command, HTTP contract and factory tests are
green; the persistence integration now seeds its parent through this application path. Start does
not require acknowledgement so the assignee can begin a draft; exact acknowledgement and open
clarification remain submit-time gates. This closes the canonical-parent bootstrap gap; the
assignment-pinned user/org panels now consume the native payload while unpinned tasks retain the
legacy fallback. Reviewer access, attribution, upload, privacy and resilience remain open.

**Native Completion Report browser follow-up (2026-08-10):** the dedicated Chromium seed creates a
published evidence-enabled assignment, exact acknowledgement and native draft parent through
production application commands. The assignee role-play passes `1/1`: it opens the structured
editor, saves a Draft, submits a fresh immutable revision, verifies the native success state and
asserts that hydration emitted no legacy `/api/v1/tasks/:taskId/submission` request. A panel-level
hydration gate now waits for the detail `resolved_brief` before mounting either native or legacy
submission UI, preserving the legacy fallback without an early wrong-endpoint fetch. Upload,
reviewer UI/access, attribution, broader RP, AX, privacy and resilience remain open.

**Resolved-brief stale recovery follow-up (2026-08-10):** user/org execution-brief components now
project `TASK_BRIEF_ASSIGNMENT_ACCESS_STALE` and assignment acknowledgement/clarification `409`
conflicts as a recoverable stale assignment state. They hide the old contract and controls, expose
an accessible reload action and leave the interaction state pending until the host reload callback
or browser fallback runs. Focused component coverage is `19/19`; detail-panel/context-card parents
wire a task-only Inertia reload with `preserveState`/`preserveScroll`, and a fresh projection clears
the stale state. Board/modal hosts now pass a selected-task reload callback so stale recovery does not
request a `task` partial from a route that only returns `tasks`. Focused material-change diff/re-ack
coverage is `19/19`; full browser draft-retention role-play, snapshot-transition policy, AX and
resilience remain open.

**Material successor diff follow-up (2026-08-10):** assignment-pinned brief projection now carries
only a safe change summary — change class, changed field paths, re-ack requirement and successor
marker. The user/org execution-brief pair renders those paths before the existing acknowledgement
action, with focused component coverage `19/19`. Previous snapshot IDs, hashes and raw canonical
envelopes remain excluded.

**Reviewer panel evidence-boundary follow-up (2026-08-10):** shared org/user observation authoring
now exposes and submits only evidence already attributed to the selected claim's `evidence_refs`;
unrelated or restricted evidence is not presented as finalizable claim evidence. Focused org/user
component suites pass `8/8` and `9/9`; the submitted-only reviewer package access adapter and
explicit response allowlist are covered by focused `23/23` plus database-backed route role-play
`5/5`. Observation persistence, quorum/finalization, audit/correction/dispute governance and full
UI/RP coverage remain required.

**Reviewer Completion Package follow-up (2026-08-10):** the reviewer read path now resolves a
submitted native report by immutable access identity before hydrating facts, checks the exact
assignment snapshot and report hash, and delegates reviewer eligibility to a Reviews-backed
composition adapter. `GET /api/v1/task-completion-reports/:reportId/review-package` returns only the
explicit editor allowlist: report facts, safe criterion/claim/mapping fields, evidence availability
state and the reviewer-facing contract subset. Canonical payloads, request hashes, raw foreign keys,
URI/storage locators, retention/tombstone metadata and unknown contract fields are excluded. Focused
query/mapper/controller/factory evidence is `23/23`, and the database-backed route role-play is
`5/5`; existing review-observation writes/context coverage is `13/13`, while governed
quorum/finalization, audit receipts and correction/dispute governance remain required before WP-25
can close.

**Reviewer attribution display follow-up (2026-08-10):** the shared reviewer panel now renders the
allowlisted persisted contributor reference, role, ownership, autonomy, claim status, contribution
statement and evidence references as read-only facts. The focused shared-panel regression is `1/1`,
and the user/org workflow package suites remain green. This does not add collaborator editing,
identity-name projection, consent or correction authority; those remain governed policy work.

**Expected outputs:** completion data đủ structured để reviewer đánh giá actual work và attribution,
không phải suy luận từ một link PR hoặc một đoạn summary.

**Abnormal cases:** partial upload; file too large/malware/unsupported; URL expired; evidence removed;
criterion N/A; collaborator unavailable/rejects claim; duplicate submit; report locked elsewhere;
task material change; offline; browser refresh; confidential evidence; no required evidence in
Operational-only mode; mobile table overflow.

**Focused verification:** existing task submission form/panel Vitest suites cả user/org và new
coverage/readiness tests; current evidence is component-level only.

### WP-25 — Review observation/claim verification frontend

- [~] **WP-25 overall status** — Native reviewer confirm/narrow/reject now pass a real Chromium
  role-play with persisted observation and post-reload history rendering; quorum/conflict,
  dispute/correction, privacy/audit and full RP coverage remain open.

**Ưu tiên/estimate:** P0, 1.5–2 agent-days.  
**Dependencies:** WP-14/WP-15 locked review package/observation fixtures.  
**Parallel-safe với:** other frontend packages.  
**Exclusive write set:** task-review package view, criterion/claim/capability observation components
and tests; backend/routes/composition/shared i18n excluded.

- [ ] RED tests cho expected-versus-actual display, criterion verification, claim narrow/reject,
      contributor ownership, capability observations và public-safe wording preview.
- [ ] Reviewer phải xem exact assignment snapshot, Completion Report and evidence state; current Task
      changes chỉ hiện như separate context.
- [ ] Require rationale cho reject/narrow/high-impact capability decision; distinguish output
      acceptance from capability verification.
- [ ] Add conflict/quorum/second-reviewer and dispute-frozen states; prevent edits when authority
      changed.
- [ ] Preview accomplishment candidate/public wording nhưng label rõ chưa verified/published; AI
      suggestion never auto-confirms.
- [ ] GREEN component/a11y/stale-state/dispute/user-org parity tests.

**Expected outputs:** reviewer tạo được structured observations và user nhìn thấy claim nào được chấp
nhận, thu hẹp hay từ chối cùng lý do.

**Abnormal cases:** reviewer lacks evidence permission; evidence unavailable; self-review; review
session expires; two reviewers edit; dispute opens; submission superseded; private wording leaks;
AI suggestion too broad; capability retired; contributor-specific mixed result; offline/double submit.

**Focused verification:** existing review board/workflow/dispute UI tests và new observation suites.

**Evidence refresh (2026-08-10):** `task_review_claim_observation_roleplay.spec.ts` passes `3/3` with
production seeds that use native start plus exact assignment acknowledgement, real confirm/narrow/reject
reviewer submissions, strict Inertia `409` success responses, read-model assertions, persisted
observation/revision data, post-reload history assertions, and screenshot
`tmp/tva-e2e/task-review-observation/04-reviewer-claim-verification.png`. Reviewer role policy remains
in application code and contract reviewer type is projected as `human`; no business logic moved into DB.
Shared reviewer observation UI copy now accepts the shell translator, with caller wiring in user task
detail, org task detail and the user review board. Focused component/i18n evidence is `3 files / 9
passed / 42 skipped` under the targeted filter; en/vi task resources remain structurally synchronized.

**Native package consumer refresh (2026-08-10):** the user/org reviewer panels now hydrate native
review facts through the canonical package GET after the backend marker is present. The page payload
keeps only review session/assignment/report identity and observations; the package projection supplies
the report, exact contract snapshot, criterion expected/actual results, claims and evidence state.
The shared normalizer strips unknown fields and URI/storage-bearing claim outcome data, and null or
malformed packages disable observation authoring. Focused package/component/i18n evidence is `4 files /
13 passed / 42 skipped`; targeted ESLint is green. This is frontend boundary evidence, not proof of
governed quorum/finalization, audit/correction/dispute or full RP acceptance.

**Native reviewer authorization refresh (2026-08-10):** the production observation-context reader
now checks active native reviewer-session assignments whenever that table has rows, and only falls
back to the legacy workflow reviewer row for sessions without native assignments. A legacy reviewer
row therefore cannot bypass a native assignment denial or a waived assignment. The policy unit is
`4/4`; the native browser role-play remains `3/3`. This is an access-boundary hardening slice, not
quorum/finalization or dispute governance evidence.

### WP-26 — Accomplishment-first Profile frontend

- [~] **WP-26 overall status** — User profile role-play covers empty, retrospective/legacy and
  review-confirmed/high-confidence demonstrated-work states with screenshots and accessibility checks;
  pagination/filter/detail/publication privacy and full recruiter journey remain open.

**Ưu tiên/estimate:** P0 demo, 2–2.5 agent-days.  
**Dependencies:** WP-19 locked profile fixtures.  
**Parallel-safe với:** WP-27; owns profile user/org/public snapshot surfaces for wave.  
**Exclusive write set:** profile view/show/public snapshot components/types/helpers/tests cả user/org;
talent index/search, backend/routes/shared i18n excluded.

- [ ] RED profile tests: demonstrated-work section xuất hiện trước skill charts và card trả lời action,
      object, ownership, context, output/outcome/scale, verification/confidence.
- [ ] Build scan-friendly accomplishment cards + detail drill-down, filter/sort by action/domain/
      recency/verification and provenance labels.
- [ ] Show supporting capabilities underneath verified work; không để “Svelte level 8” là bằng chứng
      duy nhất.
- [ ] Add publication controls/status and safe preview; private source/evidence never rendered by
      hidden CSS or serialized page props.
- [ ] Render legacy/self-declared/imported history separately, không gắn verified badge sai.
- [x] Preserve current profile overview, skill analytics and featured reviews after new evidence-first
      ordering; mobile UI is explicitly out of scope for this product delivery.
- [~] GREEN user/org/public snapshot, empty/legacy state and a11y tests; do not add mobile tests for
  the non-existent mobile surface.

**Expected outputs:** một recruiter scan Profile và nhận ra ngay user từng “designed APIs”, “scaled a
database” hoặc “debugged production”, mức ownership và cách công việc được verify.

**Abnormal cases:** zero/one/hundreds accomplishments; long/redacted titles; private org; revoked or
disputed record; public snapshot stale; missing outcome/scale; multiple contributors; inaccessible
evidence; user unpublished; pagination; timezone; XSS wording; mobile; screen reader; legacy-only
profile.

**Focused verification:** profile show/public snapshot/user-org mirrored Vitest suites and strict
Svelte check.

**Evidence refresh (2026-08-09):** `profile_trust_explanation.spec.ts` covers profile navigation,
empty work history, conservative legacy labeling, authoritative verified card rendering, screenshots,
semantic tabs/focus and image/button accessibility assertions. This is partial WP-26 evidence, not full
publication/privacy/pagination acceptance.

### WP-27 — Talent discovery/search frontend integration

- [~] **WP-27 overall status**

**Ưu tiên/estimate:** P1, 1–1.5 agent-days.  
**Dependencies:** WP-20, WP-26 card primitive, Search/Taxonomy plan WP-16/WP-17.  
**Parallelism:** không bắt đầu trước Search baseline reconciliation; coordinate exclusive files với
Search UI worker.  
**Exclusive write set:** accomplishment result card/explanation components và integration tests được
coordinator cấp; shared filter UI/query codec thuộc Search plan.

- [~] RED UI tests cho searches “thiết kế API”, “scale database”, “debug production” và explanations
  dựa trên verified action/object/ownership, không chỉ title/skill keyword.
- [~] Render match reasons, verification/confidence and safe public accomplishment snippets; recency/
  repetition and intent-specific search assertions remain open.
- [x] Reuse existing directory/Search URL primitives; không tạo bộ filter riêng trong plan
      này.
- [ ] Ensure restricted/unpublished results không xuất hiện trong totals, facets, snippets, saved view
      hoặc analytics payload.
- [x] Add zero-result/recovery states không gợi ý private taxonomy values.
- [~] GREEN component/integration/permission tests trên locked Search contracts; mobile belongs to the
  deferred Search/Filter wave, not this Task→Verified delivery.

**Expected outputs:** recruiter tìm theo work intent và hiểu tại sao result match; frontend không chỉ
show skill badge/communication level.

**Abnormal cases:** index lag; stale/revoked result; query alias/typo/Vietnamese-English variant;
missing public snippet; pagination duplicates; permission changes mid-session; zero results; high
latency; saved filter schema drift; mobile facets; hidden result affecting total.

**Focused verification:** talent index/show component tests, Search frontend integration and privacy
fixtures from related plan.

**Evidence refresh (2026-08-09):** public demonstrated-work card is covered by the Org talent UI
suite (`16/16` focused UI tests including the public-safe card assertion), directory application
integration `12/12`, typecheck/Svelte check `0/0`, Chromium recruiter directory role-play `5/5`,
canonical bookmark/workspace role-play `4/4` with a workspace screenshot, and the current seeded
canonical-source/public-projection E2E `5/5` with `Public-safe`/`Verified` assertions. The first
journey now publishes through the real owner HTTP command, replays the same idempotency key, and
asserts the generalized public projection before the recruiter reads it.
The role-play captures `test-results/e2e-visual/talent-discovery/01-public-talent-directory.png` and
covers search/detail/bookmark/empty/malformed-query states. The publication lifecycle role-play now
also asserts anonymous public Search visibility and exact removal after unpublish (`1/1`), including
absence of the private source marker. It does not yet prove hidden-result totals/facets across the
full privacy matrix, index cutover or RP-01–RP-08; WP-27 therefore remains `[~]`.

**Additional discovery integration evidence (2026-08-09):** `[x]` focused public discovery
integration `4/4` proves anonymous filter-only search, secondary-label filtering, exact totals/facets,
private/inactive/non-searchable exclusion, cursor continuity and stale/expired cursor diagnostics.
This remains supporting evidence only; restricted-result analytics, publication lifecycle privacy and
the master recruiter role-play/screenshot gates remain open.

**Runtime accessibility recheck (2026-08-09):** `[x]` `runtime_accessibility_roleplay.spec.ts`
passes Chromium `2/2` with axe-core, covering the marketplace filter surface and Search Center with
no critical/serious violations. The E2E seed initially failed because the newly required task-metadata
taxonomy registry had no published fixture rows; the testing route now creates the four application-
owned fixture revisions idempotently before search reindex. The route safety integration is `4/4`
and targeted ESLint passes. This is focused AX evidence only; it does not close the broader AX/security
matrix or master role-play gates.

**Search regression recheck (2026-08-09):** `[x]` keyword-only Search Center and Saved View role-play
(`search_center_keyword_only_roleplay.spec.ts`, `saved_view_roleplay.spec.ts`) pass Chromium `2/2`
sequentially against the same seeded server. This confirms the taxonomy fixture repair preserves
query-only results and saved-view lifecycle behavior; it is not full search privacy/cutover evidence.

**Mobile filter-state recheck (2026-08-09):** `[x]` the combined Search/Filter Chromium checkpoint
passes `6/6` (marketplace filter-only `3/3`, mobile committed/draft Back/Cancel `1/1`, keyword-only
Search Center and Saved View). The run includes two real UI fixes: drawer entry no longer creates
transient horizontal overflow, and mobile Apply waits for Inertia `onFinish` so focus restores to the
newly rendered opener; a session marker also preserves focus across browser Back navigation. FilterDrawer

- marketplace filter UI unit tests pass `10/10`, Svelte-check is `0/0` and focused ESLint passes.
  This remains supporting Search/AX evidence and does not close TVA mobile-excluded/full browser-matrix gates.

**Search Center consistency recheck (2026-08-09):** `[x]` the Discovery coverage regression unit passes
`13/13`; affected ESLint and `git diff --check` pass, and `svelte-check` reports `0 errors / 0 warnings`.
The keyword-only Chromium role-play passes `1/1`; its inspected desktop screenshot shows matching
coverage totals, domain counts and the rendered Discovery card, with a non-empty Discovery top signal.
This closes the identified Search Center presentation regressions only; privacy, cutover, master
role-play, performance/resilience and release gates remain open.

**Accomplishment module verification wave (2026-08-09):** `[x]` `105/105` unit, `44/44` integration
and `1/1` contract tests pass. The evidence includes storage-only schema checks (no DB-owned
business/FK rules), lifecycle CAS and replay safety, public projection versioning/unpublish,
publication privacy, durable legacy backfill state and governed projection transactions. This does
not close the cross-module role-play, full privacy matrix, migration release or final confidence gates.

### WP-28 — HTTP/routes/composition/outbox/i18n integration

- [~] **WP-28 overall status**

**Ưu tiên/estimate:** P0, 2–3 agent-days.  
**Dependencies:** locked outputs WP-07–WP-27; package owners available for fixes.  
**Parallelism:** integration hotspot chạy một mình trên rebased integration branch.  
**Exclusive write set:** `start/routes/**`, `app/composition/**`, controllers/transport validators not
owned earlier, shared exports, event/listener registration, shared i18n catalogs and integration
contract tests.

- [ ] Re-run GitNexus impact cho every touched factory/provider/controller/event listener; warn
      coordinator nếu HIGH/CRITICAL.
- [~] Wire Project Context, Task version/readiness, acknowledgement/change, Completion, Review
  Observation, Accomplishment, Profile and Search ports without direct infra cross-import.
- [~] Added authenticated `POST /api/v1/accomplishments/:accomplishmentId/publication` and owner-only
  DELETE; focused publication command unit is currently `5/5` and authenticated HTTP integration
  is `8/8`, and the publication HTTP contract is `2/2`, including publish/unpublish privacy,
  confirmation and malformed-body cases. No current browser evidence proves the complete RP
  flow, so this remains partial rather than complete.
- [ ] Add versioned HTTP endpoints/responses and consistent validation/error codes for readiness,
      conflict, privacy and lifecycle failure.
- [~] Durable publication outbox staging, listener registration, generic worker leases/retries and
  cache invalidation are implemented and focused-tested. Search-specific processing receipts are
  now persisted and acknowledged idempotently; measured lag/tombstone SLO and startup composition
  evidence remain incomplete; the focused
  Chromium role-play now proves worker-to-Elasticsearch/UI publication and removal visibility.
- [~] Add translation keys for user/org surfaces from one canonical catalog/parity rule; native
  Completion Report copy now uses shared `task.submission_panel.native.*` keys and reviewer
  observation copy uses `task.review_observation.*` keys in both en/vi catalogs, including native
  package loading/error and package-facts copy. Native parity/source evidence is `2/2`; the
  focused reviewer component/package/i18n wave passes `13` tests with the targeted filter. Remaining
  feature-local surfaces and the broader WP-28 endpoint/composition/catalog integration still need
  closure.
- [ ] Preserve legacy routes/controllers behind compatibility adapter/feature flag; mark deprecation
      telemetry.
- [ ] GREEN API contracts, integration flows, module-boundary, route inventory and composition smoke
      tests.

**Expected outputs:** tất cả independent packages thành một vertical pipeline chạy được, không phá
module boundaries và không tạo cyclic dependency.

**Abnormal cases:** missing provider binding; circular composition; listener registered twice; route
collision; unsupported client schema version; outbox down; cache invalidation fail; Search unavailable;
partial deployment old/new nodes; locale missing; feature flag mismatch; legacy client; startup order.

**Focused verification:** task/review/profile/talent/publication contracts and integration suites,
route list, typecheck, lint and module-boundary tests. Remaining outbox/listener/i18n and full
cross-feature composition evidence keep WP-28 at `[~]`.

**Project Context detail composition follow-up (2026-08-09):** `[~]` the active-context read path is
now wired through both the user `ProjectQueryFactory` and the organization `ProjectDetailReaderAdapter`
without exposing the raw infra fact. Focused project mapper/integration/UI checks pass
`6/6 + 1/1 + 2/2`; full Task inheritance, Work Package, version/conflict, i18n and end-to-end
composition evidence remain required.

**Publication Search outbox slice (2026-08-09):** `[~]` publish and changed unpublish now use the
application transaction runner to persist a deterministic `search:talent-reindex-requested` event
in the same transaction as the public projection; idempotent publish replay and unchanged
unpublish do not enqueue duplicates. The event payload carries only the talent aggregate and the
publication-change source identity. Focused command unit is `5/5`, durable event contract is
`10/10`, and authenticated publication integration is `8/8` with real `domain_event_outbox`
assertions for pending publish/unpublish deliveries. Worker-to-Elasticsearch delivery and the
Search-specific receipt now pass focused unit `7/7`, receipt integration `3/3`, and publication
integration `8/8`; measured index lag/tombstone SLO, startup evidence and full privacy acceptance
remain open, so the broad outbox/index checkbox above stays `[~]`.

Search receipt recheck (2026-08-09): `[~]` publication staging now writes an
`accomplishment_publication` Search revision in the same application transaction as the public fact
and durable domain event. The Search listener acknowledges that revision only after successful fenced
Elasticsearch delivery; missing receipts fail closed, and repeated acknowledgement is idempotent.
Evidence: listener unit `7/7`, revision/receipt integration `3/3`, publication HTTP integration `8/8`.
This closes processing-receipt evidence only; it does not establish a measured tombstone SLO or
production worker startup proof.

### WP-29 — Privacy, security, disclosure và audit hardening

- [~] **WP-29 overall status**

**Ưu tiên/estimate:** P0 release, 1.5–2 agent-days.  
**Dependencies:** WP-28 integrated vertical path.  
**Parallel-safe với:** WP-30 preparation, không merge cross-cutting fixes trực tiếp; return dependency
patches to package owners/coordinator.  
**Exclusive write set:** security/privacy policy tests, audit adapters/events and explicitly assigned
fix files.

- [ ] Build actor × action × data-class permission matrix for creator, assignee, contributor,
      reviewer, org admin, recruiter/public viewer, support/admin and system worker.
- [ ] RED cross-tenant tests for every new read/write endpoint and public snapshot/search projection.
- [ ] Test public payload serialization, logs, audit metadata, errors, counts/facets, cache and traces
      for confidential-field leakage.
- [ ] Enforce publication/disclosure split: user controls publication, org policy constrains what can
      be disclosed.
- [ ] Audit create/version/confirm/assign/ack/change/submit/review/publish/unpublish/dispute/correct/
      revoke/rebuild without copying sensitive bodies unnecessarily.
- [ ] Threat-test rich text, URL/file metadata, XSS, SSRF assumptions, zip bomb/oversize, malicious
      mime and authenticated reference handling.
- [ ] GREEN authorization, privacy snapshot, search no-leak and audit integrity suites.

Evidence refresh (2026-08-09): authenticated publication HTTP integration now proves a foreign
actor is rejected, `confirmed=false` writes no consent fact, and an owner can publish through the
authenticated boundary with minimized audit evidence (`4/4`); public projection unit/E2E
also prove disclosure allowlisting. The focused privacy/public snapshot integration wave is `12/12`:
publication fails closed for internal sources, public/private snapshot access and token revocation
are enforced, attacker-controlled token cache amplification is rejected, raw share tokens stay out
of Redis, and private work rows are excluded from public snapshots. WP-29 remains `[~]` because the
complete actor × action × data-class matrix, counts/facets/cache/log audit and rich-content threat
suite are still open.

**WP-29 implementation slice (2026-08-09):** `[~]` publication preparation now requires an
application disclosure-policy port instead of hard-coding `allowed: true`. The composed conservative
policy fails closed for canonical `private`/`internal` visibility; focused publication unit `3/3`,
legacy/backfill regression unit wave `11/11`, focused ESLint and publication HTTP integration `4/4`
pass. This proves the user-consent/disclosure boundary and no-write-on-denial, but it is not the
complete organization policy store, actor/data matrix, audit lifecycle, search/cache/count/log
leakage or rich-content threat suite.

**Expected outputs:** private Task/evidence không thể bị suy ra qua Profile/Search/log/cache/totals;
mọi lifecycle mutation nhạy cảm có audit trail.

**Abnormal cases:** org policy changes after publication; contributor wants removal; legal hold;
deleted user; shared link guessed; recruiter member of another tenant; error echoes title; trace dumps
payload; cached public response after unpublish; timing/count leak; malicious rich content/file URL;
admin override without reason.

**Focused verification:** permission matrix integration, public snapshot privacy, Search privacy,
audit and XSS/security tests.

**Verification update (2026-08-09):** focused disclosure, filtering-observability and discovery
contract wave is green (`19/19` unit tests, TypeScript, affected ESLint, module-domain boundary,
port-taxonomy and public-contract-surface checks). This remains supporting evidence only; the
actor/data matrix, cross-tenant endpoint matrix, audit lifecycle, no-leak counts/facets/cache/log
checks and rich-content threat suite are still `[ ]`.

**Audit lifecycle slice (2026-08-09):** `[~]` publication and unpublish now depend on an
application outbound audit port. The composition adapter records only actor/target IDs,
publication version, source/lifecycle hashes, disclosure policy version and changed/replayed
outcome; it does not copy public wording, evidence bodies or reviewer identifiers. The HTTP
publication route is also attached to the existing sanitized audit middleware. Focused publication
unit evidence is `4/4`, and adapter-to-database integration is now `2/2` against real
`audit_events`, covering redacted publish/unpublish persistence and a consecutive `prev_hash` →
`event_hash` chain assertion; TypeScript and affected ESLint remain green. This is not sufficient
to mark the audit gate complete: the other accomplishment lifecycle mutations, cross-tenant
matrix and log/cache/count/trace leakage tests remain open.

**Rich-content threat slice (2026-08-09):** `[x]` `ContextEditorViewer` now renders stored rich
content only through an explicit element/attribute allowlist; scripts, event handlers, unsupported
elements, unsafe schemes and protocol-relative external URLs are removed or neutralized. The focused
security regression suite passes `7/7`, including XSS and protocol-relative-link payloads; affected
ESLint and `git diff --check` pass. This closes only the tested presentation boundary, not the broader
file-upload, SSRF, trace/log, or actor/data-class matrix.

### WP-30 — Legacy migration, dual-read/projection và controlled cutover

- [~] **WP-30 overall status**

**Ưu tiên/estimate:** P1 release, 2–2.5 agent-days.  
**Dependencies:** WP-18, WP-19, WP-28, DEC-07.  
**Parallel-safe với:** WP-29 tests and WP-31 benchmark setup.  
**Exclusive write set:** backfill scripts/jobs, feature flags, migration reports, legacy adapters and
focused tests; no Search cutover files owned by related plan.

- [~] Inventory/classify legacy data: application classifier now covers native immutable candidate,
  high-confidence reconstructed,
  retrospective user-confirmed, insufficient/unverified and corrupt/quarantined.
- [x] RED/unit dry-run fixtures prove current Task data alone cannot become verified actual work;
      production legacy source inventory is still pending.
- [~] Implement idempotent resumable backfill with cursor/checkpoint, provenance/confidence and
  per-record outcome; application orchestration and a conservative Lucid legacy reader are
  present with default dry-run and tenant allowlist; durable Lucid checkpoint/writer adapters
  and composition boundary now exist, while release migration registration remains pending.
- [~] Add dual-read/projection comparison counters; old Profile stays available while new output is
  evaluated. The profile work-history query now emits legacy/verified overlap, legacy-only,
  verified-only and merged counters through an application observer; the focused query suite
  passed `4/4`, the adapter contract test passed `1/1`, and the operational adapter logs counts
  only with redaction enabled. Persisted audit evidence and full compatibility comparison
  remain open.
- [~] Define feature flags separately for authoring, assignment, completion, accomplishment, profile
  and search; application dependency/rollback policy unit `3/3` now rejects impossible mixed
  states and disables new reads/writes on rollback. Runtime composition now maps the operator
  cutover state into that application decision, and the composition mapping suite is `2/2`;
  rollout drills and production flag observability remain open.
- [~] Build rollback that disables new reads/writes safely without deleting immutable facts already
  created; the profile work-history read path now enforces the rollback decision and its focused
  regression suite is `1/1`, while the operator endpoint/drill and Search index rollback remain
  open.
- [~] GREEN replay/resume/partial failure/legacy compatibility: durable state integration `2/2` and
  classifier/reader unit `11/11` pass; rollback, flag matrix and full compatibility journey
  remain open.

**WP-30 implementation slice (2026-08-09):** `[x]` application-only legacy classifier and
resumable orchestration now exist under
`app/modules/accomplishments/actions/commands/legacy-backfill/run_legacy_accomplishment_backfill_command.ts`.
The `9/9` unit suite proves task-only data remains `insufficient_unverified`, corrupt identity is
quarantined, tenant allowlist and cursor planning are deterministic, dry-run has no writer/checkpoint
side effects, retrospective apply is the only writable path, and failed writes do not checkpoint.
The Lucid reader slice (`lucid_legacy_accomplishment_backfill_reader.ts`) reads only the legacy
compatibility table and fail-closes every row unless immutable governance facts are supplied by a
separate authoritative source; its `11/11` focused unit wave proves it cannot invent snapshot,
review, claim or evidence provenance. Durable state now lives in storage-only
`accomplishment_legacy_backfill_runs`/`accomplishment_legacy_backfill_facts` tables, with application
validation and idempotent writer behavior; `2/2` database integration tests pass after applying the
migration to isolated `suar_test`. This is intentionally not `[x]` for WP-30 overall: release ledger
registration/checksum, operator rollout drills, persisted dual-read comparison evidence, rollback
endpoint and full legacy compatibility journey remain open. No database business rule or foreign key
was added.

Evidence refresh (2026-08-09): durable backfill state integration is `2/2`; forward migration
rehearsal on the dedicated test database now records all four sources plus the forward constraint
removal (`104 completed / 0 pending / 0 corrupt / 25 squashed`). The taxonomy revision migration
was corrected to keep namespace,
positive-revision and fingerprint validation in the application layer; it only stores data and
storage identity. Release verification still reports schema-dump owner approval required and a
schema-dump checksum mismatch, so WP-30 remains `[~]`.

**Taxonomy storage/application verification (2026-08-09):** `[x]` the dedicated taxonomy
integration suite is `4/4` after removing database business checks; invalid revision and
fingerprint rows are now rejected by the application reader, while the database keeps only the
namespace primary key. `pg_dump` candidate regeneration is currently unavailable because the
environment does not provide the `pg_dump` binary, so the release schema checksum remains open.

**Dual-read/cutover verification (2026-08-09):** `[~]` query, observer, operator-state composition
and rollback regression evidence is `11/11` focused unit tests. The Users query consumes a
consumer-owned cutover port, so the module-domain boundary remains clean; module-layer, port-taxonomy,
public-contract-surface and side-effect gates all pass after wiring. This does not prove a production
rollback drill, persisted comparison audit, Search rollback or full browser compatibility.

**Filtering namespace/refactor verification (2026-08-09):** `[x]` sequential current-tree wave is
`153/153` unit, `46/46` contract and `23/23` integration. TypeScript, affected ESLint and six
architecture gates pass; saved-view HTTP DI and compatibility import paths were repaired. This does
not close WP-29/WP-30 or the full UI/E2E/privacy/audit/release gates.

**Expected outputs:** legacy users không mất current profile, nhưng dữ liệu cũ không được gắn nhãn
Verified sai; rollout từng tenant có thể pause/rollback/retry.

**Abnormal cases:** corrupt JSON; missing task/project/review; duplicate completion; partial migration;
job restart; two workers same range; source changes during backfill; tenant opts out; user deleted;
confidence policy changes; old app node writes; DB rollback; search dual index lag; retrospective
evidence disputed.

**Focused verification:** backfill dry-run/replay integration, legacy profile compatibility and
feature-flag matrix tests.

### WP-31 — Observability, performance, rebuild và resilience gates

- [~] **WP-31 overall status** — Search activation preview/apply application commands, stale-token
  fencing, lock-conflict repair transition, admin projection UI and focused unit/integration/UI tests
  are now green. Baselines, outage/load/rebuild evidence and release resilience gates remain open.

**Ưu tiên/estimate:** P1 release, 1.5–2 agent-days.  
**Dependencies:** WP-28, WP-30; Search benchmarks coordinate with related plan WP-26.  
**Parallel-safe với:** WP-29 and WP-32 scenario preparation.  
**Exclusive write set:** metrics/logging/runbooks/load/rebuild tests and explicitly assigned query/index
optimizations.

- [ ] Baseline p50/p95/p99 cho Task create/readiness/detail, submit, review confirm, profile show,
      accomplishment rebuild and search projection before locking DEC-10 SLO.
- [ ] RED load/rebuild tests for N versions/task, N claims/report, N accomplishments/user and
      concurrent project context changes.
- [ ] Add metrics: readiness blocker distribution, draft-to-ready time, completion coverage, review
      projection lag/failure/retry, accomplishment lifecycle counts, profile publication, index lag and
      backfill outcomes.
- [ ] Add structured alerts/runbooks for poison event, projection drift, rebuild mismatch, queue lag,
      privacy tombstone lag and migration failure.
- [ ] Prove deterministic rebuild by comparing canonical hashes before/after replay; quarantine
      mismatches, không auto-overwrite silently.
- [ ] Test DB deadlock/timeout, worker crash, outbox retry, Search outage, cache outage and partial
      deployment compatibility.
- [ ] Tune indexes/query batching/pagination only with measured evidence; rerun correctness suites.

**Expected outputs:** measured SLOs, dashboards/alerts/runbooks, reproducible rebuild evidence và rõ
system behavior khi downstream unavailable.

**Abnormal cases:** thundering herd after deploy; giant profile; version explosion; hot tenant;
poison event; clock skew; partial outage; queue backlog; cache stampede; read replica lag; long
transaction; index mapping rejection; rebuild on policy version change; telemetry backend down.

**Focused verification:** load/resilience/rebuild suites, related Search benchmark corpus, typecheck,
lint and full affected integration tests.

**Evidence refresh (2026-08-09):** Search activation unit `4/4`, integration `1/1`, admin operator UI
`3/3`, and `svelte-check` `0 errors / 0 warnings`. The activation flow keeps fencing and state
transitions in application commands; the DB/repository remains storage-only.

Cache resilience recheck (2026-08-09): cache invalidation unit/health coverage passes `19/19`, the
transactional/operator integration wave passes `17/17` and the real-Redis wave passes `3/3`; coverage includes atomic trigger intent,
scoped generation rotation, lease fencing/retry, bounded cleanup, dead-letter reporting/replay and
operator audit. The browser worker still emitted an operator-attention warning during a separate E2E
run, but direct current `suar_test` inspection reports no pending/leased/dead-letter rows. This
advances focused cache evidence but does not close the production DLQ/runbook drill gate.

### WP-32 — E2E acceptance, release evidence và canonical documentation

- [~] **WP-32 overall status**

**Ưu tiên/estimate:** P0 release, 4–6 agent-days.  
**Dependencies:** WP-00–WP-31 required milestone packages complete.  
**Parallelism:** final coordinator/QA gate; feature workers only fix assigned failures.  
**Exclusive write set:** Playwright journeys, screenshot/trace evidence, test-matrix status/manifest,
release evidence, ADR/canonical docs and small coordinator-approved fixes.

- [ ] Execute the linked test matrix: trace every FR/BR/NFR and TC-TVA-001–020 to required Unit,
      Contract, Integration, Component, role-play E2E, screenshot, security/resilience and audit
      evidence; no single green test is accepted as whole-flow proof.
- [ ] Run RP-01–RP-08 with deterministic prerequisites, real UI core actions, actor session switches,
      semantic assertions before screenshots and post-journey provenance audits.
- [ ] Run three golden vertical journeys:
  1. design API for pre-order module;
  2. scale database under measurable load;
  3. diagnose/debug a production incident.
- [ ] For each journey prove creator authoring/readiness, assignee brief and status completion,
      reviewer B acceptance/rejection, and — only when governance is enabled — accomplishment
      projection, Profile rendering and recruiter Search explanation.
- [ ] Run negative journeys: title+link Draft cannot Assign; docs/link inaccessible; critical image
      lacks text; material change; collaborative partial ownership; dispute freeze; private task;
      unpublish/revoke; historical rebuild after current Task edit.
- [ ] Review successful screenshot sequences as creator, assignee, contributor, reviewer, reviewee,
      recruiter and operator; a screenshot file existing without readable user-state proof does not
      pass.
- [ ] Run desktop P0 on every gate and the configured Chromium/Firefox/WebKit desktop matrix before
      demo; mobile UI/browser coverage is out of scope for this desktop-only delivery. Do not run or
      use `profile_mobile_layout.spec.ts` as a release gate; it is the explicitly documented N/A
      legacy audit.
- [ ] Run compatibility journeys for legacy create/submission/profile and feature flags OFF/partial
      rollout.
- [ ] Execute final quality commands, record only concise failures and obtain zero unexplained flaky/
      skipped/false-pass tests.
- [ ] Update canonical SRS/API/data-model/architecture/runbook docs; mark master design status and
      record intentional deferrals with owner/date.
- [ ] Run reader validation: creator, assignee, reviewer, recruiter and operator can answer the
      questions in Appendix D của spec from product/docs without tribal knowledge.

**Expected outputs:** completed test matrix, executable acceptance evidence, ordered screenshot/trace
manifest for every actor journey, demo data/journeys, release/rollback checklist, updated canonical
documentation and a signed decision whether to enable each feature flag.

**Abnormal cases:** flaky E2E; stale seed/index; browser timezone; mobile; user/org parity; old node in
cluster; empty profile; huge data; private content in screenshot/log; downstream outage; retry after
crash; partial flag rollout; rollback during queue processing.

**Final verification:**

```bash
pnpm run test:full-confidence
pnpm run test:contract
pnpm run test:e2e
E2E_FULL_MATRIX=true pnpm run test:e2e
pnpm run typecheck
pnpm run check:svelte:strict
pnpm run lint
pnpm run build
gitnexus detect-changes
```

## 12. Cross-cutting abnormal-case matrix

Ma trận này không thay thế edge cases từng package. Coordinator dùng nó để phát hiện gap khi một lỗi
đi xuyên nhiều module.

| Failure class                    | Bắt buộc chứng minh                                        | Primary packages                  |
| -------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Link/auth/source unavailable     | Task core vẫn executable; readiness không bị link đánh lừa | WP-08, WP-09, WP-11, WP-22, WP-23 |
| Non-text/image-only requirement  | Có accessible text hoặc assignment blocker                 | WP-08, WP-09, WP-21, WP-22        |
| Concurrent edits                 | Optimistic conflict; không overwrite version/snapshot      | WP-02, WP-03, WP-07, WP-08, WP-13 |
| Material change after assignment | New version + diff + re-ack; old snapshot immutable        | WP-13, WP-23                      |
| Partial upload/transaction       | Retry/idempotency; không orphan evidence/claim             | WP-04, WP-14, WP-24               |
| Duplicate/out-of-order events    | Receipt/lock/idempotent projection                         | WP-16, WP-17, WP-31               |
| Dispute/correction/revocation    | Freeze/supersede/tombstone profile+search                  | WP-15–WP-20, WP-25–WP-27          |
| Collaborative ownership          | Per-contributor claim/review/accomplishment                | WP-04, WP-14–WP-16, WP-24–WP-26   |
| Historical source mutation       | Rebuild reads exact snapshots and same hash                | WP-12, WP-13, WP-18, WP-31        |
| Cross-tenant/privacy             | No payload/count/cache/log/index leakage                   | WP-12, WP-19, WP-20, WP-28, WP-29 |
| Legacy incomplete data           | Labeled confidence/fallback; never fake verified           | WP-18, WP-19, WP-26, WP-30        |
| Downstream outage                | Core transaction durable; retry observable                 | WP-11, WP-14, WP-17, WP-28, WP-31 |
| Partial deployment/schema drift  | Versioned contracts and old/new node compatibility         | WP-01, WP-28, WP-30, WP-31        |
| Deletion/retention/legal hold    | Lifecycle/audit/tombstone policy, no silent erasure        | WP-06, WP-16, WP-20, WP-29, WP-30 |

## 13. Merge order và release gates

- [ ] **GATE-A — Contract freeze:** WP-00–WP-01 merged; decisions and fixtures locked.
- [ ] **GATE-B — Persistence:** WP-02–WP-06 migrations run forward/back in isolated DB; module
      boundary tests pass.
- [ ] **GATE-C — Historical truth:** WP-07–WP-13 pass assignment drift/rebuild tests; editing current
      Task cannot change old snapshot.
- [ ] **GATE-D — Evidence truth:** WP-14–WP-18 pass completion/review/projection replay; disputed claim
      does not update verified Profile.
- [ ] **GATE-E — Demo vertical:** WP-19, WP-21–WP-26, WP-28 prove API-design golden journey end-to-end.
- [ ] **GATE-F — Search:** WP-20/WP-27 and related Search plan pass three intent queries and no-leak
      benchmark.
- [ ] **GATE-G — Production readiness:** WP-29–WP-32 pass rollback, resilience, full confidence and
      reader validation.

### 13.1 Merge sequence trong mỗi gate

1. Contract/schema package.
2. Pure domain package.
3. Repository/application package.
4. Frontend package built against locked fixtures.
5. Integration hotspot WP-28.
6. Security/performance/E2E gates.

Coordinator không merge frontend làm “giả dữ liệu verified” trước canonical projection. Nếu một UI cần
demo sớm, nó chỉ dùng test fixture/story harness, không tạo production shortcut.

## 14. Definition of product completion

- [ ] Creator có thể lưu Draft thiếu thông tin nhưng không thể Assign Task link-only/mơ hồ.
- [ ] Creator reuse Project/Work Package context mà không copy lặp, nhưng vẫn review/confirm resolved
      Task ngang phần docs liên quan.
- [ ] Assignee nhận execution brief self-contained, biết version, có thể chuyển Task sang Done mà
      không cần Completion Report/evidence; material changes có acknowledgement/change flow.
- [ ] Optional Completion Report phân biệt expected/actual, criterion/evidence và contributor
      ownership khi profile governance được bật; report không gate Done.
- [ ] Review tạo structured observations; requirement/score/comment không tự thành proof.
- [ ] Verified Work Accomplishment chỉ sinh qua governed gate, immutable/rebuildable/disputable.
- [ ] Profile ưu tiên demonstrated work và trả lời được action/ownership/context/output/verification.
- [ ] Search tìm được API design, database scaling và production debugging bằng public-safe verified
      work, có explanation.
- [ ] Current Task edit không làm đổi historical Profile/Search fact.
- [ ] Private/restricted data không leak qua props, snapshot, Search, facet, logs, cache hoặc errors.
- [ ] Legacy data vẫn hiển thị công bằng nhưng không bị gọi sai là native verified accomplishment.
- [ ] Full test, build, detect-changes, rollout và rollback evidence hoàn chỉnh.

## 15. Những việc cố ý không giao trong plan này

- [ ] Không xây generic authenticated crawler cho mọi external documentation system.
- [ ] Không coi AI extraction là authority; assisted mapping chỉ là suggestion cần creator confirm.
- [ ] Không duplicate Filter AST, taxonomy platform, faceting/ranking/index cutover của plan
      Search/Taxonomy.
- [ ] Không sửa Final Year Project PDF/report trong workstream source code này.
- [ ] Không backfill “verified” chỉ từ title/description/current skills của Task cũ.
- [ ] Không redesign toàn bộ project/sprint/task board ngoài các entry points cần cho vertical flow.

## 16. Điểm bắt đầu thực tế

Thứ tự khởi động an toàn cho coordinator:

1. Đánh dấu WP-00 `[~]`, freeze dirty baseline và quyết định.
2. Merge docs-only baseline.
3. Hoàn thành WP-01 rồi khóa contracts/fixtures.
4. Fan-out WP-02–WP-06 cho tối đa năm workers có worktree riêng.
5. Sau Gate B, fan-out theo module: Projects, Tasks, Reviews, Accomplishments.
6. Chỉ mở Profile/Search workers sau Gate C/D; UI workers có thể build sớm trên locked fixtures nhưng
   không merge integration shortcut.
7. Dành một worker cố định cho WP-28 và một coordinator/QA owner cho WP-29–WP-32.
