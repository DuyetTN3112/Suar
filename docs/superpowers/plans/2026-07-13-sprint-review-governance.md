# Sprint Review Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project-sprint based reverse review governance while preserving existing task review, dispute, and admin resolution behavior.

**Architecture:** Add a focused sprint-review domain under `app/modules/reviews` first, because existing reverse review and dispute governance already live there. Project sprint identity is project-scoped, but package submission, manager target reviews, environment reviews, moderation, and aggregation are review governance concerns.

**Tech Stack:** AdonisJS, Lucid, PostgreSQL-compatible migrations, Svelte/Inertia frontend, Japa backend tests, Vitest/Svelte component tests, Playwright E2E.

## Global Constraints

- Do not restore task-level reverse review creation.
- Sprint truth is project sprint.
- Environment review must create separate project and organization target records.
- Manager reviews target users individually and may target multiple people per sprint.
- Task comments and dispute comments remain separate.
- Admin dispute resolution must use dossier readiness before profile-impacting closure.
- Use TDD for production behavior changes.
- Run `gitnexus impact <symbolName>` before editing existing functions, classes, or methods.
- Run `gitnexus detect-changes` before any commit.

---

## File Structure

Create:

- `app/modules/reviews/domain/sprint_review_rules.ts`: pure rules for sprint transitions, package completion, manager target eligibility, and environment target validation.
- `app/modules/reviews/domain/review_dispute_readiness.ts`: pure policy for required dispute dossier readiness.
- `app/modules/reviews/tests/backend/unit/sprint_review_rules.spec.ts`: unit coverage for sprint review rules.
- `app/modules/reviews/tests/backend/unit/review_dispute_readiness.spec.ts`: unit coverage for admin dossier readiness.
- `database/migrations/<timestamp>_create_project_sprint_reviews_tables.ts`: project sprint and sprint review tables.
- `app/modules/reviews/infra/models/project_sprint.ts`: Lucid model for project sprint.
- `app/modules/reviews/infra/models/sprint_review_package.ts`: Lucid model for reviewer package.
- `app/modules/reviews/infra/models/sprint_manager_review.ts`: Lucid model for manager-target feedback.
- `app/modules/reviews/infra/models/sprint_environment_review.ts`: Lucid model for project/org environment feedback.
- `app/modules/reviews/actions/commands/close_project_sprint_command.ts`: close sprint and open packages.
- `app/modules/reviews/actions/commands/submit_sprint_review_package_command.ts`: submit project/org/manager reviews.
- `app/modules/reviews/actions/queries/list_my_sprint_review_packages_query.ts`: user inbox read model.
- `app/modules/reviews/controllers/*sprint*`: route adapters for sprint review APIs.
- `inertia/pages/reviews/sprint-packages/*.svelte`: user sprint review inbox/detail.
- `inertia/pages/projects/components/sprints/*.svelte`: project sprint management components.

Modify:

- `start/routes/reviews.ts`: add user sprint package APIs.
- `start/routes/projects.ts` or relevant project route file: add project sprint APIs.
- `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts`: apply readiness gate before normal resolve.
- `inertia/pages/admin/disputes/components/dispute_resolve_tab.svelte`: disable normal resolve and require override when required dossier data is missing.
- `inertia/pages/organizations/show.svelte` and org list components: expose organization environment aggregate after backend read model exists.
- `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts`: later adapter so sprint reverse reviews can feed existing read surfaces.

---

### Task 1: Sprint Review Domain Rules

**Files:**
- Create: `app/modules/reviews/domain/sprint_review_rules.ts`
- Test: `app/modules/reviews/tests/backend/unit/sprint_review_rules.spec.ts`

**Interfaces:**
- Produces: `canTransitionProjectSprint(input): RuleResult`
- Produces: `resolveEligibleManagerTargets(input): EligibleManagerTarget[]`
- Produces: `validateSprintReviewPackage(input): RuleResult`
- Produces: `validateEnvironmentTargets(input): RuleResult`

- [ ] **Step 1: Write failing tests for transition rules**

Create tests proving:

```ts
test('project sprint can open review only from active or review_open state', ({ assert }) => {
  assert.isTrue(canTransitionProjectSprint({ from: 'active', to: 'review_open', actorCanManageSprint: true }).allowed)
  assert.isTrue(canTransitionProjectSprint({ from: 'review_open', to: 'review_closed', actorCanManageSprint: true }).allowed)
  assert.isFalse(canTransitionProjectSprint({ from: 'draft', to: 'review_open', actorCanManageSprint: true }).allowed)
  assert.isFalse(canTransitionProjectSprint({ from: 'active', to: 'review_open', actorCanManageSprint: false }).allowed)
})
```

- [ ] **Step 2: Run red test**

Run: `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/reviews/tests/backend/unit/sprint_review_rules.spec.ts`

Expected: fail because module/functions do not exist.

- [ ] **Step 3: Implement minimal rules**

Implement status values:

```ts
export type ProjectSprintStatus = 'draft' | 'active' | 'review_open' | 'review_closed' | 'archived'

export interface RuleResult {
  allowed: boolean
  reason?: string
}
```

Allowed transitions:

- `draft -> active`
- `active -> review_open`
- `review_open -> review_closed`
- `review_closed -> archived`

All require `actorCanManageSprint = true`.

- [ ] **Step 4: Add manager eligibility tests**

Test these cases:

- assignee cannot review themself;
- duplicate manager candidates collapse to one target;
- only users with `assigned_task_count > 0`, `created_task_count > 0`, `project_manager_during_sprint = true`, `project_owner_during_sprint = true`, or `explicit_sprint_lead = true` are eligible.

- [ ] **Step 5: Implement manager target resolver**

Return:

```ts
export interface EligibleManagerTarget {
  userId: string
  targetRole: 'manager' | 'lead' | 'assigner' | 'owner'
  evidenceCount: number
}
```

- [ ] **Step 6: Add package validation tests**

Test these cases:

- submitted package requires project environment review;
- submitted package requires organization environment review;
- manager reviews can be empty when there are no eligible manager targets;
- manager review target must be in eligible target list;
- reviewer cannot review themself.

- [ ] **Step 7: Implement package validation**

Minimal pure validation only. Do not query DB in this file.

- [ ] **Step 8: Verify Task 1**

Run: `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/reviews/tests/backend/unit/sprint_review_rules.spec.ts`

Expected: all tests in file pass.

---

### Task 2: Admin Dispute Dossier Readiness Policy

**Files:**
- Create: `app/modules/reviews/domain/review_dispute_readiness.ts`
- Test: `app/modules/reviews/tests/backend/unit/review_dispute_readiness.spec.ts`

**Interfaces:**
- Produces: `evaluateReviewDisputeReadiness(input): ReviewDisputeReadinessResult`

- [ ] **Step 1: Write failing readiness tests**

Cover:

- missing task snapshot blocks normal resolve;
- missing assignment snapshot blocks normal resolve;
- missing submission snapshot blocks normal resolve;
- missing review snapshot blocks normal resolve;
- missing skill reviews block normal resolve;
- missing reviewee/counterparty exchange blocks normal resolve;
- complete required data allows normal resolve;
- admin override remains possible but requires override reason.

- [ ] **Step 2: Run red test**

Run: `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/reviews/tests/backend/unit/review_dispute_readiness.spec.ts`

Expected: fail because readiness module does not exist.

- [ ] **Step 3: Implement readiness evaluator**

Return:

```ts
export interface ReviewDisputeReadinessResult {
  readyForNormalResolution: boolean
  missingRequired: string[]
  missingRecommended: string[]
  warningRecipients: Array<'reviewee' | 'counterparty' | 'admin'>
}
```

- [ ] **Step 4: Verify Task 2**

Run: `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/reviews/tests/backend/unit/review_dispute_readiness.spec.ts`

Expected: all tests in file pass.

---

### Task 3: Database Tables and Models

**Files:**
- Create: `database/migrations/<timestamp>_create_project_sprint_reviews_tables.ts`
- Create: `app/modules/reviews/infra/models/project_sprint.ts`
- Create: `app/modules/reviews/infra/models/sprint_review_package.ts`
- Create: `app/modules/reviews/infra/models/sprint_manager_review.ts`
- Create: `app/modules/reviews/infra/models/sprint_environment_review.ts`
- Test: `app/modules/reviews/tests/backend/integration/project_sprint_schema.spec.ts`

**Interfaces:**
- Consumes: status and target type literals from `sprint_review_rules.ts`
- Produces: tables and models used by later commands

- [ ] **Step 1: Write failing schema integration test**

Test creates org, project, sprint, package, manager review, project environment review, and organization environment review.

- [ ] **Step 2: Run red test**

Run: `node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/reviews/tests/backend/integration/project_sprint_schema.spec.ts`

Expected: fail because tables/models do not exist.

- [ ] **Step 3: Add migration**

Tables:

- `project_sprints`
- `sprint_review_packages`
- `sprint_manager_reviews`
- `sprint_environment_reviews`

Constraints:

- package unique on `(sprint_id, reviewer_id)`;
- manager review unique on `(package_id, target_user_id)`;
- environment review unique on `(package_id, target_type)`;
- environment target type check: `project`, `organization`;
- sprint status check: `draft`, `active`, `review_open`, `review_closed`, `archived`.

- [ ] **Step 4: Add models**

Follow existing Lucid model style in `app/modules/reviews/infra/models`.

- [ ] **Step 5: Verify Task 3**

Run: `node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/reviews/tests/backend/integration/project_sprint_schema.spec.ts`

Expected: schema integration passes.

---

### Task 4: Close Sprint and Open Packages

**Files:**
- Create: `app/modules/reviews/actions/commands/close_project_sprint_command.ts`
- Test: `app/modules/reviews/tests/backend/integration/close_project_sprint.spec.ts`

**Interfaces:**
- Consumes: `canTransitionProjectSprint`
- Produces: `CloseProjectSprintCommand.execute({ sprint_id })`

- [ ] **Step 1: Write failing integration test**

Test that closing an active project sprint:

- changes status to `review_open`;
- writes `review_opened_at`;
- creates packages for eligible sprint participants;
- does not create packages for unrelated org members.

- [ ] **Step 2: Run `gitnexus impact` before editing existing project/review symbols**

Run impact for any existing function selected for modification before editing it.

- [ ] **Step 3: Implement command with narrow DB queries**

Derive eligible reviewers from project members and sprint task activity.

- [ ] **Step 4: Verify Task 4**

Run: `node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/reviews/tests/backend/integration/close_project_sprint.spec.ts`

Expected: integration passes.

---

### Task 5: Submit Sprint Review Package

**Files:**
- Create: `app/modules/reviews/actions/commands/submit_sprint_review_package_command.ts`
- Test: `app/modules/reviews/tests/backend/integration/submit_sprint_review_package.spec.ts`

**Interfaces:**
- Consumes: `validateSprintReviewPackage`
- Produces: `SubmitSprintReviewPackageCommand.execute(dto)`

- [ ] **Step 1: Write failing integration tests**

Cover:

- submit package creates project environment review;
- submit package creates organization environment review;
- submit package creates one manager review per selected eligible manager;
- self manager target rejected;
- missing organization environment review rejected.

- [ ] **Step 2: Implement command**

Use transaction:

- lock package;
- validate package is pending;
- validate targets;
- insert child review rows;
- mark package submitted.

- [ ] **Step 3: Verify Task 5**

Run: `node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/reviews/tests/backend/integration/submit_sprint_review_package.spec.ts`

Expected: integration passes.

---

### Task 6: Admin Dossier Readiness Gate

**Files:**
- Modify: `app/modules/reviews/actions/commands/resolve_review_dispute_command.ts`
- Modify: `app/modules/reviews/actions/support/review_dispute_case_file_builder.ts` only if missing snapshots need normalization
- Test: `app/modules/reviews/tests/backend/integration/review_dispute_resolution_readiness.spec.ts`

**Interfaces:**
- Consumes: `evaluateReviewDisputeReadiness`
- Produces: normal resolve blocked when required case file data is missing

- [ ] **Step 1: Run impact analysis**

Run: `gitnexus impact ResolveReviewDisputeCommand`

If risk is HIGH or CRITICAL, report blast radius before editing.

- [ ] **Step 2: Write failing integration tests**

Cover:

- normal resolve blocked when latest case file lacks required data;
- override resolve works only with explicit override reason;
- blocking result includes missing data keys.

- [ ] **Step 3: Extend DTO**

Add optional:

```ts
override_readiness?: boolean
override_reason?: string | null
```

- [ ] **Step 4: Apply readiness before update**

Normal resolve requires `readyForNormalResolution = true`.

Override requires non-empty `override_reason`.

- [ ] **Step 5: Verify Task 6**

Run: `node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/reviews/tests/backend/integration/review_dispute_resolution_readiness.spec.ts`

Expected: integration passes.

---

### Task 7: API Routes and Controllers

**Files:**
- Modify: `start/routes/reviews.ts`
- Modify: project route file that owns `/api/v1/projects/:projectId`
- Create controllers for project sprint and package APIs
- Test: `app/modules/reviews/tests/backend/contract/sprint_review_api_standardization.contract.spec.ts`

**Interfaces:**
- Consumes: close and submit commands
- Produces: canonical JSON surfaces listed in design spec

- [ ] **Step 1: Write failing contract tests**

Cover route contracts:

- list/create project sprints;
- close/open review;
- list own sprint packages;
- submit package.

- [ ] **Step 2: Run impact for route symbols before editing**

Run impact on touched route/controller symbols.

- [ ] **Step 3: Implement controllers and routes**

Use existing API v1 response wrappers and auth contracts.

- [ ] **Step 4: Verify Task 7**

Run: `node --import=@poppinss/ts-exec bin/test.ts contract --files app/modules/reviews/tests/backend/contract/sprint_review_api_standardization.contract.spec.ts`

Expected: contract passes.

---

### Task 8: Frontend Sprint Review Inbox and Project Sprint UI

**Files:**
- Create: `inertia/pages/reviews/sprint-packages/index.svelte`
- Create: `inertia/pages/reviews/sprint-packages/show.svelte`
- Create: `inertia/pages/projects/components/sprints/project_sprint_panel.svelte`
- Modify relevant project detail page to mount sprint panel
- Test: component tests under `inertia/tests/component/reviews` and `inertia/tests/component/projects`

**Interfaces:**
- Consumes: package and sprint API contracts
- Produces: user-facing package submission and project sprint management

- [ ] **Step 1: Write failing component tests**

Cover:

- pending package renders manager targets;
- environment section requires project and org responses;
- submitted package is read-only;
- project sprint panel shows close action only when actor can manage sprint.

- [ ] **Step 2: Implement UI components**

Keep UI operational and dense. Avoid marketing-style page treatment.

- [ ] **Step 3: Verify Task 8**

Run: `pnpm exec vitest run inertia/tests/component/reviews/sprint_review_package.test.ts inertia/tests/component/projects/project_sprint_panel.test.ts`

Expected: component tests pass.

---

### Task 9: Organization and Project Environment Aggregates

**Files:**
- Create aggregate query/service in reviews or organizations module
- Modify organization profile/list read models
- Modify project detail read model
- Test backend unit/integration and frontend component tests

**Interfaces:**
- Consumes: `sprint_environment_reviews`
- Produces: org/project environment score, count, confidence label, recent trend

- [ ] **Step 1: Write failing aggregate tests**

Cover:

- project aggregate uses only project target rows;
- organization aggregate uses only organization target rows;
- low review count returns weak confidence;
- flagged/disputed rows can be excluded later without changing public shape.

- [ ] **Step 2: Implement aggregate query**

Return:

```ts
{
  averageRating: number | null
  reviewCount: number
  confidence: 'insufficient' | 'low' | 'medium' | 'high'
  trend: 'improving' | 'stable' | 'declining' | 'unknown'
}
```

- [ ] **Step 3: Wire read models and UI**

Show environment score in organization listing/profile and project detail.

- [ ] **Step 4: Verify Task 9**

Run targeted backend and frontend tests added in this task.

---

### Task 10: E2E Coverage and Change Detection

**Files:**
- Create: `inertia/tests/e2e/reviews/sprint_reverse_review_flow.spec.ts`
- Modify docs feature file if runtime behavior changes

**Interfaces:**
- Consumes: all previous tasks
- Produces: full-flow proof

- [ ] **Step 1: Write E2E flow**

Flow:

- seed project sprint with worker, manager, project, org;
- close sprint;
- worker opens package;
- worker submits project/org environment reviews and one manager review;
- manager profile signal is observable in backend/API;
- organization listing shows environment aggregate.

- [ ] **Step 2: Run E2E**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/reviews/sprint_reverse_review_flow.spec.ts --reporter=line`

Expected: E2E passes.

- [ ] **Step 3: Run detect changes before commit**

Run: `gitnexus detect-changes`

Expected: affected files/symbols match sprint review, dispute readiness, project/org environment surfaces.

- [ ] **Step 4: Run focused final suite**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/reviews/tests/backend/unit/sprint_review_rules.spec.ts --files app/modules/reviews/tests/backend/unit/review_dispute_readiness.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/reviews/tests/backend/integration/close_project_sprint.spec.ts --files app/modules/reviews/tests/backend/integration/submit_sprint_review_package.spec.ts --files app/modules/reviews/tests/backend/integration/review_dispute_resolution_readiness.spec.ts
node --import=@poppinss/ts-exec bin/test.ts contract --files app/modules/reviews/tests/backend/contract/sprint_review_api_standardization.contract.spec.ts
```

Expected: all targeted tests pass.

## Self-Review Notes

Spec coverage:

- project sprint truth: Tasks 1, 3, 4, 7, 8
- task review/dispute preservation: Task 6 keeps changes scoped to readiness gate
- multi-manager reverse reviews: Tasks 1, 5, 8
- project/org environment targets: Tasks 1, 5, 9
- admin missing-data warnings/gate: Tasks 2, 6, 8
- public organization signal: Task 9

Execution should start with Task 1 and Task 2 because they are pure domain slices and reduce uncertainty before DB/UI work.
