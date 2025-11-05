# Auth Session And Refresh Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Auth |
| L1 Large Flows | Token refresh, session authorization |
| Source evidence | `../auth-login-session.md` |
| Last Reviewed | 2026-07-15 |

## Tree

```text
AUTH-L02 Token refresh
├── AUTH-S05 Refresh same organization
├── AUTH-S06 Refresh and switch organization
├── AUTH-S07 Refresh replay/race/expiry
└── AUTH-S08 Refresh error contract

AUTH-L04 Session authorization
├── AUTH-S09 Bearer/session bridge
└── AUTH-S10 Suspended/deleted access denial
```

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | Token refresh | Same org rotation | AUTH-RF-SC01 valid token | AUTH-RF-TC001 | API caller | Active refresh token | Approved primary org | valid | Primary org | `POST /api/auth/refresh` | New access/refresh pair | Old refresh revoked | API client remains authenticated | Token rotation | covered | N/A | N/A | N/A | `testing_auth_tokens.spec.ts` | covered | covered |
| Auth | Token refresh | Organization switch | AUTH-RF-SC02 approved secondary org | AUTH-RF-TC002 | API caller | Active refresh token | Approved secondary org | valid org switch | Secondary org ID | `POST /api/auth/refresh` | New pair bound to secondary org | Current org/token claim changes | E2E helper can bootstrap secondary org | Token rotation | covered | N/A | N/A | N/A | `testing_auth_tokens.spec.ts`, `inertia/apps/user/tests/shared/e2e/helpers.ts; inertia/apps/org/tests/shared/e2e/helpers.ts` | covered | covered |
| Auth | Token refresh | Organization switch | AUTH-RF-SC03 pending org | AUTH-RF-TC003 | API caller | Active refresh token | Pending membership | forbidden state | Pending org ID | `POST /api/auth/refresh` | Reject per auth rule | No org switch; original refresh remains usable for valid org | Session remains previous or unauthorized per rule | None | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_org_boundary.spec.ts` | covered | covered |
| Auth | Token refresh | Organization switch | AUTH-RF-SC04 deleted/foreign org | AUTH-RF-TC004 | API caller | Active refresh token | Deleted/foreign org | foreign resource | Unknown org ID | `POST /api/auth/refresh` | Reject unauthorized/forbidden | No org switch; original refresh remains usable for valid org | No foreign workspace | None | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_org_boundary.spec.ts` | covered | covered |
| Auth | Token refresh | Replay | AUTH-RF-SC05 used refresh | AUTH-RF-TC005 | API caller | Refresh already rotated | Revoked token | replay | Old refresh token | `POST /api/auth/refresh` | Reject replay | No new token pair | Client forced to reauth | Security event if defined | covered | N/A | N/A | N/A | `testing_auth_tokens.spec.ts` | covered | covered |
| Auth | Token refresh | Race | AUTH-RF-SC06 concurrent refresh | AUTH-RF-TC006 | API caller | One active refresh token | Active token | concurrency | Two refresh requests | `POST /api/auth/refresh` twice | One succeeds, one rejects or deterministic idempotent rule | No duplicate active token families; stale refresh replay rejected | Winning token can authenticate | Token lock/transaction | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_org_boundary.spec.ts` | covered | covered |
| Auth | Token refresh | Expiry | AUTH-RF-SC07 expired refresh | AUTH-RF-TC007 | API caller | Expired token | Expired token | expired credential | Expired refresh | `POST /api/auth/refresh` | `401` unauthorized/problem | No new token pair and no org/user leak | Client shows expired session | None | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_org_boundary.spec.ts` | covered | covered |
| Auth | Token refresh | Error contract | AUTH-RF-SC08 missing token | AUTH-RF-TC008 | API caller | No refresh token | N/A | missing required | Empty body | `POST /api/v1/auth/refresh` | `422` problem details | No write | API client gets structured error | Request/correlation IDs | covered | partial | N/A | N/A | `testing_auth_tokens.spec.ts` | partial | partial |
| Auth | Session auth | Bearer bridge | AUTH-SA-SC01 valid bearer | AUTH-SA-TC001 | API caller | Valid access token | Approved org | valid bearer | Bearer token with org claim | `/api/v1/me` or protected API | Authenticated user/org context | No write | API data scoped to org | None | covered | N/A | N/A | N/A | `testing_auth_tokens.spec.ts` | covered | covered |
| Auth | Session auth | Bearer bridge | AUTH-SA-SC02 removed membership | AUTH-SA-TC002 | API caller | Token issued before membership removal | Membership removed | stale credential | Bearer token with old org | Protected API | Unauthorized/forbidden | Token/session invalidated or ignored | No org/user data leak | None | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_org_boundary.spec.ts` | covered | covered |
| Auth | Session auth | Browser session | AUTH-SA-SC03 suspended session user | AUTH-SA-TC003 | Suspended user | Existing browser session | Suspended account | forbidden user state | Session cookie | Protected page | Auth denied | Session cleared or rejected | Redirect/unauthorized | None | covered | N/A | N/A | missing | `app/modules/auth/tests/backend/integration/session_access_denial.spec.ts` | partial | partial |
| Auth | Session auth | Bearer token | AUTH-SA-SC04 suspended bearer user | AUTH-SA-TC004 | Suspended user | Existing bearer token | Suspended account | forbidden user state | Bearer token | Protected API | Auth denied | Token revoked/rejected | API unauthorized | None | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_access_denial.spec.ts` | covered | covered |
| Auth | Session auth | Browser session | AUTH-SA-SC05 deleted session user | AUTH-SA-TC005 | Deleted user | Existing browser session | Deleted account | deleted user state | Session cookie | Protected page | Auth denied | Session cleared or rejected | Redirect/unauthorized | None | covered | N/A | N/A | missing | `app/modules/auth/tests/backend/integration/session_access_denial.spec.ts` | partial | partial |
| Auth | Session auth | Bearer token | AUTH-SA-SC06 deleted bearer user | AUTH-SA-TC006 | Deleted user | Existing bearer token | Deleted account | deleted user state | Bearer token | Protected API | Auth denied | Token revoked/rejected | API unauthorized | None | covered | N/A | N/A | N/A | `app/modules/auth/tests/backend/integration/session_access_denial.spec.ts` | covered | covered |
| Auth | Session auth | E2E helper failure | AUTH-SA-SC07 helper failure not masked | AUTH-SA-TC007 | E2E runner | Bad token/bootstrap response | N/A | test infrastructure failure | Failed token/session bootstrap | `login(page, email, options)` | Helper throws with specific status/body | No test continues unauthenticated | E2E fails fast | Token cache cleared only when valid | N/A | N/A | N/A | covered | `inertia/apps/user/tests/e2e/meta/auth_helper_fail_fast.spec.ts` covers user/org login helper bootstrap failure, exact status/body error, and cached-token cleanup | covered | covered |

## Notes

- `AUTH-RF-TC001` through `AUTH-RF-TC007` split old `AUTH-013`.
- `AUTH-SA-TC003` through `AUTH-SA-TC006` split old `AUTH-020`.
- Session/bootstrap rows are test infrastructure, not production OAuth proof.
