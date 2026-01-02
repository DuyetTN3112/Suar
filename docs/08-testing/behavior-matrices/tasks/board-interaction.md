# Task Board Interaction Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Tasks |
| L1 Large Flow | Board interaction |
| Source evidence | `../task-lifecycle-status-submission.md` |
| Last Reviewed | 2026-07-28 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tasks | Board interaction | Dialog behavior | TASK-BD-SC01 status dialog opens/closes | TASK-BD-TC001 | Board user | Board loaded | Task card visible | valid UI action | Open/close dialog | Click card/status action | No required backend write | No write | Dialog opens/closes without crash | None | N/A | N/A | partial | partial | `dialog_reactivity_matrix.spec.ts` | partial | partial |
| Tasks | Board interaction | Dialog submit | TASK-BD-SC02 dialog submit valid change | TASK-BD-TC002 | Authorized actor | Task transition allowed | Active task | valid transition | Status change | Submit dialog | Success | Status changes | Card moves column | Audit/event | covered | N/A | N/A | missing | `app/modules/tasks/tests/backend/integration/task_sort_order.spec.ts` covers allowed status/sort change and status-changed event; existing dialog E2E covers status-definition dialogs, not task-card submit/card move | partial | partial |
| Tasks | Board interaction | Pagination | TASK-BD-SC03 board pagination renders | TASK-BD-TC003 | Board user | Multiple tasks/pages | Board data | valid page | Page/cursor | Change page | Page data returned | No write | Pagination stable | None | N/A | N/A | covered | partial | `inertia/apps/user/tests/modules/tasks/status_board.test.ts`, `inertia/apps/org/tests/modules/tasks/status_board.test.ts` | partial | partial |
| Tasks | Board interaction | Retired POC boundary | TASK-BD-SC04 board-state POC stays absent | TASK-BD-TC004 | Legacy client | Canonical Project board is active | No POC route/controller | retired request | `PATCH /api/tasks/board-state` or `/api/v1/tasks/board-state` | Send legacy patch | 404 | No write | Canonical board remains; UI must not call retired endpoint | None | covered | N/A | N/A | N/A | `app/modules/tasks/tests/backend/unit/task_status_board_retirement.spec.ts`, `app/modules/tasks/tests/backend/integration/retired_status_board_routes.spec.ts` | strong | covered |
| Tasks | Board interaction | Sort guard | TASK-BD-SC05 done-with-review cannot move backward | TASK-BD-TC005 | Authorized actor | Done task has review | Done/reviewed task | forbidden transition | Drag done reviewed card | Drag/reorder | Reject | Sort/status unchanged | Card stays, error shown | None | covered | N/A | N/A | missing | `app/modules/tasks/tests/backend/integration/task_sort_order.spec.ts` covers reject, unchanged sort/status, and no status event for done reviewed drag; no Playwright proof for card rollback/error yet | partial | partial |
