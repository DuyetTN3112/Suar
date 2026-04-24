# Task List And Access Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Tasks |
| L1 Large Flow | List/access task |
| Source evidence | `../task-lifecycle-status-submission.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tasks | List/access task | Org admin list | TASK-LA-SC01 org admin sees org tasks | TASK-LA-TC001 | Org admin/owner | Approved org | Org tasks exist | valid list | Org scope | List tasks | Org-scoped rows returned | No write | Exact org tasks visible | None | covered | N/A | N/A | partial | `list_tasks.spec.ts` | partial | partial |
| Tasks | List/access task | Member list | TASK-LA-SC02 member sees own/assigned tasks | TASK-LA-TC002 | Org member | Approved org | Own/assigned tasks exist | permission-filtered list | Member scope | List tasks | Own/assigned rows only | No write | Exact allowed rows visible | None | covered | N/A | N/A | partial | `list_tasks.spec.ts` | partial | partial |
| Tasks | List/access task | Pending member | TASK-LA-SC03 pending member denied | TASK-LA-TC003 | Pending member | Pending membership | Org tasks exist | forbidden state | Org task list | List tasks | No task rows/forbidden | No write | Empty/denied state | None | covered | N/A | N/A | partial | `list_tasks.spec.ts` | partial | partial |
| Tasks | List/access task | Project/backlog filter | TASK-LA-SC04 backlog vs sprint filter | TASK-LA-TC004 | Approved member | Tasks in sprint/backlog | Mixed task states | valid filter | Backlog/sprint filters | List tasks | Correct filtered rows | No write | Exact filter result | None | covered | N/A | N/A | partial | `list_tasks.spec.ts` | partial | partial |
| Tasks | List/access task | Current project context | TASK-LA-SC05 current project implicit filter | TASK-LA-TC005 | Approved member | Session has `current_project_id` | Org has multiple project tasks | context-sensitive filter | Org-wide task list | Open `/org/tasks/list?scope=organization` | Explicit org-wide scope avoids hidden filtering | No write | Exact task titles from current project and another project both render | None | N/A | N/A | N/A | covered | `inertia/apps/org/tests/e2e/tasks/org_task_scope_journey.spec.ts` | covered | covered |
| Tasks | List/access task | Task detail | TASK-LA-SC06 authorized detail | TASK-LA-TC006 | Allowed actor | Task exists | Active task | valid resource | Task id | Open task detail | Detail returned | No write | Detail panels render | None | partial | N/A | partial | partial | `app/modules/tasks/tests/backend/contract/task_detail.contract.spec.ts`, `app/modules/tasks/tests/backend/integration/task_detail_marketplace_access.spec.ts`, `inertia/apps/org/tests/modules/tasks/task_detail_api.test.ts`, `inertia/apps/org/tests/modules/tasks/components/task_detail_panel.test.ts`, `inertia/apps/org/tests/modules/tasks/task_show_apply.test.ts`; E2E remains partial for full authorized detail panel coverage. | partial | partial |
| Tasks | List/access task | Task detail | TASK-LA-SC07 invalid id | TASK-LA-TC007 | Authenticated actor | No task | Missing resource | invalid resource | Nonexistent UUID | Open task detail | Not found | No write | Friendly not-found | None | N/A | N/A | N/A | covered | `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts` | covered | covered |
| Tasks | List/access task | Task detail | TASK-LA-SC08 foreign/private task denied | TASK-LA-TC008 | Unauthorized actor | Task in foreign org/private task | Foreign/private task | unauthorized resource | Task id | Open detail/API | Forbidden/not found | No data leak | Denied/not-found state | None | covered | N/A | N/A | partial | `app/modules/tasks/tests/backend/integration/task_detail_marketplace_access.spec.ts` | partial | partial |
