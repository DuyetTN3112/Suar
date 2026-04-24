# Auth Logout Hierarchical Test-Case Matrix

| Field           | Value                      |
| --------------- | -------------------------- |
| Status          | Active hierarchical matrix |
| L0 Domain       | Auth                       |
| L1 Large Flow   | Logout                     |
| Source evidence | `../auth-login-session.md` |
| Last Reviewed   | 2026-07-15                 |

## Atomic Cases

| Domain | Large Flow | Subflow            | Scenario ID                       | Test Case ID  | Actor              | Preconditions              | Resource State  | Input Class        | Specific Input              | Trigger                         | Expected API                                 | Expected DB/State   | Expected UI                              | Side effects                 | Backend | Contract | Component | E2E     | Evidence                                                                                                               | Test Strength | Overall |
| ------ | ---------- | ------------------ | --------------------------------- | ------------- | ------------------ | -------------------------- | --------------- | ------------------ | --------------------------- | ------------------------------- | -------------------------------------------- | ------------------- | ---------------------------------------- | ---------------------------- | ------- | -------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- | ------- |
| Auth   | Logout     | Browser logout     | AUTH-LO-SC01 authenticated user   | AUTH-LO-TC001 | Authenticated user | Valid browser session      | Active user     | valid              | `GET /logout` browser route | Submit logout                   | Session invalidated; redirect per controller | Session cleared     | Protected page inaccessible after logout | Audit trail and logout event | covered | N/A      | N/A       | covered | `app/modules/auth/tests/backend/integration/logout_command.spec.ts`; `inertia/apps/user/tests/e2e/auth/logout.spec.ts` | covered       | covered |
| Auth   | Logout     | Browser logout     | AUTH-LO-SC02 unauthenticated user | AUTH-LO-TC002 | Guest              | No session                 | N/A             | missing credential | `GET /logout` browser route | Submit logout                   | Controlled redirect/unauthorized, not 500    | No write            | Stable login/error state                 | None                         | covered | N/A      | N/A       | covered | `app/modules/auth/tests/backend/integration/logout_command.spec.ts`; `inertia/apps/user/tests/e2e/auth/logout.spec.ts` | covered       | covered |
| Auth   | Logout     | Post-logout access | AUTH-LO-SC03 stale page/API retry | AUTH-LO-TC003 | Former user        | Logged out in same browser | Cleared session | stale credential   | Reload protected page       | `GET /tasks` or protected route | Auth middleware denies                       | No session restored | Redirect to login/require-org per route  | None                         | N/A     | N/A      | N/A       | covered | `inertia/apps/user/tests/e2e/auth/logout.spec.ts`                                                                      | covered       | covered |
