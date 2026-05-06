# Sprint Reverse Review Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two sprint-level reverse review boards: assigner reviews and one shared environment review.

**Architecture:** Keep existing `sprint_review_packages`, `sprint_manager_reviews`, and `sprint_environment_reviews` as submitted review records. Add workflow tables and board queries for status, responder, discussion, and escalation.

**Tech Stack:** AdonisJS, Lucid/raw PostgreSQL, Japa integration tests, Svelte/Inertia, Playwright.

## Global Constraints

- Reverse review is sprint-level, not task-level.
- Closing sprint N requires all task review workflows for sprint N tasks to be `done`.
- Closing sprint N opens reverse review workflows and creates sprint N+1.
- Closing sprint N+1 requires all reverse review workflows from sprint N to be `done`.
- Reviewer eligibility comes from real sprint task work evidence, not membership alone.
- Users outside project/org can review if they worked on a sprint task.
- Assigner board cards group by assigner/creator target.
- Environment board creates one shared environment card per eligible reviewer/sprint.
- Both reverse boards expose statuses: `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `done`.
- Current reverse-review submit is single-review and normally moves directly from `awaiting_review` to `awaiting_response`; `in_review` is a shared lane for consistency and future multi-review reverse rules.
- Environment review covers project, org, and co-worker environment together.
- Environment responder priority is project owner, project manager, org owner, then org admin.
- Environment review appears on organization detail.
- Disputed workflows can still be accepted into `done`.
- Sprint review tasks are read-only: view detail only, no edit/delete.
- Workflow tables are storage-only: no DB foreign keys, status checks, rating checks, or unique business constraints. Commands/queries own existence checks, duplicate prevention, state transitions, task evidence validation, responder authority, and permissions.
- Use TDD before production behavior edits.
- Run `gitnexus impact <symbolName>` before editing existing functions/classes/methods.
- Run `gitnexus detect-changes` before completion/commit.

---

## Task 1: Workflow Schema

**Files:**
- Create: `database/migrations/20260715100000_create_sprint_reverse_review_workflows.ts`
- Test: `app/modules/reviews/tests/backend/integration/sprint_reverse_review_board.spec.ts`

**Steps:**

- [ ] Write failing schema test inserting one workflow and one message.
- [ ] Write failing schema test proving `task_review_*` and `sprint_reverse_review_*` workflow tables have no DB foreign keys/check constraints/unique business constraints.
- [ ] Run: `npm run test:integration -- --files app/modules/reviews/tests/backend/integration/sprint_reverse_review_board.spec.ts`
- [ ] Add migration with `sprint_reverse_review_workflows` and `sprint_reverse_review_messages`.
- [ ] Run migration and test until green.

## Task 2: Workflow Creation On Sprint Review Open

**Files:**
- Modify: `app/modules/reviews/actions/commands/close_project_sprint_review_command.ts`
- Potentially modify: `app/modules/sprints/actions/commands/create_project_sprint_command.ts`
- Test: `app/modules/reviews/tests/backend/integration/sprint_reverse_review_board.spec.ts`

**Steps:**

- [ ] Run `gitnexus impact CloseProjectSprintReviewCommand`.
- [ ] Add failing tests for:
  - close sprint blocked while sprint task review workflows are not `done`;
  - close sprint opens reverse review workflows and creates next active sprint;
  - close sprint blocked when previous sprint has unfinished reverse review workflows;
  - assigner workflows grouped by assigner for reviewer;
  - outside project/org worker eligible from task evidence;
  - member without task evidence excluded;
  - one shared environment workflow created per eligible reviewer;
  - environment responder uses project owner/manager before org owner/admin.
- [ ] Implement workflow creation after package creation in the same transaction.
- [ ] Verify command tests pass.

## Task 3: Board Query And Detail

**Files:**
- Create: `app/modules/reviews/domain/sprint_reverse_review_workflow.ts`
- Create: `app/modules/reviews/actions/queries/get_sprint_reverse_review_board_query.ts`
- Test: `app/modules/reviews/tests/backend/integration/sprint_reverse_review_board.spec.ts`

**Steps:**

- [ ] Add failing tests for board columns and selected detail.
- [ ] Implement status columns and detail payload, including shared `in_review` lane.
- [ ] Include related task list for assigner workflows.
- [ ] Include target/responder profile data.
- [ ] Verify tests pass.

## Task 4: Actions

**Files:**
- Create: `app/modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command.ts`
- Create: `app/modules/reviews/actions/commands/accept_sprint_reverse_review_workflow_command.ts`
- Create: `app/modules/reviews/actions/commands/respond_sprint_reverse_review_workflow_command.ts`
- Create: `app/modules/reviews/actions/commands/report_sprint_reverse_review_workflow_command.ts`
- Test: `app/modules/reviews/tests/backend/integration/sprint_reverse_review_board.spec.ts`

**Steps:**

- [ ] Add failing tests for submit -> `awaiting_response`.
- [ ] Add failing tests for accept -> `done`.
- [ ] Add failing tests for response -> `disputed`.
- [ ] Add failing tests for disputed accept -> `done`.
- [ ] Add failing tests for report -> `reported`.
- [ ] Implement commands with actor guards.
- [ ] Write submitted reviews into existing sprint review tables on submit.

## Task 5: Routes And Controllers

**Files:**
- Modify: `start/routes/reviews.ts`
- Create controllers under `app/modules/reviews/controllers/*sprint_reverse_review*`
- Modify: `types/adonis.d.ts`

**Steps:**

- [ ] Run `gitnexus impact` for touched route/controller symbols.
- [ ] Add page route `/reviews/sprint-reverse-board`.
- [ ] Add POST routes for submit, accept, respond, report.
- [ ] Add Inertia page type.
- [ ] Verify route list compiles through integration tests.

## Task 6: Frontend Board

**Files:**
- Create: `inertia/apps/user/modules/reviews/sprint-reverse-board.svelte`
- Modify navigation under `inertia/apps/user/shared/components/navigation`

**Steps:**

- [ ] Build two tabs: `Người giao task` and `Môi trường`.
- [ ] Render Kanban columns.
- [ ] Render assigner profile + related read-only task list.
- [ ] Render environment target + mandatory responder.
- [ ] Add submit/accept/respond/report controls.
- [ ] Add sidebar entry.
- [ ] Run `svelte-check` filtered for touched files.

## Task 7: E2E Demo Flow

**Files:**
- Modify: `start/routes/testing.ts`
- Create: `inertia/apps/user/tests/e2e/reviews/sprint_reverse_review_board_demo.spec.ts`

**Steps:**

- [ ] Seed owner, assigners A/B, worker, outside worker, sprint, tasks, workflows.
- [ ] Reviewer submits assigner review.
- [ ] Assigner accepts.
- [ ] Reviewer submits environment review.
- [ ] Owner disputes, then accepts.
- [ ] Save screenshots under `test-results/e2e-visual/sprint-reverse-review-board/`.
- [ ] Run Playwright Chromium test.
