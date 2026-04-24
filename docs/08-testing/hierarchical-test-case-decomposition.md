# Hierarchical Test Case Decomposition

| Field | Value |
|---|---|
| Status | Active standard |
| Audience | QA, developer, reviewer, maintainer |
| Purpose | Define real test-case matrices for Suar flows, separate from file inventory and flat behavior evidence |
| Last Reviewed | 2026-07-14 |
| Stale Risk | High |

## Verdict

Current artifacts now split file inventory from behavior evidence, but most behavior matrix files are still too flat to answer:

> What exact test cases exist for this user flow, and which data variants are covered?

Correct Suar test design needs this hierarchy:

```text
L0 Domain
└── L1 Large flow
    └── L2 Subflow
        └── L3 Scenario
            └── L4 Atomic test case
                └── L5 Test data / input variant
```

Rule: one L4 row should test one main cause and one main outcome. If a row says "Google or GitHub", "suspended/deleted", "session/bearer", "approve/reject", or lists several state transitions, it is not atomic.

## Artifact Types

Do not mix these:

| Artifact type | Answers | Does not answer |
|---|---|---|
| File inventory | Which test files exist per suite/module | Whether behavior is covered |
| Domain behavior evidence matrix | Which important behaviors have some proof | Exact atomic test-case coverage |
| Hierarchical test-case matrix | Which flow/subflow/scenario/case/data variants are covered | Runtime pass/fail history |
| Technical contract matrix | API alias, envelope, pagination, schema, mapper compatibility | Business journey coverage |
| Control audit | Test DB safety, schema drift, false-pass policy, CI gates | Product behavior coverage |

## Required Columns

Use these columns for hierarchical matrices:

| Column | Meaning |
|---|---|
| Domain | L0, for example `Auth` |
| Large Flow | L1, for example `Login` |
| Subflow | L2, for example `OAuth callback` |
| Scenario ID | L3 stable scenario ID |
| Test Case ID | L4 stable atomic case ID |
| Actor | Guest, org member, owner, system admin, outsider |
| Preconditions | Session/org/project/resource state before trigger |
| Resource State | Pending, active, completed, expired, deleted, disputed |
| Input Class | Valid, missing required, boundary, malformed, duplicate, foreign-org, malicious |
| Specific Input | Exact provider, field value, transition, role, or payload variant |
| Trigger | User/API action |
| Expected API | Status code, response shape, domain error |
| Expected DB/State | Persisted row, rollback, audit, notification, event |
| Expected UI | Exact page/control/result; no broad empty-state fallback |
| Backend | `covered`, `partial`, `weak`, `missing`, or `N/A` for backend integration evidence |
| Contract | `covered`, `partial`, `weak`, `missing`, or `N/A` for API/contract evidence |
| Component | `covered`, `partial`, `weak`, `missing`, or `N/A` for component/UI evidence |
| E2E | `covered`, `partial`, `weak`, `missing`, or `N/A` for browser journey evidence |
| Evidence | Exact spec path or `missing` |
| Test Strength | Normalized strength enum: `covered`, `partial`, `weak`, or `missing` |
| Overall | Overall row status; do not infer this from one layer if another required layer is missing |

## Layer Semantics

Do not collapse test layers into one `covered` status. A pass in one layer is evidence only for that layer.

| Layer | Proves | Does not prove |
|---|---|---|
| Unit | A small function, mapper, policy, validator, or state rule behaves as asserted in isolation | DB persistence, route wiring, browser UI, or cross-module integration |
| Integration | Backend modules, DB persistence, transactions, permissions, events, and API behavior work together for the tested scenario | Browser routing, rendered UI, Playwright auth/session bootstrap, or user journey success |
| Contract | Request/response shape, aliases, envelopes, pagination, fixtures, or schema compatibility | Business journey completion or UI behavior |
| Component | UI component state/rendering for supplied props/fixtures | Real backend state, route guards, seeded DB data, or full browser flow |
| E2E | A browser journey can complete against the configured test server and test DB for the seeded scenario | Exhaustive backend decision tables, every input boundary, every API contract, or every component state |
| Control audit | Test infrastructure safety such as DB isolation, false-pass policy, generated docs freshness, and CI gates | Product behavior coverage |

Rule: `integration pass` never means `E2E pass`. If a row requires both backend correctness and browser confidence, mark `Backend` and `E2E` independently and cite separate evidence.

## Existing Matrix Status

| Current file | Correct classification | Main problem |
|---|---|---|
| `test-case-matrix.md` | Automation evidence inventory / traceability map | Name can imply real test-case matrix, but content is file mapping |
| `test-quality-audit.md` | Audit and policy document | Correctly identifies issue, but must not count current behavior rows as complete test cases |
| `behavior-matrices/auth-login-session.md` | Domain behavior evidence matrix | Groups multiple flows and several non-atomic rows |
| `behavior-matrices/marketplace-application-flow.md` | Domain/flow evidence matrix | Closest to target, but input boundary/data variants remain thin |
| `behavior-matrices/organization-membership-invitation.md` | Organization governance evidence matrix | Mixes invitation, join requests, role changes, ownership, and API aliases |
| `behavior-matrices/task-lifecycle-status-submission.md` | Task domain evidence matrix | Mixes create/update/list/status/submission/comments/attachments |
| `behavior-matrices/review-dispute-governance.md` | Review umbrella evidence matrix | Should split task review, sprint review, dispute, AI callback, analytics |
| `behavior-matrices/admin-audit-moderation.md` | Admin domain/control evidence matrix | Mixes authorization, dashboard, audit logs, moderation, packages, permissions |
| `db-docs-ai-schema-audit.md` | Control audit | Should use control objective/failure/check, not business-flow language |

## Decomposition Backlog

Use this as whole-suite map. Rows marked with a real file now have first-pass hierarchical decomposition. Coverage percentage is still not meaningful until product owners accept the atomic row set and requirement-needed rows are resolved.

| Domain | Large flow | Matrix target | Current evidence quality |
|---|---|---|---|
| Auth | Login page | `behavior-matrices/auth/oauth-login.md` | First-pass atomic rows created; evidence still missing/weak |
| Auth | OAuth redirect | `behavior-matrices/auth/oauth-login.md` | First-pass atomic rows split from `AUTH-001` |
| Auth | OAuth callback | `behavior-matrices/auth/oauth-login.md` | First-pass atomic rows created; backend partial, UI weak |
| Auth | Landing after login | `behavior-matrices/auth/oauth-login.md` | First-pass atomic rows created; stale org row still missing/suspected bug |
| Auth | Token refresh | `behavior-matrices/auth/session-refresh.md` | First-pass atomic rows split from `AUTH-013` |
| Auth | Logout | `behavior-matrices/auth/logout.md` | First-pass atomic rows created; evidence weak |
| Marketplace | Task discovery | `behavior-matrices/marketplace/task-discovery.md` | First-pass atomic rows created |
| Marketplace | Application submit | `behavior-matrices/marketplace/application-submit.md` | First-pass atomic boundary/input rows created |
| Marketplace | Application withdraw | `behavior-matrices/marketplace/application-withdraw.md` | First-pass atomic rows created |
| Marketplace | Application review | `behavior-matrices/marketplace/application-review.md` | First-pass atomic rows created |
| Organizations | Organization create/current context | `behavior-matrices/organizations/create-context.md` | First-pass atomic rows created |
| Organizations | Invitation send | `behavior-matrices/organizations/invitation-send.md` | First-pass atomic rows created |
| Organizations | Invitation accept/reject | `behavior-matrices/organizations/invitation-response.md` | First-pass atomic accept/reject rows created; important E2E gap remains |
| Organizations | Join request | `behavior-matrices/organizations/join-request.md` | First-pass atomic rows created |
| Organizations | Member role/remove | `behavior-matrices/organizations/membership-role.md` | First-pass atomic rows created |
| Organizations | Ownership transfer | `behavior-matrices/organizations/ownership-transfer.md` | First-pass atomic rows created |
| Tasks | Create task | `behavior-matrices/tasks/create-update.md` | First-pass atomic rows created |
| Tasks | Update task | `behavior-matrices/tasks/create-update.md` | First-pass atomic rows created |
| Tasks | List/access task | `behavior-matrices/tasks/list-access.md` | First-pass atomic rows created |
| Tasks | Board interaction | `behavior-matrices/tasks/board-interaction.md` | First-pass atomic rows created |
| Tasks | Status transition | `behavior-matrices/tasks/status-transition.md` | First-pass decision rows created from grouped `TASK-022` |
| Tasks | Submission package | `behavior-matrices/tasks/submission.md` | First-pass atomic rows created |
| Tasks | Comments/attachments | `behavior-matrices/tasks/comments-attachments.md` | First-pass atomic rows created |
| Projects | Project create/update | `behavior-matrices/projects/project-create-update.md` | First-pass atomic rows created |
| Projects | Project membership | `behavior-matrices/projects/project-membership.md` | First-pass atomic rows created |
| Projects | Sprint/backlog context | `behavior-matrices/projects/sprint-backlog.md` | First-pass atomic rows created |
| Reviews | Task review lifecycle | `behavior-matrices/reviews/task-review.md` | First-pass atomic rows created |
| Reviews | Reverse review read | `behavior-matrices/reviews/reverse-review-read.md` | First-pass atomic rows created |
| Reviews | Sprint review package | `behavior-matrices/reviews/sprint-review-package.md` | First-pass atomic rows created |
| Reviews | Dispute governance | `behavior-matrices/reviews/dispute-governance.md` | First-pass atomic rows created from journey `REV-029` |
| Reviews | AI evaluation callback | `behavior-matrices/reviews/ai-evaluation-callback.md` | First-pass atomic rows created; all direct tests still missing |
| Reviews | Analytics/trust | `behavior-matrices/reviews/analytics-trust.md` | First-pass atomic rows created |
| Admin | Admin authorization | `behavior-matrices/admin/authorization.md` | First-pass atomic rows created |
| Admin | Audit logs | `behavior-matrices/admin/audit-logs.md` | First-pass atomic rows created |
| Admin | Moderation/disputes | `behavior-matrices/admin/moderation-disputes.md` | First-pass atomic rows created |
| Admin | Packages/subscriptions | `behavior-matrices/admin/packages-subscriptions.md` | First-pass atomic rows created |
| Admin | Permissions/proficiency | `behavior-matrices/admin/permissions-proficiency.md` | First-pass atomic rows created |
| Users/Profile | Profile snapshot | `behavior-matrices/users/profile-snapshot.md` | First-pass atomic rows created |
| Users/Profile | Invitation inbox | `behavior-matrices/users/invitation-inbox.md` | First-pass atomic rows created |
| Users/Profile | Trust explanation | `behavior-matrices/users/trust-explanation.md` | First-pass atomic rows created |
| Search | Global search | `behavior-matrices/search/global-search.md` | First-pass atomic rows created |
| Notifications | Notification lifecycle | `behavior-matrices/notifications/notification-lifecycle.md` | First-pass atomic rows created |
| Skills | Skill/rubric management | `behavior-matrices/skills/skill-rubric-management.md` | First-pass atomic rows created |
| Technical | API aliases/envelopes/pagination | `technical-contract-matrices/api-contracts.md` | First-pass technical contract bucket created |
| Control | Test DB/schema/false-pass policy | `control-audits/testing-controls.md` | First-pass control audit bucket created |

## Example: Auth Decomposition

```text
AUTH Authentication
├── AUTH-L01 Login
│   ├── AUTH-S01 Login page
│   │   ├── AUTH-LP-SC01 Guest sees supported providers
│   │   │   ├── TC-001 Google button visible
│   │   │   ├── TC-002 GitHub button visible
│   │   │   └── TC-003 Email/password form absent because product is OAuth-only
│   │   └── AUTH-LP-SC02 Authenticated user opens login page
│   │       └── TC-001 Redirects to role/org landing
│   ├── AUTH-S02 OAuth redirect
│   │   ├── TC-001 Google redirect route uses login throttle
│   │   ├── TC-002 GitHub redirect route uses login throttle
│   │   ├── TC-003 Unsupported provider returns controlled error
│   │   └── TC-004 Rate limit exceeded returns throttle response
│   ├── AUTH-S03 OAuth callback
│   │   ├── TC-001 New user creates user/provider/session
│   │   ├── TC-002 Existing linked provider logs in same user
│   │   ├── TC-003 Existing email links new provider atomically
│   │   ├── TC-004 Missing provider email rejects without persistence
│   │   ├── TC-005 Concurrent duplicate callback creates one provider row
│   │   └── TC-006 Persistence failure rolls back provider link
│   └── AUTH-S04 Landing
│       ├── TC-001 System admin lands `/admin`
│       ├── TC-002 Org owner/admin lands `/org`
│       ├── TC-003 Org member lands `/tasks`
│       ├── TC-004 User without org lands `/organizations`
│       └── TC-005 Stale org id with no approved membership lands `/organizations`
├── AUTH-L02 Token refresh
├── AUTH-L03 Logout
├── AUTH-L04 Session authorization
└── AUTH-L05 Test-only auth infrastructure
```

`AUTH-013` from the flat matrix becomes at least these atomic rows:

| Large Flow | Subflow | Scenario | Test Case | Data variant | Expected |
|---|---|---|---|---|---|
| Token refresh | Rotate same org | Valid token | TC-001 | Primary approved org | New access/refresh pair, old refresh revoked |
| Token refresh | Rotate organization | Valid token | TC-002 | Secondary approved org | New pair bound to secondary org |
| Token refresh | Rotate organization | Forbidden org | TC-003 | Pending membership | Reject; old token policy explicit |
| Token refresh | Replay | Used token | TC-004 | Old refresh token | Reject replay |
| Token refresh | Race | Concurrent refresh | TC-005 | Same refresh token twice | One succeeds, one rejects |
| Token refresh | Expiry | Expired token | TC-006 | Expired refresh | Reject unauthorized |

## Example: Task Status Decision Table

`TASK-022` currently groups representative transitions. Real matrix needs row-per-transition plus actor/resource conditions.

| From | To | Actor | Submission required | Expected | Evidence target |
|---|---|---|---|---|---|
| Todo | In progress | Assignee | No | Allow; `task_status_id` changes; audit written | integration + E2E |
| Todo | Done | Assignee | Product rule decision | Allow or deny explicitly | integration |
| In progress | Done dev | Assignee | No | Allow | integration + component |
| In testing | Done | Reviewer/authorized actor | Yes | Allow only with valid submission | integration + E2E |
| In progress | Cancelled | Authorized actor | No | Allow; cancellation side effects explicit | integration |
| Done | In progress | Any actor | N/A | Deny if review locked | integration |
| Cancelled | In progress | Any actor | N/A | Product rule decision | requirement needed |

## Example: Review Decomposition

`REV-029` is a journey, not one atomic test case.

```text
Review Dispute Governance
├── Open dispute
│   ├── TC-001 Reviewee opens dispute from completed review
│   ├── TC-002 Non-reviewee cannot open dispute
│   └── TC-003 Duplicate active dispute rejected
├── Exchange comments
│   ├── TC-001 Reviewee comments
│   ├── TC-002 Counterparty comments
│   └── TC-003 Outsider cannot comment
├── Report to admin
│   ├── TC-001 Report blocked before two-sided exchange
│   ├── TC-002 Report allowed after two-sided exchange
│   └── TC-003 Duplicate report is idempotent or rejected per rule
└── Admin resolution
    ├── TC-001 Complete case resolves normally
    ├── TC-002 Missing required data blocks resolution
    └── TC-003 Override requires reason and decision explanation
```

## Conversion Rules

1. Split every `or`, slash-pair, and comma-list into separate L4 rows unless it is truly one input class.
2. Move API aliases, pagination, envelope compatibility, and mapper shape to technical contract matrices.
3. Move test DB, schema drift, generated docs freshness, and false-pass policy to control audits.
4. Keep one canonical E2E journey per P0 flow, but do not count that journey as every atomic case.
5. Use backend integration for large decision tables; use E2E for canonical happy path and one high-risk negative path.
6. Mark `requirement needed` separately from `missing test`; unknown product rules are not test failures.
7. Coverage percentages may be computed only after L4 rows are atomic and status columns are separated by layer.
8. Never promote `covered integration` to `covered E2E`; missing E2E remains missing until browser evidence exists.

## Minimum Gate Before Claiming Coverage

For any flow, do not say "covered" unless:

- L1/L2/L3 hierarchy exists.
- L4 rows are atomic.
- Data variants include valid, missing required, invalid format/enum, boundary, duplicate/idempotency, unauthorized, and foreign-org where relevant.
- Backend/API expected result and UI expected result are separate.
- At least one evidence file proves the row with concrete assertions.
- Weak smoke tests and empty-state fallbacks are labeled `weak`, not `covered`.
