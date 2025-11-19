# Task Review Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Kanban-style task Review Board with six review workflow statuses over delivery-done tasks while keeping those tasks in the normal Task Board done column.

**Architecture:** Add a task-level review workflow projection separate from task delivery status and existing review session status. Reuse existing task detail/comment data and review dispute case-file infrastructure for admin report packages. UI adds a project review board plus task-detail review thread/actions.

**Tech Stack:** AdonisJS/Lucid/Postgres, Inertia Svelte 5, Playwright, Vitest, Adonis integration tests, existing review/task modules.

## Global Constraints

- Review Board is separate from the normal Task Board.
- Normal delivery-done tasks remain in Task Board `done`.
- Review Board has exactly six statuses: `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `done`.
- Legacy `reviewed` workflow rows are normalized/read as `in_review`.
- `Chờ review` includes delivery-done project tasks, including the current user's own tasks for progress visibility.
- Review actions are allowed only for required reviewers; reviewee cannot review their own task.
- Every workflow requires at least two reviewers.
- Task giver is a required reviewer when not the reviewee.
- Second reviewer priority: high-ranking project role, high-ranking org role, project colleague with matching role/skills, other eligible org colleague.
- Reviewee is not forced to reply; `Đồng ý` completes the workflow.
- Reviewee reply/debate moves workflow to `disputed`.
- Reviewer or reviewee can report when workflow is `disputed`.
- Report moves workflow to `reported` and builds admin package.
- Admin resolution moves workflow to `done` and triggers score/profile projection.
- Review-visible delivery-done tasks cannot be deleted, but remain editable if permissions allow.
- Workflow tables are storage-only: no DB foreign keys, status checks, rating checks, or unique business constraints. Commands/queries own existence checks, duplicate prevention, state transitions, and permissions.

---

## File Structure

Backend domain/data:

- Create `app/modules/reviews/domain/task_review_workflow.ts`
  - constants, statuses, transition helpers, board column metadata.
- Create `app/modules/reviews/actions/queries/get_task_review_board_query.ts`
  - returns grouped board data for a project.
- Create `app/modules/reviews/actions/queries/get_task_review_detail_query.ts`
  - returns task detail, comments, workflow, review messages, permissions.
- Create `app/modules/reviews/actions/commands/ensure_task_review_workflow_command.ts`
  - creates projection for delivery-done task if missing.
- Create `app/modules/reviews/actions/commands/submit_task_review_message_command.ts`
  - creates review/debate message and transitions status.
- Create `app/modules/reviews/actions/commands/agree_task_review_command.ts`
  - reviewee agrees, status `done`.
- Create `app/modules/reviews/actions/commands/report_task_review_dispute_command.ts`
  - creates/reuses dispute, builds package, status `reported`.
- Create `app/modules/reviews/actions/commands/resolve_task_review_workflow_command.ts`
  - admin final done.
- Create `app/modules/reviews/infra/repositories/read/task_review_board_queries.ts`
  - SQL for board/detail.
- Create `app/modules/reviews/infra/repositories/write/task_review_workflow_mutations.ts`
  - SQL writes/transitions.
- Modify delete task command/controller path to block delete when delivery-done task is review-visible.

Backend HTTP:

- Create `app/modules/reviews/controllers/task_review_board_controller.ts`
- Create `app/modules/reviews/controllers/get_task_review_detail_controller.ts`
- Create `app/modules/reviews/controllers/submit_task_review_message_controller.ts`
- Create `app/modules/reviews/controllers/agree_task_review_controller.ts`
- Create `app/modules/reviews/controllers/report_task_review_dispute_controller.ts`
- Create `app/modules/reviews/controllers/admin_resolve_task_review_workflow_controller.ts`
- Modify `start/routes/reviews.ts`.

Frontend:

- Create `inertia/apps/org/modules/reviews/task-review-board.svelte`
- Create `inertia/apps/org/modules/reviews/components/task_review_board_column.svelte`
- Create `inertia/apps/org/modules/reviews/components/task_review_board_card.svelte`
- Create `inertia/apps/org/modules/reviews/components/task_review_detail_panel.svelte`
- Create `inertia/apps/org/modules/reviews/components/task_review_thread.svelte`
- Mirror user versions only if route renders user shell; otherwise keep org route primary.
- Add sidebar entry under `Review quality` or project detail entry.

Tests:

- Add `app/modules/reviews/tests/backend/integration/task_review_board.spec.ts`
- Add `app/modules/reviews/tests/backend/integration/task_review_workflow_actions.spec.ts`
- Add `inertia/apps/org/tests/modules/reviews/task_review_board.test.ts`
- Add `inertia/apps/org/tests/e2e/reviews/task_review_board_flow.spec.ts`

## Task 1: Domain Status and Board Projection Query

**Files:**

- Create: `app/modules/reviews/domain/task_review_workflow.ts`
- Create: `app/modules/reviews/infra/repositories/read/task_review_board_queries.ts`
- Create: `app/modules/reviews/actions/queries/get_task_review_board_query.ts`
- Test: `app/modules/reviews/tests/backend/integration/task_review_board.spec.ts`

**Interfaces:**

- Produces:
  - `TASK_REVIEW_WORKFLOW_STATUSES`
  - `TaskReviewWorkflowStatus`
  - `TASK_REVIEW_BOARD_COLUMNS`
  - `GetTaskReviewBoardQuery.execute({ projectId }): Promise<TaskReviewBoardResult>`

- [ ] **Step 1: Write failing integration test**

Test name:

```ts
test('review workflow board tables keep relationship and rule checks in application code', async ({
  assert,
}) => {
  // query pg_constraint for task_review_* and sprint_reverse_review_* tables
  // assert no contype f/u/c exists, only primary keys and indexes
})

test('review board awaiting_review includes all delivery-done project tasks, including own and others', async ({
  assert,
}) => {
  // seed project with two done tasks: one assigned to current user, one assigned to another member
  // call GetTaskReviewBoardQuery as a project member
  // assert both tasks appear in awaiting_review
  // assert normal task delivery status remains done
})
```

Run:

```bash
npm run test:integration -- --files app/modules/reviews/tests/backend/integration/task_review_board.spec.ts
```

Expected: FAIL because `GetTaskReviewBoardQuery` does not exist.

- [ ] **Step 2: Implement status constants**

Create `task_review_workflow.ts` with:

```ts
export const TASK_REVIEW_WORKFLOW_STATUSES = {
  AWAITING_REVIEW: 'awaiting_review',
  IN_REVIEW: 'in_review',
  AWAITING_RESPONSE: 'awaiting_response',
  DISPUTED: 'disputed',
  REPORTED: 'reported',
  DONE: 'done',
} as const

export type TaskReviewWorkflowStatus =
  (typeof TASK_REVIEW_WORKFLOW_STATUSES)[keyof typeof TASK_REVIEW_WORKFLOW_STATUSES]

export const TASK_REVIEW_BOARD_COLUMNS = [
  { status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW, label: 'Chờ review' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW, label: 'Đang review' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE, label: 'Chờ phản hồi' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED, label: 'Tranh chấp' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.REPORTED, label: 'Đã gửi report tranh chấp' },
  { status: TASK_REVIEW_WORKFLOW_STATUSES.DONE, label: 'Done' },
] as const
```

- [ ] **Step 3: Implement query using existing tables first**

Use current task tables and left join `task_review_workflows` if table exists in current schema. Until migration/table exists, query can read from `review_sessions`/`review_disputes` as compatibility but must expose the final `TaskReviewBoardResult` shape.

Result shape:

```ts
export interface TaskReviewBoardCard {
  taskId: string
  workflowId: string | null
  status: TaskReviewWorkflowStatus
  title: string
  description: string | null
  revieweeId: string | null
  revieweeName: string | null
  creatorId: string | null
  creatorName: string | null
  projectId: string
  reviewCount: number
  requiredReviewCount: number
  lastActivityAt: string | null
}

export interface TaskReviewBoardColumn {
  status: TaskReviewWorkflowStatus
  label: string
  cards: TaskReviewBoardCard[]
}

export interface TaskReviewBoardResult {
  projectId: string
  columns: TaskReviewBoardColumn[]
}
```

- [ ] **Step 4: Verify test passes**

Run same integration test.

Expected: PASS.

## Task 2: Reviewer Selection and Quorum

**Files:**

- Create: `app/modules/reviews/domain/task_review_reviewer_selection.ts`
- Create/modify: `app/modules/reviews/actions/commands/ensure_task_review_workflow_command.ts`
- Test: `app/modules/reviews/tests/backend/integration/task_review_workflow_actions.spec.ts`

**Interfaces:**

- Produces:
  - `selectTaskReviewers(input): { reviewerIds: string[]; reason: string }`
  - `EnsureTaskReviewWorkflowCommand.execute({ taskId }): Promise<{ workflowId: string }>`

- [ ] **Step 1: Write failing reviewer selection test**

Test:

```ts
test('required reviewers exclude task creator and reviewee, then use highest priority eligible colleagues', async ({
  assert,
}) => {
  // seed creator, reviewee, senior project member, regular member
  // ensure workflow for done task
  // assert creator id is not any reviewer
  // assert reviewee id is not any reviewer
  // assert selected reviewers are senior project member and next eligible colleague
})
```

Expected: FAIL because command/domain does not exist.

- [ ] **Step 2: Implement reviewer selection**

Selection order:

1. task giver (`assigner_id` first, creator fallback) when not the reviewee;
2. project member with highest seniority/rank excluding reviewee and already selected reviewer;
3. org member with highest seniority/rank excluding reviewee and already selected reviewer;
4. any eligible project colleague excluding reviewee and already selected reviewer;
5. require two official reviewers; fail workflow creation if quorum cannot be satisfied.

- [ ] **Step 3: Implement ensure command**

Command creates `task_review_workflows` row only when task delivery status is done. If schema table is absent, add migration/schema support in the same task before green.

- [ ] **Step 4: Verify tests pass**

Run:

```bash
npm run test:integration -- --files app/modules/reviews/tests/backend/integration/task_review_workflow_actions.spec.ts
```

Expected: PASS.

## Task 3: Review Messages and Status Transitions

**Files:**

- Create: `app/modules/reviews/actions/commands/submit_task_review_message_command.ts`
- Create: `app/modules/reviews/actions/commands/agree_task_review_command.ts`
- Modify: `app/modules/reviews/domain/task_review_workflow.ts`
- Test: `app/modules/reviews/tests/backend/integration/task_review_workflow_actions.spec.ts`

**Interfaces:**

- Produces:
  - `SubmitTaskReviewMessageCommand.execute({ workflowId, body, messageType })`
  - `AgreeTaskReviewCommand.execute({ workflowId })`

- [ ] **Step 1: Write failing transition tests**

Tests:

```ts
test('two required reviewer reviews move workflow to awaiting_response', async ({ assert }) => {})
test('reviewee agreement moves workflow to done and records completion', async ({ assert }) => {})
test('reviewee response message moves workflow to disputed', async ({ assert }) => {})
```

Expected: FAIL because commands are missing.

- [ ] **Step 2: Implement message command**

Rules:

- reviewer message type `review` increments/records review;
- first official review below quorum moves workflow to `in_review`;
- when required two reviewers have submitted review, workflow becomes `awaiting_response`;
- reviewee message type `reviewee_response` makes workflow `disputed`;
- ordinary reviewer messages in `disputed` keep status `disputed`.

- [ ] **Step 3: Implement agree command**

Rules:

- only reviewee can agree;
- only `awaiting_response` can agree;
- status becomes `done`;
- emits or calls existing profile projection hook used by review completion.

- [ ] **Step 4: Verify tests pass**

Run action integration test.

Expected: PASS.

## Task 4: Report Package and Admin Done

**Files:**

- Create: `app/modules/reviews/actions/commands/report_task_review_dispute_command.ts`
- Create: `app/modules/reviews/actions/commands/resolve_task_review_workflow_command.ts`
- Modify/reuse: `app/modules/reviews/actions/support/review_dispute_case_file_builder.ts`
- Test: `app/modules/reviews/tests/backend/integration/task_review_workflow_actions.spec.ts`

**Interfaces:**

- Produces:
  - `ReportTaskReviewDisputeCommand.execute({ workflowId, escalationReason })`
  - `ResolveTaskReviewWorkflowCommand.execute({ workflowId, finalDecision, finalRationale })`

- [ ] **Step 1: Write failing report/admin tests**

Tests:

```ts
test('reviewer or reviewee can report disputed workflow and package includes task comments and review messages', async ({
  assert,
}) => {})
test('admin resolution moves reported workflow to done and records final decision', async ({
  assert,
}) => {})
```

Expected: FAIL.

- [ ] **Step 2: Implement report command**

Rules:

- allowed actors: reviewee, required reviewers;
- source status must be `disputed`;
- creates/reuses `review_disputes`;
- builds case file including task snapshot, task comments, review workflow snapshot, review messages;
- status becomes `reported`.

- [ ] **Step 3: Implement admin done command**

Rules:

- system admin only;
- source status must be `reported`;
- status becomes `done`;
- stores final decision/rationale;
- triggers profile scoring/projection hook.

- [ ] **Step 4: Verify tests pass**

Run action integration test.

Expected: PASS.

## Task 5: Delete Lock

**Files:**

- Modify task delete command/controller currently used by task delete route.
- Test: existing task integration delete test or new `app/modules/tasks/tests/backend/integration/task_review_delete_lock.spec.ts`.

**Interfaces:**

- Produces backend invariant: review-visible delivery-done task cannot be deleted.

- [ ] **Step 1: Write failing delete lock test**

Test:

```ts
test('delivery-done task visible on review board cannot be deleted', async ({ assert }) => {
  // seed done task and ensure workflow
  // attempt delete as creator/admin who normally can delete
  // assert conflict/forbidden
  // assert task still exists
})
```

Expected: FAIL because delete still succeeds.

- [ ] **Step 2: Add delete guard**

Before deletion, check task status and review workflow presence. Reject if task is delivery done and review workflow exists or can be projected.

- [ ] **Step 3: Verify tests pass**

Run targeted task integration test.

Expected: PASS.

## Task 6: Routes and Controllers

**Files:**

- Create controllers listed in file structure.
- Modify `start/routes/reviews.ts`.
- Test: controller/integration route tests under `app/modules/reviews/tests/backend/integration/task_review_board.spec.ts`.

**Interfaces:**

- Produces:
  - `GET /org/projects/:projectId/review-board`
  - `GET /api/v1/projects/:projectId/review-board`
  - detail/actions API routes.

- [ ] **Step 1: Write failing route test**

Test:

```ts
test('project review board route returns six grouped columns', async ({ client, assert }) => {})
```

Expected: FAIL 404.

- [ ] **Step 2: Implement controllers and routes**

Controllers call query/command classes. Page controller renders `org/reviews/task-review-board`.

- [ ] **Step 3: Verify route tests pass**

Run board integration test.

Expected: PASS.

## Task 7: Review Board UI

**Files:**

- Create Svelte board/components listed in file structure.
- Add navigation/sidebar/project link.
- Test: `inertia/apps/org/tests/modules/reviews/task_review_board.test.ts`.

**Interfaces:**

- Consumes: `TaskReviewBoardResult`.
- Produces: six-column board rendering and card click detail panel.

- [ ] **Step 1: Write failing component tests**

Tests:

```ts
it('renders six review board columns in order', () => {})
it('shows own and other done task cards in Chờ review', () => {})
it('opens detail panel with task comments and review thread', async () => {})
```

Expected: FAIL because components missing.

- [ ] **Step 2: Implement board components**

Use existing Kanban visual language: columns, count, cards, stable dimensions, dense operational layout.

- [ ] **Step 3: Verify component tests pass**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/reviews/task_review_board.test.ts
```

Expected: PASS.

## Task 8: Detail Actions UI

**Files:**

- Modify/create `task_review_detail_panel.svelte`
- Create `task_review_thread.svelte`
- Test: `inertia/apps/org/tests/modules/reviews/task_review_board.test.ts`

**Interfaces:**

- Consumes detail payload and permissions.
- Produces:
  - reviewer submit review;
  - reviewee agree;
  - reviewee response;
  - report dispute.

- [ ] **Step 1: Write failing action UI tests**

Tests:

```ts
it('shows agree button to reviewee in Chờ phản hồi without requiring text reply', () => {})
it('posting reviewee response labels the action as tranh chấp', () => {})
it('shows report button to reviewer and reviewee when disputed', () => {})
it('does not show delete action for review-visible task', () => {})
```

Expected: FAIL.

- [ ] **Step 2: Implement actions**

Use router/axios calls to backend routes. Reload board/detail after action.

- [ ] **Step 3: Verify UI tests pass**

Run same Vitest file.

Expected: PASS.

## Task 9: E2E Demo Flow

**Files:**

- Create `inertia/apps/org/tests/e2e/reviews/task_review_board_flow.spec.ts`
- Add screenshots under `test-results/e2e-visual/task-review-board/`.

**Interfaces:**

- Proves end-to-end demo behavior.

- [ ] **Step 1: Write failing e2e**

Flow:

1. seed owner/creator, worker/reviewee, senior reviewer, peer reviewer;
2. create/complete task to delivery done;
3. open Review Board and see task in `Chờ review`;
4. senior reviewer submits review;
5. peer reviewer submits review;
6. task moves to `Chờ phản hồi`;
7. worker clicks `Đồng ý`;
8. task moves to `Done`;
9. alternate seeded task: worker replies, task moves `Tranh chấp`;
10. reviewer reports, task moves `Đã gửi report tranh chấp`;
11. screenshots for board, detail, agree, dispute, reported.

Expected: FAIL until UI/backend complete.

- [ ] **Step 2: Make e2e pass**

Fix backend/UI gaps exposed by the test.

- [ ] **Step 3: Visual audit screenshots**

Open screenshots manually and confirm:

- six columns visible;
- card text not clipped;
- detail panel includes task comments and review thread;
- agree/report actions visible in correct states.

## Final Verification

Run:

```bash
npm run test:integration -- --files app/modules/reviews/tests/backend/integration/task_review_board.spec.ts
npm run test:integration -- --files app/modules/reviews/tests/backend/integration/task_review_workflow_actions.spec.ts
pnpm exec vitest run inertia/apps/org/tests/modules/reviews/task_review_board.test.ts
E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/apps/org/tests/e2e/reviews/task_review_board_flow.spec.ts --workers=1
```

Expected:

- all targeted backend tests pass;
- component tests pass;
- e2e passes;
- screenshots prove requested workflow.

## Self-Review

Spec coverage:

- six statuses covered by Tasks 1, 7, 9;
- done task membership covered by Tasks 1, 9;
- two-reviewer rule covered by Tasks 2, 3, 9;
- creator/reviewee exclusion and priority reviewers covered by Task 2;
- reviewee agree without reply covered by Tasks 3, 8, 9;
- reply means dispute covered by Tasks 3, 8, 9;
- report package covered by Task 4;
- admin done covered by Task 4;
- delete lock covered by Task 5.

Placeholder scan:

- no TBD/TODO placeholders.

Type consistency:

- all tasks use `TaskReviewWorkflowStatus`, `TaskReviewBoardResult`, and command/query names defined above.
