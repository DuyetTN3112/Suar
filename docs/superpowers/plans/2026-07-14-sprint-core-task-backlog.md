# Sprint Core Task Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first real Sprint Management core by letting project tasks belong to a project sprint or remain in backlog.

**Architecture:** Keep sprint-review governance in `app/modules/reviews`, but introduce task sprint membership as a task/project concern. Use `tasks.project_sprint_id` as the minimal sprint-backlog link; `null` means backlog. Existing task list and board queries gain sprint filters without replacing current task status workflow.

**Tech Stack:** AdonisJS, Lucid, PostgreSQL migrations, Japa tests, Svelte/Inertia later.

## Global Constraints

- Do not restore task-level reverse review creation.
- Do not replace task status workflow.
- Do not add broad UI until backend contracts are stable.
- Run `gitnexus impact` before modifying existing symbols.
- Use TDD: failing test first, minimal implementation, verification.

---

### Task 1: Task Sprint Membership Contract

**Files:**
- Modify: `app/modules/tasks/actions/dtos/request/get_tasks_list_dto.ts`
- Modify: `app/modules/tasks/infra/models/task.ts`
- Modify: `app/modules/tasks/types/task_records.ts`
- Modify: `app/modules/tasks/infra/repositories/read/list_queries.ts`
- Modify: `tests/helpers/factories/project_task.ts`
- Create: `database/migrations/1783921000000_add_project_sprint_membership_to_tasks.ts`
- Test: `app/modules/tasks/tests/backend/unit/task_dto_contracts.spec.ts`
- Test: `app/modules/tasks/tests/backend/integration/list_tasks.spec.ts`

**Interfaces:**
- Produces: `GetTasksListDTO.project_sprint_id?: string | null`
- Produces: `GetTasksListDTO.hasProjectSprintFilter(): boolean`
- Produces: task list repository filter `project_sprint_id?: string | null`

- [ ] Write failing DTO and integration tests for sprint/backlog filtering.
- [ ] Add migration and model/type field.
- [ ] Thread `project_sprint_id` through DTO, cache key, query filters, and factory.
- [ ] Verify targeted unit/integration tests pass.

### Task 2: Sprint Core Rules

**Files:**
- Create: `app/modules/sprints/domain/sprint_core_rules.ts`
- Create: `app/modules/sprints/tests/backend/unit/sprint_core_rules.spec.ts`

**Interfaces:**
- Produces: `canAttachTaskToSprint(input): RuleResult`
- Produces: `classifySprintTaskCompletion(input): 'completed' | 'carry_over'`

- [ ] Write failing pure rule tests for project ownership and carry-over classification.
- [ ] Implement minimal pure rules.
- [ ] Verify targeted unit tests pass.
