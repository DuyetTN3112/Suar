# Task Comments And Attachments Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Tasks |
| L1 Large Flows | Comments, attachments |
| Source evidence | `../task-lifecycle-status-submission.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tasks | Comments | Root comment | TASK-CA-SC01 valid root comment | TASK-CA-TC001 | Approved member | Task accessible | Active task | valid text | Comment body | Create comment | Wrapped camelCase success | Root comment row | Comment visible | Mention notifications if any | N/A | covered | covered | N/A | `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts`, `inertia/apps/user/tests/modules/tasks/components/task_discussion_tab.test.ts` | partial | partial |
| Tasks | Comments | Reply | TASK-CA-SC02 valid reply | TASK-CA-TC002 | Approved member | Root comment exists | Active task | valid text | Reply body | Create reply | Wrapped camelCase success | Reply row with parent | Thread renders | Mention notifications if any | N/A | covered | partial | N/A | `task_submission_api_standardization.contract.spec.ts` | partial | partial |
| Tasks | Comments | Review note | TASK-CA-SC03 review-relevant note | TASK-CA-TC003 | Approved member/reviewer | Task under review | Active review context | valid intent | Review-note comment | Create comment | Success | Comment marked review relevant | Review UI can show relevance | Audit if required | N/A | covered | partial | N/A | `task_submission_api_standardization.contract.spec.ts` | partial | partial |
| Tasks | Comments | Mention edit | TASK-CA-SC04 newly mentioned only | TASK-CA-TC004 | Comment author | Existing comment with mentions | Active task | edit with mentions | Add one new mention | Edit comment | Success | Comment updated | Updated comment visible | Only new mention notified | N/A | covered | N/A | N/A | `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts` | partial | partial |
| Tasks | Comments | Unauthorized comment | TASK-CA-SC05 outsider denied | TASK-CA-TC005 | Outsider | Task exists | Active task | unauthorized actor | Comment body | Create comment | Forbidden/not found | No comment row | No discussion access | None | covered | N/A | N/A | partial | `app/modules/tasks/tests/backend/integration/task_comments_access.spec.ts`, `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts` | partial | partial |
| Tasks | Attachments | Add attachment | TASK-CA-SC06 valid attachment | TASK-CA-TC006 | Approved member | Task accessible | Active task | valid attachment | Allowed file/link | Create attachment | Wrapped camelCase success | Attachment row | File tab shows attachment | Audit if required | N/A | covered | covered | N/A | `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts`, `inertia/apps/user/tests/modules/tasks/components/task_files_tab.test.ts` | partial | partial |
| Tasks | Attachments | Attachment validation | TASK-CA-SC07 bad type/size | TASK-CA-TC007 | Approved member | Task accessible | Active task | invalid file | Negative size or invalid attachment type | Create attachment | Validation error | No attachment row | Field/error state | None | covered | N/A | partial | partial | `app/modules/tasks/tests/backend/integration/task_attachments_validation.spec.ts` | partial | partial |
| Tasks | Attachments | Delete attachment | TASK-CA-SC08 owner deletes | TASK-CA-TC008 | Attachment owner/admin per rule | Attachment exists | Active task | valid delete | Attachment id | Delete attachment | Success | Attachment removed/soft deleted | Attachment gone | Audit if required | N/A | covered | partial | N/A | `task_submission_api_standardization.contract.spec.ts` | partial | partial |
