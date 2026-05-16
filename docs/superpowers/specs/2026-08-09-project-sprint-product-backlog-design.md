# Suar Project Sprint and Product Backlog Design

**Status:** Proposed target architecture
**Date:** 2026-08-09
**Scope:** Project-owned Product Backlog, Sprint planning, Sprint Backlog, active-sprint scope changes, carry-over, and Sprint history
**Out of scope:** Sprint Review, assigner review, environment review, review packages, reverse-review governance, and retrospective workflow

**Related documents:**

- [Sprint Management Module Design](./2026-07-16-sprint-management-module-design.md)
- [Organization and Project Workspace](../../01-business/features/organization_and_project_workspace.md)
- [Review Dispute and Governance](../../01-business/features/review_dispute_and_governance.md)

## 1. Objective

Make the Project planning model explicit without creating a second Product Backlog module:

```text
Organization
└── Project
    ├── Product Backlog
    ├── Sprint 1 — completed/history
    ├── Sprint 2 — review/governance boundary
    ├── Sprint 3 — active
    └── Sprint 4 — draft/future
```

The canonical planning boundary remains `app/modules/sprints`. Product Backlog is a Project-scoped
planning view and capability inside that boundary; it is not a duplicate task table or a separate
organization-level collection.

The design has four goals:

1. Every new Project task has a predictable initial location.
2. A Project has one understandable active Sprint in v1.
3. Scope can change during an active Sprint without corrupting Sprint history.
4. Incomplete, completed, cancelled, and rejected work have explicit end-of-Sprint behavior.

## 2. Current-state evidence

The repository already has a partial Sprint planning implementation:

- `app/modules/sprints` owns create/update/list/show Sprint operations.
- `GetSprintBoardQuery` returns Product Backlog-like tasks and selected Sprint tasks separately.
- `MoveTaskToSprintCommand` moves a Project task into a Sprint or back to `null`.
- `tasks.project_sprint_id = null` is currently treated as Product Backlog.
- New task persistence defaults `project_sprint_id` to `null` when the request does not provide one.
- Tasks may currently be attached only to a Sprint from the same Project and only while the Sprint is
  `draft` or `active`.
- `project_sprints` supports `draft`, `active`, `review_open`, `review_closed`, and `archived`.
- The current Sprint board chooses the latest active Sprint when no Sprint ID is supplied.
- The current task-to-Sprint link is a single mutable pointer. Moving a task overwrites its previous
  Sprint membership, so historical carry-over cannot be reconstructed reliably from that pointer alone.
- `tasks.sort_order` already provides stable task ordering, but the current task list and Sprint board
  do not expose a first-class Product Backlog ordering command or contract.

The current implementation is therefore a useful starting point, not the final domain contract.

## 3. Decision summary

| Decision | Target behavior |
| --- | --- |
| Backlog ownership | Product Backlog belongs to a Project. |
| New task location | A new Project task enters Product Backlog by default unless an explicit valid Sprint is selected. |
| Backlog representation | Product Backlog is a filtered, ordered Project task view; no standalone `product_backlogs` table in v1. |
| Planning module | Extend `app/modules/sprints`; do not create `app/modules/product_backlog` in v1. |
| Active Sprint cardinality | At most one `active` Sprint per Project in v1. Multiple draft/future and historical Sprints are allowed. |
| Sprint creation | Create a Sprint as `draft`; an explicit start transition makes it `active`. |
| Active-sprint additions | Allowed. Adding/removing work after start is a recorded scope change. |
| Sprint selection | A Sprint Backlog is the selected set of Project Backlog items plus items created directly for the Sprint. |
| Incomplete work | At Sprint delivery completion, each incomplete item is explicitly moved to the next Sprint or Product Backlog. |
| Completed work | `done` work remains historical evidence of the old Sprint and is not automatically added to the next Sprint. |
| Cancelled/rejected work | It remains attached to the historical Sprint and is not carried into the next Sprint by default. |
| History | A durable task–Sprint assignment history records entry, exit, reason, and whether an item was added after start. |
| Review boundary | Existing review lifecycle remains outside this design. This spec only defines the delivery/planning handoff into that boundary. |

## 4. Vocabulary

### 4.1 Project

The product/workspace boundary that owns tasks, Product Backlog ordering, and Sprints. Organization
membership and Project access continue to provide authorization; they do not own the Backlog.

### 4.2 Product Backlog

The ordered, continuously changing set of Project work that has not been committed to a current or
future Sprint. In v1, it is represented by active Project tasks whose current
`project_sprint_id` is `null`, plus explicit backlog ordering and filters.

The Product Backlog is not equivalent to every row in `tasks`. Historical `done`, `cancelled`, and
`rejected` tasks may have no current Sprint assignment for other reasons, but they are not automatically
backlog work. The read contract must distinguish `backlog`, `historical`, and `deleted`/hidden records.

### 4.3 Sprint

A Project-owned, time-boxed delivery window with a Sprint Goal, schedule, lifecycle state, and a
mutable Sprint Backlog. A Sprint is not a folder and not a permanent task status.

### 4.4 Sprint Backlog

The set of task assignments currently associated with one Sprint. It includes Product Backlog items
selected during planning and work added during the active Sprint. The assignment does not replace the
task's workflow status.

### 4.5 Scope change

An add, remove, or reassignment affecting a Sprint after it became `active`. Scope change is expected
in real work; it must be observable for reporting and does not by itself invalidate the Sprint.

### 4.6 Carry-over

An explicit end-of-delivery decision that moves an incomplete task from a completed Sprint to a future
Sprint. Carry-over is not automatic simply because a task is incomplete.

## 5. Domain model

### 5.1 Two independent dimensions on a task

Task workflow status and planning location must remain separate:

```text
Task
├── workflow status: todo | in_progress | done | rejected | cancelled | ...
└── planning location:
    ├── Product Backlog
    └── one current Sprint
```

The following must not be inferred from one another:

- `project_sprint_id = null` does not mean the task is `todo`.
- `status = done` does not mean the task must be removed from historical Sprint reports.
- `status = in_progress` does not automatically mean the task belongs to the active Sprint.
- Moving a task to a new Sprint does not reset its workflow status.

### 5.2 Project task default

When a task is created within a Project:

- omitted `project_sprint_id` becomes `null`;
- the task appears in Product Backlog;
- it is not included in an active Sprint until explicitly selected;
- the task's existing status initialization remains owned by the task workflow module.

An explicit Sprint assignment is accepted only if:

- the Sprint belongs to the same Project;
- the actor can manage Sprint planning;
- the Sprint is `draft` or `active`;
- the task is not deleted;
- the assignment does not violate the one-active-Sprint Project policy.

### 5.3 Backlog ordering

Product Backlog ordering is Project-scoped and deterministic. The v1 contract exposes an explicit
rank/order value rather than relying on task `updated_at` order.

The read order is:

1. explicit Backlog rank ascending;
2. task priority as a secondary business signal;
3. `updated_at` descending;
4. task ID descending as a stable tie-breaker.

The Backlog rank is only meaningful among current Product Backlog items in the same Project. Sprint
task order can continue using the existing task-board ordering contract until a separate Sprint ranking
requirement is approved.

### 5.4 Sprint lifecycle owned by planning

The planning contract is:

```text
draft → active → delivery-ended/review boundary → historical
```

The persisted repository currently uses:

```text
draft → active → review_open → review_closed → archived
```

This design does not rename or reimplement the review states. It defines the planning meaning of the
handoff:

- `draft`: Sprint can be prepared, scheduled, ranked, and populated.
- `active`: delivery is in progress; task additions/removals are allowed and recorded.
- `review_open`: delivery selection is no longer being treated as the active Sprint board; review
  governance owns the next phase.
- `review_closed`: review governance has closed its period.
- `archived`: historical Sprint is read-only for normal planning operations.

The implementation must not make date passage silently mutate lifecycle state. Starting and ending a
Sprint are explicit commands so that tests and audit records are deterministic.

### 5.5 One active Sprint per Project

The v1 invariant is:

```text
count(project_sprints where project_id = P and status = 'active') <= 1
```

Multiple `draft` Sprints are allowed so a manager can prepare future work. A Project with no active
Sprint is valid while planning or between delivery cycles.

Parallel active Sprints are explicitly deferred until Suar has a first-class team/board delivery scope.
That future feature must not be implemented by merely removing this invariant.

### 5.6 Creating and starting Sprints

Create and start are separate operations:

```text
POST /projects/:projectId/sprints           → draft
POST /projects/:projectId/sprints/:sprintId/start → active
```

Before start, the manager may set the name, goal, dates, and Sprint Backlog. At start:

- the Project must not have another active Sprint;
- the schedule must be valid;
- the actor must have Sprint management permission;
- the Sprint Goal may be nullable for the initial compatibility path, but the UI should strongly
  encourage one;
- all assignments present at that moment receive a planning snapshot/history entry.

The plan may preserve the existing generic status update internally, but the public contract should
expose a named start intent so clients do not need to know lifecycle transition implementation details.

### 5.7 Adding work during an active Sprint

An active Sprint accepts:

- a Product Backlog task added to the Sprint;
- a newly created Project task explicitly assigned to the active Sprint;
- an active-Sprint task removed back to Product Backlog;
- an active-Sprint task reassigned to a different future/draft Sprint only through an explicit manager
  operation.

Every post-start add/remove/reassignment records:

- task ID;
- previous and next Sprint IDs;
- actor;
- timestamp;
- reason when supplied;
- `added_after_start` or equivalent scope-change marker.

Adding work does not change the Sprint Goal, task status, or historical task identity.

### 5.8 Ending a Sprint and incomplete work

At the delivery-end command, the system must present every current Sprint task in one of these buckets:

| Task category | Default result |
| --- | --- |
| `done` | Keep in historical Sprint; do not carry over. |
| `cancelled` | Keep in historical Sprint; do not carry over. |
| `rejected` | Keep in historical Sprint; do not carry over unless explicitly reopened and replanned. |
| Other incomplete status | Require destination: next Sprint or Product Backlog. |

The command must not silently move all incomplete tasks to the next Sprint. A bulk choice is allowed,
but the persisted result must be explicit per task so a manager can send some items to the next Sprint
and others back to Backlog.

The task workflow status is preserved during carry-over. A carry-over operation changes planning
location, not completion state.

### 5.9 Historical assignment

The current `tasks.project_sprint_id` remains the current location pointer. A new append-only assignment
history is required for reporting and audit:

```text
project_sprint_task_assignments
- id
- organization_id
- project_id
- task_id
- sprint_id
- entered_at
- exited_at nullable
- entry_reason
- exit_reason nullable
- added_after_start
- actor_id
- created_at
```

The exact migration naming may follow repository conventions, but the semantics above are required.
Only one current assignment may exist for a task at a time. Historical rows must not be rewritten when
the task moves to a later Sprint.

## 6. API and surface contract

### 6.1 Product Backlog read surface

The Sprint planning API remains Project-scoped. The selected board response must clearly distinguish:

```ts
{
  projectId: string
  backlog: {
    tasks: ProjectPlanningTask[]
    counts: { total: number }
  }
  selectedSprint: SprintSummary | null
  sprintTasks: ProjectPlanningTask[]
}
```

Compatibility mapping from the current `backlog_tasks`/`sprint_tasks` fields may be retained during
migration, but the canonical application contract must use names that make Product Backlog explicit.

### 6.2 Sprint collection

The Project Sprint list must include:

- draft/future Sprints;
- the active Sprint, if one exists;
- historical Sprints;
- status, date range, goal, and task counts;
- a safe indicator for whether a Sprint can accept planning changes.

The list must not silently hide future Sprints just because the board defaults to the active Sprint.

### 6.3 Planning mutations

The planning boundary needs these explicit intents:

- create draft Sprint;
- start draft Sprint;
- update draft/active Sprint metadata;
- add task to Sprint;
- remove task to Product Backlog;
- reorder Product Backlog;
- end delivery and submit incomplete-task destinations;
- read assignment history for a Project task/Sprint.

Review-open and review-period operations remain routed through `app/modules/reviews` and are only
consumed as the next lifecycle boundary.

### 6.4 UI

The Project detail page is the primary planning surface. It should expose:

- Product Backlog section with rank/order controls;
- Sprint list with Draft, Active, and historical states;
- selected Sprint Backlog;
- Start Sprint action for draft Sprints;
- Add/remove task actions while allowed;
- explicit End Sprint flow showing done/cancelled/rejected/incomplete buckets;
- carry-over destination selection;
- task history link showing previous Sprint assignments.

The general Task Board may link to Project planning, but must not silently present the full planning
surface as if it were only a task-status board.

## 7. Authorization and integrity

- Project participants may read Project Backlog and Sprint planning data allowed by Project visibility.
- Project owner, manager, and existing manager roles may mutate Sprint planning.
- A task and Sprint must belong to the same Project.
- A normal task mutation must not be able to bypass planning authorization by writing
  `project_sprint_id` directly.
- Only one active Sprint per Project is allowed.
- A task has at most one current Sprint assignment.
- Historical assignment rows are append-only from the application boundary.
- Deleted/hidden tasks do not appear in current Product Backlog or Sprint Backlog reads.

## 8. Testing strategy

No feature is complete with only one unit test. Every P0 planning behavior requires the smallest
appropriate evidence bundle:

| Behavior | Required evidence |
| --- | --- |
| Task defaults to Backlog | DTO/unit + persistence integration + API contract |
| Backlog ordering | domain/unit + repository integration + API pagination/order contract |
| One active Sprint | domain truth table + database/application concurrency integration + API negative contract |
| Draft → active | lifecycle unit + command integration + API contract + manager/member permission tests |
| Add task while active | domain unit + transaction integration + API contract + Project UI component test + E2E |
| Remove/carry-over | decision-table unit + transaction integration + API contract + UI flow/E2E |
| Done/cancelled/rejected handling | classification unit + persisted end-delivery integration + historical read contract |
| Historical assignment | migration/schema integration + repository integration + replay/idempotency test |
| Backlog/Sprint UI | component tests for state/actions + role-play E2E + semantic assertions before screenshot |

Required negative coverage includes cross-Project assignment, second active Sprint, unauthorized
mutation, deleted task, invalid destination, duplicate retry, stale command, and concurrent start.

## 9. Acceptance criteria

The planning capability is accepted only when all of the following are true:

1. Creating a Project task without a Sprint places it in Product Backlog.
2. Product Backlog read order is deterministic and can be explicitly changed by an authorized manager.
3. A Project cannot have two active Sprints, including concurrent start attempts.
4. A draft Sprint can be started through a named start operation.
5. An active Sprint accepts new task scope and records the change.
6. A manager can remove a task to Product Backlog without changing its workflow status.
7. Ending a Sprint shows all task outcome buckets and requires a destination for incomplete work.
8. Done, cancelled, and rejected tasks do not appear in the next Sprint by default.
9. Carry-over preserves task status and creates a new assignment-history row.
10. Historical Sprint views still show completed/cancelled/rejected tasks after carry-over decisions.
11. Members can inspect but cannot mutate planning unless their existing Project role permits it.
12. Backend, contract, component, integration, E2E, and required evidence gates pass without false-pass
    patterns.

## 10. Delivery phases

### Phase A — Domain and persistence foundation

Add explicit planning rules, current-location semantics, assignment history, one-active-Sprint
protection, and task default tests.

### Phase B — Product Backlog contract

Expose ordered Backlog reads, ranking mutation, stable counts, and API contracts.

### Phase C — Sprint lifecycle and scope changes

Separate draft/start behavior, active-Sprint additions, removal to Backlog, and end-delivery
carry-over decisions.

### Phase D — Project planning UI and role-play

Make Project planning the primary surface, test manager/member behavior, and prove the core journeys
through the real browser.

### Phase E — Verification and migration readiness

Run focused tests sequentially where the shared test database requires it, run affected suites, inspect
assignment-history data, run `gitnexus detect-changes`, and record any unrelated dirty-worktree failures
separately.

## 11. Explicit non-goals

- No standalone Product Backlog aggregate/table in v1.
- No parallel active Sprints before a team/board delivery scope exists.
- No automatic date-based lifecycle mutation.
- No automatic carry-over of every incomplete task.
- No deletion of historical Sprint membership.
- No redesign of Sprint Review, assigner review, environment review, or dispute governance.
- No replacement of the existing task workflow status system with Sprint statuses.
- No broad rename of `app/modules/sprints` to `project_planning` in this delivery.

## 12. Research references

- [The Scrum Guide 2020](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf)
- [Atlassian — Start a sprint](https://support.atlassian.com/jira-software-cloud/docs/plan-a-sprint/)
- [Atlassian — Complete a sprint](https://support.atlassian.com/jira-software-cloud/docs/complete-a-sprint/)
- [Atlassian — Enable the backlog](https://support.atlassian.com/jira-software-cloud/docs/enable-the-backlog/)
- [Atlassian — Parallel sprints](https://support.atlassian.com/jira-software-cloud/docs/what-are-parallel-sprints/)
