# Project Operating Model Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the demo flow prove that a deeply configured Project Operating Model shortens task creation and feeds the existing task review/dispute lifecycle.

**Architecture:** Keep the first pass demo-facing and narrow: add an Operating Model surface to project detail, strengthen existing project create/role/staffing copy, and make task create visibly inherit role, preset, DoD, and review policy. Use existing project professional roles, role skills, project members, task presets, work-area starters, task submission, review, and dispute flows rather than adding a new persistence model.

**Tech Stack:** Svelte 5, Inertia Svelte, AdonisJS, TypeScript, Vitest component tests, Playwright e2e tests.

## Global Constraints

- Work directly on `main`.
- Do not run `git add`.
- Do not commit.
- Do not push.
- Do not require sprint setup in the short demo.
- Preserve existing sprint panels and sprint review governance; position sprint as optional for this demo.
- Treat task review as a four-account demo when using real task submission:
  owner/creator reviewer, worker/assignee, peer reviewer 1, peer reviewer 2.
- Do not rely on the one-peer review lifecycle seed for the live product demo unless the seed route is explicitly being demoed.
- Prefer existing frontend-defined task presets and project role data over new schema.
- Use GitNexus impact before editing functions, classes, or methods.
- Keep changes demo-facing and narrow because the worktree is already dirty.
- Use `apply_patch` for manual file edits.

---

## File Structure

Create:

- `inertia/apps/org/modules/projects/components/project_operating_model_tab.svelte`
  - Presents Project Operating Model: charter summary, work areas, task presets, Definition of Done, review policy, sprint positioning, launch task actions.
- `inertia/apps/org/modules/projects/lib/project_operating_model.ts`
  - Centralizes demo-ready operating model content and launch URL helpers.
- `inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts`
  - Component tests for visible model sections and launch links.
- `inertia/apps/org/tests/e2e/projects/project_operating_model_task_inheritance.spec.ts`
  - E2E for project role/preset launch into prefilled task form.
- `inertia/apps/org/tests/e2e/demo/project_operating_model_demo_visual.spec.ts`
  - Screenshot audit for the demo path.

Modify:

- `inertia/apps/org/modules/projects/show.svelte`
  - Add `operating_model` tab and wire `ProjectOperatingModelTab`.
- `inertia/apps/org/modules/projects/create.svelte`
  - Strengthen wizard labels and summary so creation feels like project operating model setup.
- `inertia/apps/org/modules/projects/components/project_create_foundation_step.svelte`
  - Add charter-oriented copy and visible project context cues.
- `inertia/apps/org/modules/projects/components/project_create_staffing_step.svelte`
  - Make role blueprint/staffing explanations explicitly about later task inheritance.
- `inertia/apps/org/modules/projects/components/project_create_launch_step.svelte`
  - Explain launch choices as "setup now, create task faster".
- `inertia/apps/org/modules/projects/components/project_roles_tab.svelte`
  - Make role card launch action and candidate suggestion copy demo-obvious.
- `inertia/apps/org/modules/tasks/components/detail/task_role_prefill_panel.svelte`
  - Strengthen copy for inherited role skills, task preset, assignee suggestions, and sprint optionality.
- `inertia/apps/org/modules/tasks/create.svelte`
  - Add visible applied-preset/DoD/review policy cues near readiness card without changing backend payload.
- `inertia/apps/org/modules/tasks/lib/rules/task_contract_presets.ts`
  - Extend demo preset labels and metadata for docs/review/evidence cues.
- Existing tests:
  - `inertia/apps/org/tests/modules/projects/project_show_page.test.ts`
  - `inertia/apps/org/tests/modules/projects/project_roles_tab.test.ts`
  - `inertia/apps/org/tests/modules/tasks/components/task_contract_presets.test.ts`
  - `inertia/apps/org/tests/modules/tasks/components/task_role_prefill_panel.test.ts`

---

## Review Quorum Audit Finding

Current real task submission path creates review sessions from `submit_task_submission_command.ts`
with `REVIEW_DEFAULTS.MIN_PEER_REVIEWS = 2`, `MINIMUM_PEER_REVIEWS = 2`,
`MIN_MANAGER_REVIEWS = 1`, and `MIN_TOTAL_REVIEWS = 2`.

Review completion/quorum requires:

- creator review completed
- at least 1 manager-side review
- at least 2 peer-side reviews
- manager + peer review count at least the total threshold

Because creator/owner review is also the manager-side review in the demo, the safe live-demo cast is:

- Account A: org owner, project creator, task creator, manager/creator reviewer
- Account B: worker, task assignee, reviewee
- Account C: peer reviewer 1
- Account D: peer reviewer 2

The existing `/api/testing/seed-review-lifecycle-flow` route overrides this to one peer for focused e2e speed. That seed is useful for regression tests but should not be assumed for the product demo path.

Project staffing must therefore add both peer reviewers to the project before the worker submits the task, or the review can get stuck waiting for peer quorum.

---

### Task 1: Add Operating Model Content Library

**Files:**
- Create: `inertia/apps/org/modules/projects/lib/project_operating_model.ts`
- Test: `inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts`

**Interfaces:**
- Produces:
  - `PROJECT_WORK_AREAS: ProjectWorkArea[]`
  - `PROJECT_DEFINITION_OF_DONE: ProjectOperatingModelChecklistItem[]`
  - `PROJECT_REVIEW_POLICY_POINTS: ProjectOperatingModelChecklistItem[]`
  - `buildRoleTaskLaunchHref(input: ProjectTaskLaunchInput): string`
- Consumes:
  - Existing `inferTaskTypeFromRoleCode(roleCode)` from `task_contract_presets.ts`.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "inferTaskTypeFromRoleCode"
gitnexus impact "ProjectRolesTab"
```

Expected: risk below HIGH. If HIGH or CRITICAL appears, stop and report before editing.

- [ ] **Step 2: Create failing test for launch helper and visible model copy**

Create `inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts`:

```ts
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import {
  PROJECT_DEFINITION_OF_DONE,
  PROJECT_REVIEW_POLICY_POINTS,
  PROJECT_WORK_AREAS,
  buildRoleTaskLaunchHref,
} from '@/apps/org/modules/projects/lib/project_operating_model'

describe('project operating model content', () => {
  it('defines demo work areas, DoD, and review policy points', () => {
    expect(PROJECT_WORK_AREAS.map((area) => area.key)).toEqual([
      'ui',
      'api',
      'qa',
      'review',
      'docs',
      'ops',
    ])
    expect(PROJECT_DEFINITION_OF_DONE.map((item) => item.label)).toContain('Evidence attached')
    expect(PROJECT_REVIEW_POLICY_POINTS.map((item) => item.label)).toContain('Profile-impacting review')
  })

  it('builds task launch href from project role and inferred task type', () => {
    expect(
      buildRoleTaskLaunchHref({
        baseUrl: '/org/tasks/board',
        projectId: 'project-1',
        roleId: 'role-1',
        roleCode: 'qa_engineer',
        workArea: 'qa',
      })
    ).toBe('/org/tasks/board?project_id=project-1&roleId=role-1&taskType=qa_testing&workArea=qa')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts
```

Expected: FAIL because `project_operating_model` module does not exist.

- [ ] **Step 4: Implement content library**

Create `inertia/apps/org/modules/projects/lib/project_operating_model.ts`:

```ts
import { inferTaskTypeFromRoleCode } from '@/apps/org/modules/tasks/lib/rules/task_contract_presets'

export interface ProjectWorkArea {
  key: 'ui' | 'api' | 'qa' | 'review' | 'docs' | 'ops'
  label: string
  description: string
  defaultTaskType: string
  evidence: string
}

export interface ProjectOperatingModelChecklistItem {
  label: string
  description: string
}

export interface ProjectTaskLaunchInput {
  baseUrl: string
  projectId: string
  roleId?: string | null
  roleCode?: string | null
  taskType?: string | null
  workArea?: string | null
}

export const PROJECT_WORK_AREAS: ProjectWorkArea[] = [
  {
    key: 'ui',
    label: 'UI',
    description: 'Screens, interaction states, responsive polish, and visual QA.',
    defaultTaskType: 'feature_development',
    evidence: 'Screenshot or short screen recording.',
  },
  {
    key: 'api',
    label: 'API',
    description: 'Backend contract, integration behavior, validation, and data consistency.',
    defaultTaskType: 'feature_development',
    evidence: 'API response sample or contract test result.',
  },
  {
    key: 'qa',
    label: 'QA',
    description: 'Manual test pass, regression checks, edge cases, and release confidence.',
    defaultTaskType: 'qa_testing',
    evidence: 'Checklist result with pass/fail notes.',
  },
  {
    key: 'review',
    label: 'Review',
    description: 'Peer or manager review package with rationale and clear actionability.',
    defaultTaskType: 'code_review',
    evidence: 'Review notes with must-fix and suggestion split.',
  },
  {
    key: 'docs',
    label: 'Docs',
    description: 'User-facing or internal documentation tied to delivery context.',
    defaultTaskType: 'documentation',
    evidence: 'Documentation link and reviewed scope.',
  },
  {
    key: 'ops',
    label: 'Ops',
    description: 'Release readiness, environment checks, deployment notes, and rollback plan.',
    defaultTaskType: 'infrastructure',
    evidence: 'Release checklist or deployment verification.',
  },
]

export const PROJECT_DEFINITION_OF_DONE: ProjectOperatingModelChecklistItem[] = [
  {
    label: 'Output summary',
    description: 'Assignee explains what changed and where reviewer should inspect it.',
  },
  {
    label: 'Acceptance criteria satisfied',
    description: 'The task result maps back to the inherited project/task criteria.',
  },
  {
    label: 'Evidence attached',
    description: 'PR, screenshot, recording, test log, or review artifact is present.',
  },
  {
    label: 'Self-assessment ready',
    description: 'Assignee can state confidence, trade-offs, and remaining risk.',
  },
  {
    label: 'Review-ready package',
    description: 'Reviewer has enough context to approve, dispute, or request follow-up.',
  },
]

export const PROJECT_REVIEW_POLICY_POINTS: ProjectOperatingModelChecklistItem[] = [
  {
    label: 'Default reviewer',
    description: 'Creator, owner, manager, role lead, or peer can be used as review source.',
  },
  {
    label: 'Profile-impacting review',
    description: 'Skill reviews update user profile only after confirmation or final resolution.',
  },
  {
    label: 'Dispute exchange',
    description: 'Both sides can comment before report-to-admin is allowed.',
  },
  {
    label: 'Admin package',
    description: 'Task, submission, skill requirements, comments, evidence, and review history travel together.',
  },
]

export function buildRoleTaskLaunchHref(input: ProjectTaskLaunchInput): string {
  const params = new URLSearchParams({ project_id: input.projectId })
  const inferredTaskType = input.taskType || inferTaskTypeFromRoleCode(input.roleCode)

  if (input.roleId) params.set('roleId', input.roleId)
  if (inferredTaskType) params.set('taskType', inferredTaskType)
  if (input.workArea) params.set('workArea', input.workArea)

  return `${input.baseUrl}?${params.toString()}`
}
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts
```

Expected: PASS.

---

### Task 2: Add Project Operating Model Tab

**Files:**
- Create: `inertia/apps/org/modules/projects/components/project_operating_model_tab.svelte`
- Modify: `inertia/apps/org/modules/projects/show.svelte`
- Test: `inertia/apps/org/tests/modules/projects/project_show_page.test.ts`
- Test: `inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts`

**Interfaces:**
- Consumes:
  - `PROJECT_WORK_AREAS`, `PROJECT_DEFINITION_OF_DONE`, `PROJECT_REVIEW_POLICY_POINTS`, `buildRoleTaskLaunchHref`.
  - Project role objects from `show.svelte`: `{ id, name, code, isActive }`.
- Produces:
  - New tab value: `'operating_model'`.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "ProjectShowPage"
gitnexus impact "ProjectOperatingModelTab"
```

Expected: `ProjectOperatingModelTab` may be absent. `ProjectShowPage` risk below HIGH.

- [ ] **Step 2: Extend failing tests**

Append to `inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts`:

```ts
import { fireEvent } from '@testing-library/svelte'
import ProjectOperatingModelTab from '@/apps/org/modules/projects/components/project_operating_model_tab.svelte'

describe('ProjectOperatingModelTab', () => {
  it('renders operating model sections and launch links', () => {
    render(ProjectOperatingModelTab, {
      props: {
        projectId: 'project-1',
        taskLaunchBaseUrl: '/org/tasks/board',
        roles: [
          { id: 'role-1', name: 'QA Engineer', code: 'qa_engineer', isActive: true },
          { id: 'role-2', name: 'Frontend Engineer', code: 'frontend_engineer', isActive: true },
        ],
        canLaunchTask: true,
      },
    })

    expect(screen.getByRole('heading', { name: /Project Operating Model/i })).toBeInTheDocument()
    expect(screen.getByText('Task Presets')).toBeInTheDocument()
    expect(screen.getByText('Definition of Done')).toBeInTheDocument()
    expect(screen.getByText('Review Policy')).toBeInTheDocument()
    expect(screen.getByText(/Sprint optional/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tạo task từ QA Engineer/i })).toHaveAttribute(
      'href',
      '/org/tasks/board?project_id=project-1&roleId=role-1&taskType=qa_testing'
    )
  })

  it('announces when no role is ready for task launch', () => {
    render(ProjectOperatingModelTab, {
      props: {
        projectId: 'project-1',
        taskLaunchBaseUrl: '/org/tasks/board',
        roles: [],
        canLaunchTask: true,
      },
    })

    expect(screen.getByText(/Chưa có role active để launch task/i)).toBeInTheDocument()
  })
})
```

Modify `project_show_page.test.ts` mocks:

```ts
vi.mock('@/apps/org/modules/projects/components/project_operating_model_tab.svelte', () => ({
  default: EmptyStub,
}))
```

Add assertion in existing test:

```ts
expect(screen.getByRole('tab', { name: /Operating Model/i })).toBeInTheDocument()
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts inertia/apps/org/tests/modules/projects/project_show_page.test.ts
```

Expected: FAIL because component/tab not wired.

- [ ] **Step 4: Implement `ProjectOperatingModelTab`**

Create `inertia/apps/org/modules/projects/components/project_operating_model_tab.svelte`:

```svelte
<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { ArrowRight, CheckCircle2, ClipboardCheck, Layers3, ShieldCheck } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import {
    PROJECT_DEFINITION_OF_DONE,
    PROJECT_REVIEW_POLICY_POINTS,
    PROJECT_WORK_AREAS,
    buildRoleTaskLaunchHref,
  } from '@/apps/org/modules/projects/lib/project_operating_model'
  import { TASK_CONTRACT_PRESETS } from '@/apps/org/modules/tasks/lib/rules/task_contract_presets'

  interface RoleOption {
    id: string
    name: string
    code: string
    isActive?: boolean
  }

  interface Props {
    projectId: string
    taskLaunchBaseUrl: string
    roles: RoleOption[]
    canLaunchTask: boolean
  }

  const { projectId, taskLaunchBaseUrl, roles, canLaunchTask }: Props = $props()
  const activeRoles = $derived(roles.filter((role) => role.isActive !== false))
</script>

<div class="space-y-5">
  <div class="rounded-2xl border border-primary/20 bg-primary/5 p-5">
    <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-primary">
      Project Operating Model
    </p>
    <h2 class="mt-2 text-2xl font-black tracking-tight text-foreground">
      Setup project kỹ, tạo task nhanh
    </h2>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
      Project này đóng gói role, skill, DoD, preset và review policy. Sprint vẫn là lớp quản lý kế hoạch,
      nhưng demo ngắn sẽ đi thẳng từ operating model sang task và review.
    </p>
  </div>

  <div class="grid gap-4 xl:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Layers3 class="h-4 w-4 text-primary" />
          Work Areas
        </CardTitle>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2">
        {#each PROJECT_WORK_AREAS as area (area.key)}
          <div class="rounded-xl border border-border bg-secondary/20 p-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-bold text-foreground">{area.label}</p>
              <span class="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                {area.defaultTaskType}
              </span>
            </div>
            <p class="mt-2 text-xs leading-5 text-muted-foreground">{area.description}</p>
            <p class="mt-2 text-xs font-semibold text-foreground">{area.evidence}</p>
          </div>
        {/each}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <ClipboardCheck class="h-4 w-4 text-primary" />
          Task Presets
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each TASK_CONTRACT_PRESETS as preset (preset.taskType)}
          <div class="rounded-xl border border-border bg-background p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold text-foreground">{preset.label}</p>
              <span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                {preset.verificationMethod}
              </span>
            </div>
            <p class="mt-2 text-xs leading-5 text-muted-foreground">{preset.acceptanceCriteria}</p>
          </div>
        {/each}
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-4 xl:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <CheckCircle2 class="h-4 w-4 text-primary" />
          Definition of Done
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each PROJECT_DEFINITION_OF_DONE as item (item.label)}
          <div class="rounded-xl border border-border bg-secondary/20 p-3">
            <p class="text-sm font-bold text-foreground">{item.label}</p>
            <p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        {/each}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <ShieldCheck class="h-4 w-4 text-primary" />
          Review Policy
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#each PROJECT_REVIEW_POLICY_POINTS as item (item.label)}
          <div class="rounded-xl border border-border bg-secondary/20 p-3">
            <p class="text-sm font-bold text-foreground">{item.label}</p>
            <p class="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        {/each}
      </CardContent>
    </Card>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Launch Task</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="mb-4 rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
        Sprint optional for this demo: task can be grouped into a sprint later, but task creation can inherit project role and preset now.
      </div>

      {#if activeRoles.length === 0}
        <div class="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có role active để launch task.
        </div>
      {:else}
        <div class="grid gap-3 md:grid-cols-2">
          {#each activeRoles as role (role.id)}
            <div class="rounded-xl border border-border bg-background p-4">
              <p class="text-sm font-bold text-foreground">{role.name}</p>
              <p class="mt-1 font-mono text-xs text-muted-foreground">{role.code}</p>
              {#if canLaunchTask}
                <Link
                  class="mt-3 inline-flex"
                  href={buildRoleTaskLaunchHref({
                    baseUrl: taskLaunchBaseUrl,
                    projectId,
                    roleId: role.id,
                    roleCode: role.code,
                  })}
                >
                  <Button size="sm" class="gap-1.5">
                    Tạo task từ {role.name}
                    <ArrowRight class="h-3.5 w-3.5" />
                  </Button>
                </Link>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
```

- [ ] **Step 5: Wire tab in `show.svelte`**

In `inertia/apps/org/modules/projects/show.svelte`, add import:

```ts
import ProjectOperatingModelTab from './components/project_operating_model_tab.svelte'
```

Change tab type:

```ts
type ProjectTab = 'details' | 'members' | 'skills' | 'roles' | 'operating_model'
```

Extend focus handling:

```ts
else if (focusMode === 'operating_model' || focusMode === 'task_factory') nextTab = 'operating_model'
```

Add trigger:

```svelte
<TabsTrigger value="operating_model">Operating Model</TabsTrigger>
```

Add content after roles:

```svelte
<TabsContent value="operating_model" class="mt-4">
  <ProjectOperatingModelTab
    projectId={project.id}
    taskLaunchBaseUrl={shellMode === 'organization' ? '/org/tasks/board' : FRONTEND_ROUTES.TASKS}
    roles={activeProfessionalRoles}
    canLaunchTask={permissions.canEdit || permissions.isOwner || permissions.isManager}
  />
</TabsContent>
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts inertia/apps/org/tests/modules/projects/project_show_page.test.ts
```

Expected: PASS.

---

### Task 3: Strengthen Project Create As Operating Model Setup

**Files:**
- Modify: `inertia/apps/org/modules/projects/create.svelte`
- Modify: `inertia/apps/org/modules/projects/components/project_create_foundation_step.svelte`
- Modify: `inertia/apps/org/modules/projects/components/project_create_staffing_step.svelte`
- Modify: `inertia/apps/org/modules/projects/components/project_create_launch_step.svelte`
- Test: `inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts`

**Interfaces:**
- Consumes:
  - Existing wizard props and state.
- Produces:
  - Demo copy and step labels that frame project setup as operating model setup.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "ProjectCreateFoundationStep"
gitnexus impact "ProjectCreateStaffingStep"
gitnexus impact "ProjectCreateLaunchStep"
```

Expected: risk below HIGH.

- [ ] **Step 2: Add failing e2e assertions**

In `inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts`, add after `await createProject(page, 'E2E Staffing Flow')` in the first test only if that helper exposes the create page before submit. If helper skips wizard, add a new test:

```ts
test('project create frames setup as operating model', async ({ page }) => {
  await page.goto('/org/projects/create')
  await expect(page.getByText(/Project Operating Model/i)).toBeVisible()
  await expect(page.getByText(/setup project kỹ/i)).toBeVisible()
  await expect(page.getByText(/role, skill, DoD/i)).toBeVisible()
})
```

- [ ] **Step 3: Run e2e to verify failure**

Run:

```bash
pnpm exec playwright test inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts --grep "operating model"
```

Expected: FAIL because copy is not present.

- [ ] **Step 4: Update create wizard step labels**

In `create.svelte`, update `steps`:

```ts
const steps: { id: WizardStep; title: string; description: string }[] = [
  {
    id: 'foundation',
    title: '1. Charter',
    description: 'Scope, org context, timeline, and task inheritance base.',
  },
  {
    id: 'staffing',
    title: '2. Roles & Staffing',
    description: 'Role lanes, skills, and first assignee suggestions.',
  },
  {
    id: 'launch',
    title: '3. Operating Rules',
    description: 'DoD, review policy, and first task launch direction.',
  },
]
```

Add a hero copy above the step card:

```svelte
<div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
  <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-primary">
    Project Operating Model
  </p>
  <p class="mt-2 text-sm leading-6 text-muted-foreground">
    Setup project kỹ một lần: role, skill, DoD, review policy và staffing sẽ làm task sau đó nhanh hơn.
  </p>
</div>
```

- [ ] **Step 5: Update foundation step copy**

In `project_create_foundation_step.svelte`, change description placeholder:

```svelte
placeholder="Mục tiêu, phạm vi, domain, tech stack, success metrics và bối cảnh task sẽ kế thừa..."
```

Add small helper under description:

```svelte
<p class="text-xs leading-5 text-muted-foreground">
  Charter này là nguồn context để task sau đó không phải nhập lại domain, scope và tiêu chí vận hành.
</p>
```

- [ ] **Step 6: Update staffing step copy**

In `project_create_staffing_step.svelte`, add under "Bộ role mẫu":

```svelte
<p class="text-xs leading-5 text-muted-foreground">
  Role mẫu không chỉ để phân người. Khi tạo task, role sẽ nạp skill, level, preset và gợi ý assignee.
</p>
```

Change `Gán người khởi tạo` heading to:

```svelte
<p class="text-sm font-semibold text-foreground">Gán người vào role để task gợi ý assignee</p>
```

- [ ] **Step 7: Update launch step copy**

In `project_create_launch_step.svelte`, add top explanatory block:

```svelte
<div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
  <p class="text-sm font-semibold text-foreground">Operating rules trước, task nhanh sau</p>
  <p class="mt-2 text-sm leading-6 text-muted-foreground">
    Sprint có thể dùng sau để gom task theo nhịp delivery. Demo này sẽ launch task trực tiếp từ project operating model.
  </p>
</div>
```

- [ ] **Step 8: Run e2e**

Run:

```bash
pnpm exec playwright test inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts --grep "operating model"
```

Expected: PASS.

---

### Task 4: Make Role Launch And Candidate Suggestions Demo-Obvious

**Files:**
- Modify: `inertia/apps/org/modules/projects/components/project_roles_tab.svelte`
- Test: `inertia/apps/org/tests/modules/projects/project_roles_tab.test.ts`

**Interfaces:**
- Consumes:
  - `buildRoleTaskLaunchHref` helper from Task 1.
- Produces:
  - Role cards with "Tạo task từ role" links and clear candidate suggestion explanation.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
gitnexus impact "ProjectRolesTab"
gitnexus impact "buildRoleTaskLaunchHref"
```

Expected: risk below HIGH.

- [ ] **Step 2: Add failing test assertion**

In `project_roles_tab.test.ts`, after role loads:

```ts
await waitFor(() => {
  expect(screen.getByRole('link', { name: /Tạo task từ Backend Lead/i })).toHaveAttribute(
    'href',
    '/projects?project_id=project-1&roleId=role-1&taskType=feature_development'
  )
})
```

If `taskLaunchBaseUrl` default remains `FRONTEND_ROUTES.TASKS`, assert that actual route value from constants.

- [ ] **Step 3: Run test to verify failure**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_roles_tab.test.ts
```

Expected: FAIL if role launch link is not accessible or copy differs.

- [ ] **Step 4: Use shared launch helper**

In `project_roles_tab.svelte`, import:

```ts
import { buildRoleTaskLaunchHref } from '@/apps/org/modules/projects/lib/project_operating_model'
```

Replace local `buildRoleTaskLaunchHref` function with calls to imported helper:

```ts
const href = buildRoleTaskLaunchHref({
  baseUrl: taskLaunchBaseUrl,
  projectId,
  roleId: role.id,
  roleCode: role.code,
})
```

Add visible link in each role card action area:

```svelte
<a href={buildRoleTaskLaunchHref({
  baseUrl: taskLaunchBaseUrl,
  projectId,
  roleId: role.id,
  roleCode: role.code,
})}>
  <Button size="sm" variant="outline" class="gap-1.5">
    Tạo task từ {role.name}
  </Button>
</a>
```

Add candidate explanation near candidate button:

```svelte
<p class="mt-2 text-xs leading-5 text-muted-foreground">
  Ứng viên được gợi ý theo skill match, level, review history và dispute signal.
</p>
```

- [ ] **Step 5: Run test**

Run:

```bash
pnpm exec vitest run inertia/apps/org/tests/modules/projects/project_roles_tab.test.ts
```

Expected: PASS.

---

### Task 5: Make Task Create Inheritance Visibly Obvious

**Files:**
- Modify: `inertia/apps/org/modules/tasks/create.svelte`
- Modify: `inertia/apps/org/modules/tasks/components/detail/task_role_prefill_panel.svelte`
- Modify: `inertia/apps/org/modules/tasks/lib/rules/task_contract_presets.ts`
- Test: `inertia/apps/org/tests/modules/tasks/components/task_contract_presets.test.ts`
- Test: `inertia/apps/org/tests/modules/tasks/components/task_role_prefill_panel.test.ts`
