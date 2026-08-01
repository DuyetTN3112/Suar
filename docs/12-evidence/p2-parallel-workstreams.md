# P2 parallel workstreams

> **Status: Superseded historical execution note — do not run as an implementation plan.**
> Current canonical truth is `frontend-ui-audit-2026-07-26.md` plus the current routes/tests:
> System Admin is a separate realm; Organization Management has no delivery boards; Project
> Workspace has four shared boards; `/reviews/pending` and duplicate User/Org review pages are
> retired. Any instruction below that conflicts with those invariants is obsolete.

Nguồn chuẩn: `implementation-plan.md` P2, `output-target.json`, và `test-matrix.md`.
Mỗi worker phải giữ nguyên thay đổi đang có trong worktree, chạy GitNexus impact trước
khi sửa symbol, và làm theo vòng TDD red → green → refactor.

## Worker A — Work execution

Phạm vi: P2.1–P2.2.

- Submission ngay trong task drawer, không đổi shell hoặc mở tab mới.
- Upload file thật và gắn evidence vào submission.
- Không tạo trạng thái `IN_REVIEW` ẩn sau submit.
- Done gate theo submission/permission/task type.
- Optimistic move phải rollback và thông báo bằng `aria-live` khi server từ chối.

File ownership chính:

- `app/modules/tasks/controllers/task_submission_controller.ts`
- `app/modules/tasks/actions/commands/update_task_sort_order_command.ts`
- `app/modules/tasks/domain/task_permission_policy.ts`
- `inertia/apps/{user,org}/modules/tasks/components/detail/`
- `inertia/apps/{user,org}/modules/tasks/components/views/kanban/`
- `inertia/apps/{user,org}/modules/tasks/index.svelte`

Điều kiện bàn giao: targeted unit/component/contract tests xanh; có test cho cả allow
và refuse; không request nào được gửi khi client đã biết Done bị chặn.

## Worker B — Forward-review pipeline

Phạm vi: P2.3–P2.5. Phụ thuộc contract của Worker A về task reaching Done.

- Task vào done-category mở đúng một forward-review workflow.
- Task detail chỉ còn một review system và một quorum rule.
- Tám lane giữ đúng workflow status.
- Pending reviewer thao tác submit/accept/respond/report từ board.
- Người ngoài reviewer roster không có control và bị API từ chối.
- `Waiting on me` là filter của `/projects/:projectId/reviews/tasks`; `/reviews/pending` không tồn tại.

File ownership chính:

- `app/modules/reviews/domain/task_review_workflow.ts`
- `app/modules/reviews/infra/repositories/read/task_review_board_queries.ts`
- `app/modules/reviews/controllers/show_task_review_board_controller.ts`
- `app/modules/reviews/controllers/show_task_review_board_controller.ts`
- `start/routes/reviews.ts`
- `start/routes/projects.ts`
- `inertia/apps/user/modules/reviews/task-board.svelte`
- `inertia/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte`

Điều kiện bàn giao hiện hành: một Project board/panel test suite xanh; integration test pin
workflow handoff và roster authorization; reviewer inbox route tiếp tục vắng mặt.

## Worker C — Task collaboration and lifecycle

Phạm vi: P2.6–P2.7.

- History dùng đúng contract actor/timestamp/changes.
- Discussion trả về reply sâu hơn một cấp.
- Composer cho chọn classification/visibility/review relevance hợp lệ.
- Drawer và full page dùng cùng work-tab access rule.
- Edit cho phép publish/unpublish và giữ đúng assignee/sprint.
- Delete giữ confirmation hiện có và được khóa bằng regression test.

File ownership chính:

- `app/modules/tasks/controllers/task_submission_controller.ts`
- `app/contracts/api/v1/`
- `inertia/apps/{user,org}/modules/tasks/components/detail/task_history_tab.svelte`
- `inertia/apps/{user,org}/modules/tasks/components/detail/task_discussion_tab.svelte`
- `inertia/apps/{user,org}/modules/tasks/lib/show_helpers.ts`
- `inertia/apps/{user,org}/modules/tasks/edit.svelte`
- `inertia/apps/{user,org}/modules/tasks/show.svelte`

Điều kiện bàn giao: L3 contract test pin audit shape; three-level reply survives reload;
user/org component tests xanh; edit visibility round-trip được test.

## Integration order

1. Merge Worker A contract first.
2. Rebase/verify Worker B against the final Done handoff.
3. Merge Worker C; resolve only the two shared boundaries
   (`task_submission_controller.ts` and task `show.svelte`) by preserving both behaviors.
4. Run targeted unit/component/contract suites, then safe integration/E2E environment.
5. Run `gitnexus detect-changes` and review unexpected symbols/flows before commit.
