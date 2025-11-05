# Sprint Management Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote Sprint into a first-class Agile/Scrum planning module with Sprint Goal, dedicated project UI, backend API support, and tests.

**Architecture:** Keep sprint planning/backlog in `app/modules/sprints`; keep sprint review governance in `app/modules/reviews`. Add a nullable `goal` column to `project_sprints`, thread it through sprint commands/queries/controllers, and move the full sprint panel into a project `Sprints` tab.

**Tech Stack:** AdonisJS, Lucid, PostgreSQL migrations, Japa, Svelte 5, Inertia, Vitest, Playwright.

## Global Constraints

- Do not touch main DB seed data.
- Do not move sprint review governance out of `app/modules/reviews`.
- Run GitNexus impact before editing existing symbols.
- Use TDD: failing test first, minimal code, then green.
- Run sprint integration tests sequentially because shared test DB cleanup is not parallel-safe.

---

### Task 1: Sprint Goal Backend Contract

**Files:**
- Create: `database/migrations/20260716120000_add_project_sprint_goal.ts`
- Modify: `app/modules/sprints/actions/commands/create_project_sprint_command.ts`
- Modify: `app/modules/sprints/actions/commands/update_project_sprint_command.ts`
- Modify: `app/modules/sprints/actions/queries/get_sprint_board_query.ts`
- Modify: `app/modules/sprints/types/project_sprint_records.ts`
- Test: `app/modules/sprints/tests/backend/integration/project_sprint_goal_contract.spec.ts`

**Interfaces:**
- `CreateProjectSprintDTO.goal?: string | null`
- `UpdateProjectSprintDTO.goal?: string | null`
- `ProjectSprintRecord.goal: string | null`
- Sprint board selected sprint includes `goal`.

- [ ] Write failing integration tests for create/update/board goal behavior.
- [ ] Run: `pnpm run test:integration --files=project_sprint_goal_contract`
- [ ] Add nullable migration and application normalization.
- [ ] Run: `pnpm run test:integration --files=project_sprint_goal_contract`
- [ ] Run existing sprint integration tests sequentially.

### Task 2: Sprint Planning UI

**Files:**
- Modify: `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`
- Modify: `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`
- Modify: `inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts`

**Interfaces:**
- Create payload includes `{ goal }`.
- `ProjectSprint.goal` and `SprintBoard.sprint.goal` render as Sprint Goal.

- [ ] Write failing Vitest assertion that create payload includes goal.
- [ ] Write failing Vitest assertion that Sprint Goal renders in list and board.
- [ ] Run: `pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts`
- [ ] Update org and user sprint panel copy and goal field.
- [ ] Run targeted Vitest again.

### Task 3: Separate Sprint Surface From Task Board

**Files:**
- Modify: `inertia/apps/org/modules/projects/show.svelte`
- Modify: `inertia/apps/org/modules/tasks/index.svelte`
- Modify: `inertia/apps/org/tests/modules/tasks/index.test.ts`
- Modify: `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts`

**Interfaces:**
- Project detail supports `?focus=sprints`.
- Task workspace shows a compact Sprints link when project-scoped.

- [ ] Write failing UI test for project `Sprints` tab and task workspace compact link.
- [ ] Run targeted Vitest files.
- [ ] Move full panel into project tab and replace task workspace full panel with link.
- [ ] Update E2E to visit `/org/projects/:projectId?focus=sprints`.
- [ ] Run targeted Vitest files.

### Task 4: Verification

**Commands:**

```bash
pnpm run test:unit --files=sprint_core_rules
pnpm run test:unit --files=sprint_module_contracts
pnpm run test:unit --files=sprint_port_contracts
pnpm run test:integration --files=project_sprint_goal_contract
pnpm run test:integration --files=get_sprint_board_query
pnpm run test:integration --files=move_task_to_sprint_command
pnpm run test:integration --files=project_sprint_schema
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts inertia/apps/org/tests/modules/tasks/index.test.ts
pnpm exec playwright test inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts
```

- [ ] Run GitNexus `detect-changes` before final report.
- [ ] Capture Playwright screenshot from sprint management page.
- [ ] Report unrelated existing UI suite failures separately if full suite is run.
