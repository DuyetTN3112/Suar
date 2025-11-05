# Sprint Management Module Design

## Goal

Make Sprint a first-class Agile/Scrum module in Suar, separate from the task board and separate from sprint reverse review governance.

Sprint Management covers:

- Sprint Goal, sprint window, status, and project ownership.
- Product Backlog vs Sprint Backlog.
- Moving project tasks into an editable sprint or back to backlog.
- Closing an active sprint into the review lifecycle when task review debt is clear.

Sprint Review remains the end-of-sprint governance loop owned by `reviews`. It must not be the label or primary mental model for sprint planning.

## Current Truth

The repo already has a new `app/modules/sprints` boundary with:

- create/update/list/show project sprint commands and queries;
- `GetSprintBoardQuery` for backlog and sprint tasks;
- `MoveTaskToSprintCommand`;
- API routes under `/api/v1/projects/:projectId/sprints` and `/api/v1/projects/:projectId/sprint-board`;
- `ProjectSprintPanel` in org/user frontends.

Related review logic still lives in `app/modules/reviews`:

- `CloseProjectSprintReviewCommand`;
- sprint review packages;
- reverse review workflow boards.

The weak spots are product shape and UX:

- the UI title says "Project Sprint Reviews", so sprint planning looks like review-only behavior;
- the full sprint panel is rendered inside the task workspace, which makes Sprint feel like an appendix of Task Board;
- there is no Sprint Goal, even though Agile/Scrum needs a goal beyond name/date;
- tests exist, but integration tests must be run sequentially because shared test DB cleanup can cross-delete data when sprint suites run in parallel.

## Product Decisions

1. `app/modules/sprints` owns sprint planning and sprint backlog.
2. `app/modules/reviews` owns sprint review and reverse review workflows.
3. `project_sprints.goal` is nullable but first-class in API/UI.
4. A project detail page has a dedicated `Sprints` tab.
5. The task board must not render the full sprint management panel. It can link users to project sprints, but the working sprint surface lives under the project.
6. Existing task status workflow remains unchanged.
7. `tasks.project_sprint_id = null` means Product Backlog.
8. Tasks can move into only `draft` or `active` sprints in the same project.
9. Closing sprint to review stays blocked while task review workflows are not `done`.
10. No main DB seed is required for tests. Playwright seeds remain test-only.

## Backend Design

Add nullable `goal` to `project_sprints`.

API fields:

- request accepts `goal` on create and update;
- response returns `goal` on list, show, create, update, and sprint board selected sprint.

Validation:

- missing goal is allowed;
- blank goal normalizes to `null`;
- long goal is rejected at application level.

The sprint board response keeps the existing shape and adds:

```ts
sprint: {
  id: string
  name: string
  goal: string | null
  status: SprintStatus
  startsAt: string
  endsAt: string
} | null
```

## Frontend Design

`ProjectSprintPanel` becomes a sprint planning panel:

- heading: `Sprint Management`;
- eyebrow: `Agile Scrum`;
- create form fields: name, goal, starts at, ends at;
- sprint cards show goal when present;
- board header shows selected Sprint Goal;
- review actions stay available only on `active` or `review_open` states, but copy labels make it clear this is the end-of-sprint review stage.

Project detail adds a `Sprints` tab and renders `ProjectSprintPanel` inside it.

Task workspace removes the full panel. When scoped to a project and the user has sprint access, it shows a compact project sprint link to `/org/projects/:projectId?focus=sprints`.

## Test Plan

Backend unit/integration:

- create sprint persists normalized goal;
- update sprint can set and clear goal without changing lifecycle;
- sprint board API includes selected sprint goal;
- existing move-to-sprint tests remain green.

Frontend unit:

- sprint panel submits goal on create;
- sprint panel renders Sprint Goal in list and selected board;
- task workspace renders a compact Sprints link, not the full backlog board.

E2E:

- seed sprint governance flow in test DB;
- owner opens project Sprints tab, moves backlog task into sprint, sees Sprint Goal;
- member opens project Sprints tab and can inspect without management actions.

## Risks

- Worktree is already dirty with many untracked sprint/review files. Changes must be narrow and never revert unrelated files.
- GitNexus impact for sprint symbols is MEDIUM, so targeted backend and frontend tests are required.
- If main DB has not run the new migration, create/update with `goal` will fail. Migration must be applied before checking the main DB account.
