# Reverse Review Read Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Reviews |
| L1 Large Flow | Reverse review read |
| Source evidence | `../review-dispute-governance.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reviews | Reverse review read | Me scope | REV-RR-SC01 own reverse reviews | REV-RR-TC001 | Review author/target per product rule | Reverse reviews exist | Own reviews | valid scope | Me scope | List reverse reviews | Own detail returned | No write | Own reverse reviews visible | None | covered | N/A | partial | N/A | `reverse_review_reads.spec.ts` | partial | partial |
| Reviews | Reverse review read | Org scope | REV-RR-SC02 org admin reads masked reviews | REV-RR-TC002 | Org owner/admin | Org reverse reviews exist | Org reviews | authorized scope | Org scope | List org reverse reviews | Rows returned with identity masking per rule | No write | Anonymous/friendly labels, no raw identity leak | None | covered | N/A | N/A | partial | `app/modules/reviews/tests/backend/integration/reverse_review_access.spec.ts`, `inertia/apps/org/tests/e2e/reviews/reverse_review_access.spec.ts` | partial | partial |
| Reviews | Reverse review read | Org scope | REV-RR-SC03 plain member denied org scope | REV-RR-TC003 | Plain member | Org reviews exist | Org reviews | forbidden actor | Org scope | List org reverse reviews | Forbidden | No data leak | No org reverse-review page data | None | covered | N/A | N/A | partial | `app/modules/reviews/tests/backend/integration/reverse_review_access.spec.ts` | partial | partial |
| Reviews | Reverse review read | Admin scope | REV-RR-SC04 system admin reads identity | REV-RR-TC004 | System admin | Reverse reviews exist | Reviews | authorized admin scope | Admin scope | List admin reverse reviews | Rows include admin-visible identity | No write | Admin page shows identity | None | covered | N/A | N/A | partial | `app/modules/reviews/tests/backend/integration/reverse_review_access.spec.ts`, `inertia/apps/org/tests/e2e/reviews/reverse_review_access.spec.ts` | partial | partial |
| Reviews | Reverse review read | Deprecated create | REV-RR-SC05 task-level create rejected | REV-RR-TC005 | Any actor | Deprecated path available | N/A | deprecated action | Task-level reverse review create | Submit old create | Reject by design | No reverse review row | Product-direction message | None | N/A | partial | covered | N/A | `submit_reverse_review_controller.spec.ts`, `review_show_page.test.ts` | partial | partial |
