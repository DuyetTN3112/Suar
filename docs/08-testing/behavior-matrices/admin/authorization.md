# Admin Authorization Boundary Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Admin |
| L1 Large Flow | Authorization boundary |
| Source evidence | `../admin-audit-moderation.md` |
| Last Reviewed | 2026-07-28 |

## Tree

```text
ADM-L01 Authorization boundary
├── ADM-S01 Admin shell route guard
├── ADM-S02 Admin API route guard
├── ADM-S03 Organization admin is not system admin
└── ADM-S04 Isolated System application context; physical identity/session migration
```

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Admin | Authorization boundary | Admin shell route guard | ADM-AUTH-SC01 authorized System context | ADM-AUTH-TC001 | System Administration actor | Valid current compatibility session | Active shared auth record; physical-separation debt | authorized System classification | `/admin` route | Visit admin shell | Route allowed through `requireSystemAdmin` | No write | Isolated Admin shell visible; no Org/Project switcher | None | partial | N/A | N/A | partial | `start/routes/admin.ts`, `realm_separation_source.spec.ts`, `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts`; no dedicated `/admin` shell-only testcase. | partial until independent System identity/session exists | partial |
| Admin | Authorization boundary | Admin shell route guard | ADM-AUTH-SC02 normal user denied | ADM-AUTH-TC002 | Normal user | Valid session | Active account | unauthorized role | `/admin` route | Visit admin shell | Forbidden/redirect | No write | Admin shell not visible | None | covered | N/A | N/A | covered | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin shell route guard | ADM-AUTH-SC03 guest denied | ADM-AUTH-TC003 | Guest | No session | N/A | missing auth | `/admin` route | Visit admin shell | Redirect/login/unauthorized | No write | Login/unauthorized state | None | N/A | N/A | N/A | covered | `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` | covered | covered |
| Admin | Authorization boundary | Org admin distinction | ADM-AUTH-SC04 org owner denied System access | ADM-AUTH-TC004 | Organization owner/admin | Approved org admin role, no System-principal authorization | Active org membership | wrong authority type | `/admin` route | Visit admin shell | Forbidden/redirect | No write | Org admin cannot see System Admin shell | None | covered | N/A | N/A | covered | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`, `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin API route guard | ADM-AUTH-SC05 system admin API allowed | ADM-AUTH-TC005 | System admin | Valid session/token | Active account | authorized role | `/api/admin/dashboard` | Request admin API | Wrapped data response | No write for read endpoint | Dashboard can consume | None | covered | N/A | partial | N/A | `admin_read_api_standardization.spec.ts` | partial | partial |
| Admin | Authorization boundary | Admin API route guard | ADM-AUTH-SC06 normal user API denied | ADM-AUTH-TC006 | Normal user | Valid session/token | Active account | unauthorized role | `/api/admin/dashboard` | Request admin API | Forbidden/unauthorized | No data leak | Error/redirect state | None | covered | N/A | N/A | N/A | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | covered | covered |
| Admin | Authorization boundary | Admin API route guard | ADM-AUTH-SC07 guest API denied | ADM-AUTH-TC007 | Guest | No session/token | N/A | missing auth | `/api/admin/dashboard` | Request admin API | Unauthorized | No data leak | N/A | None | covered | N/A | N/A | N/A | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | covered | covered |
| Admin | Authorization boundary | Realm isolation | ADM-AUTH-SC08 admin toggle route absent | ADM-AUTH-TC008 | System Administration actor | Valid System application context | Current compatibility auth record | retired route | `/admin/toggle` | Request retired bridge | Not found | No session mode is created | Admin stays in isolated System shell | None | covered | N/A | N/A | N/A | route-list assertion and `app/modules/http/tests/backend/unit/inertia_middleware.spec.ts` | covered | covered |
| Admin | Authorization boundary | Realm isolation | ADM-AUTH-SC09 user workspace has no Admin switch | ADM-AUTH-TC009 | User/organization admin | Valid User session | Active User account | absent capability | Open workspace switcher | Inspect available workspaces | No Admin target | Session unchanged | Personal/Org/Project only | None | covered | N/A | covered | missing | `inertia/apps/org/tests/shared/navigation_helpers.test.ts`, `app/modules/http/tests/backend/unit/inertia_middleware.spec.ts` | covered | covered |

## Notes

- Target/product model: System Admin and User are different principals/realms; Organization permission is evaluated only inside the User realm.
- Current route/UI/policy isolation is covered, but `auth.user`/`users.system_role` still share the physical transport. That coupling is migration debt and must not be counted as a combined role stack.
- API envelope assertions belong in `../../technical-contract-matrices/api-contracts.md`; this file only counts access-boundary cases.
