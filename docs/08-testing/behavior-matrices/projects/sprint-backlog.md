# Project Sprint And Backlog Context Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Projects |
| L1 Large Flow | Sprint/backlog context |
| Last Reviewed | 2026-07-28 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projects | Sprint/backlog context | Current project filter | PRJ-SP-SC01 project context filters project pages | PRJ-SP-TC001 | Project member | Current project selected | Active project | valid context | Current project id | Open project task/sprint page | Rows scoped to project | No write | Scope label/filter accurate | None | covered | N/A | covered | partial | `app/modules/sprints/tests/backend/integration/get_sprint_board_query.spec.ts` covers selected-project sprint/backlog rows and excludes foreign project tasks; `inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts` covers Sprint Backlog label and rows; `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts` covers project page sprint backlog visibility but not browser-level foreign exclusion | partial | partial |
| Projects | Sprint/backlog context | Legacy Org entry | PRJ-SP-SC02 Org task URL exits to selected Project | PRJ-SP-TC002 | User with accessible current Project | Current project selected | Multiple projects exist | compatibility URL | `/org/tasks`, `/org/tasks/board` or `/org/tasks/list` | Open old Org task URL | Redirect to `/projects/:projectId/tasks` | No write | Selected Project Kanban renders; no org-wide task list and no foreign-project cards | None | covered | N/A | covered | N/A | `realm_separation_source.spec.ts`, current Organization task redirect controllers | covered | covered |
| Projects | Sprint/backlog context | Sprint assignment | PRJ-SP-SC03 assign task to sprint | PRJ-SP-TC003 | Project manager | Active sprint and task | Backlog task | valid relation | Sprint id | Assign task to sprint | Success | Task sprint relation set | Sprint board shows task | Audit if required | covered | N/A | N/A | covered | `app/modules/sprints/tests/backend/integration/move_task_to_sprint_command.spec.ts`; `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts` | covered | covered |
| Projects | Sprint/backlog context | Cross-project sprint | PRJ-SP-SC04 foreign sprint denied | PRJ-SP-TC004 | Project manager | Task in project A, sprint in B | Foreign sprint | foreign resource | Sprint id from other project | Assign task to sprint | Reject | Task unchanged | Error shown | None | covered | N/A | N/A | covered | `app/modules/sprints/tests/backend/integration/move_task_to_sprint_command.spec.ts`; `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts` | covered | covered |
