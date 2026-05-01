# Project Sprint and Product Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Project Product Backlog and Sprint Planning explicit, testable, historical, and usable without creating a separate Product Backlog module.

**Primary specification:** [Project Sprint and Product Backlog Design](../specs/2026-08-09-project-sprint-product-backlog-design.md)

**Architecture:** Extend `app/modules/sprints` as the Project planning boundary. Keep Product Backlog as an ordered Project task view, keep `tasks.project_sprint_id` as the current location pointer, add append-only task–Sprint assignment history, and keep Sprint Review governance in `app/modules/reviews` as a downstream boundary.

**Tech Stack:** AdonisJS, TypeScript, Lucid/PostgreSQL, Japa, Vitest, Svelte 5, Inertia, Playwright, existing Project access policies and test-environment seed helpers.

## Global Constraints

- Product Backlog belongs to a Project and is not a standalone aggregate/table in v1.
- Keep the canonical planning boundary in `app/modules/sprints`; do not create `app/modules/product_backlog`.
- A Project has at most one `active` Sprint in v1; multiple `draft` and historical Sprints remain valid.
- New Project tasks default to Product Backlog when no valid Sprint is explicitly supplied.
- Active Sprint additions/removals are allowed and must be recorded as scope changes.
- Incomplete end-of-Sprint tasks require an explicit destination: the next Sprint or Product Backlog.
- `done`, `cancelled`, and `rejected` tasks stay in historical Sprint context and are not carried over by default.
- Keep task workflow status independent from Sprint assignment.
- Do not redesign Sprint Review, reverse review, environment review, review packages, disputes, or retrospective governance.
- Every production symbol edit requires `gitnexus impact <symbolName>` before editing. HIGH/CRITICAL output must be reported before proceeding.
- Use TDD: write a valid failing test, run it and record the failure, implement the smallest change, then run the focused green suite.
- A feature is not complete with only unit tests. Use the behavior-to-evidence matrix in this plan.
- Run Sprint integration suites sequentially because the shared test database cleanup is not parallel-safe.
- Preserve the already dirty worktree. Do not revert, format, or modify unrelated work.
- Do not commit until `gitnexus detect-changes` confirms only expected files and flows are affected.

## 1. Implementation file map

### Domain and application boundary

- Create: `app/modules/sprints/domain/product_backlog_rules.ts` — pure Backlog ordering, location, and destination decisions.
- Modify: `app/modules/sprints/domain/sprint_core_rules.ts` — active-Sprint cardinality, start rules, and task outcome classification.
- Modify: `app/modules/sprints/domain/project_sprint_policy.ts` — explicit start/metadata policy and status validation.
- Create: `app/modules/sprints/actions/commands/start_project_sprint_command.ts` — named draft-to-active intent.
- Create: `app/modules/sprints/actions/commands/end_project_sprint_delivery_command.ts` — end delivery and apply explicit task destinations.
- Create: `app/modules/sprints/actions/commands/reorder_project_backlog_command.ts` — manager-only Backlog rank mutation.
- Create: `app/modules/sprints/actions/queries/get_project_backlog_query.ts` — ordered Project Backlog read.
- Modify: `app/modules/sprints/actions/ports/inbound/sprint_command_factory.ts` and `sprint_query_factory.ts` — expose new actions.
- Modify: `app/composition/sprint_application_composition.ts` — wire the new commands and query.

### Persistence and contracts

- Create: `database/migrations/20260809010000_create_project_sprint_task_assignments.ts` — append-only assignment history.
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_repository.ts` — history, start, rank, and end-delivery ports.
- Modify: `app/modules/sprints/infra/repositories/postgres_sprint_repository.ts` — transactional writes and current-location reads.
- Create: `app/modules/sprints/infra/repositories/read/postgres_project_backlog_reader.ts` — ordered Backlog reader.
- Modify: `app/modules/sprints/public_contracts/sprint_public_api.ts` — canonical planning result contracts and compatibility fields.
- Create: `app/modules/sprints/public_contracts/project_sprint_assignment_history.ts` — history response contract.
- Modify: `app/modules/tasks/actions/mapper/task_create_persistence_mapper.ts` — explicit default Backlog behavior remains visible and tested.

### HTTP and frontend surfaces

- Modify: `start/routes/projects.ts` — start, backlog, reorder, end-delivery, and history routes.
- Create: `app/modules/sprints/controllers/start_project_sprint_controller.ts`.
- Create: `app/modules/sprints/controllers/get_project_backlog_controller.ts`.
- Create: `app/modules/sprints/controllers/reorder_project_backlog_controller.ts`.
- Create: `app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts`.
- Create: `app/modules/sprints/controllers/list_task_sprint_assignment_history_controller.ts`.
- Modify: `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`.
- Modify: `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`.
- Modify: `inertia/apps/org/modules/projects/show.svelte` and `inertia/apps/user/modules/projects/show.svelte`.
- Modify: `inertia/apps/org/modules/sprints/index.svelte`; add a user counterpart only if the existing user route actually reuses this surface.
- Modify: existing Project Sprint panel and Project show tests.

### Test and evidence files

- Create: `app/modules/sprints/tests/backend/unit/product_backlog_rules.spec.ts`.
- Modify: `app/modules/sprints/tests/backend/unit/sprint_core_rules.spec.ts`.
- Create: `app/modules/sprints/tests/backend/unit/project_sprint_planning_contracts.spec.ts`.
- Create: `app/modules/sprints/tests/backend/integration/project_sprint_task_assignment_history.spec.ts`.
- Create: `app/modules/sprints/tests/backend/integration/project_backlog_query.spec.ts`.
- Create: `app/modules/sprints/tests/backend/integration/start_project_sprint_command.spec.ts`.
- Create: `app/modules/sprints/tests/backend/integration/end_project_sprint_delivery_command.spec.ts`.
- Extend: `app/modules/sprints/tests/backend/integration/move_task_to_sprint_command.spec.ts`.
- Extend: `app/modules/sprints/tests/backend/integration/project_sprint_commands.spec.ts`.
- Create or extend: `inertia/apps/org/tests/modules/projects/project_backlog_planning.test.ts`.
- Extend: `inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts` and `project_show_page.test.ts`.
- Create: `inertia/apps/user/tests/modules/projects/project_sprint_panel.test.ts` if the user panel receives its own planning behavior; otherwise cover the shared behavior through the existing user Project show test.
- Create: `inertia/apps/org/tests/e2e/projects/project_backlog_sprint_planning.spec.ts`.
- Extend: `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts` only when the existing journey remains the correct owner.

## 2. Test evidence matrix

| Acceptance behavior | Unit/domain | Integration/persistence | API/contract | Component | E2E/role-play | Expected artifact |
| --- | --- | --- | --- | --- | --- | --- |
| New task defaults to Backlog | Task mapper default test | Persist and query task with `project_sprint_id = null` | Create-task response exposes null/current location | Backlog list shows task | Manager creates task and sees it in Backlog | No Sprint assignment, visible in ordered Backlog |
| Backlog ordering | Rank normalization and tie-break rules | PostgreSQL ordering and reorder transaction | Rank mutation/request/result contract | Drag/reorder state and optimistic error state | Manager reorders and refreshes | Order survives refresh and is deterministic |
| One active Sprint | Truth table and transition rule | Concurrent start transaction | Second-start conflict contract | Start button disabled/blocked state | Two sessions attempt start | Exactly one active Sprint; stable conflict code |
| Draft → active | Transition and schedule rules | Start persists timestamps/status/history | Named start response | Draft card becomes active | Manager starts Sprint | Active Sprint selected by board |
| Add to active Sprint | Scope-change classification | Assignment history row and pointer update | Move/add response includes history metadata | Add task action and scope marker | Add Backlog task while Sprint runs | Task appears in Sprint; history says after-start |
| Remove to Backlog | Location rule | Pointer/history transaction | Null destination contract | Move-to-Backlog action | Remove and refresh | Task returns to Backlog without status reset |
| End delivery | Outcome decision table | Mixed task destinations in one transaction | Validation rejects missing incomplete destination | End modal buckets and destination selectors | Manager completes end-delivery flow | Done/cancelled/rejected retained; incomplete explicit |
| Carry-over | Status preservation | New assignment history row | Destination response | Carry-over summary | Carry task into next Sprint | Task appears only in destination Sprint |
| Permissions | Actor matrix | Unauthorized transaction rejection | 403/forbidden contract | Read-only member UI | Member cannot mutate | No state change or leaked mutation controls |
| Historical assignment | Append-only rules | Migration/schema/repository replay | History response contract | History panel | Move task across two Sprints and inspect history | Previous assignments remain queryable |
| Project scope isolation | Same-project/cross-project rules | Foreign Sprint rejection | Negative API contract | Foreign options hidden | Cross-project direct request fails | No cross-Project assignment |

Every row needs at least one negative assertion. The E2E row is not a replacement for backend evidence;
the backend row is not a replacement for user-visible evidence.

## 3. Task 1: Lock the domain truth tables

**Files:**

- Create: `app/modules/sprints/domain/product_backlog_rules.ts`
- Modify: `app/modules/sprints/domain/sprint_core_rules.ts`
- Modify: `app/modules/sprints/domain/project_sprint_policy.ts`
- Create: `app/modules/sprints/tests/backend/unit/product_backlog_rules.spec.ts`
- Modify: `app/modules/sprints/tests/backend/unit/sprint_core_rules.spec.ts`
- Create: `app/modules/sprints/tests/backend/unit/project_sprint_planning_contracts.spec.ts`

**Interfaces produced for later tasks:**

```ts
export type BacklogLocation = 'backlog' | 'sprint'
export type SprintTaskOutcome = 'historical_done' | 'historical_cancelled' | 'historical_rejected' | 'requires_destination'
export type IncompleteTaskDestination = { kind: 'backlog' } | { kind: 'sprint'; sprintId: string }

export function classifySprintTaskOutcome(input: {
  statusCategory: SprintTaskStatusCategory
}): SprintTaskOutcome

export function canStartProjectSprint(input: {
  currentStatus: ProjectSprintCoreStatus
  activeSprintCount: number
  actorCanManageSprint: boolean
  startsAt: Date
  endsAt: Date
}): RuleResult

export function normalizeBacklogRank(value: unknown): number
```

- [ ] Write a failing unit truth table for `todo`, `in_progress`, `done`, `cancelled`, `rejected`, and an unknown incomplete category.
- [ ] Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/sprints/tests/backend/unit/product_backlog_rules.spec.ts --files app/modules/sprints/tests/backend/unit/sprint_core_rules.spec.ts
```

Expected RED: the new imports/functions are absent or the expected decisions are not implemented; no environment/setup failure is accepted as the RED proof.

- [ ] Implement pure rules with no database, HTTP, or review-module dependency.
- [ ] Add explicit cases for: non-manager, non-draft start, invalid schedule, second active Sprint, active-scope addition allowed, archived assignment rejected, completed task not carry-over, and incomplete task requiring a destination.
- [ ] Run the same command again.

Expected GREEN: all domain cases pass and the process exits `0`.

- [ ] Run the existing Sprint unit contract suite:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/sprints/tests/backend/unit/project_sprint_input.spec.ts --files app/modules/sprints/tests/backend/unit/sprint_module_contracts.spec.ts --files app/modules/sprints/tests/backend/unit/sprint_port_contracts.spec.ts
```

Expected output: existing Sprint contract tests remain green; no review tests are changed by this task.

- [ ] Commit only the domain files and tests with message `feat: define project backlog and sprint planning rules`.

## 4. Task 2: Add append-only task–Sprint assignment history

**Files:**

- Create: `database/migrations/20260809010000_create_project_sprint_task_assignments.ts`
- Create: `app/modules/sprints/public_contracts/project_sprint_assignment_history.ts`
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_repository.ts`
- Modify: `app/modules/sprints/infra/repositories/postgres_sprint_repository.ts`
- Create: `app/modules/sprints/tests/backend/integration/project_sprint_task_assignment_history.spec.ts`

**Interfaces:**

```ts
export interface ProjectSprintAssignmentHistoryRecord {
  id: string
  organization_id: string
  project_id: string
  task_id: string
  sprint_id: string | null
  entered_at: string
  exited_at: string | null
  entry_reason: 'created_in_backlog' | 'planned' | 'scope_change' | 'carry_over' | 'restored'
  exit_reason: 'moved_to_backlog' | 'moved_to_sprint' | 'delivery_completed' | 'task_cancelled' | 'task_rejected' | null
  added_after_start: boolean
  actor_id: string | null
  created_at: string
}
```

- [ ] Write a failing integration test that creates a task in Backlog, moves it into Sprint 1, moves it into Sprint 2, and asserts three append-only history facts: initial Backlog entry, Sprint 1 assignment, and Sprint 2 assignment.
- [ ] Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/project_sprint_task_assignment_history.spec.ts
```

Expected RED: the history table/repository methods do not exist or the history query returns no rows.

- [ ] Add the migration with UUID identity, Project/Organization/Task/Sprint references as storage fields, timestamps, nullable `sprint_id` for Backlog entries, and indexes for `(project_id, task_id, entered_at)` and `(sprint_id, entered_at)`.
- [ ] Keep business transition validation in application/domain code; do not add a database trigger that decides whether a task may move.
- [ ] Add repository methods to append a history row, close the current row, and list a task's history in chronological order.
- [ ] Update the existing move-task transaction to update the current pointer and history atomically.
- [ ] Run the focused integration test again.

Expected GREEN: the test exits `0`; prior assignment rows remain unchanged; exactly one current assignment is visible for the task.

- [ ] Add negative integration assertions for cross-Project Sprint, duplicate retry, and moving an already-current task to the same destination.
- [ ] Run the existing move-task integration suite sequentially:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/move_task_to_sprint_command.spec.ts
```

Expected output: all existing move-to-Sprint/back-to-Backlog cases pass and history writes do not alter their response contract unexpectedly.

- [ ] Commit migration, repository, public contract, and tests with message `feat: preserve task sprint assignment history`.

## 5. Task 3: Make Product Backlog explicit and ordered

**Files:**

- Create: `app/modules/sprints/actions/queries/get_project_backlog_query.ts`
- Create: `app/modules/sprints/infra/repositories/read/postgres_project_backlog_reader.ts`
- Create: `app/modules/sprints/actions/commands/reorder_project_backlog_command.ts`
- Modify: `app/modules/sprints/public_contracts/sprint_public_api.ts`
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_board_reader.ts`
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_repository.ts`
- Modify: `app/modules/sprints/actions/ports/inbound/sprint_command_factory.ts`
- Modify: `app/modules/sprints/actions/ports/inbound/sprint_query_factory.ts`
- Modify: `app/composition/sprint_application_composition.ts`
- Create: `app/modules/sprints/tests/backend/integration/project_backlog_query.spec.ts`
- Modify: `app/modules/sprints/tests/backend/integration/get_sprint_board_query.spec.ts`

**Interfaces:**

```ts
export interface GetProjectBacklogDTO {
  project_id: string
  page?: unknown
  per_page?: unknown
  status?: string[]
}

export interface ProjectBacklogResult {
  project_id: string
  tasks: SprintBoardTask[]
  counts: { total: number }
}

export interface ReorderProjectBacklogDTO {
  project_id: string
  task_id: string
  before_task_id?: string | null
  after_task_id?: string | null
}
```

- [ ] Write a failing integration test with at least five Project tasks, two priorities, one hidden/deleted task, one task in a Sprint, and deterministic rank values. Assert only current Backlog tasks appear and tie-break order is stable.
- [ ] Run the focused test.

Expected RED: no canonical Backlog query exists or the result includes Sprint/deleted tasks.

- [ ] Implement the Backlog reader as a Project-scoped query using `whereNull(project_sprint_id)` and `whereNull(deleted_at)`.
- [ ] Return canonical Backlog naming while preserving `backlog_tasks` compatibility in the existing Sprint board response until all consumers migrate.
- [ ] Implement rank mutation transactionally. The command must reject foreign `before_task_id`/`after_task_id`, unauthorized actors, and ambiguous placement references.
- [ ] Use a deterministic ordering algorithm based on existing task order storage; if a renumber is required, perform it in the same transaction and prove it with an integration test.
- [ ] Run the focused test again.

Expected GREEN: Backlog total/order is correct after mutation and remains correct after a fresh read.

- [ ] Add API contract tests for empty Backlog, filtered Backlog, pagination, rank mutation, and cross-Project negative cases.
- [ ] Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/project_backlog_query.spec.ts --files app/modules/sprints/tests/backend/integration/get_sprint_board_query.spec.ts
```

Expected output: focused Backlog and board suites pass; selected Sprint tasks remain separate from Backlog tasks.

- [ ] Commit the Backlog query/order contract with message `feat: expose ordered project product backlog`.

## 6. Task 4: Default task creation to Product Backlog

**Files:**

- Modify: `app/modules/tasks/actions/mapper/task_create_persistence_mapper.ts`
- Modify: `app/modules/tasks/actions/dtos/request/create_task_dto.ts` only if the canonical request contract needs explicit naming.
- Modify: `app/modules/tasks/actions/commands` task-create orchestration only if the Sprint assignment validation boundary is bypassed.
- Modify: `app/modules/sprints/actions/commands/move_task_to_sprint_command.ts` if shared assignment validation must be extracted.
- Create: `app/modules/sprints/tests/backend/integration/project_task_backlog_default.spec.ts`
- Modify: existing task create integration/contract tests that already own the create response.

- [ ] Add a failing persistence integration test that creates a Project task without `projectSprintId` and asserts `project_sprint_id` is `null`.
- [ ] Run the task-create focused test.

Expected RED: the test either lacks the fixture/assertion or exposes a non-null implicit assignment.

- [ ] Add the smallest implementation/contract adjustment so omitted Sprint means Backlog; preserve explicit valid Sprint input only through the authorized planning boundary.
- [ ] Add a negative test for a Sprint belonging to another Project and a test that a regular Project member cannot assign into a Sprint.
- [ ] Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/project_task_backlog_default.spec.ts --files app/modules/tasks/tests/backend/integration/create_task.spec.ts
```

Expected GREEN: omitted Sprint is persisted as null; invalid/unauthorized explicit assignments fail without creating a partial task.

- [ ] Run relevant task DTO contract tests and record any unrelated pre-existing failure separately.
- [ ] Commit the default-location contract with message `test: prove new project tasks enter backlog`.

## 7. Task 5: Separate Draft creation from Sprint start

**Files:**

- Create: `app/modules/sprints/actions/commands/start_project_sprint_command.ts`
- Create: `app/modules/sprints/controllers/start_project_sprint_controller.ts`
- Modify: `app/modules/sprints/actions/commands/create_project_sprint_command.ts`
- Modify: `app/modules/sprints/domain/project_sprint_policy.ts`
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_repository.ts`
- Modify: `app/modules/sprints/infra/repositories/postgres_sprint_repository.ts`
- Modify: `start/routes/projects.ts`
- Create: `app/modules/sprints/tests/backend/integration/start_project_sprint_command.spec.ts`
- Modify: `app/modules/sprints/tests/backend/integration/project_sprint_commands.spec.ts`

**Public intent:**

```http
POST /api/v1/projects/:projectId/sprints/:sprintId/start
```

- [ ] Write a failing integration test proving create defaults to `draft` and named start changes exactly one Sprint to `active`.
- [ ] Add failing cases for second active Sprint, non-manager, invalid schedule, missing Sprint, and starting an already active/closed Sprint.
- [ ] Run the focused integration suite.

Expected RED: create/start semantics are not yet separated or the second active Sprint is accepted.

- [ ] Implement `StartProjectSprintCommand` with Project access, row locking, active-count check, schedule validation, and history snapshot writes.
- [ ] Keep the existing generic update command compatible for already persisted clients, but route new UI behavior through the named start endpoint.
- [ ] Add the route/controller/composition wiring.
- [ ] Run the focused suite again.

Expected GREEN: valid draft start passes; all negative cases return stable authorization/conflict/validation errors; no second active Sprint is persisted.

- [ ] Add a concurrency integration test that starts two drafts in the same Project from separate transactions and asserts one success and one conflict after both complete.
- [ ] Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/start_project_sprint_command.spec.ts --files app/modules/sprints/tests/backend/integration/project_sprint_commands.spec.ts
```

Expected output: one-active-Sprint invariant holds under concurrent start attempts.

- [ ] Commit the start lifecycle with message `feat: add explicit project sprint start`.

## 8. Task 6: Allow active-scope changes with durable reasons

**Files:**

- Modify: `app/modules/sprints/actions/commands/move_task_to_sprint_command.ts`
- Modify: `app/modules/sprints/public_contracts/sprint_public_api.ts`
- Modify: `app/modules/sprints/infra/repositories/postgres_sprint_repository.ts`
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_repository.ts`
- Modify: `app/modules/sprints/controllers/move_task_to_sprint_controller.ts`
- Modify: `app/modules/sprints/tests/backend/integration/move_task_to_sprint_command.spec.ts`
- Create: `app/modules/sprints/tests/backend/unit/sprint_scope_change_rules.spec.ts`

**Request addition:**

```ts
type SprintAssignmentReason = 'planned' | 'scope_change' | 'carry_over' | 'restored'

interface MoveTaskToSprintDTO {
  project_id: string
  task_id: string
  project_sprint_id: string | null
  reason?: SprintAssignmentReason
}
```

- [ ] Write failing unit tests for `planned`, `scope_change`, and `carry_over` classification.
- [ ] Write failing integration tests for adding a Backlog task to an active Sprint and removing it back to Backlog while preserving task workflow status.
- [ ] Run both focused tests.

Expected RED: history has no reason/scope marker or active-scope behavior cannot be proven.

- [ ] Implement reason normalization and history metadata in the existing transaction.
- [ ] Reject unsupported direct assignment reasons from public clients; the end-delivery command may use `carry_over` internally.
- [ ] Add an integration assertion that adding after `started_at` produces `added_after_start = true`.
- [ ] Run the focused unit and integration suites.

Expected GREEN: active additions/removals succeed for managers, preserve task status, and create exactly one new history event per actual location change.

- [ ] Add negative tests for archived Sprint, review-boundary Sprint, foreign Project, and unauthorized member.
- [ ] Commit the scope-change contract with message `feat: record active sprint scope changes`.

## 9. Task 7: End delivery and resolve incomplete tasks explicitly

**Files:**

- Create: `app/modules/sprints/actions/commands/end_project_sprint_delivery_command.ts`
- Create: `app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts`
- Modify: `app/modules/sprints/actions/ports/outbound/sprint_repository.ts`
- Modify: `app/modules/sprints/infra/repositories/postgres_sprint_repository.ts`
- Modify: `app/modules/sprints/domain/sprint_core_rules.ts`
- Modify: `start/routes/projects.ts`
- Create: `app/modules/sprints/tests/backend/integration/end_project_sprint_delivery_command.spec.ts`
- Modify: `app/modules/sprints/tests/backend/unit/sprint_core_rules.spec.ts`

**Request contract:**

```ts
interface EndProjectSprintDeliveryDTO {
  project_id: string
  sprint_id: string
  incomplete_tasks: Array<{
    task_id: string
    destination: { kind: 'backlog' } | { kind: 'sprint'; sprint_id: string }
  }>
}
```

- [ ] Write a failing decision-table unit test for a mixed Sprint containing done, cancelled, rejected, and incomplete tasks.
- [ ] Write a failing integration test that submits explicit destinations for incomplete tasks and asserts all pointer/history writes commit atomically.
- [ ] Write failing tests for missing destination, destination from another Project, destination Sprint not draft/active, and non-manager actor.
- [ ] Run the focused suite.

Expected RED: no end-delivery command exists or incomplete tasks can be silently carried over.

- [ ] Implement the command to lock the Sprint and all affected tasks, classify outcomes, require one destination for every incomplete task, preserve workflow statuses, and append history rows with `exit_reason`/`entry_reason`.
- [ ] Keep done/cancelled/rejected tasks in the historical Sprint and reject attempts to carry them by default unless a separate explicit reopen transition exists.
- [ ] Return a result containing historical task IDs, moved-to-Backlog IDs, and moved-to-Sprint IDs.
- [ ] Run the focused suite.

Expected GREEN: mixed outcome transaction passes; incomplete tasks are never silently lost; a failed validation leaves pointers/history unchanged.

- [ ] Add retry/idempotency coverage for submitting the same end-delivery command twice.
- [ ] Add a test proving the command only ends delivery once and does not mutate review package/reverse-review records.
- [ ] Commit the end-delivery behavior with message `feat: make sprint delivery completion explicit`.

## 10. Task 8: Expose assignment history and canonical planning contracts

**Files:**

- Create: `app/modules/sprints/actions/queries/list_task_sprint_assignment_history_query.ts`
- Create: `app/modules/sprints/controllers/list_task_sprint_assignment_history_controller.ts`
- Modify: `app/modules/sprints/actions/ports/inbound/sprint_query_factory.ts`
- Modify: `app/composition/sprint_application_composition.ts`
- Modify: `start/routes/projects.ts`
- Create: `app/modules/sprints/public_contracts/project_sprint_assignment_history.ts`
- Create: `app/modules/sprints/tests/backend/integration/list_task_sprint_assignment_history_query.spec.ts`
- Create: `app/modules/sprints/tests/backend/unit/project_sprint_planning_contracts.spec.ts`

**Public route:**

```http
GET /api/v1/projects/:projectId/tasks/:taskId/sprint-history
```

- [ ] Write failing contract tests for chronological history, current assignment marker, reason labels, and cross-Project denial.
- [ ] Run the focused contract/integration tests.

Expected RED: history endpoint or canonical response mapper does not exist.

- [ ] Implement the query with Project access checks and stable chronological ordering.
- [ ] Add response mapping that uses camelCase at the HTTP boundary while preserving snake_case internal records according to existing module conventions.
- [ ] Run focused tests.

Expected GREEN: a task moved across Backlog → Sprint 1 → Sprint 2 returns all historical assignments, not only the current pointer.

- [ ] Add a compatibility test proving existing Sprint list/board consumers continue to receive their documented fields while the new canonical planning fields are present.
- [ ] Commit the history read contract with message `feat: expose sprint assignment history`.

## 11. Task 9: Build the Project planning UI

**Files:**

- Modify: `inertia/apps/org/modules/projects/components/project_sprint_panel.svelte`
- Modify: `inertia/apps/user/modules/projects/components/project_sprint_panel.svelte`
- Modify: `inertia/apps/org/modules/projects/show.svelte`
- Modify: `inertia/apps/user/modules/projects/show.svelte`
- Modify: `inertia/apps/org/modules/sprints/index.svelte`
- Create or modify: `inertia/apps/org/tests/modules/projects/project_backlog_planning.test.ts`
- Modify: `inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts`
- Modify: `inertia/apps/org/tests/modules/projects/project_show_page.test.ts`
- Modify: matching user Project tests.

- [ ] Write failing component tests for: Backlog section, Draft/Active/Historical Sprint sections, Start Sprint action, adding a task to active Sprint, removing to Backlog, end-delivery modal buckets, and read-only member state.
- [ ] Run the focused Vitest files.

Expected RED: the new planning states/actions are absent or the existing full panel still presents only review-oriented copy.

- [ ] Render Product Backlog and Sprint Backlog as distinct sections inside the Project Sprints planning surface.
- [ ] Add explicit Draft → Start action; do not make creating a Sprint silently start it.
- [ ] Allow active-Sprint task additions/removals and show a scope-change indicator when the task was added after start.
- [ ] Add an end-delivery dialog that requires destinations for incomplete tasks and visibly keeps done/cancelled/rejected in historical results.
- [ ] Add assignment-history access from task/Sprint cards.
- [ ] Keep member reads available while hiding/disabling planning mutations according to the existing access model.
- [ ] Run the focused component tests again.

Expected GREEN: all component state and permission assertions pass without relying on arbitrary timeouts.

- [ ] Add keyboard/accessible-name assertions for Backlog, Start Sprint, move actions, modal focus, and error summaries.
- [ ] Run the org and user focused UI suites.

Expected output: both app surfaces pass their focused component suites; no review board test is used as a substitute for planning UI coverage.

- [ ] Commit the Project planning surface with message `feat: add project backlog and sprint planning UI`.

## 12. Task 10: Prove the real browser journeys

**Files:**

- Create: `inertia/apps/org/tests/e2e/projects/project_backlog_sprint_planning.spec.ts`
- Modify: `inertia/apps/org/tests/e2e/projects/sprint_board_role_experience.spec.ts` only for shared setup/route ownership.
- Modify: approved test-only seed/cleanup helpers if the existing Sprint fixture cannot express the scenarios; do not modify production seed behavior.

### RP-PSB-01 — Manager plans and starts one Sprint

- [ ] Seed one Organization, one Project, one manager, one member, at least five Backlog tasks, two draft Sprints, and no active Sprint.
- [ ] Login as manager and open Project Sprints.
- [ ] Assert Product Backlog count/order and both draft Sprints are visible.
- [ ] Move selected tasks into Sprint 1, start Sprint 1, and assert exactly one active Sprint.
- [ ] Refresh and assert the active Sprint remains selected and Backlog excludes selected tasks.
- [ ] Capture semantic assertions before screenshot; record route, actor, viewport, and fixture ID in the manifest.

Expected output: manager can plan and start one Sprint; no second active Sprint appears.

### RP-PSB-02 — Scope change during active Sprint

- [ ] Create a new Project task through the real UI and assert it appears in Product Backlog.
- [ ] Add it to the active Sprint and assert the UI marks it as added after start.
- [ ] Remove one incomplete Sprint task to Backlog and assert its workflow status is unchanged.
- [ ] Refresh and assert both current locations are correct.
- [ ] Query the test-only history endpoint or approved backend evidence hook and assert reasons/timestamps.

Expected output: active scope changes are visible, durable, and do not reset task status.

### RP-PSB-03 — End delivery with mixed task outcomes

- [ ] Seed done, cancelled, rejected, and incomplete tasks in the active Sprint.
- [ ] Open End Sprint and assert the four outcome buckets.
- [ ] Send incomplete task A to the next draft Sprint and task B to Product Backlog.
- [ ] Complete the flow and assert done/cancelled/rejected remain historical while A/B go to their chosen destinations.
- [ ] Refresh and inspect history for all affected tasks.

Expected output: no incomplete task disappears, no completed terminal task is silently carried over, and history remains readable.

### RP-PSB-04 — Member read-only and cross-Project negative path

- [ ] Login as a normal Project member and inspect Backlog/Sprint data.
- [ ] Assert Start, Reorder, Move, and End actions are unavailable or disabled with accessible explanation.
- [ ] Attempt a direct cross-Project assignment request and assert a safe failure.
- [ ] Assert no task, Sprint, rank, or history state changed.

Expected output: read access works; planning mutation is denied at both UI and API boundaries.

- [ ] Run:

```bash
pnpm exec playwright test inertia/apps/org/tests/e2e/projects/project_backlog_sprint_planning.spec.ts --project=chromium
```

Expected output: all P0 planning journeys pass; `pageerror`, unexpected 5xx, failed requests, and false-pass skips are zero.

- [ ] Commit the role-play suite and evidence manifest with message `test: prove project backlog sprint journeys`.

## 13. Task 11: Verification wave

- [ ] Run domain unit tests:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/sprints/tests/backend/unit/product_backlog_rules.spec.ts --files app/modules/sprints/tests/backend/unit/sprint_core_rules.spec.ts --files app/modules/sprints/tests/backend/unit/sprint_scope_change_rules.spec.ts --files app/modules/sprints/tests/backend/unit/project_sprint_planning_contracts.spec.ts
```

Expected output: all planning truth tables and contracts pass.

- [ ] Run Sprint integration tests sequentially:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/project_backlog_query.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/project_sprint_task_assignment_history.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/project_task_backlog_default.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/start_project_sprint_command.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/end_project_sprint_delivery_command.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/list_task_sprint_assignment_history_query.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/move_task_to_sprint_command.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/sprints/tests/backend/integration/get_sprint_board_query.spec.ts
```

Expected output: each command exits `0`; if a shared database cleanup issue occurs, record the exact
suite and rerun serially instead of marking the feature green.

- [ ] Run affected component tests:

```bash
  pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_backlog_planning.test.ts inertia/apps/org/tests/modules/projects/project_sprint_panel.test.ts inertia/apps/org/tests/modules/projects/project_show_page.test.ts inertia/apps/user/tests/modules/projects/show.test.ts
```

Expected output: all planning UI tests pass with accessible state assertions.

- [ ] Run the P0 Chromium role-play suite and inspect screenshots/traces manually.
- [ ] Run typecheck/lint/build commands used by the repository's current CI profile.
- [ ] Run `gitnexus detect-changes` from the repository root.

Expected output: detected files/flows match only Product Backlog, Sprint planning, task assignment
history, affected routes, and their tests. Any extra affected symbol must be investigated before the
work is considered complete.

- [ ] Review the dirty worktree diff and ensure no unrelated files were reverted or included.
- [ ] Record migration verification, focused test results, browser evidence, remaining known failures,
  and review-module boundary confirmation in the handoff.

## 14. Definition of done

This plan is complete only when:

- every task has RED evidence followed by GREEN evidence;
- each acceptance row has all applicable test layers, not only a unit test;
- one-active-Sprint concurrency is proven;
- task assignment history survives multiple moves;
- Product Backlog order survives refresh and pagination;
- active scope changes are visible and durable;
- mixed end-delivery outcomes are handled explicitly;
- manager/member and cross-Project negative paths pass;
- browser journeys pass with semantic assertions before screenshots;
- `gitnexus detect-changes` has been run before any commit;
- unrelated dirty-worktree changes are excluded from the final handoff.
