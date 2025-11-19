# Suar Realistic Seed Data Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, realistic Suar seed pack that covers org/project/task hierarchy, profile/work-history context, related tasks, and all 3 dispute review types.

**Architecture:** Keep the existing `seed:data` command and `app/seed/demo_data/**` modules. Add one small scenario-spec module and focused seeder additions for missing dispute sources, then harden `assertSeedIntegrity` so missing relationships fail fast.

**Tech Stack:** TypeScript, AdonisJS Ace command, Lucid query builder, PostgreSQL, Japa tests, GitNexus CLI.

## Global Constraints

- Do not import `data_train` rows directly into Suar DB.
- Do not fake gold/admin labels.
- Do not reset the main `suar` DB without explicit user approval.
- Use `PG_TEST_DATABASE` or a disposable DB for destructive seed verification.
- Preserve current seed keys and canonical test-dependent emails.
- Skill evidence must use the 4 top-level categories: `technology`, `engineering`, `soft_skill`, `delivery`.
- User-visible seed copy must not contain seed/test/filler language.
- Run `gitnexus impact <symbolName>` before editing any Suar function, class, or method.
- Run `gitnexus detect-changes` before committing or final completion.

---

## File Structure

Create:

- `app/seed/demo_data/dispute_scenario_specs.ts`
  - Single source of truth for required dispute seed scenarios.
- `app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts`
  - Verifies all 3 dispute types and required scenario links exist.

Modify:

- `commands/seed_data.ts`
  - Wire any new seeder function in deterministic order.
- `app/seed/demo_data/types.ts`
  - Add narrow scenario types if needed.
- `app/seed/demo_data/task_specs.ts`
  - Add or align task cluster specs for each dispute scenario.
- `app/seed/demo_data/review_specs.ts`
  - Align review/dispute claims with scenario specs.
- `app/seed/demo_data/review_data_seeder.ts`
  - Keep classic `review_disputes` path aligned.
- `app/seed/demo_data/review_dispute_dossier_seeder.ts`
  - Ensure classic case files include related tasks/profile/work-history context.
- `app/seed/demo_data/sprint_seeder.ts`
  - Seed missing `sprint_review_disputes` and enrich reverse workflow runtime/report context.
- `app/seed/demo_data/seed_integrity.ts`
  - Add relationship checks for all 3 dispute types.

---

### Task 1: Scenario Contract

**Files:**

- Create: `app/seed/demo_data/dispute_scenario_specs.ts`
- Create: `app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts`
- Modify: `app/seed/demo_data/types.ts` only if inline types become noisy.

**Interfaces:**

- Produces:
  - `DisputeReviewType = 'task_review' | 'manager_review' | 'environment_review'`
  - `DISPUTE_SCENARIO_SPECS`
  - `EXPECTED_DISPUTE_REVIEW_TYPES`

- [x] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "SeedContext"
gitnexus impact "TaskSpec"
```

Expected: MEDIUM or lower. If HIGH/CRITICAL appears, stop and report.

- [x] **Step 2: Write failing test**

Create `app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts`:

```ts
import { test } from '@japa/runner'

import {
  DISPUTE_SCENARIO_SPECS,
  EXPECTED_DISPUTE_REVIEW_TYPES,
} from '../../../../../seed/demo_data/dispute_scenario_specs.js'

test.group('Seed dispute scenario specs', () => {
  test('cover all dispute review types', ({ assert }) => {
    const presentTypes = new Set(DISPUTE_SCENARIO_SPECS.map((scenario) => scenario.reviewType))

    for (const reviewType of EXPECTED_DISPUTE_REVIEW_TYPES) {
      assert.isTrue(presentTypes.has(reviewType), `missing ${reviewType}`)
    }
  })

  test('declare hierarchy and party context for every scenario', ({ assert }) => {
    for (const scenario of DISPUTE_SCENARIO_SPECS) {
      assert.isNotEmpty(scenario.organization)
      assert.isNotEmpty(scenario.project)
      assert.isNotEmpty(scenario.primaryTask)
      assert.isAtLeast(scenario.relatedTasks.length, 1)
      assert.isNotEmpty(scenario.taskGiver)
      assert.isNotEmpty(scenario.worker)
      assert.isNotEmpty(scenario.counterparty)
    }
  })
})
```

- [x] **Step 3: Verify RED**

Run:

```bash
pnpm exec node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts
```

Expected: FAIL because `dispute_scenario_specs.ts` is missing.

- [x] **Step 4: Implement minimal scenario spec**

Create `app/seed/demo_data/dispute_scenario_specs.ts`:

```ts
import type { OrgKey, ProjectKey, UserKey } from './types.js'

export type DisputeReviewType = 'task_review' | 'manager_review' | 'environment_review'

export const EXPECTED_DISPUTE_REVIEW_TYPES = [
  'task_review',
  'manager_review',
  'environment_review',
] as const satisfies readonly DisputeReviewType[]

export interface DisputeScenarioSpec {
  key: string
  reviewType: DisputeReviewType
  organization: OrgKey
  project: ProjectKey
  sprint?: string
  primaryTask: string
  relatedTasks: string[]
  taskGiver: UserKey
  worker: UserKey
  counterparty: UserKey
  expectedDecision?: 'adjust_score' | 'uphold_review' | 'request_more_evidence' | 'partially_accept'
  evidenceSummary: string
}

export const DISPUTE_SCENARIO_SPECS: DisputeScenarioSpec[] = [
  {
    key: 'taskReviewEvidenceUnderscored',
    reviewType: 'task_review',
    organization: 'orgA',
    project: 'orgAOperations',
    primaryTask: 'owner-review-dispute-case',
    relatedTasks: ['member-admin-regression', 'owner-data-governance'],
    taskGiver: 'orgAdmin',
    worker: 'owner',
    counterparty: 'peerReviewer',
    expectedDecision: 'adjust_score',
    evidenceSummary: 'Submission evidence and related operations work support a score adjustment.',
  },
  {
    key: 'managerSprintPlanningAmbiguity',
    reviewType: 'manager_review',
    organization: 'orgA',
    project: 'orgAPlatform',
    sprint: 'trustReviewJuly',
    primaryTask: 'member-profile-proof',
    relatedTasks: ['member-org-switch', 'member-profile-live'],
    taskGiver: 'owner',
    worker: 'member',
    counterparty: 'owner',
    expectedDecision: 'partially_accept',
    evidenceSummary: 'Sprint handoff helped delivery, but rubric examples arrived late.',
  },
  {
    key: 'environmentOwnershipAmbiguity',
    reviewType: 'environment_review',
    organization: 'orgA',
    project: 'orgAPlatform',
    sprint: 'trustReviewJuly',
    primaryTask: 'member-profile-proof',
    relatedTasks: ['member-org-switch', 'member-profile-live'],
    taskGiver: 'owner',
    worker: 'member',
    counterparty: 'orgAdmin',
    expectedDecision: 'request_more_evidence',
    evidenceSummary:
      'Environment review needs clearer ownership signals for sprint scoring governance.',
  },
]
```

- [x] **Step 5: Verify GREEN**

Run the same unit command. Expected: PASS.

Completion evidence from current session:

- `gitnexus impact SeedContext`: `risk: MEDIUM`, `direct_callers: 10`.
- `gitnexus impact TaskSpec`: `risk: MEDIUM`, `direct_callers: 17`.
- RED: focused unit command failed because `dispute_scenario_specs.ts` was missing.
- GREEN: focused unit command passed, 2 tests.

### Task 2: Task Cluster Coverage

**Files:**

- Modify: `app/seed/demo_data/task_specs.ts`
- Modify: `app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts`

**Interfaces:**

- Consumes `DISPUTE_SCENARIO_SPECS`.
- Produces task specs for every `primaryTask` and `relatedTasks`.
- Produces `getTaskRequiredSkillCategory(skillCode: string): TaskRequiredSkillCategory | null` from `task_specs.ts`.

- [x] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "getSeededTaskSpecs"
```

- [x] **Step 2: Write failing test**

Append to `seed_dispute_scenario_specs.spec.ts`:

```ts
import {
  getSeededTaskSpecs,
  getTaskRequiredSkillCategory,
} from '../../../../../seed/demo_data/task_specs.js'

test('every dispute scenario references existing task specs with four-category skills', ({
  assert,
}) => {
  const taskSpecs = getSeededTaskSpecs({ dense: true })
  const byKey = new Map(taskSpecs.map((task) => [task.key, task]))
  const requiredCategories = ['technology', 'engineering', 'soft_skill', 'delivery']

  for (const scenario of DISPUTE_SCENARIO_SPECS) {
    for (const taskKey of [scenario.primaryTask, ...scenario.relatedTasks]) {
      const task = byKey.get(taskKey)
      assert.exists(task, `missing task ${taskKey}`)
      for (const category of requiredCategories) {
        assert.isTrue(
          task!.requiredSkills.some((skill) => getTaskRequiredSkillCategory(skill) === category),
          `task ${taskKey} missing ${category} required skill`
        )
      }
    }
  }
})
```

Expected RED: FAIL because `getTaskRequiredSkillCategory` is not exported yet, or because a scenario points at an absent task.

- [x] **Step 3: Implement minimal task alignment**

Edit `task_specs.ts` so every scenario key exists. Prefer reusing existing realistic task specs and renaming scenario references over adding many new tasks.

Export the category helper from the existing private mapping:

```ts
export function getTaskRequiredSkillCategory(skillCode: string): TaskRequiredSkillCategory | null {
  return TASK_REQUIRED_SKILL_CATEGORY_BY_CODE[skillCode] ?? null
}
```

- [x] **Step 4: Verify GREEN**

Run:

```bash
pnpm exec node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts app/modules/testing/tests/backend/unit/seed_task_specs.spec.ts
```

Completion evidence from current session:

- `gitnexus impact getSeededTaskSpecs`: `risk=MEDIUM`, `direct_callers=6`.
- `gitnexus impact TASK_REQUIRED_SKILL_CATEGORY_BY_CODE`: `risk=MEDIUM`, `direct_callers=1`.
- RED: focused unit command failed because `getTaskRequiredSkillCategory` was not exported.
- GREEN: focused unit command passed, 3 tests.

### Task 3: Seed Missing Task Review Workflow

**Files:**

- Modify: `app/seed/demo_data/review_data_seeder.ts` or create `app/seed/demo_data/task_review_workflow_seeder.ts`
- Modify: `commands/seed_data.ts` if a new seeder is created
- Modify: `app/seed/demo_data/seed_integrity.ts`

**Interfaces:**

- Produces rows in:
  - `task_review_workflows`
  - `task_review_reviewers`
  - `task_review_messages`

- [x] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "seedReviewData"
gitnexus impact "assertSeedIntegrity"
```

- [x] **Step 2: Write failing integrity test or check**

Add an integrity check in `seed_integrity.ts` after sprint/profile checks:

```ts
const taskReviewWorkflows = await countRowsIfTableExists(trx, 'task_review_workflows')
if (taskReviewWorkflows === 0) {
  fail('missing task review workflow seed data')
}
```

Expected RED: `seed:data` or existing seed integrity path fails because DB audit shows current count is 0.

- [x] **Step 3: Implement minimal seeder**

Seed one reported or resolved `task_review_workflows` row for the `taskReviewEvidenceUnderscored` scenario. Add at least:

- 1 manager reviewer.
- 1 peer reviewer.
- 1 review message.
- 1 report message with `metadata.runtime_context`.

Runtime context must include:

- organization
- project
- task
- `task_giver_context`
- `reviewee_context`
- `related_project_tasks`
- `sprint_peer_tasks`

- [x] **Step 4: Verify GREEN**

Run seed command on safe DB only:

```bash
set -a
. ./.env
set +a
PG_DATABASE="${PG_TEST_DATABASE:-$PG_DATABASE}" node ace seed:data
```

Expected: seed integrity passes, with `task_review_workflows > 0`.

Completion evidence:

- `gitnexus impact "seedReviewData"`: MEDIUM.
- `gitnexus impact "assertSeedIntegrity"`: MEDIUM.
- RED safe seed failed with `Seed integrity failed: missing task review workflow seed data`.
- GREEN safe seed passed after `seedTaskReviewWorkflows`.
- Follow-up RED safe seed failed with
  `Seed integrity failed: task review workflow runtime context must include sprint peer tasks`.
- Follow-up GREEN safe seed passed after adding `operationsReviewJuly` and linking the task-review scenario tasks into that sprint.
- DB audit confirmed `task_review_sprint_peer_tasks=3`.
- Second follow-up RED safe seed failed with `Seed integrity failed: missing resolved dispute seed data`.
- Second follow-up GREEN safe seed passed after adding resolved/final-decision lifecycle rows.
- DB audit confirmed `resolved_classic_disputes=1` and `resolved_task_review_workflows=1`.

### Task 4: Seed Missing Sprint Manager Review Dispute

**Files:**

- Modify: `app/seed/demo_data/sprint_seeder.ts`
- Modify: `app/seed/demo_data/seed_integrity.ts`

**Interfaces:**

- Produces rows in:
  - `sprint_review_disputes`
  - optional `sprint_review_dispute_comments`

- [x] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "seedSprints"
gitnexus impact "assertSeedIntegrity"
```

- [x] **Step 2: Write failing integrity check**

Add:

```ts
const sprintReviewDisputes = await countRowsIfTableExists(trx, 'sprint_review_disputes')
if (sprintReviewDisputes === 0) {
  fail('missing sprint review dispute seed data')
}
```

- [x] **Step 3: Implement minimal manager-review dispute seed**

In `sprint_seeder.ts`, after manager/environment reviews exist, upsert one `sprint_review_disputes` row for `managerSprintPlanningAmbiguity`:

- `dispute_review_type='manager_review'`
- `status='admin_reviewing'` or `resolved`
- `runtime_context` includes:
  - organization/project/sprint
  - `manager_assigned_tasks`
  - reviewer context
  - counterparty context
  - related sprint/project tasks

- [x] **Step 4: Verify GREEN**

Run safe seed command and DB count:

```bash
set -a
. ./.env
set +a
PG_DATABASE="${PG_TEST_DATABASE:-$PG_DATABASE}" node ace seed:data
PG_DATABASE="${PG_TEST_DATABASE:-$PG_DATABASE}" node --input-type=module -e "import { Client } from 'pg'; const c=new Client({host:process.env.PG_HOST,port:Number(process.env.PG_PORT||5432),user:process.env.PG_USER,password:process.env.PG_PASSWORD||'',database:process.env.PG_DATABASE}); await c.connect(); console.log((await c.query('select dispute_review_type, count(*)::int total from sprint_review_disputes group by dispute_review_type')).rows); await c.end();"
```

Expected: at least one `manager_review`.

Completion evidence:

- `gitnexus impact "seedSprints"`: MEDIUM.
- `gitnexus impact "assertSeedIntegrity"`: MEDIUM.
- RED safe seed failed with `Seed integrity failed: missing linked sprint review data`.
- GREEN safe seed passed after `seedSprintReviewDisputes`.
- DB audit confirmed `sprint_review_disputes_by_type=[{"dispute_review_type":"manager_review","total":1}]`.
- Follow-up DB audit confirmed `resolved_sprint_review_disputes=1`.

### Task 5: Enrich Environment Review Runtime Context

**Files:**

- Modify: `app/seed/demo_data/sprint_seeder.ts`
- Modify: `app/seed/demo_data/seed_integrity.ts`

**Interfaces:**

- Consumes existing `sprint_reverse_review_workflows`.
- Produces report message metadata sufficient for `environment_review`.

- [x] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "seedSprints"
```

- [x] **Step 2: Write failing integrity check**

Add a check that reported environment reverse workflows have at least one report message with runtime context or environment signal metadata.

- [x] **Step 3: Implement minimal report context**

In `upsertWorkflowMessages`, for `spec.status === 'reported'`, set `metadata.runtime_context` with:

- `schema_version='suar_sprint_reverse_review_report_context_v1'`
- `dispute_review_type='environment_review'`
- organization/project/sprint
- environment signal
- `sprint_peer_tasks`
- reviewer and counterparty contexts

- [x] **Step 4: Verify GREEN**

Run safe seed command. Then query:

```sql
select count(*)::int as total
from sprint_reverse_review_messages
where message_type = 'report'
  and metadata ? 'runtime_context';
```

Expected: `total > 0`.

Completion evidence:

- `gitnexus impact "seedSprints"`: MEDIUM.
- `gitnexus impact "upsertWorkflowMessages"`: MEDIUM.
- RED safe seed failed with `Seed integrity failed: missing sprint reverse review report runtime context`.
- GREEN safe seed passed after adding reverse-review report runtime context.
- DB audit confirmed `reverse_report_contexts=1`.
- Follow-up DB audit confirmed `resolved_reverse_workflows=1`.

### Task 6: Final Verification

**Files:**

- Modify: `TRAINING_DATA_SESSION_HANDOFF_VI.md`
- No code edits unless earlier tasks require fixes.

- [x] **Step 1: Run unit verification**

```bash
pnpm exec node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/testing/tests/backend/unit/seed_dispute_scenario_specs.spec.ts app/modules/testing/tests/backend/unit/seed_task_specs.spec.ts app/modules/testing/tests/backend/unit/seed_copy_guard.spec.ts
```

- [x] **Step 2: Run typecheck**

```bash
pnpm exec tsc --noEmit --pretty false
```

- [x] **Step 3: Run safe seed verification**

Use a disposable DB or `PG_TEST_DATABASE`. Do not reset main `suar` without explicit approval.

```bash
set -a
. ./.env
set +a
PG_DATABASE="${PG_TEST_DATABASE:-$PG_DATABASE}" node ace seed:data
```

- [x] **Step 4: Run DB count audit**

Use the read-only count script from `TRAINING_DATA_SESSION_HANDOFF_VI.md` Worker C section. Expected after implementation:

- `task_review_workflows > 0`
- `sprint_review_disputes > 0`
- `sprint_reverse_review_workflows > 0`
- `sprint_manager_reviews > 0`
- `sprint_environment_reviews > 0`
- `user_profile_snapshots > 0`
- `user_work_history > 0`

- [x] **Step 5: Run GitNexus detect**

```bash
gitnexus detect-changes
```

- [x] **Step 6: Update handoff**

Append a dated Worker C completion section to `TRAINING_DATA_SESSION_HANDOFF_VI.md` with:

- files changed
- test commands run
- DB counts after safe seed
- remaining seed realism gaps

Completion evidence:

- Focused seed unit command passed: 7 tests.
- `pnpm exec tsc --noEmit --pretty false`: OK.
- Safe `PG_TEST_DATABASE` seed command passed.
- DB audit confirmed `task_review_workflows=1`, `task_review_sprint_peer_tasks=3`, `sprint_review_disputes=1`, `sprint_reverse_review_workflows=4`, `sprint_manager_reviews=3`, `sprint_environment_reviews=3`, `user_profile_snapshots=3`, `user_work_history=8`.
- Resolved lifecycle audit confirmed `resolved_classic_disputes=1`, `resolved_task_review_workflows=1`, `resolved_sprint_review_disputes=1`, `resolved_reverse_workflows=1`.
- `gitnexus detect-changes`: `changed=76`, `new=12`, `deleted=0` in existing dirty worktree.
- Handoff has dated Worker C completion section.
