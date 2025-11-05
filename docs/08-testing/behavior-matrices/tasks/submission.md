# Task Submission Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Tasks |
| L1 Large Flow | Submission |
| Source evidence | `../task-lifecycle-status-submission.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tasks | Submission | Save draft | TASK-SUB-SC01 assignee saves draft | TASK-SUB-TC001 | Assignee | Assigned task | Submission unlocked | valid draft | Summary/evidence text | Save draft | Success | Draft saved | Success toast, draft values persist | None | N/A | partial | N/A | covered | `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts` | partial | partial |
| Tasks | Submission | Save draft | TASK-SUB-SC02 outsider cannot edit | TASK-SUB-TC002 | Outsider | Task exists | Submission unlocked | unauthorized actor | Draft payload | Save draft/open tab | Forbidden/read-only | Submission unchanged | No edit field | None | N/A | partial | N/A | covered | `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts` | partial | partial |
| Tasks | Submission | Submit package | TASK-SUB-SC03 valid submit | TASK-SUB-TC003 | Assignee | Draft exists | Submission unlocked | valid submit | Complete package | Submit | Success | Submission submitted; review session created | Review zone visible/locked as rule | Reviewer notifications | N/A | covered | covered | partial | `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts`, `inertia/apps/user/tests/modules/tasks/components/task_review_zone_card.test.ts` | partial | partial |
| Tasks | Submission | Submit package | TASK-SUB-SC04 duplicate submit | TASK-SUB-TC004 | Assignee | Already submitted | Locked/submitted | duplicate state | Submit again | Submit | Reject/idempotent per rule | No duplicate review session | Submit disabled/stable state | No duplicate notifications | covered | N/A | N/A | partial | `app/modules/tasks/tests/backend/integration/task_submission_duplicate.spec.ts` | partial | partial |
| Tasks | Submission | Lock/read-only | TASK-SUB-SC05 locked submission read-only | TASK-SUB-TC005 | Assignee | Submitted/locked | Locked submission | locked state | Edit attempt | Open/edit | Reject/no edit | Submission unchanged | Locked label, field gone | None | N/A | N/A | N/A | covered | `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts` | covered | covered |
| Tasks | Submission | Evidence | TASK-SUB-SC06 valid evidence add | TASK-SUB-TC006 | Assignee/reviewer per rule | Submission exists | Unlocked or evidence-allowed | valid evidence | Link/file/text evidence | Add evidence | Wrapped camelCase success | Evidence row created | Evidence visible | Audit if required | N/A | covered | partial | N/A | `task_submission_api_standardization.contract.spec.ts` | partial | partial |
| Tasks | Submission | Evidence | TASK-SUB-SC07 invalid evidence URL/type | TASK-SUB-TC007 | Assignee | Submission exists | Unlocked | malformed evidence | Bad URL/file type | Add evidence | Validation error | No evidence row | Field error | None | covered | N/A | partial | partial | `app/modules/tasks/tests/backend/integration/task_submission_duplicate.spec.ts` | partial | partial |
