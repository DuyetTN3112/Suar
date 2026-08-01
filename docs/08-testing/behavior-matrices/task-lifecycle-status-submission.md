# Task Lifecycle, Status, And Submission Behavior Matrix

| Field | Value |
|---|---|
| Status | Draft audit |
| Last Reviewed | 2026-07-14 |
| Scope | Task create/update/list/status board/submission/comment/attachment surfaces |
| Primary Docs | `docs/01-business/features/task_workflow_and_submission.md`, `docs/09-operations/production-incident-first-response.md` |
| Primary Runtime | `start/routes/tasks.ts`, `app/modules/tasks/**` |
| Primary Tests | `app/modules/tasks/tests/backend/**`, `inertia/apps/*/tests/modules/tasks/**`, `inertia/apps/*/tests/e2e/tasks/**` |

## Read This First

This is behavior coverage, not file inventory. A row is only `covered` when the test proves the business outcome with concrete actor, state, and persisted/API/UI result.

This file is still a task-domain evidence matrix, not a complete hierarchical test-case matrix. It mixes create, update, list, status transition, submission, comments, and attachments. Split it with `../hierarchical-test-case-decomposition.md` before calculating coverage.

`task_status_id` is workflow truth. `status` is legacy compatibility mirror. Any test or report that only checks `status` is partial unless it also proves `task_status_id` behavior.

## Matrix

| ID | Behavior | Actor / State | Input / Trigger | Expected Backend Result | Expected UI Result | Evidence | Status |
|---|---|---|---|---|---|---|---|
| TASK-001 | Task create persists canonical workflow status | Approved org actor with project | Valid create payload | Task saved with creator, org/project alignment, `task_status_id`, legacy `status`, DB row | Create success visible after submit | `app/modules/tasks/tests/backend/integration/create_task.spec.ts` | covered backend, partial UI |
| TASK-002 | Task create enforces project organization boundary | Actor in current org | Project from another org | Reject with business error, no task persisted | Error state expected | `create_task.spec.ts` | covered backend, missing UI |
| TASK-003 | Task create rejects inactive actor | Inactive user | Valid create payload | Not found/rejected, no task persisted | Error state expected | `create_task.spec.ts` | covered backend, missing UI |
| TASK-004 | Task create rejects actor without create permission | Outsider/member without permission | Valid create payload | Forbidden, no task persisted | Error state expected | `create_task.spec.ts` | covered backend, missing UI |
| TASK-005 | Assignee must match allowed scope | Internal task, non-member assignee | Create/update assignee | Business error, task unchanged | Form should explain invalid assignee | `create_task.spec.ts`, `update_task.spec.ts`, `inertia/apps/*/tests/modules/tasks/components/task_assignee_scope*.test.ts` | covered backend, partial UI |
| TASK-006 | External contributor allowed only for marketplace-facing task | External/hybrid visibility | External assignee | Allowed for external visibility, rejected otherwise | External bucket visible only for marketplace-facing modes | `create_task.spec.ts`, `task_assignee_scope.test.ts`, `task_assignee_scope_selects.test.ts` | covered backend, partial UI |
| TASK-007 | Required skill validation rollback | Create task after initial insert, invalid skill graph | Invalid required skill payload | Whole create rolls back, no partial task/skill data | Error state expected | `create_task.spec.ts` | covered backend, missing UI |
| TASK-008 | Cross-org parent task rejected | New task with parent from another org | Parent task id | Business error, no child persisted | Error state expected | `create_task.spec.ts` | covered backend, missing UI |
| TASK-009 | Project members with create capability can create task | Project owner/manager/member | Valid create payload in an accessible project | Task persisted | Create flow available | `create_task.spec.ts` | covered backend, missing UI |
| TASK-010 | Task create modal renders required controls on the canonical board | Logged-in user with accessible project | Open create from `/projects/:projectId/tasks` or compatibility `/tasks/create` | Compatibility GET redirects with create intent; no write until submit | Board remains mounted; title, description, project context and validation appear in modal/overlay | `inertia/apps/user/tests/e2e/tasks/task_create_role_prefill.spec.ts`, `CreateTaskController.showForm` | partial |
| TASK-011 | Role prefill maps backend helper data into skills/member suggestions | Project with professional roles | Select role/project | Prefill data available | Required skills and member suggestion shown | `task_role_prefill_panel.test.ts`, `task_create_prefill_mapping.test.ts`, `create_task_modal.test.ts` | partial |
| TASK-012 | Task update persists mutable fields, version snapshot, audit trail | Owner/authorized actor | Update title/assignee/estimated time | Task changed, version snapshot of old values, audit log written | Edited values should render | `app/modules/tasks/tests/backend/integration/update_task.spec.ts` | covered backend, missing E2E |
| TASK-013 | Project-only update avoids unnecessary version snapshot | Authorized actor | Change `project_id` only | Project changes, no version snapshot | Project change should render | `update_task.spec.ts` | covered backend, missing UI |
| TASK-014 | Assign/unassign notification rules are correct | Updater assigns self / unassigns previous assignee | Update assignee | No self notification; previous assignee notified on unassign | Notification surface expected | `update_task.spec.ts` | covered backend, missing UI |
| TASK-015 | Task update rejects invalid assignee and leaves state unchanged | Authorized actor, outsider assignee | Update assignee | Business error, no task/version/audit change | Error state expected | `update_task.spec.ts` | covered backend, missing UI |
| TASK-016 | Task update rejects actor without task field permission | Non-permitted member | Update protected field | Forbidden, task/version/audit unchanged | Error state expected | `update_task.spec.ts` | covered backend, missing UI |
| TASK-017 | Task update rejects wrong current organization context | Valid actor, mismatched session org | Update task | Forbidden, task/version/audit unchanged | Error or redirect expected | `update_task.spec.ts` | covered backend, missing E2E |
| TASK-018 | Project board query enforces task visibility | Project participant or Organization actor entering an accessible Project | Load Project Task Board | Query returns only rows permitted in selected Project/organization context | `/projects/:projectId/tasks` shows the same authorized cards; Organization shell does not render a task list | `app/modules/tasks/tests/backend/integration/list_tasks.spec.ts`, `ListTasksController` | covered backend, partial UI |
| TASK-019 | Pending members do not gain task visibility | Pending org member | List tasks | No task rows from org | Empty/forbidden UI expected | `list_tasks.spec.ts` | covered backend, missing UI |
| TASK-020 | Board filters Project backlog vs active sprint separately | Project tasks in sprint/backlog states | Filter canonical board | Correct filtered rows | One Project board switches view/filter without opening a separate list page | `list_tasks.spec.ts` | covered backend, missing E2E |
| TASK-021 | Legacy task URLs enter the canonical Project board | Session has accessible `current_project_id` | Visit `/tasks` or `/org/tasks*` | Redirect to `/projects/:projectId/tasks`; no legacy list/detail render | Project Kanban visible | `realm_separation_source.spec.ts`, `ListTasksController`, current Org task redirect controllers | covered source/integration |
| TASK-022 | Representative status transitions preserve workflow and legacy mirror | Owner/authorized actor | todo -> in_progress, in_progress -> done_dev, in_testing -> done, in_progress -> cancelled | `task_status_id` updated; legacy `status` category mirrors | Board column should move | `app/modules/tasks/tests/backend/integration/task_status.spec.ts` | covered backend, partial UI |
| TASK-023 | Done transition requiring submission is enforced | Task in testing, submission present | Move to done | Allowed only with valid submission state | Done move should be visible | `task_status.spec.ts`, `docs/01-business/features/task_workflow_and_submission.md` | partial |
| TASK-024 | Status changes record updater and audit trail | Authorized actor | Update status | `updated_by` set, audit log written | Audit tab should show event | `task_status.spec.ts` | covered backend, missing UI |
| TASK-025 | Status notification avoids self-spam and notifies creator for other actor | Creator vs project manager | Update status | Self update emits no notification; manager update notifies creator | Notification UI expected | `task_status.spec.ts` | covered backend, missing UI |
| TASK-026 | Status permission boundaries | Outsider, project manager, org admin without project membership | Update status | Outsider denied; project manager allowed; org admin without project membership denied | UI controls should hide/disable consistently | `task_status.spec.ts` | covered backend, missing UI |
| TASK-027 | Batch status update is atomic | Multiple tasks, one transition conflicts | Batch status change | All tasks roll back on conflict | Board should not partially move cards | `task_status.spec.ts` | covered backend, missing E2E |
| TASK-028 | Batch status update publishes domain events | Authorized actor | Batch status change | Status-changed event emitted with task/user/status payload | Realtime/notification consumers expected | `task_status.spec.ts` | covered backend, missing consumer UI |
| TASK-029 | Project Task Board dialogs open, close, submit, and resist UI crashes | User on canonical Project board | Dialog interactions | Status API mocked/seeded by test helper | Dialog behavior visible on the same board, no console crash | `inertia/apps/user/tests/e2e/tasks/dialog_reactivity_matrix.spec.ts` | partial, not workflow proof |
| TASK-030 | Board view pagination renders | Task board slice | Load component | API data shape accepted | Pagination controls render inside the board view | `inertia/apps/*/tests/modules/tasks/status_board.test.ts` | partial |
| TASK-031 | Retired status-board POC stays absent | Any authenticated client | Request `/tasks/status-board`, `PATCH /api/tasks/board-state` or `PATCH /api/v1/tasks/board-state` | Route/controller remains absent; no parallel board engine is revived | Canonical Project Task Board remains the only task-delivery UI | `task_status_board_retirement.spec.ts`, `retired_status_board_routes.spec.ts` | covered unit/integration |
| TASK-032 | Sort order/status drag behavior respects done-with-review guard | Done task with review | Drag/reorder/change status | Done+review task cannot move backward | Card should stay put with error | `docs/01-business/features/task_workflow_and_submission.md`, `app/modules/tasks/tests/backend/integration/task_sort_order.spec.ts` | partial |
| TASK-033 | Submission API show/save/lock/evidence contract is stable | Assignee/reviewer contexts | `/api/tasks/:taskId/submission`, `/api/task-submissions/:id/evidences` | Wrapped nullable/data collection contract, no success envelope drift | UI form can consume same shape | `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts` | covered contract |
| TASK-034 | Canonical `/api/v1` submission routes preserve legacy camelCase contract | API client | `/api/v1/tasks/:taskId/submission`, evidence routes | CamelCase wrapped contract preserved | Frontend can migrate safely | `task_submission_api_standardization.contract.spec.ts` | covered contract |
| TASK-035 | Task comments API accepts camelCase and paginates root threads | Member/commenter | Create/list comments/replies | Wrapped camelCase collection; root threads paginated; replies with parent | Discussion tab can render threads | `task_submission_api_standardization.contract.spec.ts`, `task_discussion_tab.test.ts` | covered contract, partial UI |
| TASK-036 | Review-note comments mark review relevance | Approved member | Comment with review-note intent | Comment saved with review relevance | Review UI can show relevance | `task_submission_api_standardization.contract.spec.ts` | covered contract, missing E2E |
| TASK-037 | Editing comment notifies only new mentions | Comment author edits mentions | Patch comment | Newly mentioned users notified, existing mentions not spammed | Notification UI expected | `task_submission_api_standardization.contract.spec.ts` | covered contract, missing UI |
| TASK-038 | Submission submit creates review session and reviewer notifications | Assignee with package | Submit package | Review session created; reviewers notified; creator-required fallback handled | Submit success and review zone expected | `task_submission_api_standardization.contract.spec.ts`, `task_review_zone_card.test.ts` | covered contract, partial UI |
| TASK-039 | Task attachments API contract is stable | Member with attachment payload | Create/list/delete attachments | Wrapped camelCase collection | Files tab can render pagination | `task_submission_api_standardization.contract.spec.ts`, `task_files_tab.test.ts` | covered contract, partial UI |
| TASK-040 | Assignee can save draft submission in real page | Seeded task, assignee session | Fill summary, click save draft | Draft saved | Success toast visible | `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts` | covered E2E |
| TASK-041 | Outsider cannot edit submission fields | Seeded task, outsider session | Open submission tab | No edit permission | No summary field; empty/read-only state visible | `task_submission_package.spec.ts` | covered E2E |
| TASK-042 | Locked submission is read-only after submit/lock | Seeded task, assignee session | Submit then lock | Submission locked | Locked label visible, edit field gone | `task_submission_package.spec.ts` | covered E2E |
| TASK-043 | Invalid task id fails gracefully | Authenticated actor | Visit nonexistent UUID task detail | Not found, no leaked row error/500 | `/errors/not-found`, friendly copy | `task_submission_package.spec.ts` | covered E2E |
| TASK-044 | Task detail public marketplace access follows application state | Unaffiliated marketplace viewer/project manager | Open task detail | Application state and review permission derive from `task_applications` | Public viewer kept out of work tabs; review CTA visible when permitted | `task_detail_marketplace_access.spec.ts`, `task_show_apply.test.ts` | covered backend, partial UI |
| TASK-045 | Component task detail consumes API shape | Task detail modal | Hydrate detail | API detail shape parsed | Discussion/work/submission/files panels render | `task_detail_api.test.ts`, `task_detail_panel.test.ts`, `task_execution_brief.test.ts` | partial |

## Strong Coverage

- Create/update/status backend tests assert persistence, rollback, audit, permission, and notification side effects.
- Submission/comment/attachment contracts are broad and include compatibility plus canonical `/api/v1` surfaces.
- Submission package E2E uses seeded data and concrete actor states. This is the stronger E2E pattern to copy.

## Weak Coverage

- Task create E2E mostly proves the form does not crash and validation keeps the user on the page. It does not prove a successful persisted task lifecycle from UI.
- Status board E2E proves dialog reactivity and crash resistance, not workflow permission, ordering, persisted board state, or exact column movement.
- List/query visibility is strong in backend tests; canonical UI proof should be evaluated only on the Project Kanban, not retired Org list pages.
- Many component tests use hand-built props. They are useful for rendering regressions but should not be counted as backend/frontend contract proof unless paired with contract fixtures.

## Next Tests To Add

1. Seeded UI create task success path: create from the modal on `/projects/:projectId/tasks`, assert the exact card, and verify DB/API status id.
2. Seeded UI status transition path: move exact task between statuses, assert `task_status_id` through API and card column in UI.
3. Legacy redirect regression: set current project, visit `/tasks` and `/org/tasks*`, assert canonical Project board and no legacy render.
4. Retired-board regression: assert `/tasks/status-board` and both `board-state` patch aliases remain absent while status/sort-order/batch mutations continue through the canonical Project board.
5. Contract-fixture component bridge: feed `task_submission_api_standardization` response examples into `TaskSubmissionPanel`, discussion tab, files tab, and task detail panel tests.
