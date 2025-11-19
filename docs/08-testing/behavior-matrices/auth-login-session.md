# Behavior Matrix — Auth, Login, Session, Token

| Field | Value |
|---|---|
| Status | Active audit matrix |
| Flow family | OAuth login, logout, session auth, testing token/session bootstrap |
| Requirement anchors | `docs/02-requirements/srs.md#FR-AUTH`, `docs/02-requirements/user-story-use-case-business-rule.md#UC-01 OAuth Sign-In`, `docs/01-business/feature-specification.md#Feature 1: OAuth Authentication` |
| Runtime anchors | `start/routes/auth.ts`, `start/routes/testing.ts`, `app/modules/auth/*`, `inertia/apps/user/tests/shared/e2e/helpers.ts; inertia/apps/org/tests/shared/e2e/helpers.ts` |
| Last Reviewed | 2026-07-14 |
| Stale Risk | High |

## Why This Matrix Exists

This is the shape missing from the old test matrix.

The old matrix answers "which files exist". This matrix answers "which behavior combinations are proven, partial, or missing".

This file is still a domain behavior evidence matrix, not a complete hierarchical test-case matrix. Before calculating coverage, split these rows into `domain -> large flow -> subflow -> scenario -> atomic case -> test data` using `../hierarchical-test-case-decomposition.md`.

Status meanings:

- `covered`: current test asserts backend/UI behavior with enough specificity for this row
- `partial`: some layer is tested, but important UI/backend/state dimension is missing
- `missing`: no direct evidence found in current source audit
- `not-production`: test-only behavior; useful for E2E infrastructure, not production auth claim

## Behavior Matrix

| ID | Requirement / risk | Actor and state | Input / trigger | Expected backend result | Expected UI/browser result | Current evidence | Status | Gap / next test |
|---|---|---|---|---|---|---|---|---|
| AUTH-001 | OAuth provider redirect route exists and is throttled | Guest | `GET /auth/google/redirect` or `/auth/github/redirect` | Route applies `loginThrottle`; redirects to provider | Browser leaves app for provider | `start/routes/auth.ts` | partial | Add integration/route test asserting Google/GitHub redirect routes exist, throttle middleware remains wired, invalid provider behavior is defined. |
| AUTH-002 | OAuth callback creates new user | Guest with valid provider profile | Provider callback with new social identity | User row + `user_oauth_providers` row created; session login; redirect `/organizations` | Browser lands on organization onboarding/discovery | `SocialLoginCommand.finalizeNewUserLogin`; no direct route/E2E proof found | partial | Add integration for callback/controller or command with new user redirect and session side effect. Add E2E only if OAuth can be mocked safely. |
| AUTH-003 | OAuth callback deduplicates concurrent same provider identity | Multiple callback attempts same provider ID | Concurrent `SocialLoginCommand.execute('google', same social data)` | One user row; one provider row; same user returned | Not applicable at UI level | `app/modules/auth/tests/backend/integration/social_login.spec.ts` | covered | Keep as backend integration; optional: assert event/audit/log side effect if required. |
| AUTH-004 | Existing user by email links new provider atomically | Existing active user, no GitHub provider | Social login from provider with same email | Existing user reused; provider row created; `auth_method` synced | Existing user lands according to role/org context | `social_login.spec.ts` | partial | Backend persistence covered; landing path/UI redirect for linked user not directly proven. |
| AUTH-005 | Provider linking rollback on sync failure | Existing user, provider link write starts, user sync fails | Injected repository save failure | Provider row rollback; original `auth_method` kept | Error surface should be stable | `social_login.spec.ts` | partial | Backend rollback covered; user-facing error/redirect not covered. |
| AUTH-006 | Missing provider email is rejected | Provider profile without usable email | OAuth callback | No user/provider created; validation/auth error | Login page or provider error visible | `app/modules/auth/tests/backend/integration/social_login.spec.ts` | partial | Backend command proves rejection and no user/provider rows; route/controller response and browser error surface remain unproven. |
| AUTH-007 | Unsupported provider is rejected | Guest | `/auth/:provider/...` with unsupported provider | Controlled validation/not-found response | Error page or redirect, not 500 | Unit provider tests may cover provider service; route matrix not found | partial | Add route/controller test for unsupported provider path and no user creation. |
| AUTH-008 | Existing registered user with approved org lands on task workspace | Existing active user, current org approved, non-admin | Social login existing user | `resolveLandingPath` returns `/tasks` | Browser lands `/tasks` | `landing_surface.spec.ts`; `social_login.spec.ts` | covered unit + integration | Member redirect matrix covered; browser landing E2E optional if login route is mocked. |
| AUTH-009 | Existing org admin/owner lands on org admin shell | Existing active user, current org role can access org admin shell | Social login existing user | `resolveLandingPath` returns `/org` | Browser lands `/org` | `landing_surface.spec.ts`; `social_login.spec.ts` | covered unit + integration | Owner/admin landing contract covered at domain + command layer. |
| AUTH-010 | System admin/superadmin lands on admin shell | Existing system admin or superadmin | Social login existing user or testing token bootstrap | `resolveLandingPath` returns `/admin`; testing token has null org | Browser lands `/admin` after login helper/page nav | `landing_surface.spec.ts`; `social_login.spec.ts`; `testing_auth_state.spec.ts` | covered unit + integration | Browser admin landing still optional; backend redirect contract covered. |
| AUTH-011 | Existing user with stale `current_organization_id` does not land on `/tasks` | Existing active user, raw current org id but no approved membership | Social login existing user | Ignores stale org and lands `/organizations` | No bounce loop; no org-required modal as login result | `landing_surface.spec.ts`; `social_login.spec.ts` | fixed + covered unit + integration | `resolveLandingPath` now requires an approved membership role before returning `/tasks`; stale org id with null role returns `/organizations`. |
| AUTH-012 | Session-authenticated user can mint API token pair | Active session user | `POST /api/auth/token` or `/api/v1/auth/token` | Token pair created; canonical body has no legacy `success`; org pinned | Not a browser UI row | `testing_auth_tokens.spec.ts` | covered | Good backend contract row. |
| AUTH-013 | Refresh token rotates active organization | User has approved membership in primary and secondary org | `POST /api/auth/refresh` or `/api/testing/token-refresh` with secondary org | New token pair; old refresh revoked; org changes | E2E helper can bootstrap session into requested org | `testing_auth_tokens.spec.ts`, `inertia/apps/user/tests/shared/e2e/helpers.ts; inertia/apps/org/tests/shared/e2e/helpers.ts` | covered | Includes replay guard proving the old refresh token cannot be reused after rotation. |
| AUTH-014 | Refresh with missing token returns Problem Details contract | API caller | Empty `POST /api/v1/auth/refresh` | `422`, `application/problem+json`, request/correlation IDs | API client sees structured error | `testing_auth_tokens.spec.ts` | covered | Good contract row. |
| AUTH-015 | Refresh with invalid/expired token returns unauthorized | API caller | Unknown refresh token or replayed old refresh token | `401` unauthorized problem/error | UI/session helper clears cache and reissues token | `testing_auth_tokens.spec.ts` | covered integration | Canonical v1 invalid refresh returns Problem Details; legacy refresh-token replay returns unauthorized error envelope. |
| AUTH-016 | Access token bootstrap creates browser session | Testing/E2E user with valid access token | `POST /api/testing/session/bootstrap` bearer token | Web session cookie; user current org synced; session org set/cleared | Browser context authenticated for subsequent page loads | `testing_auth_tokens.spec.ts`, `testing_auth_state.spec.ts`, E2E helper | not-production / covered | Keep, but never cite as production OAuth proof. |
| AUTH-017 | Access token bootstrap rejects missing token | Testing/E2E caller | Empty bootstrap request | `422` validation | Helper should fail and reissue only when cache exists | `testing_auth_tokens.spec.ts` | not-production / covered integration | Missing bootstrap token returns `E_VALIDATION` and no silent session creation. |
| AUTH-018 | Access token bootstrap rejects invalid token | Testing/E2E caller | Invalid bearer token | `401`; no session cookie | Helper clears token cache | `testing_auth_tokens.spec.ts`; `inertia/apps/user/tests/shared/e2e/helpers.ts; inertia/apps/org/tests/shared/e2e/helpers.ts` | not-production / covered integration | Invalid bootstrap bearer returns `E_UNAUTHORIZED`; helper failure path already throws status/body context. |
| AUTH-019 | Bearer token API auth honors org membership | User token with org ID | API request with bearer token | User authenticated; `currentOrganizationId` set; revoked if membership missing | API client gets org-scoped data only | `testing_auth_tokens.spec.ts` covers `/api/v1/me`, project detail, task statuses | covered | Add negative row: removed membership invalidates token. |
| AUTH-020 | Suspended/deleted user cannot keep session/bearer access | Suspended or deleted user | Session or bearer request | Auth denied; token revoked for bearer | Browser/API redirected or unauthorized | `auth_middleware.ts`, `session_token_service.ts`; no direct auth test found | partial | Add integration for suspended/deleted session and bearer token. |
| AUTH-021 | Logout invalidates browser session | Authenticated user | `POST /logout` or `GET /logout` | Session logged out; redirect/response per controller | Browser cannot access protected page | `inertia/apps/user/tests/e2e/auth/logout.spec.ts` | covered E2E | Browser test logs in, opens `/tasks`, logs out, then verifies `/tasks` redirects to OAuth login and task workspace is absent. |
| AUTH-022 | Login page renders OAuth entry surface | Guest | `GET /login` | Inertia page `auth/login` rendered | Google/GitHub actions visible; no email/password claim | `inertia/apps/user/tests/e2e/auth/login_page.spec.ts` | covered E2E | Browser test asserts provider links and absence of email/password form. |
| AUTH-023 | E2E login helper does not mask auth failures | E2E test runner | `login(page, email, options)` | Token issue/bootstrap fails test with status/body context on auth failure | Tests stop instead of continuing unauthenticated | `inertia/apps/user/tests/shared/e2e/helpers.ts; inertia/apps/org/tests/shared/e2e/helpers.ts`; `inertia/apps/user/tests/shared/e2e/helpers.ts; inertia/apps/org/tests/shared/e2e/helpers.ts`; marketplace and task application E2E smoke | covered helper + E2E smoke | Helper now throws status/body-specific errors for token issue, token refresh, and session bootstrap failures; no generic truthy assertion remains. |
| AUTH-024 | Session cache reuses only correct user/org | E2E browser with existing cookie | Request login helper with same/different email/org | Reuse only if email and org match; reject drift | Browser session not cross-contaminated | `tests/shared/auth_session_cache.ts`, `inertia/apps/*/tests/shared/e2e/helpers.ts` | helper source / needs direct unit | Add direct unit coverage for helper cache drift. |
| AUTH-025 | Token cache keyed by email/org | E2E helper token cache | Store/retrieve/clear token | Normalized email key; org-aware token selection | Stable E2E login speed without wrong org | `tests/shared/auth_token_cache.ts`, `inertia/apps/*/tests/shared/e2e/helpers.ts` | helper source / partial | Add org mismatch/any-token fallback unit coverage. |

## Coverage Summary

| Area | Covered | Partial | Missing | Notes |
|---|---:|---:|---:|---|
| OAuth persistence and concurrency | 1 | 3 | 1 | Backend command has useful tests; callback/UI/provider error rows weak. |
| Landing path by role/org state | 4 | 0 | 0 | Domain and SocialLoginCommand integration now cover admin/member/no-org/stale-org redirects. |
| Token/session API contract | 9 | 1 | 0 | Stronger than UI auth; invalid refresh, refresh replay, and bootstrap negatives now covered. |
| Browser/UI auth behavior | 2 | 1 | 1 | Login page and logout E2E covered; OAuth callback/browser provider errors remain weak. |
| E2E auth infrastructure | 2 | 2 | 0 | Useful but test-only; do not cite as production OAuth proof. |

## Highest-Priority Follow-Up Tests

1. Auth route/API negative tests:
   - missing provider email route/controller response
   - suspended/deleted session and bearer access
2. Browser/UI tests:
   - OAuth provider callback/browser error surfaces where provider can be mocked safely

## Evidence Commands Used

- `gitnexus query "auth login session token social org bootstrap"`
- `find app/modules/auth -maxdepth 5 -type f`
- `rg "token-login|session/bootstrap|token-refresh|auth-state|testing"`
- `sed` over auth routes, auth command/domain/service/middleware, auth tests, E2E helpers, SRS and feature docs

GitNexus returned no flow results for the broad auth query, so source/test/docs inspection was used as fallback.
