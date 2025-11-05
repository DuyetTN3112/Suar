# Project Create And Update Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Projects |
| L1 Large Flow | Project create/update |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Projects | Project create/update | Create project | PRJ-CU-SC01 valid project | PRJ-CU-TC001 | Org owner/admin/project creator per rule | Approved org | Org active | valid payload | Name, description, status | Create project | Success | Project row created in current org | Project appears in list/detail | Audit if required | partial | N/A | N/A | partial | `app/modules/projects/tests/backend/integration/create_project.spec.ts`, `app/modules/projects/tests/backend/integration/project_create_staffing_http.spec.ts`, `inertia/apps/org/tests/e2e/projects/debug_create.spec.ts`; E2E evidence is partial and not a full create/list/detail/audit assertion. | partial | partial |
| Projects | Project create/update | Create project | PRJ-CU-SC02 missing name | PRJ-CU-TC002 | Authorized actor | Approved org | Org active | missing required | Empty name | Create project | Validation error | No project row | Field error | None | covered | N/A | partial | N/A | `project_controller_mappers.spec.ts` | partial | partial |
| Projects | Project create/update | Create project | PRJ-CU-SC03 duplicate or same name | PRJ-CU-TC003 | Authorized actor | Existing project | Org active | duplicate | Same project name | Create project | Allows duplicate names as distinct projects | Two project rows with distinct IDs | Exact result visible | None | covered | N/A | N/A | N/A | `create_project.spec.ts` | covered | covered |
| Projects | Project create/update | Create project | PRJ-CU-SC04 unauthorized member | PRJ-CU-TC004 | Member without create permission | Approved org | Org active | forbidden actor | Valid payload | Create project | Forbidden | No project row | Control hidden/error | None | covered | N/A | N/A | partial | `project_permission_policy.spec.ts` partial | partial | partial |
| Projects | Project create/update | Update project | PRJ-CU-SC05 valid update | PRJ-CU-TC005 | Authorized actor | Existing project | Active project | valid payload | Name/status/details | Update project | Success | Project updated | Detail/list show new values | Audit/version if required | partial | N/A | N/A | partial | `app/modules/projects/tests/backend/contract/project_api_standardization.contract.spec.ts`, `app/modules/projects/tests/backend/unit/project_permission_policy.spec.ts`; no exact integration/E2E proof for visible post-update values. | partial | partial |
| Projects | Project create/update | Update project | PRJ-CU-SC06 foreign org update denied | PRJ-CU-TC006 | Org A actor | Project in org B | Foreign project | foreign resource | Foreign project id | Update project | Forbidden/not found | Project unchanged | No foreign project access | None | partial | N/A | N/A | partial | `app/modules/projects/tests/backend/unit/project_permission_policy.spec.ts`, `app/modules/projects/tests/backend/integration/project_members.spec.ts`; no exact update-project foreign-org integration or E2E proof. | partial | partial |
| Projects | Project create/update | Update project | PRJ-CU-SC07 invalid status enum | PRJ-CU-TC007 | Authorized actor | Existing project | Active project | invalid enum | Legacy/fake status | Update project | Validation error | Status unchanged | Field error | None | N/A | N/A | N/A | covered | `inertia/apps/org/tests/e2e/projects/project_status_enum_matrix.spec.ts` | covered | covered |
