# Project Membership Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Projects |
| L1 Large Flow | Project membership |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projects | Project membership | Add member | PRJ-MEM-SC01 add approved org member | PRJ-MEM-TC001 | Project manager/org admin per rule | Target approved org member | Active project | valid target | Member id | Add project member | Success | Project membership created | Member appears in project staffing | Notification/audit if required | partial | N/A | N/A | partial | `app/modules/projects/tests/backend/integration/project_members.spec.ts`, `app/modules/projects/tests/backend/integration/project_member_management_http.spec.ts`, `inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts`; audit/notification assertion remains partial. | partial | partial |
| Projects | Project membership | Add member | PRJ-MEM-SC02 add non-org member denied | PRJ-MEM-TC002 | Authorized actor | Target outside org | Active project | foreign target | User id outside org | Add project member | Reject | No project membership | Error shown | None | covered | N/A | partial | N/A | `project_members.spec.ts` | partial | partial |
| Projects | Project membership | Add member | PRJ-MEM-SC03 duplicate member | PRJ-MEM-TC003 | Authorized actor | Target already project member | Active project | duplicate | Existing member id | Add project member | Conflict/idempotent per rule | One membership row | Stable member row | No duplicate notification unless defined | covered | N/A | N/A | N/A | `project_members.spec.ts` | covered | covered |
| Projects | Project membership | Update member | PRJ-MEM-SC04 update role/allocation | PRJ-MEM-TC004 | Project manager/org admin per rule | Project member exists | Active project | valid update | Role/allocation fields | Update project member | Success | Membership fields updated | Row updates | Audit if required | partial | N/A | partial | N/A | `app/modules/projects/tests/backend/integration/project_members.spec.ts`, `app/modules/projects/tests/backend/integration/project_member_management_http.spec.ts`, `inertia/apps/org/tests/modules/projects/project_member_card.test.ts`; no exact audit assertion. | partial | partial |
| Projects | Project membership | Remove member | PRJ-MEM-SC05 remove member | PRJ-MEM-TC005 | Authorized actor | Project member exists | Active project | valid removal | Member id | Remove project member | Success | Membership removed; task assignment policy applied | Member removed | Audit/notification | partial | N/A | N/A | partial | `app/modules/projects/tests/backend/integration/project_members.spec.ts`, `app/modules/projects/tests/backend/integration/project_member_management_http.spec.ts`, `inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts`; Playwright covers add/list, not exact remove flow. | partial | partial |
| Projects | Project membership | Permission boundary | PRJ-MEM-SC06 plain member denied | PRJ-MEM-TC006 | Plain project member | Project member exists | Active project | forbidden actor | Add/update/remove | Mutate member | Forbidden | Membership unchanged | Controls hidden/error | None | covered | N/A | N/A | partial | `project_members.spec.ts`, `project_member_management_http.spec.ts` | partial | partial |
