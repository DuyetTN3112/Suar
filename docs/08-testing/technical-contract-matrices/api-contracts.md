# API Technical Contract Matrix

| Field | Value |
|---|---|
| Status | Active technical contract matrix |
| Purpose | Separate API alias, envelope, pagination, mapper, and compatibility checks from business-flow test cases |
| Last Reviewed | 2026-07-14 |

## Scope

These rows support business matrices but must not be counted as user-journey coverage.

```text
Technical API Contracts
├── Route aliases
├── Response envelope
├── Problem Details errors
├── Pagination windows
├── Request/response mappers
└── Deprecated compatibility behavior
```

## Matrix

| Contract Family | Contract Objective | Scenario ID | Check ID | Surface | Expected Contract | Evidence | Backend | Contract | Component | E2E | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Route aliases | Legacy and v1 invitation paths do not drift | API-ALIAS-SC01 | API-ALIAS-TC001 | Organization invitation response | Legacy and canonical paths return same status/body semantics | Referenced in `organization-membership-invitation.md` | partial | missing | N/A | missing | partial |
| Route aliases | Task submission canonical `/api/v1` contract preserved | API-ALIAS-SC02 | API-ALIAS-TC002 | Task submission/comments/attachments | Canonical and legacy routes return wrapped camelCase contract | `app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts` | covered | covered | partial | missing | medium |
| Response envelope | Admin read APIs avoid legacy `success` envelope | API-ENV-SC01 | API-ENV-TC001 | `/api/admin/*` read APIs | Wrapped `data` + pagination/filter fields, no legacy `success` | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | covered | partial | partial | missing | medium |
| Response envelope | Review dispute APIs use camelCase wrappers | API-ENV-SC02 | API-ENV-TC002 | Review dispute list/detail/comments/evidences | Wrapped camelCase data across `/api` and `/api/v1` | `review_disputes_api_standardization.spec.ts`, `review_dispute_artifacts_api_standardization.spec.ts` | covered | covered | partial | partial | medium |
| Problem Details | Auth refresh missing token uses structured error | API-ERR-SC01 | API-ERR-TC001 | `/api/v1/auth/refresh` | `422`, `application/problem+json`, request/correlation IDs | `testing_auth_tokens.spec.ts` | covered | covered | N/A | missing | strong |
| Pagination | Cursor windows do not overlap | API-PAGE-SC01 | API-PAGE-TC001 | Board-backed review queries and System dispute board | Older/newer cursor windows have no duplicate rows; no retired inbox/Org page is required | review query tests plus Admin dispute list tests | covered | partial | partial | weak | medium |
| Pagination | Tied created-at ordering deterministic | API-PAGE-SC02 | API-PAGE-TC002 | Admin users/orgs, audit logs | Stable id-desc tie-break on tied timestamps | `admin_read_api_standardization.spec.ts`, `audit_logs.spec.ts` | covered | partial | missing | missing | medium |
| Mapper shape | UI consumes backend fixture, not optimistic props | API-MAP-SC01 | API-MAP-TC001 | Task/review/admin components | Component fixture matches contract test response | Scattered component tests, contract bridge not systematic | partial | partial | partial | missing | weak |
| Deprecated compatibility | Deprecated task-level reverse review creation rejects by design | API-DEPR-SC01 | API-DEPR-TC001 | Reverse review create route | Old create path rejects with product-direction behavior | `submit_reverse_review_controller.spec.ts`, `reverse_review_target_guards.spec.ts` | covered | covered | partial | missing | medium |

## Use Rule

If a row tests aliases, envelopes, pagination, request mapping, response mapping, or deprecation compatibility, keep it here. Link it from business matrices as supporting evidence only.
