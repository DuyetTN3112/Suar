# Personal Workspace Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Personal Workspace the single shell for ordinary organization/project members while keeping task and review boards available through selected organization/project context.

**Architecture:** Reuse the existing task and review board queries. Add personal entry routes that render the existing board pages with `workspaceMode: 'personal'`; keep canonical project routes unchanged. The sidebar exposes project switching as context selection, not as a second workspace tab.

**Tech Stack:** AdonisJS, Inertia, Svelte, TypeScript, Vitest/Japa.

## Global Constraints

- Do not restore `/work` aggregate task list.
- Do not change database data. Enforce the existing workspace policy distinction: ordinary project members may switch project context but may not enter Project Workspace.
- Do not commit or push.
- Preserve unrelated pre-existing worktree changes.

### Task 1: Personal navigation and context shell

**Files:**
- Modify: `inertia/apps/user/shared/components/navigation/main_sections/overview.ts`
- Modify: `inertia/apps/user/shared/components/layout/app_sidebar.svelte`
- Modify: `inertia/apps/user/tests/shared/navigation_profile_settings.test.ts`
- Modify: `inertia/apps/user/tests/shared/layout/project_workspace_access_source.test.ts`

- [x] Write failing navigation tests for personal task/review entries, project switching, and no standalone project tab.
- [x] Run the focused Vitest files and verify the expected failures.
- [x] Add the two navigation entries and enable the existing project context switcher on the personal sidebar.
- [x] Run the focused Vitest files and verify they pass.

### Task 2: Personal task board route

**Files:**
- Modify: `app/modules/tasks/controllers/list_tasks_controller.ts`
- Add/modify: `app/modules/tasks/tests/backend/unit/list_tasks_controller.spec.ts`

- [x] Add a failing controller test proving `/tasks` renders `tasks/index` with `shellMode: 'app'` when a project context exists.
- [x] Run the Japa test and verify it fails because the controller redirects.
- [x] Remove the non-project redirect while retaining project route validation and personal base route.
- [x] Run the Japa test and verify it passes.

### Task 3: Personal review board route

**Files:**
- Modify: `start/routes/reviews.ts`
- Modify: `app/modules/reviews/controllers/show_task_review_board_controller.ts`
- Modify: `app/modules/reviews/tests/backend/unit/show_task_review_board_controller.spec.ts`

- [x] Add a failing test for `/reviews/tasks` using the session project and rendering `workspaceMode: 'personal'`.
- [x] Run the Japa test and verify it fails because only the project route is supported.
- [x] Add the personal route and keep canonical project route behavior unchanged.
- [x] Run the focused Japa tests.

### Task 4: Regression verification

- [x] Run focused user navigation, task, review, and project access tests.
- [x] Run `gitnexus detect-changes` and inspect affected symbols/flows.
- [x] Report remaining failures without committing or pushing.
