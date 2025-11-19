# Suar — Test Quality Audit

| Field | Value |
|---|---|
| Status | Active audit |
| Audience | QA, developer, reviewer, maintainer |
| Purpose | Explain why current test volume does not equal behavioral confidence, and define the matrix model required for future tests |
| Source of Truth | `package.json`, `docs/08-testing/test-case-matrix.md`, `docs/test/generated/*`, `scripts/tests/*`, sampled specs, `docs_AI/integration_test_db_connect.md` |
| Last Reviewed | 2026-07-14 |
| Stale Risk | High |

## Executive Verdict

User suspicion is valid.

The project has many tests, but the current "matrix" artifacts mostly answer:

- which test files exist
- which suite bucket a file belongs to
- which domain has at least one automation evidence file

They do not answer:

- which business scenarios are covered
- which actor/state/permission/data combinations are covered
- whether the UI and backend agree on the same contract
- whether a green E2E result proves real behavior instead of accepting empty state, redirect, or broad selector fallback

Current test inventory after regeneration:

| Source | Count |
|---|---:|
| Component runnable | 104 |
| Wrapper fixtures | 133 |
| E2E specs | 34 |
| Unit specs | 134 |
| Integration specs | 122 |
| Contract specs | 16 |
| Total counted test files | 410 |

This is broad, but not yet a behavioral coverage matrix.

The newer files under `behavior-matrices/` are also not the final form. They are domain behavior evidence matrices: useful for finding proof and gaps, but still too flat to calculate atomic test-case coverage. Real test-case matrices must follow `domain -> large flow -> subflow -> scenario -> atomic case -> test data`; see `hierarchical-test-case-decomposition.md`.

## Root Causes

### R1 - The existing matrix is a traceability map, not a test design matrix

`docs/08-testing/test-case-matrix.md` explicitly says it is an automation evidence map, not a test run report or proof of full E2E coverage.

That is useful for navigation, but it is not the same as a matrix for a flow like login, task application, sprint review, or organization invitation.

A correct behavior matrix must enumerate dimensions such as:

- actor
- auth state
- organization context
- role
- resource state
- input validity
- backend response contract
- UI state after response
- audit/notification side effects
- DB write target
- negative/forbidden path
- empty/loading/error state

Current docs list files per domain instead of rows per scenario combination.

### R2 - Module matrix counts files, not behavior

`scripts/tests/collect_module_suite_matrix.mjs` builds rows from file paths and regexes. It counts module-local and legacy-mapped files. It does not parse assertions, route coverage, permissions, UI state, or DB side effects.

Example current matrix rows:

| Module | Code files | Unit | Integration | Contract | Component | E2E |
|---|---:|---:|---:|---:|---:|---:|
| organizations | 238 | 14 | 17 | 1 | 3 | 0 |
| users | 200 | 5 | 14 | 0 | 0 | 0 |
| tasks | 312 | 27 | 22 | 6 | 21 | 5 |
| reviews | 246 | 11 | 28 | 0 | 12 | 8 |

This is inventory health. It is not behavioral confidence.

### R3 - False-pass guard now scans broadly, but known debt remains

`scripts/tests/critical_e2e_policy.json` now scans all Playwright specs under:

- `inertia/apps/*/tests/e2e/**/*.spec.ts`

The scanner supports explicit strings, regex pattern IDs, globbed spec lists, excluded meta specs, and `allowedOffenders`.

The scan catches some bad smells, but it misses:

- helper-level optional behavior outside scanned spec source
- `hasX || hasEmptyState` patterns with different variable names
- tests that only assert headings or body text
- tests where backend seed/request result is checked only with `toBeTruthy()`

Current policy has 30 explicit `allowedOffenders`. These are not clean tests; they are tracked debt so new offenders fail without pretending old offenders are solved.

Observed weak E2E patterns still exist in the allowlist:

- `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` accepts task cards or empty state.
- `inertia/apps/org/tests/e2e/reviews/org_dispute_queue_flow.spec.ts` accepts forbidden, redirect, empty state, or own-org text for some access paths.
- `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts` uses broad `hasContent` truthiness.
- `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts` accepts profiles or empty state, and checks absence of 500.

Those tests can pass while important behavior remains missing.

### R4 - Some "matrix" specs are real E2E, but still incomplete matrixes

`inertia/apps/org/tests/e2e/projects/project_status_enum_matrix.spec.ts` is stronger than most: it creates records through UI, verifies valid enum options, rejects legacy values, and checks backend rejection for fake DOM injection.

But even this is a focused enum-contract matrix, not a complete project-create matrix. It does not cover every actor, organization context, duplicate project name behavior, validation field matrix, permission denial, audit side effect, mobile/browser variants, or API contract parity.

`inertia/apps/user/tests/e2e/tasks/dialog_reactivity_matrix.spec.ts` covers dialog open/close/reactivity and several crash guards. It does not prove the whole task-status workflow, permissions, ordering, empty state, or side effects.

These files show the right direction but not enough breadth.

### R5 - Backend tests are stronger for domain logic than UI tests, but still not always end-to-end contract proof

Some backend integration tests have real value:

- `app/modules/tasks/tests/backend/integration/create_task.spec.ts` checks DB persistence, org/project invariant, permission denial, rollback, external contributor assignment, and audit log.
- `app/modules/tasks/tests/backend/integration/task_status.spec.ts` checks representative transitions, permission denial, notification side effects, audit trail, atomic batch rollback, and event publisher calls.

These are meaningful tests. Problem is that many frontend tests do not consume the same scenario matrix or contract fixture, so backend green does not guarantee UI green.

This is a hard rule for Suar test docs: integration and E2E are different evidence types. A passing integration suite can prove backend state transitions, DB writes, permissions, and side effects for the asserted scenario. It does not prove the same scenario works through Playwright, Inertia routing, browser auth/session bootstrap, visible controls, loading/error states, or seeded UI data. Any matrix row that needs browser confidence must keep `Integration` and `E2E` status separate.

Needed bridge:

- backend contract tests define payload shape and state transitions
- frontend component tests use generated/recorded contract fixtures
- E2E covers one or more canonical critical rows through real UI and test DB

### R6 - Test docs and generated inventory can drift

Before regeneration, `docs/test/generated/runnable_inventory.md` reported 345 files. Running `pnpm run test:inventory` regenerated it to 410 counted test files.

This proves generated docs are useful only if the generator is part of the required gate. A stale matrix can undercount or overclaim test coverage.

### R7 - DB truth is safer now, but static artifacts still need drift gates

`docs_AI/integration_test_db_connect.md` documents the safe integration/E2E DB flow:

- force `database config = test database config`
- migrate test DB before integration/E2E
- do not reuse a dev server unless it is already connected to the test DB

This is good.

When someone asks how to connect DB for tests, treat `docs_AI/integration_test_db_connect.md` as the first source to open. Do not reconstruct DB connection rules from scattered env usage before checking that file.

Current static and live evidence is better than the older DB audit warning:

- current `schema/migration evidence` contains `marketplace_applications`, `project_sprints`, `sprint_review_packages`, `sprint_manager_reviews`, and `sprint_environment_reviews`
- current `database/schema.ts` contains generated schema classes for the same sprint/marketplace tables
- a read-only `suar_test` check found those tables plus `tasks`, `task_applications`, `review_disputes`, and `ai_dispute_evaluations`

However, this is not a permanent guarantee. Static DB artifacts can drift again because migration success, schema evidence export, and schema generation are separate actions. See `db-docs-ai-schema-audit.md`.

## What A Correct Matrix Should Look Like

Use this model for each critical flow.

| Column | Meaning |
|---|---|
| Requirement ID | Link to SRS/user story/business rule |
| Flow | Example: login, apply task, create task, invite member |
| Actor | Guest, user, org member, org admin, project manager, outsider, superadmin |
| Auth state | unauthenticated, session, bearer token, stale org, expired token |
| Org/project context | no org, current org, foreign org, deleted org, project filter active |
| Resource state | draft, pending, active, closed, expired, deleted, disputed |
| Input class | valid, missing required, invalid enum, duplicate, boundary length, malicious |
| Expected backend result | status code, domain error, DB write, audit, notification, event |
| Expected UI result | exact visible state, disabled/enabled controls, route, no broad empty-state fallback |
| Test layer | unit, integration, contract, component, E2E |
| Evidence file | exact spec path |
| Assertion strength | strong, medium, weak |
| Gap | missing layer or missing dimension |

## Example: Login Matrix Shape

Concrete auth/login/session matrix now lives at:

- `docs/08-testing/behavior-matrices/auth-login-session.md`

Concrete marketplace application matrix now lives at:

- `docs/08-testing/behavior-matrices/marketplace-application-flow.md`

The shape below is the minimal row style expected for every critical flow.

| Case | Actor/context | Expected backend | Expected UI | Required tests |
|---|---|---|---|---|
| valid user with approved org | session created, current org accepted | redirect to `/tasks` or role landing | integration + E2E |
| valid org admin | session created, org admin role detected | redirect to `/org` | integration + E2E |
| valid user with stale org | stale org cleared | redirect to `/organizations`, not bounce loop | integration + E2E |
| user without email from provider | login rejected | visible auth error | integration + E2E |
| duplicate provider link race | one identity wins, no duplicate rows | stable login result | integration |
| expired token refresh | refresh denied or rotated per rule | session expired state | contract + E2E |
| bearer/session bridge | bearer state maps to session bootstrap | user/org visible in UI | integration + E2E |

## Immediate Remediation Plan

### P0 - Stop treating inventory as coverage

Rename/report current generated module suite matrix as inventory only.

Acceptance:

- docs say "file inventory", not "coverage proof"
- report never says a domain is covered just because a file count is nonzero

### P0 - Burn down false-pass E2E debt

Current policy scans all E2E specs and fails new offenders. The remaining work is to remove `allowedOffenders` by replacing weak assertions with seeded positive/negative behavior checks.

Patterns currently guarded:

- `hasX || hasEmptyState`
- `hasForbidden || hasRedirect || hasEmptyState`
- optional `if (await locator.count() > 0)` in critical path
- `toBeTruthy()` on response or behavioral outcome
- body-level "not 500" checks without positive state assertion
- broad heading-only smoke tests marked as behavior proof

Acceptance:

- `pnpm run test:e2e:policy` scans all E2E specs
- `allowedOffenders` trends to zero
- every removed offender gets a stronger behavior assertion or a dedicated empty-state row

### P0 - Create critical-flow behavior evidence files

Start with flows where bugs escape most often:

- auth/login/session/org bootstrap
- task create/update/status/submission
- marketplace apply/withdraw/process
- organization invitation/join/member role
- review/dispute/sprint review governance
- admin audit/dispute moderation

Acceptance:

- each flow has matrix rows with actor, state, input, backend result, UI result, and evidence file
- every row has exactly one status: covered, partial, missing, intentionally not supported
- every file clearly states whether it is behavior evidence or an atomic test-case matrix

Current artifacts:

- `behavior-matrices/auth-login-session.md`
- `behavior-matrices/marketplace-application-flow.md`
- `behavior-matrices/task-lifecycle-status-submission.md`
- `behavior-matrices/organization-membership-invitation.md`
- `behavior-matrices/review-dispute-governance.md`
- `behavior-matrices/admin-audit-moderation.md`

These artifacts are not yet hierarchical test-case matrices. Rows like "Google or GitHub", "suspended/deleted user", "session/bearer", "approve/reject", or multiple state transitions must be split before coverage can be counted.

### P0 - Convert behavior evidence into hierarchical test-case decomposition

Use `hierarchical-test-case-decomposition.md` as the standard. The conversion target is:

```text
Domain -> Large flow -> Subflow -> Scenario -> Atomic test case -> Test data
```

Acceptance:

- each L4 test case has one main cause and one main outcome
- technical API alias/pagination/schema rows move to technical contract matrices
- test DB, false-pass, generated docs, and schema drift rows move to control audits
- unknown product rules are marked `requirement needed`, not `missing test`
- coverage summaries use layer-specific status columns, not a single overloaded status

First-pass conversion artifacts now exist for the exact high-risk rows called out during review:

- `behavior-matrices/auth/oauth-login.md`
- `behavior-matrices/auth/session-refresh.md`
- `behavior-matrices/auth/logout.md`
- `behavior-matrices/marketplace/application-submit.md`
- `behavior-matrices/marketplace/application-withdraw.md`
- `behavior-matrices/marketplace/application-review.md`
- `behavior-matrices/marketplace/task-discovery.md`
- `behavior-matrices/organizations/invitation-response.md`
- `behavior-matrices/organizations/create-context.md`
- `behavior-matrices/organizations/invitation-send.md`
- `behavior-matrices/organizations/join-request.md`
- `behavior-matrices/organizations/membership-role.md`
- `behavior-matrices/organizations/ownership-transfer.md`
- `behavior-matrices/tasks/create-update.md`
- `behavior-matrices/tasks/list-access.md`
- `behavior-matrices/tasks/board-interaction.md`
- `behavior-matrices/tasks/status-transition.md`
- `behavior-matrices/tasks/submission.md`
- `behavior-matrices/tasks/comments-attachments.md`
- `behavior-matrices/reviews/task-review.md`
- `behavior-matrices/reviews/reverse-review-read.md`
- `behavior-matrices/reviews/sprint-review-package.md`
- `behavior-matrices/reviews/dispute-governance.md`
- `behavior-matrices/reviews/ai-evaluation-callback.md`
- `behavior-matrices/reviews/analytics-trust.md`
- `behavior-matrices/admin/authorization.md`
- `behavior-matrices/admin/dashboard.md`
- `behavior-matrices/admin/audit-logs.md`
- `behavior-matrices/admin/moderation-disputes.md`
- `behavior-matrices/admin/packages-subscriptions.md`
- `behavior-matrices/admin/permissions-proficiency.md`
- `behavior-matrices/projects/project-create-update.md`
- `behavior-matrices/projects/project-membership.md`
- `behavior-matrices/projects/sprint-backlog.md`
- `behavior-matrices/users/profile-snapshot.md`
- `behavior-matrices/users/invitation-inbox.md`
- `behavior-matrices/users/trust-explanation.md`
- `behavior-matrices/search/global-search.md`
- `behavior-matrices/notifications/notification-lifecycle.md`
- `behavior-matrices/skills/skill-rubric-management.md`
- `technical-contract-matrices/api-contracts.md`
- `control-audits/testing-controls.md`

These are still audit matrices, not new automated tests. They make gaps measurable without pretending coverage exists.

### P1 - Bridge backend contracts to frontend fixtures

For each critical UI page, component tests should use backend contract fixtures or generated API examples, not hand-built optimistic props only.

Acceptance:

- contract fixture source path is referenced in component test
- at least one E2E proves real UI against migrated test DB for the same flow

### P1 - Require seeded positive data for E2E behavior tests

Behavior tests must not pass by accepting empty state unless the row is explicitly an empty-state row.

Acceptance:

- positive-flow E2E creates or seeds data in test DB
- assertions target exact record/user/action visible in UI
- empty-state tests are separate rows

### P1 - Add mutation testing or negative control checks for critical flows

For high-risk flows, prove tests fail when the behavior is inverted.

Low-cost options:

- temporary local mutation checklist in PR review
- script-level scanner for missing negative assertions
- targeted mutation tests for pure domain policy functions

Acceptance:

- permission rules have allow and deny cases for every role in the matrix
- invalid enum/status/input tests assert exact rejection, not generic failure

## Suggested Quality Gates

Add or evolve commands:

- `test:inventory`: keep as file inventory drift check
- `test:matrix`: validate behavior matrix rows link to existing files and required dimensions
- `test:e2e:policy`: scan all E2E specs for false-pass patterns
- `test:contracts:critical`: keep backend contract proof for critical HTTP surfaces
- `test:ui:contracts`: run component tests using contract fixtures
- `test:e2e:critical`: run seeded positive and negative critical paths

Do not let `test:quality:critical` imply full quality until it includes behavior matrix validation, all-E2E false-pass scanning, contract fixture parity, and seeded E2E rows.

## Current Risk Summary

| Risk | Severity | Evidence |
|---|---|---|
| Matrix artifacts count files instead of scenario combinations | High | `docs/08-testing/test-case-matrix.md`, `scripts/tests/collect_module_suite_matrix.mjs` |
| E2E false-pass debt still allowed | High | `scripts/tests/critical_e2e_policy.json` scans all E2E specs but has 30 `allowedOffenders` |
| Empty-state-or-content patterns still pass as behavior | High | marketplace, org dispute, org talent, profile E2E samples |
| Backend/frontend contract gap | High | backend integration tests stronger than frontend prop/heading tests |
| Generated inventory stale unless command is run | Medium | inventory changed from 345 to 410 after regeneration |
| Static DB docs can drift from live test DB | Medium | `db-docs-ai-schema-audit.md`, `docs_AI/integration_test_db_connect.md` |

## Commands Run During This Audit

- `npm run test:inventory`
- `npm run test:inventory:modules`
- `grep` / `rg` over tests and docs
- `read` over matrix docs, test scripts, Playwright/Vitest/Japa config, sampled specs, and DB test guide
- `gitnexus query "test coverage matrix frontend backend e2e"`

No full unit/integration/E2E suite was run in this audit turn.
