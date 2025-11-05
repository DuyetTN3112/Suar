# Task Review Dispute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a clear separation between task comments and dispute exchange, enforce review-zone quorum (`1 manager + 2 peers + creator review`), and complete the end-to-end review/dispute/reverse-review surfaces across backend and frontend.

**Architecture:** Keep `task_comments` in the `tasks` domain as work-context discussion. Keep dispute exchange in the `reviews` domain as the formal bilateral argument room opened only after reviewee disputes a completed review. Reuse existing routes and tables where possible, and strengthen read models plus UI state instead of introducing a new comment platform.

**Tech Stack:** AdonisJS, Lucid/PostgreSQL, Svelte + Inertia, existing notification public API, existing review/dispute infrastructure, test suite under `app/modules/*/tests`, `tests/integration`, and `inertia/tests`.

## Global Constraints

- Keep task comments and dispute exchange as separate concepts and separate UI surfaces.
- Do not create a generic cross-domain comment module in this phase.
- Task comments may be marked `review_relevance` and included as dispute context, but they do not become dispute messages.
- Dispute exchange must exist only after reviewee explicitly disputes a completed review.
- `report` escalation must be available only after real two-side exchange has happened in the dispute room.
- Review quorum must require `1 manager + 2 peers + creator review`.
- Preserve existing route shapes unless a change is strictly required.
- Follow TDD: write failing tests first, verify red, implement minimal code, verify green.

---

## File Structure

### Backend review governance

- Modify: `app/modules/reviews/actions/commands/confirm_review_command.ts`
- Modify: `app/modules/reviews/actions/commands/create_review_dispute_command.ts`
- Modify: `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- Modify: `app/modules/reviews/actions/commands/submit_skill_review_command.ts`
- Modify: `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`
- Modify: `app/modules/reviews/domain/review_formulas.ts`
- Modify: `app/modules/reviews/controllers/show_review_controller.ts`
- Modify: `app/modules/reviews/actions/queries/get_review_show_page_query.ts`
- Modify or create: `app/modules/reviews/actions/queries/get_user_dispute_detail_query.ts` or the existing query used by `show_user_dispute_controller.ts`

### Backend task comment and review-context read model

- Modify: `app/modules/tasks/controllers/task_submission_controller.ts`
- Modify: `app/modules/tasks/actions/commands/create_task_comment_command.ts`
- Modify: `app/modules/tasks/actions/support/task_comment_mentions.ts`
- Create or modify query/helper for review-relevant task comments if needed under `app/modules/tasks/actions/queries/` or `app/modules/reviews/actions/queries/`

### Frontend task/review/dispute/org surfaces

- Modify: `inertia/pages/tasks/components/detail/task_discussion_tab.svelte`
- Modify: `inertia/pages/tasks/components/detail/task_review_zone_card.svelte`
- Modify: `inertia/pages/reviews/show.svelte`
- Modify: `inertia/pages/reviews/components/confirmation_panel.svelte`
- Modify: `inertia/pages/reviews/components/review_related_task_comments_panel.svelte`
- Modify: `inertia/pages/reviews/disputes/show.svelte`
- Modify dispute tab components under `inertia/pages/reviews/disputes/components/`
- Modify: `inertia/pages/organizations/show.svelte`

### Tests

- Modify or create: `app/modules/reviews/tests/integration/confirm_review.spec.ts`
- Modify or create: `app/modules/reviews/tests/integration/review_disputes_api_standardization.spec.ts`
- Modify or create: `app/modules/reviews/tests/unit/review_formulas.spec.ts`
- Modify or create: task comment integration tests near `app/modules/tasks/tests/` or existing integration suites using `/api/v1/tasks/:taskId/comments`
- Modify or create: organization review page/query tests near `app/modules/organizations/tests/` and mapper tests
- Modify or create: frontend tests under `inertia/tests/`

## Task 1: Lock Review Quorum and Session Completion Rules

**Files:**
- Modify: `app/modules/reviews/domain/review_formulas.ts`
- Modify: `app/modules/reviews/actions/commands/submit_skill_review_command.ts`
- Modify: `app/modules/reviews/actions/commands/create_review_session_command.ts`
- Modify: `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`
- Test: `app/modules/reviews/tests/unit/review_formulas.spec.ts`
- Test: `app/modules/reviews/tests/integration/create_session.spec.ts`

**Interfaces:**
- Consumes: existing `isReviewSessionQuorumSatisfied`, `determineSessionStatus`, reviewer assignment generation.
- Produces: stable quorum semantics that later tasks rely on:
  - `minimum_manager_reviews = 1`
  - `minimum_peer_reviews = 2`
  - `creator_review_completed = true` required for `completed`

Note: this section documents the legacy `review_sessions` quorum. The newer task Review Board quorum is separate: task giver plus one colleague reviewer, with partial quorum shown as `in_review`.

- [ ] **Step 1: Write failing quorum tests**

Add tests proving:
- one manager + one peer + creator complete is still not enough;
- one manager + two peers without creator complete is still not enough;
- one manager + two peers + creator complete becomes complete.

- [ ] **Step 2: Run unit tests to verify red**

Run: `npm run test:unit -- review_formulas`
Expected: FAIL in quorum/status assertions.

- [ ] **Step 3: Write failing integration session tests**

Add or update integration coverage so stored sessions and reviewer assignments reflect the stronger quorum contract.

- [ ] **Step 4: Run integration tests to verify red**

Run: `npm run test:unit -- create_session`
Expected: FAIL on expected peer minimum or creator-required assertions.

- [ ] **Step 5: Implement minimal quorum changes**

Update defaults and completion logic so `completed` only happens after all three quorum conditions are met.

- [ ] **Step 6: Run targeted tests to verify green**

Run:
- `npm run test:unit -- review_formulas`
- `npm run test:unit -- create_session`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/modules/reviews/domain/review_formulas.ts app/modules/reviews/actions/commands/submit_skill_review_command.ts app/modules/reviews/actions/commands/create_review_session_command.ts app/modules/reviews/actions/support/review_session_reviewer_assignments.ts app/modules/reviews/tests/unit/review_formulas.spec.ts app/modules/reviews/tests/integration/create_session.spec.ts
git commit -m "feat: enforce review quorum rules"
```

## Task 2: Canonicalize Dispute Creation from Review Confirmation

**Files:**
- Modify: `app/modules/reviews/actions/commands/confirm_review_command.ts`
- Modify: `app/modules/reviews/actions/commands/create_review_dispute_command.ts`
- Modify or create: shared helper under `app/modules/reviews/actions/commands/` or `app/modules/reviews/actions/support/`
- Test: `app/modules/reviews/tests/integration/confirm_review.spec.ts`
- Test: `app/modules/reviews/tests/integration/review_disputes_api_standardization.spec.ts`

**Interfaces:**
- Consumes: completed review sessions from Task 1.
- Produces:
  - a single canonical dispute-creation path;
  - `ConfirmReviewCommand` delegates when `action = disputed`.

- [ ] **Step 1: Write failing integration test for disputed confirm path**

Test should prove:
- reviewee confirming with `disputed` creates exactly one dispute;
- dispute fields come from canonical creation logic;
- session status becomes `disputed`.

- [ ] **Step 2: Run targeted tests to verify red**

Run: `npm run test:unit -- confirm_review`
Expected: FAIL because confirm path still uses legacy insert logic or mismatched behavior.

- [ ] **Step 3: Write failing API-level test for duplicate/disconnected dispute behavior**

Cover regression where direct dispute creation and confirm-dispute path could diverge.

- [ ] **Step 4: Run dispute API tests to verify red**

Run: `npm run test:unit -- review_disputes_api_standardization`
Expected: FAIL on canonical behavior assertions.

- [ ] **Step 5: Implement shared dispute creation logic**

Refactor so:
- `ConfirmReviewCommand` records confirmation history;
- canonical dispute creator owns dispute row creation;
- duplicate active disputes are prevented centrally.

- [ ] **Step 6: Run targeted tests to verify green**

Run:
- `npm run test:unit -- confirm_review`
- `npm run test:unit -- review_disputes_api_standardization`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/modules/reviews/actions/commands/confirm_review_command.ts app/modules/reviews/actions/commands/create_review_dispute_command.ts app/modules/reviews/tests/integration/confirm_review.spec.ts app/modules/reviews/tests/integration/review_disputes_api_standardization.spec.ts
git commit -m "refactor: unify dispute creation flow"
```

## Task 3: Enforce Dispute Exchange Before Admin Escalation

**Files:**
- Modify: `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- Modify: query/controller code that loads dispute comments for user dispute detail
- Test: `app/modules/reviews/tests/integration/review_dispute_observability.spec.ts`
- Test: `app/modules/reviews/tests/integration/review_disputes_api_standardization.spec.ts`

**Interfaces:**
- Consumes: canonical dispute records from Task 2.
- Produces:
  - `report` available only after actual dispute exchange;
  - explicit validation for empty/no-op escalation attempts.

- [ ] **Step 1: Write failing test for early escalation rejection**

Test should prove reviewee cannot report a dispute with no back-and-forth yet.

- [ ] **Step 2: Run targeted dispute tests to verify red**

Run: `npm run test:unit -- review_disputes_api_standardization`
Expected: FAIL because early escalation is still accepted.

- [ ] **Step 3: Add failing success-path test**

Create a dispute, add at least one message from each side, then report successfully.

- [ ] **Step 4: Run tests to verify mixed red**

Run same dispute suite.
Expected: one rejection assertion and one success-path assertion fail before implementation.

- [ ] **Step 5: Implement minimal escalation guard**

Use existing dispute comments timeline to require meaningful exchange before `admin_reviewing`.

- [ ] **Step 6: Run targeted tests to verify green**

Run:
- `npm run test:unit -- review_disputes_api_standardization`
- `npm run test:unit -- review_dispute_observability`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/modules/reviews/actions/commands/report_review_dispute_command.ts app/modules/reviews/tests/integration/review_disputes_api_standardization.spec.ts app/modules/reviews/tests/integration/review_dispute_observability.spec.ts
git commit -m "feat: require dispute exchange before escalation"
```

## Task 4: Strengthen Task Comment Semantics and Review-Relevant Read Model

**Files:**
- Modify: `app/modules/tasks/controllers/task_submission_controller.ts`
- Modify: `app/modules/tasks/actions/commands/create_task_comment_command.ts`
- Modify: `app/modules/tasks/actions/support/task_comment_mentions.ts`
- Create or modify: helper/query for loading review-relevant task comments
- Test: task comment integration tests under existing tasks test area

**Interfaces:**
- Consumes: existing `task_comments`, mention support.
- Produces:
  - stable distinction between task discussion and dispute exchange;
  - read model for review-relevant task comments with mentions and author info.

- [ ] **Step 1: Write failing task comment tests**

Cover:
- create/update/delete comment;
- new mentions trigger notifications;
- existing mentions do not re-notify on edit;
- review-relevant comments can be filtered for review/dispute usage.

- [ ] **Step 2: Run targeted tests to verify red**

Run: `npm run test:unit -- task comment`
Expected: FAIL on missing filter or notification assertions.

- [ ] **Step 3: Implement minimal backend changes**

Keep comment routes stable, but ensure serialized responses are strong enough for:
- reply-aware rendering;
- mention badges;
- `review_relevance` support panels.

- [ ] **Step 4: Run targeted tests to verify green**

Run task comment test subset again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/modules/tasks/controllers/task_submission_controller.ts app/modules/tasks/actions/commands/create_task_comment_command.ts app/modules/tasks/actions/support/task_comment_mentions.ts
git commit -m "feat: strengthen task comment review context"
```

## Task 5: Expose Task Review Context in Review and Dispute Queries

**Files:**
- Modify: `app/modules/reviews/actions/queries/get_review_show_page_query.ts`
- Modify: query used by `app/modules/reviews/controllers/show_user_dispute_controller.ts`
- Modify: `app/modules/reviews/controllers/show_review_controller.ts`
- Test: review/dispute query tests near existing review query suites

**Interfaces:**
- Consumes: review-relevant task comments from Task 4.
- Produces:
  - review page props include task comment context when needed;
  - dispute page props include supporting task-comment evidence separate from dispute messages.

- [ ] **Step 1: Write failing review/dispute query tests**

Assert returned payload separates:
- `taskComments` or equivalent support context;
- `disputeComments` or equivalent exchange timeline.

- [ ] **Step 2: Run query tests to verify red**

Run targeted review query tests.
Expected: FAIL because support context is absent or conflated.

- [ ] **Step 3: Implement minimal query/controller changes**

Expose review-relevant task comments as separate props for review/dispute pages.

- [ ] **Step 4: Run query tests to verify green**

Run targeted query tests again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/modules/reviews/actions/queries/get_review_show_page_query.ts app/modules/reviews/controllers/show_review_controller.ts
git commit -m "feat: expose task review context in dispute surfaces"
```

## Task 6: Update Task Detail UI for Discussion vs Review Zone

**Files:**
- Modify: `inertia/pages/tasks/components/detail/task_discussion_tab.svelte`
- Modify: `inertia/pages/tasks/components/detail/task_review_zone_card.svelte`
- Test: `inertia/tests/` task detail coverage

**Interfaces:**
- Consumes: strengthened task comment API from Task 4.
- Produces:
  - clearer task discussion UI;
  - clearer review-zone progress and governance messaging.

- [ ] **Step 1: Write failing frontend tests for task discussion semantics**

Assert UI distinguishes:
- task discussion;
- review-related note badges;
- navigation to review/dispute rather than mixing argument into task tab.

- [ ] **Step 2: Run frontend tests to verify red**

Run: `npm run test:unit -- inertia task discussion`
Expected: FAIL on missing labels or state copy.

- [ ] **Step 3: Implement minimal UI changes**

Update copy, badges, and status cards without changing the underlying route structure.

- [ ] **Step 4: Run frontend tests to verify green**

Run targeted task UI tests again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add inertia/pages/tasks/components/detail/task_discussion_tab.svelte inertia/pages/tasks/components/detail/task_review_zone_card.svelte
git commit -m "feat: clarify task discussion and review zone"
```

## Task 7: Build Dedicated Dispute Exchange UX

**Files:**
- Modify: `inertia/pages/reviews/disputes/show.svelte`
- Modify: dispute tab components under `inertia/pages/reviews/disputes/components/`
- Modify: `inertia/pages/reviews/components/review_related_task_comments_panel.svelte`
- Test: `inertia/tests/` dispute page coverage

**Interfaces:**
- Consumes: separated dispute/task-comment payloads from Task 5.
- Produces:
  - clear bilateral dispute room;
  - support evidence panel for task comments;
  - report button gated behind real exchange.

- [ ] **Step 1: Write failing frontend dispute tests**

Cover:
- dispute exchange messages render as the primary thread;
- support task comments render separately;
- report action hidden or disabled before enough exchange exists.

- [ ] **Step 2: Run frontend tests to verify red**

Run: `npm run test:unit -- inertia dispute`
Expected: FAIL on separation and escalation gating assertions.

- [ ] **Step 3: Implement minimal dispute UI changes**

Make the page feel like a bilateral argument room:
- obvious chronology;
- side labels;
- separate support evidence section;
- escalation control appears only after exchange threshold is met.

- [ ] **Step 4: Run frontend tests to verify green**

Run targeted dispute UI tests again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add inertia/pages/reviews/disputes/show.svelte inertia/pages/reviews/components/review_related_task_comments_panel.svelte inertia/pages/reviews/disputes/components
git commit -m "feat: add dispute exchange room ui"
```

## Task 8: Improve Review Confirmation and Reverse Review Surfaces

**Files:**
- Modify: `inertia/pages/reviews/show.svelte`
- Modify: `inertia/pages/reviews/components/confirmation_panel.svelte`
- Modify reverse-review related components if needed
- Test: `inertia/tests/` review show coverage

**Interfaces:**
- Consumes: canonical confirm/dispute behavior from Tasks 2 and 3.
- Produces:
  - clear confirm vs dispute choice;
  - explicit explanation that dispute opens the exchange room;
  - clearer reverse-review expectations after confirmation or dispute.

- [ ] **Step 1: Write failing review-page frontend tests**

Assert the page explains:
- dispute opens formal exchange room;
- task comments are separate context;
- reverse review remains available after session closure.

- [ ] **Step 2: Run frontend tests to verify red**

Run: `npm run test:unit -- inertia review show`
Expected: FAIL on missing copy or controls.

- [ ] **Step 3: Implement minimal review page updates**

Refresh confirmation copy and reverse-review target presentation.

- [ ] **Step 4: Run frontend tests to verify green**

Run targeted review UI tests again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add inertia/pages/reviews/show.svelte inertia/pages/reviews/components/confirmation_panel.svelte
git commit -m "feat: clarify review confirmation flow"
```

## Task 9: Strengthen Organization Review and Reverse Review Display

**Files:**
- Modify: `app/modules/organizations/actions/queries/get_organization_show_page_query.ts`
- Modify: `app/modules/organizations/controllers/show_organization_controller.ts`
- Modify: `inertia/pages/organizations/show.svelte`
- Test: organization query/page tests

**Interfaces:**
- Consumes: existing reverse review target stats.
- Produces:
  - stronger org review summary;
  - clearer recent organization review feed;
  - governance counts by target type.

- [ ] **Step 1: Write failing organization query/frontend tests**

Assert the page shows:
- organization review totals;
- average rating;
- anonymous count;
- recent organization reviews;
- governance counts by target type.

- [ ] **Step 2: Run tests to verify red**

Run targeted organization tests.
Expected: FAIL on missing fields or shallow rendering.

- [ ] **Step 3: Implement minimal query/UI changes**

Keep current route and data shape where possible, but improve cards and feed presentation.

- [ ] **Step 4: Run tests to verify green**

Run targeted organization tests again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/modules/organizations/actions/queries/get_organization_show_page_query.ts app/modules/organizations/controllers/show_organization_controller.ts inertia/pages/organizations/show.svelte
git commit -m "feat: improve organization review surface"
```

## Task 10: Full Verification and Regression Sweep

**Files:**
- Modify: any remaining test fixtures or docs touched by earlier tasks
- Test: all relevant backend/frontend suites

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: verified integrated behavior across task comments, review zone, dispute exchange, escalation, and organization review.

- [ ] **Step 1: Run targeted backend suites**

Run:
- `npm run test:unit -- confirm_review`
- `npm run test:unit -- review_disputes_api_standardization`
- `npm run test:unit -- review_formulas`
- task comment test subset

Expected: PASS.

- [ ] **Step 2: Run targeted frontend suites**

Run relevant `inertia/tests` subsets for:
- task detail;
- review show;
- dispute show;
- organization show.

Expected: PASS.

- [ ] **Step 3: Run static verification**

Run:
- `npm run typecheck`
- `npm run lint`

Expected: PASS or only known pre-existing failures outside touched scope.

- [ ] **Step 4: Review git diff scope**

Run:
- `git diff --stat`
- `gitnexus detect-changes`

Expected: changed symbols and flows match task/review/dispute/org scope.

- [ ] **Step 5: Commit final integration pass**

```bash
git add .
git commit -m "feat: complete task review dispute flow"
```

## Self-Review

### Spec coverage

- Task comments with mentions and notifications: covered by Tasks 4, 6, 10.
- Separation between task comments and dispute exchange: covered by Tasks 4, 5, 7, 8.
- Review quorum `1 manager + 2 peers + creator`: covered by Task 1.
- Confirm vs dispute and opening dispute room: covered by Tasks 2, 7, 8.
- Report to admin only after failed bilateral exchange: covered by Task 3 and Task 7.
- Reverse review and organization review stats/surfaces: covered by Tasks 8 and 9.

### Placeholder scan

- No `TODO`/`TBD` placeholders left.
- Each task identifies exact file groups and verification commands.

### Type consistency

- The plan keeps existing route shapes and existing concepts:
  - `task_comments` remain task-domain;
  - `review_disputes` / `review_dispute_comments` remain review-domain;
  - page props should expose separated support context vs exchange messages.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-task-review-dispute-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
