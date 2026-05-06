# Seed Data Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current local-test flavored seed data with a realistic, deeply linked Suar operating dataset.

**Architecture:** Keep the existing modular seed command and add focused seed modules for copy validation, task submissions, review dispute dossiers, and sprint review data. Rework visible seed specs into one primary product storyline plus controlled dense background data, then strengthen integrity checks so missing links fail fast.

**Tech Stack:** AdonisJS Ace command, Lucid query builder, PostgreSQL, TypeScript, Japa backend tests, GitNexus CLI.

## Global Constraints

- Keep current seed keys and canonical emails where tests depend on them.
- Do not import raw `/home/tranngocduyet/Projects/data_train` records directly.
- Use `data_train` only for dispute/evidence structure, verdict rules, and dossier shape.
- User-visible seed copy must not include: `seed`, `local verification`, `QA local`, `account test`, `filler`, `scenario task`.
- Optional newer tables must be guarded by table-existence checks.
- Preserve unrelated worktree changes; do not revert user changes.
- Run GitNexus impact before editing existing functions, classes, or methods.
- Run `gitnexus detect-changes` before any commit or final completion claim.
- Do not commit automatically in this dirty worktree unless the user explicitly asks.

---

## File Structure

Create:

- `app/seed/demo_data/seed_copy_guard.ts`
  - Central banned-copy guard for user-visible seed text.
- `app/seed/demo_data/task_submission_seeder.ts`
  - Creates realistic task submissions, submission evidence, task comments, task versions, and assignment snapshots for completed/reviewed tasks.
- `app/seed/demo_data/review_dispute_dossier_seeder.ts`
  - Completes dispute rows with comments, case files, AI evaluation rows, and final decisions inspired by `data_train`.
- `app/seed/demo_data/sprint_seeder.ts`
  - Creates project sprints, assigns selected tasks to sprint/backlog, seeds sprint review packages, manager/environment reviews, and sprint reverse review workflows.
- `app/modules/testing/tests/backend/unit/seed_copy_guard.spec.ts`
  - Unit test for visible-copy bans across seed specs.

Modify:

- `commands/seed_data.ts`
  - Wire new seeders in correct order.
- `app/seed/demo_data/seed_utils.ts`
  - Export table existence helper for optional newer tables.
- `app/seed/demo_data/types.ts`
  - Add submission/sprint context types.
- `app/seed/demo_data/user_seeds_specs.ts`
  - Rewrite persona bios/headlines away from test-account language.
- `app/seed/demo_data/organization_seeds_specs.ts`
  - Rewrite tenant descriptions into realistic Suar orgs.
- `app/seed/demo_data/project_seeder.ts`
  - Rewrite project descriptions/tags and keep existing project IDs/context stable.
- `app/seed/demo_data/task_specs.ts`
  - Replace scenario/filler tasks with realistic task catalog and controlled dense templates.
- `app/seed/demo_data/task_seeder.ts`
  - Use realistic application copy and avoid generic rejected-state copy.
- `app/seed/demo_data/review_specs.ts`
  - Rewrite review strengths/improvements/comments into product-realistic review evidence.
- `app/seed/demo_data/review_data_seeder.ts`
  - Keep session/skill review creation; leave dossier-specific enrichment to new module.
- `app/seed/demo_data/mongo_seed.ts`
  - Rewrite notification/audit text to match new storyline.
- `app/seed/demo_data/profile_seed.ts`
  - Ensure profile snapshots/work history reflect new task titles/evidence.
- `app/seed/demo_data/work_history_specs.ts`
  - Align user work history with renamed task catalog.
- `app/seed/demo_data/seed_integrity.ts`
  - Add deep linkage and banned-copy integrity checks.
- `app/modules/testing/tests/backend/unit/seed_task_specs.spec.ts`
  - Extend density/copy assertions if needed.

---

### Task 1: Seed Copy Guard

**Files:**
- Create: `app/seed/demo_data/seed_copy_guard.ts`
- Create: `app/modules/testing/tests/backend/unit/seed_copy_guard.spec.ts`
- Modify: `app/seed/demo_data/seed_integrity.ts`
- Modify: `app/modules/testing/tests/backend/unit/seed_task_specs.spec.ts`

**Interfaces:**
- Produces:
  - `BANNED_USER_VISIBLE_SEED_COPY: readonly string[]`
  - `SeedCopyCandidate`
  - `findBannedSeedCopy(candidates: SeedCopyCandidate[]): BannedSeedCopyMatch[]`
  - `assertNoBannedSeedCopy(candidates: SeedCopyCandidate[]): void`
- Consumes:
  - Seed spec objects from user/org/task/project/review modules.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "assertSeedIntegrity"
gitnexus impact "getSeededTaskSpecs"
```

Expected: MEDIUM or lower. If HIGH or CRITICAL appears, stop and report before editing.

- [ ] **Step 2: Write failing copy guard test**

Create `app/modules/testing/tests/backend/unit/seed_copy_guard.spec.ts`:

```ts
import { test } from '@japa/runner'

import {
  assertNoBannedSeedCopy,
  findBannedSeedCopy,
  type SeedCopyCandidate,
} from '../../../../../seed/demo_data/seed_copy_guard.js'
import { SEED_ORGANIZATIONS_SPECS } from '../../../../../seed/demo_data/organization_seeds_specs.js'
import { getSeededTaskSpecs } from '../../../../../seed/demo_data/task_specs.js'
import { SEED_USERS_SPECS } from '../../../../../seed/demo_data/user_seeds_specs.js'

function collectCurrentSeedCopy(): SeedCopyCandidate[] {
  const candidates: SeedCopyCandidate[] = []

  for (const [key, spec] of Object.entries(SEED_USERS_SPECS)) {
    candidates.push({ label: `user:${key}:bio`, value: spec.bio })
    candidates.push({ label: `user:${key}:headline`, value: spec.headline })
  }

  for (const [key, spec] of Object.entries(SEED_ORGANIZATIONS_SPECS)) {
    candidates.push({ label: `organization:${key}:description`, value: spec.description })
  }

  for (const spec of getSeededTaskSpecs({ dense: true })) {
    candidates.push({ label: `task:${spec.key}:title`, value: spec.title })
    candidates.push({ label: `task:${spec.key}:description`, value: spec.description })
    candidates.push({ label: `task:${spec.key}:contextBackground`, value: spec.contextBackground })
    candidates.push({ label: `task:${spec.key}:complexityNotes`, value: spec.complexityNotes })
    candidates.push({
      label: `task:${spec.key}:acceptanceCriteria`,
      value: spec.acceptanceCriteria.join('\n'),
    })
    candidates.push({
      label: `task:${spec.key}:expectedDeliverables`,
      value: spec.expectedDeliverables.join('\n'),
    })
  }

  return candidates
}

test.group('Seed copy guard', () => {
  test('finds banned local-test language in user-visible copy', ({ assert }) => {
    const matches = findBannedSeedCopy([
      { label: 'task:bad:description', value: 'Task dùng cho local verification.' },
    ])

    assert.lengthOf(matches, 1)
    assert.equal(matches[0]?.label, 'task:bad:description')
    assert.equal(matches[0]?.phrase, 'local verification')
  })

  test('current seed user-visible copy avoids local-test language', ({ assert }) => {
    assertNoBannedSeedCopy(collectCurrentSeedCopy())
    assert.isEmpty(findBannedSeedCopy(collectCurrentSeedCopy()))
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm run test:unit --files=seed_copy_guard
```

Expected: FAIL because `seed_copy_guard.ts` does not exist.

- [ ] **Step 4: Implement copy guard**

Create `app/seed/demo_data/seed_copy_guard.ts`:

```ts
export const BANNED_USER_VISIBLE_SEED_COPY = [
  'seed scenario',
  'scenario task',
  'local verification',
  'qa local',
  'account test',
  'test account',
  'filler',
  'demo-only',
] as const

export interface SeedCopyCandidate {
  label: string
  value: string | null | undefined
}

export interface BannedSeedCopyMatch {
  label: string
  phrase: string
  value: string
}

export function findBannedSeedCopy(candidates: SeedCopyCandidate[]): BannedSeedCopyMatch[] {
  const matches: BannedSeedCopyMatch[] = []

  for (const candidate of candidates) {
    const value = candidate.value ?? ''
    const normalized = value.toLowerCase()

    for (const phrase of BANNED_USER_VISIBLE_SEED_COPY) {
      if (normalized.includes(phrase)) {
        matches.push({ label: candidate.label, phrase, value })
      }
    }
  }

  return matches
}

export function assertNoBannedSeedCopy(candidates: SeedCopyCandidate[]): void {
  const matches = findBannedSeedCopy(candidates)
  if (matches.length === 0) return

  const details = matches
    .map((match) => `${match.label} contains "${match.phrase}"`)
    .join('; ')

  throw new Error(`Seed copy guard failed: ${details}`)
}
```

- [ ] **Step 5: Run copy guard test**

Run:

```bash
pnpm run test:unit --files=seed_copy_guard
```

Expected: FAIL with banned-copy matches from existing seed specs.

- [ ] **Step 6: Wire guard into seed integrity**

Modify `app/seed/demo_data/seed_integrity.ts` to import:

```ts
import { assertNoBannedSeedCopy, type SeedCopyCandidate } from './seed_copy_guard.js'
```

Add a helper near `requireMembership`:

```ts
function collectSeedIntegrityCopy(taskSpecs: TaskSpec[]): SeedCopyCandidate[] {
  const candidates: SeedCopyCandidate[] = []

  for (const [key, spec] of Object.entries(SEED_USERS_SPECS)) {
    candidates.push({ label: `user:${key}:bio`, value: spec.bio })
    candidates.push({ label: `user:${key}:headline`, value: spec.headline })
  }

  for (const [key, spec] of Object.entries(SEED_ORGANIZATIONS_SPECS)) {
    candidates.push({ label: `organization:${key}:description`, value: spec.description })
  }

  for (const spec of taskSpecs) {
    candidates.push({ label: `task:${spec.key}:title`, value: spec.title })
    candidates.push({ label: `task:${spec.key}:description`, value: spec.description })
    candidates.push({ label: `task:${spec.key}:contextBackground`, value: spec.contextBackground })
    candidates.push({ label: `task:${spec.key}:complexityNotes`, value: spec.complexityNotes })
    candidates.push({
      label: `task:${spec.key}:acceptanceCriteria`,
      value: spec.acceptanceCriteria.join('\n'),
    })
    candidates.push({
      label: `task:${spec.key}:expectedDeliverables`,
      value: spec.expectedDeliverables.join('\n'),
    })
  }

  return candidates
}
```

Call it at the start of `assertSeedIntegrity`:

```ts
  assertNoBannedSeedCopy(collectSeedIntegrityCopy(taskSpecs))
```

- [ ] **Step 7: Run test again**

Run:

```bash
pnpm run test:unit --files=seed_copy_guard
```

Expected: still FAIL until copy specs are rewritten in Task 2.

---

### Task 2: Rewrite Visible Seed Story Specs

**Files:**
- Modify: `app/seed/demo_data/user_seeds_specs.ts`
- Modify: `app/seed/demo_data/organization_seeds_specs.ts`
- Modify: `app/seed/demo_data/project_seeder.ts`
- Modify: `app/seed/demo_data/task_specs.ts`
- Modify: `app/seed/demo_data/task_seeder.ts`
- Modify: `app/seed/demo_data/review_specs.ts`
- Modify: `app/seed/demo_data/work_history_specs.ts`
- Modify: `app/seed/demo_data/mongo_seed.ts`

**Interfaces:**
- Consumes:
  - Existing seed keys from `types.ts`.
  - Existing `TaskSpec` shape.
- Produces:
  - Same keys and task statuses, but realistic copy.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "seedUsers"
gitnexus impact "seedOrganizations"
gitnexus impact "seedProjects"
gitnexus impact "getSeededTaskSpecs"
gitnexus impact "seedTaskApplications"
gitnexus impact "seedReviewData"
```

Expected: MEDIUM or lower. If HIGH or CRITICAL appears, stop and report before editing.

- [ ] **Step 2: Rewrite user and org specs**

Keep emails/user keys. Replace bios/headlines/descriptions with:

```ts
owner.bio =
  'Product operator responsible for the Trust Review Operating System workspace, sprint cadence, contributor staffing, and review governance.'
owner.headline = 'Product operator for trust, review, and delivery workflows'

superadmin.bio =
  'Platform trust administrator who reviews escalated disputes, flagged reviews, tenant health, and AI-assisted decision evidence.'
superadmin.headline = 'Platform trust and safety administrator'

member.bio =
  'Delivery contributor with verified task submissions, profile proof, peer reviews, and sprint participation across product and evidence workflows.'
member.headline = 'Full-stack contributor with verified delivery evidence'

orgAdmin.bio =
  'Delivery manager coordinating project roles, sprint scope, review quality, and contributor feedback loops.'
orgAdmin.headline = 'Delivery manager for sprint and review operations'

peerReviewer.bio =
  'Quality reviewer specializing in acceptance criteria, evidence checks, rubric calibration, and dispute-ready review notes.'
peerReviewer.headline = 'QA reviewer and rubric calibration specialist'

orgBOwner.bio =
  'Education operations owner building curriculum workflows, learner evidence models, and review-ready delivery standards.'
orgBOwner.headline = 'Education operations owner'

externalContributorOne.bio =
  'Marketplace contributor focused on documentation, evidence packaging, and public profile proof.'
externalContributorOne.headline = 'Marketplace contributor for evidence and documentation'

externalContributorTwo.bio =
  'Data quality contributor focused on analytics, QA pipelines, and dataset readiness workflows.'
externalContributorTwo.headline = 'Data quality and analytics contributor'
```

Rewrite org descriptions:

```ts
orgA.description =
  'Primary Suar operating workspace for delivery planning, skill evidence, sprint review, and dispute governance.'
orgB.description =
  'Education operations tenant for curriculum delivery, learner evidence, and review-ready teaching workflows.'
orgC.description =
  'Marketplace growth tenant focused on talent discovery, applicant quality, and public task conversion.'
orgD.description =
  'External contributor network for portfolio work, documentation assignments, and verified profile proof.'
orgE.description =
  'Data operations tenant for evidence quality, analytics pipelines, and review decision support.'
```

- [ ] **Step 3: Rewrite project descriptions and tags**

In `seedProjects`, replace generated project descriptions with a small map:

```ts
const projectDescriptions: Record<ProjectKey, string> = {
  orgAPlatform:
    'Core product workspace for organization context, task evidence, contributor profile proof, and role-aware delivery.',
  orgAOperations:
    'Trust operations project for review calibration, dispute readiness, admin moderation, and audit response.',
  orgADesignSystem:
    'Interface system for role states, evidence panels, sprint boards, and review workflow screens.',
  orgAAnalytics:
    'Metrics project for trust scoring, review health, moderation queues, and decision support dashboards.',
  orgBKnowledgeBase:
    'Knowledge base for education delivery playbooks, learner evidence, and curriculum review standards.',
  orgBCurriculumOps:
    'Curriculum operations project for course planning, instructor feedback loops, and AI-assisted assessment.',
  orgCMarketplaceLab:
    'Marketplace growth project for public task quality, applicant matching, and talent discovery experiments.',
  orgDTalentShowcase:
    'Contributor showcase project for portfolio proof, public profile content, and external work samples.',
  orgEDataOps:
    'Data quality project for dataset intake, evidence labeling, validation reports, and QA pipelines.',
  orgEInsightEngine:
    'Insight project for dispute decision signals, review evidence patterns, and operational analytics.',
}
```

Use:

```ts
description: projectDescriptions[key],
```

Update tags with domain words, not test words:

```ts
tags: runtime.toJson(
  spec.organization === 'orgA'
    ? ['trust', 'review', 'delivery']
    : ['evidence', 'operations', 'marketplace']
),
```

- [ ] **Step 4: Rewrite task specs**

Replace visible task copy in `TASK_SPECS`, `createScenarioTask`, `SCENARIO_TASK_SPECS`, and `buildGeneratedTaskSpecs`:

Use the primary task key set:

```ts
member-org-switch -> "Validate role-aware organization switching"
member-profile-proof -> "Publish verified profile proof from completed delivery"
member-admin-regression -> "Prepare admin redirect regression evidence"
orgb-navigation-qa -> "Audit member navigation after admin-mode exit"
owner-profile-scoring-loop -> "Refresh profile scoring after confirmed review"
owner-seed-governance -> "Coordinate multi-role operating data for product demo"
owner-active-platform-work -> "Implement evidence panel for active task board"
owner-review-dispute-case -> "Review disputed evidence for profile scoring"
orgc-marketplace-ranking -> "Compare marketplace package adoption signals"
orga-review-dispute-detail -> "Assemble moderation-ready review dispute dossier"
marketplace-content-pass -> "Write marketplace task guidance for applicants"
owner-marketplace-pending -> "Draft public profile showcase copy"
owner-marketplace-approved -> "Build data quality QA checklist"
owner-marketplace-rejected -> "Polish public Svelte profile widget"
owner-marketplace-withdrawn -> "Clean up analytics documentation"
marketplace-qa-pipeline -> "Design applicant QA pipeline"
member-profile-live -> "Update live profile proof widget"
orga-design-refresh -> "Refresh role states in workspace design system"
owner-orgb-curriculum-todo -> keep edtech task, remove overlong AI wording if needed
```

Change `createScenarioTask` defaults:

```ts
acceptanceCriteria: [
  `${input.title} is visible in the relevant project workflow`,
  'Related task evidence, review context, and profile data stay linked',
],
expectedDeliverables: ['Updated task record', 'Evidence notes', 'Review-ready context'],
contextBackground: `This work belongs to the ${input.businessDomain} operating workflow for ${input.project}.`,
complexityNotes:
  'Requires coordination between task scope, evidence quality, and review expectations.',
measurableOutcomes: [{ metric: 'linked_operating_context', target: 'complete' }],
learningObjectives: ['Evidence-driven delivery', 'Review-ready collaboration'],
domainTags: [input.organization, input.project, input.businessDomain],
```

Change generated dense text:

```ts
title: `${config.titlePrefix} ${String(targetIndex + 1).padStart(2, '0')}`,
description:
  `Operational backlog item for ${project} focused on ${config.businessDomain} delivery quality, evidence readiness, and review follow-through.`,
acceptanceCriteria: [
  `Project ${project} has actionable work in ${status} state`,
  'Task metadata supports board scanning, reporting, and review planning',
],
expectedDeliverables: ['Delivery notes', 'Evidence checklist', 'Review context'],
contextBackground:
  `Generated operating backlog item for ${project} so dashboards and boards show realistic work density.`,
complexityNotes:
  'Uses domain-specific metadata without adding a bespoke review dossier.',
learningObjectives: ['Operating cadence', 'Cross-role delivery'],
domainTags: [config.organization, project, config.businessDomain, 'operating-backlog'],
```

- [ ] **Step 5: Rewrite application/rejection copy**

In `SEED_TASK_APPLICATION_SPECS`, remove test-state wording. Example replacements:

```ts
message:
  'I can package marketplace guidance with examples, acceptance criteria, and reviewer notes within this sprint.'
rejection_reason:
  row.status === 'rejected'
    ? 'Application declined because the task requires prior Svelte profile-widget evidence.'
    : null
```

- [ ] **Step 6: Rewrite review/work history/mongo copy**

Align review strengths, improvements, work history artifacts, notification titles, notification messages, and audit values with new task titles.

Concrete examples:

```ts
strengths:
  'Connected organization context, permission state, and navigation expectations into a clear delivery path.'
improvements:
  'Add browser-history automation to protect the role-switching regression path.'
```

```ts
notification.title = 'Marketplace application approved'
notification.message =
  'Your data quality QA checklist proposal was accepted and linked to an external contributor assignment.'
```

- [ ] **Step 7: Run copy guard tests**

Run:

```bash
pnpm run test:unit --files=seed_copy_guard
pnpm run test:unit --files=seed_task_specs
```

Expected: PASS.

---

### Task 3: Task Submission and Evidence Seeder

**Files:**
- Create: `app/seed/demo_data/task_submission_seeder.ts`
- Modify: `app/seed/demo_data/types.ts`
- Modify: `commands/seed_data.ts`
- Modify: `app/seed/demo_data/seed_utils.ts`

**Interfaces:**
- Produces:
  - `SeededSubmission`
  - `seedTaskSubmissions(runtime, trx, users, tasks, assignments, taskSpecs): Promise<Record<string, SeededSubmission>>`
- Consumes:
  - `tasks`, `assignments`, `taskSpecs` after `seedTaskAssignments`.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "SeedData"
gitnexus impact "resetPostgres"
```

Expected: MEDIUM or lower.

- [ ] **Step 2: Export table existence helper**

Modify `app/seed/demo_data/seed_utils.ts`:

```ts
export async function tableExists(
  trx: TransactionClientContract,
  table: string
): Promise<boolean> {
  const exists = (await trx
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', table)
    .first()) as (Record<string, unknown> & { id?: string }) | null

  return Boolean(exists)
}
```

Update `deleteTableIfExists` to use `tableExists`.

- [ ] **Step 3: Add context type**

Modify `app/seed/demo_data/types.ts`:

```ts
export interface SeededSubmission {
  id: string
  taskId: string
  taskAssignmentId: string
  submittedBy: string
}
```

Add to `SeedContext`:

```ts
submissions: Record<string, SeededSubmission>
```

- [ ] **Step 4: Create submission seeder**

Create `app/seed/demo_data/task_submission_seeder.ts`:

```ts
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow, tableExists } from './seed_utils.js'
import type {
  SeededAssignment,
  SeededSubmission,
  SeededTask,
  SeededUser,
  TaskSpec,
  UserKey,
} from './types.js'

function shouldCreateSubmission(spec: TaskSpec): boolean {
  return spec.status === 'done' || spec.status === 'in_review'
}

function submissionStatusFor(spec: TaskSpec): 'submitted' | 'approved' {
  return spec.status === 'done' ? 'approved' : 'submitted'
}

export async function seedTaskSubmissions(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  tasks: Record<string, SeededTask>,
  assignments: Record<string, SeededAssignment>,
  taskSpecs: TaskSpec[]
): Promise<Record<string, SeededSubmission>> {
  if (!(await tableExists(trx, 'task_submissions'))) {
    return {}
  }

  const submissions: Record<string, SeededSubmission> = {}

  for (const spec of taskSpecs.filter((item) => item.assignee && shouldCreateSubmission(item))) {
    const task = runtime.requireValue(tasks[spec.key], `task-submission:${spec.key}`)
    const assignment = runtime.requireValue(assignments[spec.key], `assignment-submission:${spec.key}`)
    const assigneeKey = runtime.requireValue(spec.assignee, `submission-assignee:${spec.key}`)
    const submittedBy = users[assigneeKey].id
    const existing = await findRow(trx, 'task_submissions', {
      task_id: task.id,
      task_assignment_id: assignment.id,
    })
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      task_id: task.id,
      task_assignment_id: assignment.id,
      submitted_by: submittedBy,
      status: submissionStatusFor(spec),
      summary: `${spec.title} delivered with linked evidence and review-ready notes.`,
      implementation_notes: spec.expectedDeliverables.join('\n'),
      test_notes: spec.acceptanceCriteria.join('\n'),
      known_limitations:
        spec.status === 'in_review'
          ? 'Final reviewer confirmation is still pending.'
          : 'No known blocker remains after delivery review.',
      repository_url: 'https://github.com/suar/demo-workspace',
      pull_request_url: runtime.seedPullRequestUrl(spec.key),
      demo_url: `https://demo.suar.local/tasks/${spec.key}`,
      submitted_at: runtime.isoDaysAgo(spec.status === 'done' ? 4 : 1),
      locked_at: spec.status === 'done' ? runtime.isoDaysAgo(3) : null,
      created_at: runtime.isoDaysAgo(5),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('task_submissions').where('id', id).update(payload)
    } else {
      await trx.insertQuery().table('task_submissions').insert({ id, ...payload })
    }

    submissions[spec.key] = {
      id,
      taskId: task.id,
      taskAssignmentId: assignment.id,
      submittedBy,
    }

    if (await tableExists(trx, 'task_submission_evidences')) {
      const evidenceRows = [
        {
          evidence_type: 'pull_request',
          title: `${spec.title} pull request`,
          url: runtime.seedPullRequestUrl(spec.key),
          description: 'Code and implementation notes linked to the delivered task.',
        },
        {
          evidence_type: 'test_report',
          title: `${spec.title} verification notes`,
          url: `https://demo.suar.local/evidence/${spec.key}/test-report`,
          description: spec.acceptanceCriteria.join('\n'),
        },
      ]

      for (const evidence of evidenceRows) {
        const where = { submission_id: id, title: evidence.title }
        const existingEvidence = await findRow(trx, 'task_submission_evidences', where)
        const evidencePayload = {
          evidence_type: evidence.evidence_type,
          url: evidence.url,
          description: evidence.description,
          uploaded_by: submittedBy,
          created_at: runtime.isoDaysAgo(2),
        }

        if (existingEvidence) {
          await applyWhere(trx.from('task_submission_evidences'), where).update(evidencePayload)
        } else {
          await trx
            .insertQuery()
            .table('task_submission_evidences')
            .insert({ id: runtime.uuid(), ...where, ...evidencePayload })
        }
      }
    }

    if (await tableExists(trx, 'task_comments')) {
      const comments = [
        {
          author_id: users[spec.creator].id,
          body: `Please keep the evidence tied to ${spec.verificationMethod} so the review can trace every acceptance criterion.`,
          comment_type: 'review_note',
        },
        {
          author_id: submittedBy,
          body: `Delivery notes are attached with ${spec.expectedDeliverables.length} expected deliverables and reviewer context.`,
          comment_type: 'status_update',
        },
      ]

      for (const comment of comments) {
        const where = { task_id: task.id, body: comment.body }
        const existingComment = await findRow(trx, 'task_comments', where)
        const commentPayload = {
          author_id: comment.author_id,
          comment_type: comment.comment_type,
          visibility: 'team',
          parent_comment_id: null,
          review_relevance: true,
          edited_at: null,
          deleted_at: null,
          created_at: runtime.isoDaysAgo(2),
          updated_at: runtime.isoDaysAgo(1),
        }

        if (existingComment) {
          await applyWhere(trx.from('task_comments'), where).update(commentPayload)
        } else {
          await trx
            .insertQuery()
            .table('task_comments')
            .insert({ id: runtime.uuid(), ...where, ...commentPayload })
        }
      }
    }

    if (await tableExists(trx, 'task_versions')) {
      const where = { task_id: task.id, title: spec.title }
      const existingVersion = await findRow(trx, 'task_versions', where)
      const versionPayload = {
        description: spec.description,
        status: spec.status,
        label: spec.label,
        priority: spec.priority,
        difficulty: spec.difficulty,
        assigned_to: submittedBy,
        changed_by: users[spec.creator].id,
        changed_at: runtime.isoDaysAgo(8),
      }

      if (existingVersion) {
        await applyWhere(trx.from('task_versions'), where).update(versionPayload)
      } else {
        await trx
          .insertQuery()
          .table('task_versions')
          .insert({ id: runtime.uuid(), ...where, ...versionPayload })
      }
    }
  }

  return submissions
}
```

- [ ] **Step 5: Wire command**

Modify `commands/seed_data.ts` imports:

```ts
import { seedTaskSubmissions } from '../app/seed/demo_data/task_submission_seeder.js'
```

After `seedTaskAssignments`:

```ts
const submissions = await seedTaskSubmissions(this, trx, users, tasks, assignments, taskSpecs)
```

Add to context:

```ts
submissions,
```

- [ ] **Step 6: Typecheck targeted seed files**

Run:

```bash
pnpm exec tsc --noEmit --pretty false
```

Expected: PASS or unrelated existing failures only. If unrelated failures exist, capture first seed-related error separately.

---

### Task 4: Review Dispute Dossier Seeder

**Files:**
- Create: `app/seed/demo_data/review_dispute_dossier_seeder.ts`
- Modify: `commands/seed_data.ts`
- Modify: `app/seed/demo_data/review_data_seeder.ts`
- Modify: `app/seed/demo_data/seed_integrity.ts`

**Interfaces:**
- Produces:
  - `seedReviewDisputeDossiers(runtime, trx, users, tasks, assignments, submissions): Promise<void>`
- Consumes:
  - Dispute rows created by `seedReviewData`.
  - Submission/evidence rows created by Task 3.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "seedReviewData"
gitnexus impact "SeedData"
gitnexus impact "assertSeedIntegrity"
```

Expected: MEDIUM or lower.

- [ ] **Step 2: Make existing dispute creation idempotent**

In `review_data_seeder.ts`, where disputed sessions create comments only on insert, change logic so comments are upserted every run by `(dispute_id, body)`.

Use comment bodies:

```ts
const comments = [
  {
    author_id: assignment.assigneeId,
    author_context: 'reviewee',
    body: 'The review score does not reflect the submitted evidence and acceptance criteria coverage.',
  },
  {
    author_id: users.orgAdmin.id,
    author_context: 'counterparty',
    body: 'The review was based on the rubric, but the evidence package should be checked before final resolution.',
  },
]
```

Insert/update `review_dispute_comments` with `visibility: 'all_parties'`.

- [ ] **Step 3: Create dossier seeder**

Create `app/seed/demo_data/review_dispute_dossier_seeder.ts` with resolved decisions:

```ts
const DISPUTE_DOSSIER_SPECS = {
  'orgc-marketplace-ranking': {
    status: 'resolved',
    finalDecision: 'adjust_score',
    finalRationale:
      'Submission evidence and marketplace adoption analysis are stronger than the original review score. Adjust score and record rubric calibration note.',
    reviewerCredibilityAction: 'calibrate_reviewer',
    profileUpdateAction: 'refresh_profile_after_adjustment',
    aiRecommendation: 'adjust_score',
    aiSummary:
      'Evidence package includes implementation notes and verification output. Low score should be adjusted after rubric review.',
  },
  'owner-review-dispute-case': {
    status: 'admin_reviewing',
