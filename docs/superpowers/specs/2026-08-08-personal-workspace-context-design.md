# Personal Workspace Context Design

## Goal

Keep an ordinary organization member with ordinary project membership in one
Personal Workspace while allowing organization and project switching as board
context changes.

## Behavior

- Personal navigation exposes the personal task board and personal review board.
- `/tasks` renders the task board in the personal shell using the selected
  project context; it does not redirect to a project shell.
- `/reviews/tasks` renders the review board in the personal shell using the
  selected project context.
- The personal sidebar can switch approved organizations and accessible
  projects, but it has no standalone Project Workspace tab for ordinary roles.
- Switching organization clears the old project context; the next request may
  select a valid project in the new organization.
- `/work` remains retired; no cross-organization aggregate list is restored.

## Scope

This change targets the user-facing workspace shell and existing board query
routes. It does not change organization/project permission policy or database
records.

## Verification

- Navigation source tests assert personal task/review entries and no project
  workspace tab.
- Controller tests assert `/tasks` and personal review rendering preserve the
  personal shell instead of redirecting/rendering the project shell.
- Existing task/review and workspace access tests remain green.
