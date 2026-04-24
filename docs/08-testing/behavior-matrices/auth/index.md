# Auth Hierarchical Test-Case Matrices

| Field | Value |
|---|---|
| Status | Active split index |
| Parent evidence matrix | `../auth-login-session.md` |
| Standard | `../../hierarchical-test-case-decomposition.md` |
| Last Reviewed | 2026-07-14 |

## Flow Tree

```text
AUTH Authentication
├── AUTH-L01 Login
│   ├── AUTH-S01 Login page
│   ├── AUTH-S02 OAuth redirect
│   ├── AUTH-S03 OAuth callback
│   └── AUTH-S04 Landing after login
├── AUTH-L02 Token refresh
├── AUTH-L03 Logout
├── AUTH-L04 Session authorization
└── AUTH-L05 Test-only auth infrastructure
```

## Split Matrices

| Matrix | Purpose | Source rows split |
|---|---|---|
| `oauth-login.md` | Login page, OAuth redirect/callback, landing | `AUTH-001` through `AUTH-011`, `AUTH-022` |
| `session-refresh.md` | Refresh token, bearer/session bridge, suspended/deleted access | `AUTH-012` through `AUTH-020`, `AUTH-023` through `AUTH-025` |
| `logout.md` | Logout and post-logout access behavior | `AUTH-021` |

## Coverage Rule

Do not count `../auth-login-session.md` rows as atomic coverage. Count only L4 rows in the split files.
