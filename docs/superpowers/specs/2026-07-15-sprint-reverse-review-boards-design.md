# Sprint Reverse Review Boards Design

## Summary

Reverse review is split into two sprint-level boards:

- assigner review board: worker reviews people who assigned or created work for them in the sprint;
- environment review board: worker reviews the overall work environment, including project context, organization context, and peer collaboration.

Both boards open only after a project sprint enters `review_open`. Both boards are driven by real sprint work evidence, not by organization or project membership alone. If a user worked on a task in the sprint, they can review even when they are outside the project or outside the organization.

Closing a sprint is now the lifecycle trigger. When project owner or project manager ends sprint N:

1. System verifies every task review workflow for tasks in sprint N is `done`.
2. System moves sprint N to `review_open`.
3. System opens the two reverse review boards for sprint N.
4. System creates sprint N+1 automatically.

Sprint N+1 cannot be closed while reverse review workflows from sprint N are unfinished. A workflow is finished only when it is `done`; `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, and `reported` all count as review debt.

## Board Statuses

Both boards use the same workflow statuses:

- `awaiting_review`: reviewer has not submitted the review yet;
- `in_review`: review is partially complete but not ready for target response yet;
- `awaiting_response`: target must respond or accept;
- `disputed`: target or reviewer replied with disagreement;
- `reported`: either side escalated the dispute to admin;
- `done`: either side accepted the outcome.

Current reverse-review submission is single-review, so it normally jumps from `awaiting_review` to `awaiting_response`. The `in_review` lane still exists on both reverse boards for consistency with task review and future multi-review reverse rules.

If a workflow is already `disputed`, either side may still accept and move it to `done`. Dispute does not force admin escalation.

## Assigner Review Board

The first board groups by target person, not by task.

Example:

- A assigned 3 sprint tasks to the reviewer;
- B assigned 5 sprint tasks to the reviewer;
- board shows 2 cards in `awaiting_review`: A and B.

Clicking a card shows:

- target profile summary;
- all related sprint tasks;
- task detail links;
- read-only task context because sprint review is already open and sprint work is closed;
- review form;
- discussion thread;
- accept and report controls when allowed.

Eligibility:

- reviewer must have worked on at least one task in the sprint project;
- target must have assigned or created at least one task for that reviewer in the sprint;
- reviewer cannot review themself.

## Environment Review Board

The second board creates one shared environment card for each eligible reviewer and sprint.

The environment card covers:

- project working process;
- organization support;
- peer/co-worker collaboration;
- general psychological safety and communication quality.

The target is stored as a single `environment` workflow for the sprint organization. The mandatory responder is resolved by priority:

1. project owner;
2. project manager;
3. organization owner;
4. organization admin.

The target responder must respond or accept after the reviewer submits.

Environment reviews surface on organization detail pages through existing `sprint_environment_reviews` aggregation. They may include the sprint project id as context, but the public display target is the organization detail surface.

## Data Model

Add workflow tables instead of replacing existing sprint review package tables:

- `sprint_reverse_review_workflows`
- `sprint_reverse_review_messages`

`sprint_review_packages`, `sprint_manager_reviews`, and `sprint_environment_reviews` remain the submitted review/audit records. The new workflow rows are the board projection and response state.

Workflow fields:

- `id`
- `sprint_id`
- `project_id`
- `organization_id`
- `reviewer_id`
- `target_type`: `assigner | environment`
- `target_user_id`
- `target_entity_id`
- `responder_id`
- `status`
- `rating`
- `comment`
- `package_id`
- `submitted_at`
- `accepted_at`
- `reported_at`
- timestamps

Messages store review, response, accept, and report discussion.

Database policy:

- workflow tables are storage-only;
- do not add database foreign keys, status checks, rating checks, or uniqueness rules for workflow business invariants;
- application commands and queries validate sprint/project/org/user/package existence, duplicate prevention, legal status transitions, responder authority, task evidence, and report permissions.

## Existing Behavior To Preserve

- Task review board remains per task.
- Sprint packages remain the source of submitted review records.
- Project/org detail review aggregations can continue reading `sprint_environment_reviews`.
- Existing reverse review list can continue listing submitted reviews.
- Manual sprint create/update stays available, but the normal owner/manager flow after closing a sprint creates the next active sprint automatically.

## Testing

Backend integration must prove:

- workflow storage schema has no DB foreign keys/check constraints/unique business constraints;
- sprint close is blocked while sprint task review workflows are not `done`;
- sprint close opens reverse review boards and creates the next active sprint;
- sprint N+1 close is blocked while sprint N reverse review workflows are not `done`;
- sprint close creates assigner workflows grouped by assigner for each reviewer;
- reviewer outside project/org is eligible when they worked on a sprint task;
- membership-only users without task evidence do not get workflows;
- assigner workflow detail shows related tasks;
- submitted assigner review moves to `awaiting_response`;
- target accept moves to `done`;
- target response moves to `disputed`;
- disputed workflow can still be accepted into `done`;
- report moves workflow to `reported`;
- environment workflow creates one shared environment card;
- environment card responder is project owner/manager first, then org owner/admin.

Frontend/E2E must prove:

- both boards render as Kanban boards;
- cards can be opened and reviewed;
- closed sprint task list is read-only;
- responder can accept or dispute;
- screenshots cover reviewer board and target response state.
