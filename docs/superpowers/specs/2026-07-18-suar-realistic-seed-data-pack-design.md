# Suar Realistic Seed Data Pack Design

Date: 2026-07-18
Status: Draft for Worker C
Scope: Seed data design only. No runtime product behavior changes in this document.

## Goal

Create a deterministic Suar seed pack that feels like real product data and is relationally valid for the dispute domain.

The seed must support:

- `organization -> project -> sprint/task` hierarchy.
- Task packages with assignment, submission, evidence, comments, and review data.
- Profile and work-history context for both sides of a dispute.
- Related tasks in the same project or sprint.
- All 3 dispute review types:
  - `task_review`
  - `manager_review`
  - `environment_review`

## Current Evidence

Read-only DB counts from 2026-07-18 show current seed is linked but incomplete for this target.

| Table                           | `suar` | `suar_test` |
| ------------------------------- | -----: | ----------: |
| organizations                   |      5 |           4 |
| projects                        |     10 |           6 |
| project_sprints                 |      2 |           0 |
| tasks                           |     19 |           2 |
| task_assignments                |     15 |           0 |
| task_submissions                |     15 |           0 |
| review_sessions                 |      8 |           0 |
| skill_reviews                   |     18 |           0 |
| review_disputes                 |      3 |           0 |
| review_dispute_case_files       |      3 |           0 |
| task_review_workflows           |      0 |           0 |
| sprint_review_disputes          |      0 |           0 |
| sprint_reverse_review_workflows |      4 |           0 |
| sprint_review_packages          |      4 |           0 |
| sprint_manager_reviews          |      3 |           0 |
| sprint_environment_reviews      |      3 |           0 |
| user_profile_snapshots          |      3 |           0 |
| user_work_history               |      8 |           0 |
| ai_dispute_evaluations          |      3 |           0 |

Existing seed entrypoint:

- `commands/seed_data.ts`
- `app/seed/demo_data/**`
- There is no `database/seeders` entrypoint.

Existing docs:

- `docs/superpowers/specs/2026-07-17-seed-data-redesign-design.md`
- `docs/superpowers/plans/2026-07-17-seed-data-redesign.md`
- `docs_AI/seed_data_audit/suar_seed_data_audit.md`
- `docs_AI/seed_data_audit/suar_seed_data_audit.json`

## Decision

Build this as a narrow add-on to current `app/seed/demo_data` architecture, not as a new seed framework.

Do not import `data_train` rows directly into the DB. Use `data_train` only as:

- Runtime package shape reference.
- Evidence/rationale narrative reference.
- Case-file context checklist.

The Suar seed pack itself should remain native TypeScript seed specs and seeders under `app/seed/demo_data/**`.

## Scenario Model

Add a focused scenario layer for dispute seed cases.

Recommended scenario keys:

| Key                              | Review type          | Source table                      | Expected state              |
| -------------------------------- | -------------------- | --------------------------------- | --------------------------- |
| `taskReviewEvidenceUnderscored`  | `task_review`        | `task_review_workflows`           | reported or resolved        |
| `managerSprintPlanningAmbiguity` | `manager_review`     | `sprint_review_disputes`          | admin_reviewing or resolved |
| `environmentOwnershipAmbiguity`  | `environment_review` | `sprint_reverse_review_workflows` | reported or resolved        |

Each scenario must declare:

- organization key
- project key
- sprint key when relevant
- primary task keys
- related task keys
- task giver key
- reviewee/worker key
- reviewer/counterparty key
- evidence summary
- missing-context flags, if intentional
- expected admin decision, when resolved

## Data Requirements

### Organization And Project

At least one primary organization must contain two projects:

- One active delivery project.
- One related platform/operations project.

The same people may appear across projects only when membership roles make sense.

### Task Cluster

Each dispute scenario must be backed by a task cluster, not a single isolated task.

Minimum task cluster:

- 1 disputed task.
- 2 related project tasks.
- 1 sprint peer task.
- 1 task assigned by the manager/task giver for the manager-review scenario.

Tasks must have:

- task giver/creator
- assignee
- task assignment
- submission package
- submission evidence
- comments
- version/snapshot records if available in current seed architecture
- required skills in all 4 top-level categories:
  - `technology`
  - `engineering`
  - `soft_skill`
  - `delivery`

### Profile And Work History

Both sides of each dispute need profile/work context:

- `user_profile_snapshots`
- `user_work_history`
- `user_skills`
- performance/domain aggregate rows where current seed supports them

There is no separate calendar/work-schedule table in current audit evidence. Work schedule should initially be derived from assigned/created tasks in the scenario until product schema adds explicit calendar records.

### Dispute Types

`task_review` must include:

- `task_review_workflows`
- `task_review_reviewers`
- `task_review_messages`
- runtime context with:
  - organization/project/task
  - task giver context
  - reviewee context
  - related project tasks
  - sprint peer tasks

`manager_review` must include:

- `sprint_review_packages`
- `sprint_manager_reviews`
- `sprint_review_disputes`
- runtime context with:
  - organization/project/sprint
  - manager assigned tasks
  - reviewer context
  - counterparty/manager context

`environment_review` must include:

- `sprint_review_packages`
- `sprint_environment_reviews`
- `sprint_reverse_review_workflows`
- report message with runtime context or source fields sufficient to build one
- environment signals, organization/project/sprint context, and peer tasks

## Integrity Requirements

Strengthen `assertSeedIntegrity` so the seed fails when:

- Any expected dispute review type is absent.
- A dispute scenario lacks org/project/task/sprint links.
- A task-review workflow lacks reviewers or messages.
- A sprint manager-review dispute lacks `manager_assigned_tasks` in runtime context.
- An environment-review report lacks environment signal/context.
- Either side of a dispute lacks profile snapshot or work history.
- Related project tasks or sprint peer tasks are missing.
- User-visible seed copy contains seed/test/filler phrasing.

## Non-Goals

- No schema migration unless implementation proves current tables cannot represent required seed state.
- No import of raw `data_train` labels.
- No fake gold labels.
- No random filler tasks.
- No Clawagent prompt/runtime changes.

## Verification

Minimum verification for implementation:

```bash
pnpm exec tsc --noEmit --pretty false
pnpm exec node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/testing/tests/backend/unit/seed_task_specs.spec.ts app/modules/testing/tests/backend/unit/seed_copy_guard.spec.ts
```

Implementation should also run `seed:data` on a safe local DB before claiming the seed pack is ready. Use `PG_TEST_DATABASE` or a clearly disposable seed DB. Do not reset the main `suar` DB without explicit user approval.
