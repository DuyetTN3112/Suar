# Task Review Board Design

## Goal

Build a dedicated Review Board for project tasks that have reached delivery `done`, using a Kanban-style board with six review workflow columns while keeping those tasks visible in the normal Task Board `done` column.

## Current Problem

The current review experience is centered on review sessions and rating forms. It does not match the demo/product need:

- users need to see task-level review status as a board;
- clicking a review item must feel like opening normal task detail;
- review discussion must live with the task context;
- the reviewee should only need to agree when reviews are acceptable;
- any reviewee reply/debate after review turns the item into a dispute;
- the admin escalation package must include the full task and review context.

## Core Model

Add a task-level review workflow projection separate from delivery task status.

The normal task workflow remains unchanged. A task that is delivery `done` stays in the Task Board `done` column. The Review Board overlays a separate workflow for review governance.

Recommended persistence:

- `task_review_workflows`
  - one row per task once a task becomes review-visible;
  - stores project, organization, task, reviewee, creator reviewer, second reviewer, workflow status, timestamps, completion/report references.
- `task_review_messages`
  - review/debate thread under the task review detail;
  - message types: `review`, `reviewee_response`, `system`, `admin_note`;
  - `reviewee_response` moves workflow to `disputed`.
- existing `review_disputes`, `review_dispute_comments`, and `review_dispute_case_files`
  - still handle admin escalation and package snapshots.

Database policy:

- workflow tables are storage-only;
- do not add database foreign keys, status checks, rating checks, or uniqueness rules for workflow business invariants;
- application commands and queries validate record existence, duplicate prevention, status transitions, reviewer quorum, and report permissions.

## Board Columns

The Review Board has exactly these columns:

1. `Chờ review` (`awaiting_review`)
2. `Đang review` (`in_review`)
3. `Chờ phản hồi` (`awaiting_response`)
4. `Tranh chấp` (`disputed`)
5. `Đã gửi report tranh chấp` (`reported`)
6. `Done` (`done`)

Legacy database rows with status `reviewed` are treated as `in_review`. New writes must use `in_review`.

## Board Membership

For a selected project, the board is scoped to work the current user can act on:

- `Chờ review` shows delivery-`done` project tasks, including the current user's own tasks, so the task owner can track review progress;
- review actions are shown only to required reviewers;
- the reviewee cannot review their own task;
- once a workflow reaches reviewee action states, the reviewee can see their own workflow to agree, respond, or report.

If a task has no `task_review_workflows` row yet, the board treats it as `awaiting_review`.

## Reviewer Rules

Every review workflow requires at least two official reviewers:

- one reviewer must be the task giver (`assigner_id` first, then creator fallback) when that user is not the reviewee;
- one reviewer is selected from eligible colleagues by priority.

Eligible reviewers must not be:

- the task assignee/reviewee;
- duplicate reviewer rows for the same workflow.

The second reviewer is selected by priority:

1. high-ranking project role member;
2. high-ranking organization role member;
3. project colleague with matching role or skills;
4. other eligible colleague in the organization.

The persisted quorum is two. If two official reviewers cannot be selected, workflow creation must fail instead of silently lowering the bar.

## Workflow Transitions

### Awaiting Review

Initial state for every delivery-done task visible on Review Board.

Actions:

- first required reviewer submits review;
- if completed review count is still below quorum, status moves to `in_review`;
- if completed review count reaches quorum, status moves to `awaiting_response`.

### In Review

Partial quorum state. At least one official reviewer has submitted, but the workflow still needs another required reviewer before the reviewee should respond.

Actions:

- remaining required reviewers can submit their reviews;
- reviewee can see progress but cannot accept until quorum is met;
- once completed review count reaches required review count, status moves to `awaiting_response`.

### Awaiting Response

Reviewee sees reviews and can either agree or reply.

Actions:

- `Đồng ý`: status moves to `done`; profile scoring/projection runs.
- Reply/debate message: status moves to `disputed`.

Reviewee is not forced to reply. Agreeing is enough to pass.

### Disputed

Any reviewee response/debate after review turns the workflow into dispute state.

Actions:

- reviewer or reviewee can add more discussion messages;
- reviewer or reviewee can click `Gửi report`;
- report builds a full admin package and moves status to `reported`.

### Reported

Admin escalation package exists.

Actions:

- admin reviews case package;
- admin resolves and clicks done;
- status moves to `done`; profile scoring/projection runs based on admin outcome.

### Done

Terminal state for completed review workflow.

Actions:

- no delete;
- detail remains readable;
- admin/system audit remains linked.

## Task Detail Behavior

Clicking a review board card opens normal task detail context, not a disconnected review form.

Detail must include:

- task title, description, priority, difficulty, labels, due date;
- assignee/reviewee and task creator;
- project and organization;
- skill requirements and role inheritance if present;
- submission package;
- task comments/discussion;
- attachments/files;
- history/audit;
- review/debate thread at the bottom;
- status-specific actions.

## Delete Lock

Once a delivery-done task is visible on the Review Board, it cannot be deleted.

Editing remains allowed for users who already have edit permission. Delete controls must be hidden or disabled, and backend delete must reject the action.

## Admin Report Package

`Gửi report` creates or updates an admin dispute package containing:

- task snapshot;
- assignment snapshot;
- submission snapshot;
- task comments snapshot;
- task history snapshot;
- review workflow snapshot;
- review/debate messages snapshot;
- reviewer context;
- reviewee profile context;
- existing evidence files and dispute evidence;
- escalation reason.

The package is sent to admin dispute queue. The demo does not need to show admin UI, but backend must produce the package and status must move to `reported`.

## Routes and Surfaces

Recommended routes:

- `GET /org/projects/:projectId/review-board`
  - org/project review board.
- `GET /api/v1/projects/:projectId/review-board`
  - grouped board data.
- `GET /api/v1/task-review-workflows/:workflowId`
  - task detail plus review workflow/thread payload.
- `POST /api/v1/task-review-workflows/:workflowId/reviews`
  - reviewer submits review.
- `POST /api/v1/task-review-workflows/:workflowId/agree`
  - reviewee agrees and completes workflow.
- `POST /api/v1/task-review-workflows/:workflowId/messages`
  - review/debate message; reviewee response moves to `disputed`.
- `POST /api/v1/task-review-workflows/:workflowId/report`
  - reviewer/reviewee reports dispute to admin.
- `POST /api/admin/task-review-workflows/:workflowId/done`
  - admin finalizes after decision.

## UI Shape

The board should visually follow the existing task Kanban:

- horizontal columns with stable widths;
- each column has count and cards;
- cards show task title, assignee/reviewee, creator, project role/skills, review count, last activity;
- clicking card opens detail drawer or page with the task context and review thread;
- no marketing/hero layout.

## Permissions

Project members can see workflows for tasks in their project.

Reviewee can:

- see their own task review workflow;
- agree;
- reply, which causes dispute;
- report when disputed.

Required reviewers can:

- submit review;
- discuss when disputed;
- report when disputed.

Task creator can:

- see the task in normal task/project surfaces;
- not submit the task review for tasks they created;
- only discuss/report in review workflow if separately allowed by a non-reviewer surface.

Org/project admins can:

- see project review board;
- inspect workflows;
- cannot bypass admin-only final resolution unless they are system admin in admin surface.

System admin can:

- inspect reported package;
- resolve and mark workflow done.

## Testing Requirements

Backend:

- workflow storage schema has no DB foreign keys/check constraints/unique business constraints;
- done task without workflow appears in `awaiting_review`;
- board includes delivery-done project tasks, including the current user's own task, for progress visibility;
- required reviewers include the task giver plus one eligible colleague;
- required reviewers exclude task assignee/reviewee;
- submit review rejects assignee/reviewee even if bad reviewer rows exist;
- first review below quorum moves workflow to `in_review`;
- two reviews move workflow to `awaiting_response`;
- reviewee agree moves workflow to `done` and triggers profile scoring/projection hook;
- reviewee message moves workflow to `disputed`;
- reviewer or reviewee report moves workflow to `reported` and builds package;
- delete of delivery-done review-visible task is rejected.

Frontend:

- board renders six columns;
- cards appear in correct columns;
- clicking card opens task detail context with task comments and review thread;
- delete is unavailable for review-visible done task;
- reviewee can agree without replying;
- reviewee reply moves card to disputed;
- report action moves card to reported.

E2E:

- owner creates task, worker completes it to delivery done;
- review board shows task in `Chờ review`;
- task giver submits one review and task moves to `Đang review`;
- second official reviewer submits review;
- worker sees `Chờ phản hồi`;
- worker clicks `Đồng ý`, workflow goes `Done`;
- alternate path: worker replies, workflow goes `Tranh chấp`;
- reviewer or worker reports, workflow goes `Đã gửi report tranh chấp`;
- screenshots verify board/detail/thread surfaces.

## Non-Goals

- Do not replace the normal task board.
- Do not remove existing review session/rating infrastructure until the new board is verified.
- Do not show full admin resolution UI in the demo path unless needed for tests.
