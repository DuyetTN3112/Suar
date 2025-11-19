# Admin Authorization Boundary Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Admin |
| L1 Large Flow | Authorization boundary |
| Source evidence | `../admin-audit-moderation.md` |
| Last Reviewed | 2026-07-14 |

## Tree

```text
ADM-L01 Authorization boundary
├── ADM-S01 Admin shell route guard
├── ADM-S02 Admin API route guard
├── ADM-S03 Organization admin is not system admin
└── ADM-S04 Admin mode/session context
```

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin | Authorization boundary | Admin shell route guard | ADM-AUTH-SC01 superadmin shell access | ADM-AUTH-TC001 | Superadmin/system admin | Valid session | Active account | authorized role | `/admin` route | Visit admin shell | Route allowed | No write | Admin shell visible | None | partial | N/A | N/A | partial | `start/routes/admin.ts`, `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts`; no dedicated `/admin` shell-only testcase. | partial | partial |
| Admin | Authorization boundary | Admin shell route guard | ADM-AUTH-SC02 normal user denied | ADM-AUTH-TC002 | Normal user | Valid session | Active account | unauthorized role | `/admin` route | Visit admin shell | Forbidden/redirect | No write | Admin shell not visible | None | covered | N/A | N/A | covered | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin shell route guard | ADM-AUTH-SC03 guest denied | ADM-AUTH-TC003 | Guest | No session | N/A | missing auth | `/admin` route | Visit admin shell | Redirect/login/unauthorized | No write | Login/unauthorized state | None | N/A | N/A | N/A | covered | `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` | covered | covered |
| Admin | Authorization boundary | Org admin distinction | ADM-AUTH-SC04 org owner denied system admin | ADM-AUTH-TC004 | Organization owner/admin | Approved org admin role, no system role | Active org membership | wrong authority type | `/admin` route | Visit admin shell | Forbidden/redirect | No write | Org admin cannot see system admin shell | None | covered | N/A | N/A | covered | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin API route guard | ADM-AUTH-SC05 system admin API allowed | ADM-AUTH-TC005 | System admin | Valid session/token | Active account | authorized role | `/api/admin/dashboard` | Request admin API | Wrapped data response | No write for read endpoint | Dashboard can consume | None | covered | N/A | partial | N/A | `admin_read_api_standardization.spec.ts` | partial | partial |
| Admin | Authorization boundary | Admin API route guard | ADM-AUTH-SC06 normal user API denied | ADM-AUTH-TC006 | Normal user | Valid session/token | Active account | unauthorized role | `/api/admin/dashboard` | Request admin API | Forbidden/unauthorized | No data leak | Error/redirect state | None | covered | N/A | N/A | N/A | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin API route guard | ADM-AUTH-SC07 guest API denied | ADM-AUTH-TC007 | Guest | No session/token | N/A | missing auth | `/api/admin/dashboard` | Request admin API | Unauthorized | No data leak | N/A | None | covered | N/A | N/A | N/A | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin mode/session context | ADM-AUTH-SC08 toggle admin mode valid | ADM-AUTH-TC008 | System admin | Valid session | Active account | valid toggle | Enable/disable admin mode | Toggle admin mode | Redirect to resolved shell | Command returns enabled flag and shell redirect; controller writes session flag | Admin/org/task shell target chosen by org context | Flash success; no audit event asserted | partial | N/A | N/A | N/A | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `app/modules/admin/controllers/toggle_admin_mode_controller.ts` | partial | partial |
| Admin | Authorization boundary | Admin mode/session context | ADM-AUTH-SC09 non-admin cannot toggle admin mode | ADM-AUTH-TC009 | Normal user/org admin | Valid session | Active account | unauthorized role | Toggle admin mode | Toggle admin mode | Forbidden | Session unchanged | No admin mode | None | covered | N/A | N/A | missing | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | partial | partial |

## Notes

- Organization admin permission is not system admin permission.
- API envelope assertions belong in `../../technical-contract-matrices/api-contracts.md`; this file only counts access-boundary cases.
