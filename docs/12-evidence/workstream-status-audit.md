# Workstream Status Audit

| Field | Value |
|---|---|
| Status | Active |
| Audience | Maintainer, reviewer, lead, on-call doc editor |
| Purpose | Audit chéo giữa handoff/plan/spec docs và code hiện tại để biết claim nào còn đúng, claim nào stale, claim nào mới chỉ là intent |
| Source of Truth | Current code, routes, schema, tests; handoff/plan/spec chỉ là historical input |
| Last Reviewed | 2026-07-17 |
| Review Cycle | Khi dùng handoff/plan/spec làm nguồn cho docs chính hoặc khi worktree thay đổi lớn |
| Owner | Engineering |
| Stale Risk | Rất cao nếu không rà lại với code |

## Why This File Exists

`docs/handovers` và `docs/superpowers` rất hữu ích, nhưng nguy hiểm nếu đọc sai.

Chúng chứa:

- phần đã làm xong
- phần đang làm dở
- intent thiết kế
- next steps của một thời điểm cũ

Nếu lấy nguyên xi các file này làm source of truth cho docs chính, reader rất dễ bị sai.

Nếu bạn chỉ cần dùng nhanh:

- muốn biết handoff/plan/spec có còn tin được không: đọc `Audit Rule`
- muốn biết workstream nào stale rõ nhất: đọc từng section `Current Read`
- muốn biết docs chính nên dùng chúng thế nào: đọc `Practical Rule For Main Docs`

## Audit Rule

Mỗi claim trong handoff/plan/spec phải được xếp vào một trong ba trạng thái:

| Status | Ý nghĩa |
|---|---|
| `verified current` | code/tests hiện tại vẫn xác nhận claim |
| `partially stale` | claim đúng một phần nhưng tiến độ hoặc implementation đã thay đổi |
| `stale` | claim cũ, code hiện tại đã khác hoặc đã đi xa hơn |

Một câu nhớ ngắn:

`Handoff và plan giúp tìm câu hỏi đúng. Code và test hiện tại mới giúp chốt câu trả lời cuối.`

## Promotion Pipeline

Khi một spec/plan/handoff có ý đáng giữ lại, không copy nguyên xi vào docs chính. Dùng pipeline này:

1. đọc raw note để tìm claim hoặc concern
2. đối chiếu lại với code, route, schema, migration, command/query, test, và frontend surface nếu concern chạm UI
3. nếu claim còn đúng, chuyển hóa thành mô tả chính thức trong taxonomy `docs/00-12` hoặc diagram tương ứng
4. nếu claim chỉ đúng một phần, ghi caveat trong evidence docs và chỉ đưa phần verified vào docs chính
5. nếu claim sai hoặc đã bị code thay thế, giữ raw note như lịch sử và không đưa vào public narrative

Mục tiêu của pipeline này: sau này có thể bỏ raw notes mà không mất context hệ thống, vì phần còn giá trị đã được hấp thụ vào docs chính sau khi kiểm chứng.

Policy đầy đủ cho draft, handoff, demo audit, plan, spec, và mockup nằm ở `docs/12-evidence/working-document-promotion-policy.md`.

## Folder-Level Classification

| Folder | Current role | Rule |
|---|---|---|
| `docs/12-evidence` | Official audit/control layer | Dùng để biết proof strength, source hierarchy, stale risk; không thay docs nghiệp vụ |
| `docs/handovers` | Historical session snapshots | Dùng để tìm nơi cần audit; không cite như current truth |
| `docs/demo-audit` | Date-bound demo proof and runbook | Dùng cho rehearsal/demo path; không mở rộng thành product truth tổng quát |
| `docs/superpowers` | Working design/implementation workspace | Specs/plans/handoffs/mockups là target/history; phải verify trước khi promote |

Root-level scratch drafts không thuộc taxonomy docs chính. Nếu có ý đúng, promote ý đó vào docs chính hoặc evidence docs; không cite scratch draft bằng tên.

## Workstream: Search Rollout

### Files Audited

- `docs/handovers/2026-07-04-search-session-handoff.md`
- `docs/superpowers/plans/2026-07-04-search-phase1-talents.md`

### Current Read

#### `docs/handovers/2026-07-04-search-session-handoff.md`

Status: `partially stale`

What still helps:

- mô tả kiến trúc search dùng Elasticsearch trả về candidate ids, PostgreSQL hydrate và filter quyền
- warning chạy test tuần tự
- các lưu ý về dirty worktree

What is stale:

- handoff nói generic user-directory search còn thiếu nhiều file và branch có thể compile-broken
- code hiện tại đã có:
  - `app/modules/search/actions/queries/search_users_via_engine_query.ts`
  - `app/modules/search/infra/users/user_directory_search_document_builder.ts`
  - `app/modules/search/infra/users/user_directory_search_index_repository.ts`

Conclusion:

- handoff cũ hữu ích như snapshot lịch sử
- không còn dùng làm mô tả trạng thái hiện tại của search module

#### `docs/superpowers/plans/2026-07-04-search-phase1-talents.md`

Status: `verified current` cho phần session notes; `intent` cho phần plan steps

What current code strongly supports:

- search đã có generic user-directory search
- search decoupling đã đi qua nhiều bounded contexts
- local candidate-reader ports/adapters đã tồn tại cho nhiều consumer

Conclusion:

- file này tốt hơn handoff cũ để hiểu trạng thái search hiện tại
- nhưng vẫn là plan/checkpoint, không thay cho docs kiến trúc chính

## Workstream: Review Governance

### Files Audited

- `docs/handovers/2026-07-06-review-governance-session-handoff.md`
- `docs/superpowers/plans/2026-07-09-task-review-dispute-implementation.md`

### Current Read

#### `docs/handovers/2026-07-06-review-governance-session-handoff.md`

Status: `partially stale`

What current code strongly supports:

- dispute reporting command exists:
  - `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- reviewer assignment support exists:
  - `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`
- org dispute page shell exists:
  - `app/modules/reviews/controllers/show_org_disputes_page_controller.ts`
  - `inertia/apps/org/modules/disputes/index.svelte`
- org dispute page route is also confirmed:
  - `start/routes/reviews.ts` binds `GET /org/disputes`
- review-related task comment panel exists:
  - `inertia/apps/user/modules/reviews/components/review_related_task_comments_panel.svelte`
  - `inertia/apps/org/modules/reviews/components/review_related_task_comments_panel.svelte`

What is still not safe to treat as complete:

- chính handoff này nói rõ `not proven complete`
- còn mở gap về stronger frontend/backend proof
- product direction của reverse review đã đổi:
  - code hiện tại chặn task-level reverse review mới
  - các màn reverse review hiện đọc dữ liệu hiện có và mang caveat chuyển sang sprint-close flow
- còn cần phân biệt rõ hơn giữa:
  - org dispute queue đã có proof mạnh
  - reverse-review create flow hiện không còn active
  - admin moderation surfaces không phải mọi nhánh đều có proof E2E ngang nhau

Conclusion:

- dùng file này như checklist audit rất tốt
- không được dùng làm bằng chứng rằng toàn bộ review governance đã hoàn tất

#### `docs/superpowers/plans/2026-07-09-task-review-dispute-implementation.md`

Status: `intent / target state`

What it gives:

- target architecture và target verification
- danh sách file chịu tác động
- checklist điều cần đúng khi hoàn tất

What it does not prove:

- không chứng minh code hiện tại đã đạt hết từng task
- không chứng minh tests đã green hết ở current worktree

Conclusion:

- đây là source để biết “phải audit cái gì”
- không phải source để kết luận “đã xong”

## Practical Rule For Main Docs

Khi viết docs chính:

1. có thể dùng handoff/plan/spec để phát hiện concern
2. nhưng claim cuối cùng phải quay về code, route, schema, test, và frontend surface hiện tại nếu UI liên quan
3. nếu handoff và code mâu thuẫn nhau, ưu tiên code
4. nếu plan nói sẽ làm nhưng code chưa chứng minh, ghi là `planned` hoặc `unverified`, không ghi thành fact
5. không trích raw note như official docs trong tài liệu public; chỉ trích docs chính hoặc evidence đã ghi rõ mức verified

Đây là rule rất quan trọng để tránh chuyện docs mới lại vô tình quay về phụ thuộc narrative cũ hoặc session snapshot cũ.

## Workstream: Task Review Board And Sprint Reverse Review

### Files Audited

- `docs/superpowers/specs/2026-07-15-task-review-board-design.md`
- `docs/superpowers/plans/2026-07-15-task-review-board.md`
- `docs/superpowers/specs/2026-07-15-sprint-reverse-review-boards-design.md`
- `docs/superpowers/plans/2026-07-15-sprint-reverse-review-boards.md`
- `database/migrations/20260715090000_create_task_review_workflows.ts`
- `database/migrations/20260715100000_create_sprint_reverse_review_workflows.ts`
- `database/migrations/20260715110000_remove_review_workflow_db_constraints.ts`
- `database/migrations/20260715120000_normalize_task_review_in_review_status.ts`
- `start/routes/reviews.ts`
- `app/modules/reviews/domain/task_review_workflow.ts`
- `app/modules/reviews/domain/sprint_reverse_review_workflow.ts`
- `app/modules/reviews/domain/sprint_review_rules.ts`
- `app/modules/reviews/actions/commands/*task_review*`
- `app/modules/reviews/actions/commands/*sprint_reverse*`
- `app/modules/reviews/actions/commands/*sprint_review*`
- `app/modules/reviews/actions/queries/get_task_review_board_query.ts`
- `app/modules/reviews/actions/queries/get_sprint_reverse_review_board_query.ts`

### Current Read

Status: `verified current` ở mức route + migration + command/query/domain + focused integration tests có mặt.

What current code strongly supports:

- task review board có workflow riêng với board lane status:
  - `awaiting_review`
  - `in_review`
  - `awaiting_response`
  - `disputed`
  - `reported`
  - `done`
- task review workflow admin/AI path can also persist `ai_reviewing` and `resolved`; admin dispute queries read `reported`, `ai_reviewing`, `resolved`.
- task review workflow dùng `task_review_workflows`, `task_review_reviewers`, `task_review_messages`.
- reviewer quorum và self-review guard nằm ở application/domain command, không nên mô tả như DB constraint.
- project sprint close gate kiểm tra các task review workflow rows đã tồn tại phải `done` trước khi mở sprint review; missing workflow rows không được gate này đếm.
- sprint review package ghi manager/environment review.
- sprint reverse review board dùng workflow riêng với board lane tương tự task review board, plus admin/AI persisted statuses `ai_reviewing` and `resolved`.
- migrations 2026-07-15 đã chủ động bỏ một số FK/check/unique business constraints để app layer sở hữu validation.

What is stale in older docs/plans:

- không được mô tả reverse review mới như task-level create flow chính.
- không được nói task completion review chỉ là review-session cũ.
- không được nói DB constraint là nơi enforce chính toàn bộ workflow rule.

Conclusion:

- specs/plans ngày 2026-07-15 đã được hấp thụ một phần vào docs chính sau khi đối chiếu runtime.
- docs chính được phép mô tả task review board, sprint review package, sprint close gate, và sprint reverse board như current architecture.
- docs chính vẫn nên ghi rõ plan/spec chỉ là input lịch sử; code/migration/domain command mới là câu trả lời cuối.

## Workstream: Sprint Management Module

### Files Audited

- `docs/superpowers/specs/2026-07-16-sprint-management-module-design.md`
- `docs/superpowers/plans/2026-07-16-sprint-management-module.md`
- `database/migrations/20260716120000_add_project_sprint_goal.ts`
- `start/routes/projects.ts`
- `app/modules/sprints/**`
- `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`
- `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`
- `inertia/apps/user/modules/projects/show.svelte`
- `inertia/apps/org/modules/projects/show.svelte`

### Current Read

Status: `verified current` ở mức module boundary + route + command/query/domain + component/integration/E2E evidence hiện có.

What current code strongly supports:

- `app/modules/sprints` là boundary riêng cho sprint planning/backlog.
- `app/modules/reviews` vẫn sở hữu sprint review package, close-period gate, dispute, và sprint reverse review workflow.
- `project_sprints.goal` là Sprint Goal nullable, create/update/list/show và sprint board đều expose.
- blank Sprint Goal normalize thành `null`; nonblank goal bị cap `2000` ký tự ở command layer.
- `tasks.project_sprint_id = null` là Product Backlog.
- task chỉ move vào sprint cùng project và sprint phải editable (`draft` hoặc `active`).
- project detail user/org shell đều có tab `Sprints`; task board link sang tab này thay vì render full sprint management.

What older docs/specs must not imply:

- không gọi toàn bộ sprint feature là "Project Sprint Reviews".
- không đặt sprint planning dưới review domain; review domain chỉ bắt đầu mạnh khi mở review/close period/package/reverse workflow.
- không claim task board là nơi quản lý sprint đầy đủ.

Conclusion:

- specs/plans ngày `2026-07-16` đã được hấp thụ vào docs chính ở mức current code xác nhận.
- vẫn nên giữ caveat rằng worktree đang có nhiều thay đổi chưa merge; mỗi claim mới cần đối chiếu route/module/test hiện tại.

## Recommended Next Audit Targets

- behavior end-to-end cho org talents, org disputes, và admin proficiency surfaces
- higher-level regression proof cho search-backed consumers
- review governance completion proof thay vì chỉ file-presence proof
- mọi docs chính hiện còn dùng handoff như evidence trực tiếp nhưng chưa ghi caveat

## Worktree Review Snapshot 2026-07-17

Status: `verified local checks green after frontend/backend review fixes`

Scope reviewed:

- frontend multi-app split under `inertia/apps/{user,org,admin}`
- backend module/test migration under `app/modules/*/tests/backend`
- Inertia page resolution for user/org root views
- lint/typecheck failures exposed by current worktree
- frontend shared pagination regression exposed by full runnable UI suite

Findings fixed:

- missing Inertia page resolution for `index` and `org/no_org`
- strict Svelte unused symbols in organization/project surfaces
- backend lint unsafe `any` in sprint management/testing cleanup code
- frontend import-order lint in org sprint test
- unified offset pagination no longer rendering `page / lastPage`
- org control sidebar source guard updated to current `data-open` selector

Commands verified:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:ui:runnable`
- focused Vitest guard for `inertia_page_resolution`, org sprint page, unified offset pagination, and org control sidebar source

Current caveat:

- Playwright full E2E matrix and backend integration/contract suites were not rerun in this review pass.
- GitNexus `detect-changes` became non-informative after re-indexing the working tree; use `git diff` for current uncommitted scope until a fresh baseline is available.

## Surface Audit Snapshot

### Org Talents

Status: `verified current` ở mức route + controller + UI + component tests + E2E

Evidence hiện có:

- route:
  - `start/routes/users.ts` binds `GET /org/talents`
  - `start/routes/users.ts` binds `GET /org/talents/:userId`
- controller:
  - `app/modules/users/controllers/org_talents_page_controller.ts`
  - có guard cho current organization và quyền manager/admin shell
- UI:
  - `inertia/apps/org/modules/talents/index.svelte`
  - `inertia/apps/org/modules/talents/show.svelte`
  - `inertia/apps/org/modules/bookmarks/index.svelte`
- component tests:
  - `inertia/apps/org/tests/modules/talents/index.test.ts`
  - `inertia/apps/org/tests/modules/talents/show.test.ts`
  - `inertia/apps/org/tests/modules/bookmarks/index.test.ts`
- E2E:
  - `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts`
  - `inertia/apps/org/tests/e2e/org/talent_bookmarks.spec.ts`
  - `inertia/apps/user/tests/e2e/marketplace/talent_directory_bookmarks.spec.ts`
  - cover listing shell, search, empty state, detail navigation, bookmark flow, and legacy marketplace redirects

Current conclusion:

- đây không còn là page shell mơ hồ
- docs có thể nói đây là runtime surface đã được xác nhận khá mạnh

### Admin Proficiency

Status: `verified current` ở mức route + controller + unit/view-model proof + E2E read proof

Evidence hiện có:

- route:
  - `start/routes/admin.ts` binds `/admin/proficiency*`
- controllers:
  - `app/modules/admin/controllers/proficiency/list_proficiency_scales_controller.ts`
  - `app/modules/admin/controllers/proficiency/show_proficiency_scale_controller.ts`
  - `app/modules/admin/controllers/proficiency/show_skill_rubric_controller.ts`
- unit proof:
  - `app/modules/admin/tests/backend/unit/proficiency_view_model.spec.ts`
- E2E:
  - `inertia/apps/admin/tests/e2e/admin/admin_proficiency_rubric_read.spec.ts`

Current limitation:

- rubric E2E có nhánh skip nếu không có published rubric seed hiện hành
- admin surface hiện là read/readiness proof, chưa chứng minh create/update rubric UX

Current conclusion:

- docs có thể khẳng định route và controller surface đã có
- docs có thể khẳng định read UX đã có E2E proof, nhưng mutation/admin authoring UX chưa nên được claim đầy đủ

### Review Boards Frontend Surfaces

Status: `mixed proof; route/page confirmed, root seeded E2E stronger than org post-action proof`

Evidence hiện có:

- task review board routes:
  - `GET /reviews/task-board`
  - `GET /org/reviews/task-board`
- task review pages:
  - `inertia/apps/user/modules/reviews/task-board.svelte`
  - `inertia/apps/org/modules/reviews/task-board.svelte`
- task review flow E2E:
  - `inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts`
- org route smoke:
  - `inertia/apps/org/tests/e2e/org/org_workspace_navigation_smoke.spec.ts`
- sprint reverse board routes:
  - `GET /reviews/sprint-reverse-board`
  - `GET /org/reviews/sprint-reverse-board`
- sprint reverse pages:
  - `inertia/apps/user/modules/reviews/sprint-reverse-board.svelte`
  - `inertia/apps/org/modules/reviews/sprint-reverse-board.svelte`
- sprint reverse flow E2E:
  - `inertia/apps/user/tests/e2e/reviews/sprint_reverse_review_board_demo.spec.ts`

Current caveat:

- task-review mutation controllers redirect to `/reviews/task-board`, not `/org/reviews/task-board`
- sprint-reverse mutation controllers and some links redirect to `/reviews/sprint-reverse-board`, not `/org/reviews/sprint-reverse-board`
- therefore docs can claim org route/page/shell presence, but should not claim org post-action shell retention is fully verified

Current conclusion:

- frontend is not missing for these boards
- proof strength differs by shell and action path
- official docs should keep this caveat until route-preserving post-action behavior is either fixed or explicitly accepted

### Org Disputes

Status: `verified current` ở mức route + controller + integration query + E2E

Evidence hiện có:

- route:
  - `start/routes/reviews.ts` binds `GET /org/disputes`
- controller:
  - `app/modules/reviews/controllers/show_org_disputes_page_controller.ts`
- query/integration proof:
  - `app/modules/reviews/actions/queries/list_org_review_disputes_query.ts`
  - `app/modules/reviews/tests/backend/integration/org_dispute_queue_access.spec.ts`
- E2E:
  - `inertia/apps/org/tests/e2e/reviews/org_dispute_queue.spec.ts`
  - `inertia/apps/org/tests/e2e/reviews/org_dispute_queue_flow.spec.ts`

Current conclusion:

- org dispute queue không còn là shell mơ hồ
- docs chính có thể mô tả đây là surface vận hành đã được chứng minh khá mạnh

### Re-Audit Regression Snapshot

Status: `rechecked green on current worktree`

Các suite từng rất đáng nghi cho narrative docs và contract docs đã được chạy lại trên worktree hiện tại ngày `2026-07-10` và đều pass:

- `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
- `app/modules/users/tests/backend/integration/user_snapshot_api_standardization.spec.ts`
- `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`

Current conclusion:

- các surface talent search, org talent detail, talent bookmarks, admin organizations, và admin audit logs hiện có proof integration mạnh hơn so với lần rà soát trước
- điều này tăng độ tin cậy cho docs business/API hiện tại, nhưng không thay thế việc phải tiếp tục rà E2E và UX proof ở các nhánh khác

### Current Red Signals Worth Keeping In Docs

Status: `open regression signals on current worktree`

Trong lần re-audit ngày `2026-07-10`, suite dưới đây đã được chạy lại và hiện còn lộ ra một lệch runtime đáng chú ý:

- `app/modules/auth/tests/backend/integration/testing_auth_tokens.spec.ts`

Current failing signals:

1. `bearer token can list grouped tasks in refreshed organization context`
   - expected `200`
   - current result `500`
   - Postgres error hiện tại cho thấy route `/api/tasks/grouped` đang rơi vào path xử lý task detail kiểu `:taskId = "grouped"` rồi đụng lỗi UUID parse
   - code audit hiện tại còn cho thấy một nghi ngờ root cause rất mạnh:
     - `start/routes/tasks.ts` đăng ký `/api/tasks/:taskId` sớm
     - alias deprecated `/api/tasks/grouped` lại được nạp muộn hơn từ `start/routes/deprecated/task_surface_aliases.ts`
     - vì vậy alias shape có nguy cơ bị dynamic detail route nuốt mất

Current implication for docs:

- docs task/API nên giữ cảnh giác rằng một số mixed `/api/*` surfaces vẫn có thể gặp route-shape regression dù domain narrative tổng thể đã đúng
- khi ai dùng bộ docs này để audit code quality, điểm trên nên được coi là known runtime warning chứ không phải đã-complete proof
- với task board/read APIs, external reader nên tin canonical names như `/api/tasks/status-groups` hơn alias cũ `/api/tasks/grouped` khi cần mô tả stable surface

## Workstream: Task Workflow And Status Surface

### Files Audited

- `start/routes/tasks.ts`
- `start/routes/api_v1.ts`
- `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`
- `app/modules/tasks/actions/commands/batch_update_task_status_command.ts`
- `app/modules/tasks/domain/task_status_mirror.ts`
- `app/modules/tasks/tests/backend/contract/task_statuses_workflow_api.contract.spec.ts`

### Current Read

Status: `verified current`

What current code strongly supports:

- `task_status_id` là workflow truth hiện tại
- cột `tasks.status` chỉ còn là legacy mirror theo category để phục vụ một số path/report cũ
- compatibility routes `/api/task-statuses`, `/api/workflow` vẫn chạy thật
- canonical routes `/api/v1/task-statuses`, `/api/v1/workflow` cũng đã có thật và có contract parity proof
- drag/drop đổi cột và batch status update đều validate workflow transition từ DB
- khi target status là `done`, runtime còn kiểm tra submission hợp lệ trừ một nhóm task type được bypass

Evidence hiện có:

- route:
  - `start/routes/tasks.ts` binds `/api/task-statuses`, `/api/workflow`
  - `start/routes/api_v1.ts` binds `/api/v1/task-statuses`, `/api/v1/workflow`
- commands/domain:
  - `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`
  - `app/modules/tasks/actions/commands/batch_update_task_status_command.ts`
  - `app/modules/tasks/domain/task_status_mirror.ts`
- contract proof:
  - `app/modules/tasks/tests/backend/contract/task_statuses_workflow_api.contract.spec.ts`

Current conclusion:

- docs chính được phép nói task workflow hiện là mixed compat + canonical surface
- docs chính không được viết như thể `status` vẫn là workflow truth
- docs chính cũng không được viết như thể board-state hoặc status update chỉ là UI convenience không có business rule sâu

## Workstream: Pagination Surface Unification

### Files Audited

- `docs/superpowers/handoffs/2026-07-05-pagination-rollout-handoff.md`
- `docs/superpowers/plans/2026-07-09-pagination-surface-unification.md`
- `docs/superpowers/specs/2026-07-09-pagination-surface-unification-design.md`

### Current Read

#### `docs/superpowers/handoffs/2026-07-05-pagination-rollout-handoff.md`

Status: `partially stale`

What current code strongly supports:

- shared offset pagination component exists:
  - `inertia/apps/*/shared/ui/unified_offset_pagination.svelte`
- shared cursor pagination component exists:
  - `inertia/apps/*/shared/ui/unified_cursor_pagination.svelte`
- active pages are already using unified components in multiple places:
  - `inertia/apps/user/modules/projects/index.svelte`
  - `inertia/apps/org/modules/projects/index.svelte`
  - `inertia/apps/admin/modules/organizations/index.svelte`
  - `inertia/apps/admin/modules/disputes/index.svelte`
  - `inertia/apps/user/modules/notifications/components/notification_pagination.svelte`
  - `inertia/apps/org/modules/notifications/components/notification_pagination.svelte`

What is still not safe to treat as complete:

- repo scan still shows legacy/local wrappers and non-unified usage remain
- for example:
  - `inertia/apps/admin/modules/audit_logs/components/pagination_controls.svelte`
  - still renders `CursorPagination` directly instead of `UnifiedCursorPagination`
- very broad grep still shows many pagination dialects crossing modules

Conclusion:

- rollout đã tiến xa và có proof thật trong code
- nhưng plan/spec vẫn chưa thể coi là hoàn tất toàn repo

#### `docs/superpowers/plans/2026-07-09-pagination-surface-unification.md`

Status: `intent with partially landed prerequisites`

What current code strongly supports:

- canonical shared components đã tồn tại
- repo đã có bề mặt đủ lớn để justify audit unification toàn cục

What it does not prove:

- không chứng minh toàn bộ paginated surfaces đã được inventory đầy đủ
- không chứng minh mọi page đã canonicalized

Conclusion:

- file này tốt để hiểu target rollout và checklist
- không được dùng làm bằng chứng hoàn tất

## Workstream: API Governance Hardening

### Files Audited

- `docs/superpowers/plans/2026-07-06-api-governance-hardening.md`

### Current Read

#### `docs/superpowers/plans/2026-07-06-api-governance-hardening.md`

Status: `historical plan with retired script names`

What current code strongly supports:

- API route families still exist across:
  - `start/routes/api.ts`
  - `start/routes/api_v1.ts`
  - `start/routes/admin.ts`
  - `start/routes/organizations_current.ts`
  - `start/routes/deprecated/*`
- current guardrails exist, but under broader boundary/test tooling:
  - `scripts/check_backend_side_effect_boundary.mjs`
  - `scripts/check_module_domain_boundary.mjs`
  - `scripts/check_public_contract_surface.mjs`
  - `scripts/api_deprecated_route_policy.json`
  - `scripts/tests/collect_test_inventory.mjs`
  - `scripts/tests/collect_module_suite_matrix.mjs`
- contract/integration evidence now lives under `app/modules/*/tests/backend/{contract,integration}`

What is still not safe to treat as complete:

- dedicated API suite scripts from the old plan are not current files:
  - `scripts/check_api_route_governance.mjs`
  - `scripts/run_api_suite.mjs`
- existence of current boundary checks does not prove every legacy API family has been migrated
- runtime still clearly contains mixed `/api/*` and `/api/v1/*` surfaces

Conclusion:

- governance hardening direction landed as broader boundary/test controls, not as the exact script set named in the old plan
- repo still reflects transitional runtime reality, so docs phải nói theo current state thay vì target-state wording

## Folder-Level Reading Rule

Với `docs/handovers/*` và `docs/superpowers/*`:

- handoff giúp hiểu session state và risk
- plan giúp hiểu target rollout
- spec giúp hiểu target architecture
- chỉ code/routes/tests mới giúp kết luận runtime hiện tại

Current conclusion:

- org dispute queue đã có proof mạnh hơn mức route existence
- docs có thể xem đây là runtime surface đã được xác nhận khá chắc ở cả access rules, pagination/search shell, và page rendering

## Khi Nào Dừng Ở File Này

Dừng ở file này khi bạn đã biết:

1. handoff/plan/spec concern của mình đang ở trạng thái `verified current`, `partially stale`, hay `stale`
2. file nào còn dùng được như audit input và file nào không nên dùng làm output cuối
3. có cần quay sang docs chính hoặc code/test evidence để chốt kết luận hay không
