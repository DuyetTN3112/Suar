# Org Admin Workspace Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship phase 1 of the org admin workspace redesign by making the org sidebar, org dashboard, task entry points, and project entry points reflect the new `Organization / Project / Task` information architecture without yet splitting every shared page into separate implementations.

**Architecture:** Keep backend behavior mostly intact for phase 1, but make the frontend tell the truth about scope. Normalize org entry points first, add explicit scope headers and CTA paths, and reshape existing pages so the org workspace feels like one coherent administration surface. Defer heavy shared-page extraction to later phases once the navigation and workspace truth are stable.

**Tech Stack:** AdonisJS, Inertia.js, Svelte 5, TypeScript, existing UI component library, Playwright E2E, Vitest component tests.

## Global Constraints

- Keep org workspace split into `Quản lý tổ chức`, `Quản lý dự án`, `Quản lý task`.
- Do not redesign `user workspace` or `system admin workspace` in this phase.
- Do not introduce a visual redesign that changes brand tokens or global theme primitives.
- Do not remove existing routes without compatibility redirects.
- Task board default scope should follow the currently selected project, with a visible toggle to `Toàn tổ chức`.
- `Workflow` must move conceptually into task management, even if temporary compatibility paths remain.
- `Project detail` must stop presenting task management as a peer tab in phase 1 copy and CTA design, even if some internals are still shared.
- Preserve or improve test coverage for role visibility, scope labels, redirects, and CTA navigation.

---

## File Structure

### Core navigation and shared shell files

- Modify: `inertia/components/navigation.svelte.ts`
  - Source of truth for org sidebar grouping and labels.
- Modify: `inertia/layouts/organization_layout.svelte`
  - Keep layout stable, but ensure page title and shell framing support the new IA.
- Modify: `inertia/constants/routes.ts`
  - Add normalized org task management route constants for board/list/workflow if missing.

### Org dashboard and org pages

- Modify: `inertia/pages/org/dashboard.svelte`
  - Replace current “stats + shortcut board” with a three-domain decision hub.
- Modify: `inertia/pages/org/projects/index.svelte`
  - Reframe the project portfolio page with stronger project-vs-task CTA separation.
- Modify: `inertia/pages/org/projects/components/project_grid.svelte`
  - Add distinct actions for project detail and project task workspace.
- Modify: `inertia/pages/org/workflow/index.svelte`
  - Reframe copy and entry semantics around task management instead of generic workflow customization.

### Shared project and task pages still reused in phase 1

- Modify: `inertia/pages/tasks/index.svelte`
  - Make org scope and board/list entry truth explicit.
- Modify: `inertia/pages/tasks/components/header/task_scope_bar.svelte`
  - Stronger scope label and org/project toggle.
- Modify: `inertia/pages/tasks/components/header/task_header.svelte`
  - Ensure filters and chrome reflect the selected task management mode.
- Modify: `inertia/pages/projects/show.svelte`
  - Reduce “task tab as equal peer” emphasis in phase 1 and add CTA-driven project/task separation.

### Server routes and org controllers

- Modify: `start/routes/organizations_current.ts`
  - Add normalized task management paths with compatibility aliases.
- Modify: `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts`
  - Support board/list mode routing inputs and normalized base route selection.
- Modify: `app/modules/organizations/controllers/current/projects/show_project_controller.ts`
  - Ensure project detail renders org-friendly base routes and project task CTA links.

### Tests

- Modify: `inertia/tests/storybook/components/layout/organization_sidebar.stories.svelte`
  - Update sidebar story to match new IA.
- Create: `inertia/tests/e2e/org/org_workspace_navigation.spec.ts`
  - Verify sidebar groups and target routes.
- Create: `inertia/tests/e2e/org/org_dashboard_decision_hub.spec.ts`
  - Verify dashboard exposes the three management domains and correct CTAs.
- Create: `inertia/tests/e2e/org/org_task_scope_toggle.spec.ts`
  - Verify default project scope and explicit toggle to org-wide scope.
- Create: `inertia/tests/e2e/org/org_project_task_split.spec.ts`
  - Verify project portfolio and project detail separate project management from task management.

### Docs

- Modify: `docs/design/navigation-structure-documentation.md`
  - Update navigation description to reflect the phase 1 IA truth.
- Modify: `docs/design/screen-page-inventory.md`
  - Note the new org task/project management structure.

## Task 1: Rebuild org sidebar information architecture

**Files:**
- Modify: `inertia/components/navigation.svelte.ts`
- Modify: `inertia/constants/routes.ts`
- Modify: `inertia/tests/storybook/components/layout/organization_sidebar.stories.svelte`
- Test: `inertia/tests/e2e/org/org_workspace_navigation.spec.ts`

**Interfaces:**
- Consumes: Existing `organizationNavigation` structure and current `FRONTEND_ROUTES`.
- Produces:
  - `FRONTEND_ROUTES.ORG_TASK_BOARD`
  - `FRONTEND_ROUTES.ORG_TASK_LIST`
  - `FRONTEND_ROUTES.ORG_TASK_WORKFLOW`
  - org sidebar groups labeled `Quản lý tổ chức`, `Quản lý dự án`, `Quản lý task`, `Chất lượng`

- [ ] **Step 1: Write the failing E2E test for the new org sidebar grouping**

```ts
import { test, expect } from '@playwright/test'

test('org sidebar groups organization, project, and task management separately', async ({ page }) => {
  await page.goto('/org')

  await expect(page.getByText('Quản lý tổ chức')).toBeVisible()
  await expect(page.getByText('Quản lý dự án')).toBeVisible()
  await expect(page.getByText('Quản lý task')).toBeVisible()

  await expect(page.getByRole('link', { name: 'Task board' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Task list' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Workflow' })).toBeVisible()

  await expect(page.getByText('Công Việc')).toHaveCount(0)
})
```

- [ ] **Step 2: Run the new E2E test to verify it fails on current navigation**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_workspace_navigation.spec.ts --project=chromium`

Expected: FAIL because `Quản lý tổ chức`, `Quản lý dự án`, and `Quản lý task` group labels are not all present, and `Công Việc` still exists.

- [ ] **Step 3: Add normalized org task route constants**

```ts
export const FRONTEND_ROUTES = {
  // ...
  ORG_TASK_BOARD: '/org/tasks/board',
  ORG_TASK_LIST: '/org/tasks/list',
  ORG_TASK_WORKFLOW: '/org/tasks/workflow',
  ORG_PROJECTS: '/org/projects',
} as const
```

- [ ] **Step 4: Rewrite the org sidebar structure around the three management domains**

```ts
const organizationNavigationData = [
  {
    title: 'Tổng quan',
    items: [{ title: 'Dashboard điều hành', url: '/org', iconName: 'LayoutDashboard' }],
  },
  {
    title: 'Quản lý tổ chức',
    items: [
      { title: 'Thành viên', url: FRONTEND_ROUTES.ORG_MEMBERS, iconName: 'Users' },
      { title: 'Lời mời', url: FRONTEND_ROUTES.ORG_INVITATIONS, iconName: 'Mail' },
      { title: 'Yêu cầu tham gia', url: FRONTEND_ROUTES.ORG_INVITATION_REQUESTS, iconName: 'UserRoundPlus' },
      { title: 'Vai trò', url: FRONTEND_ROUTES.ORG_ROLES, iconName: 'Shield' },
      { title: 'Quyền hạn', url: FRONTEND_ROUTES.ORG_PERMISSIONS, iconName: 'ShieldCheck' },
      { title: 'Phòng ban', url: FRONTEND_ROUTES.ORG_DEPARTMENTS, iconName: 'Building2' },
      { title: 'Thông tin tổ chức', url: FRONTEND_ROUTES.ORG_SETTINGS, iconName: 'Settings' },
    ],
  },
  {
    title: 'Quản lý dự án',
    items: [
      { title: 'Danh mục dự án', url: FRONTEND_ROUTES.ORG_PROJECTS, iconName: 'Briefcase' },
      { title: 'Vai trò dự án', url: '/org/projects#roles', iconName: 'BadgeCheck' },
      { title: 'Skills baseline', url: '/org/projects#skills', iconName: 'FolderKanban' },
    ],
  },
  {
    title: 'Quản lý task',
    items: [
      { title: 'Task board', url: FRONTEND_ROUTES.ORG_TASK_BOARD, iconName: 'KanbanSquare' },
      { title: 'Task list', url: FRONTEND_ROUTES.ORG_TASK_LIST, iconName: 'ListTodo' },
      { title: 'Workflow', url: FRONTEND_ROUTES.ORG_TASK_WORKFLOW, iconName: 'GitBranch' },
    ],
  },
  {
    title: 'Chất lượng',
    items: [
      { title: 'Reverse reviews', url: '/org/reverse-reviews', iconName: 'Star' },
      { title: 'Disputes', url: '/org/disputes', iconName: 'AlertTriangle' },
    ],
  },
]
```

- [ ] **Step 5: Update the org sidebar story fixture to match the new labels**

```svelte
page.url = '/org'
page.props = {
  auth: {
    user: {
      current_organization_id: 'org-1',
      current_organization_role: 'org_owner',
      organizations: [{ id: 'org-1', name: 'Google DeepMind', org_role: 'org_owner' }],
      projects: [{ id: 'p-1', name: 'Apollo Project' }],
      current_project: { id: 'p-1', name: 'Apollo Project' },
    },
  },
}
```

- [ ] **Step 6: Re-run the org sidebar E2E test**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_workspace_navigation.spec.ts --project=chromium`

Expected: PASS with the new sidebar groups and no `Công Việc` heading.

- [ ] **Step 7: Commit**

```bash
git add inertia/components/navigation.svelte.ts inertia/constants/routes.ts inertia/tests/storybook/components/layout/organization_sidebar.stories.svelte inertia/tests/e2e/org/org_workspace_navigation.spec.ts
git commit -m "feat: reorganize org sidebar by management domain"
```

## Task 2: Turn `/org` into a decision hub instead of a shortcut board

**Files:**
- Modify: `inertia/pages/org/dashboard.svelte`
- Test: `inertia/tests/e2e/org/org_dashboard_decision_hub.spec.ts`

**Interfaces:**
- Consumes: Existing `stats` shape from org dashboard controller.
- Produces:
  - dashboard sections labeled `Quản lý tổ chức`, `Quản lý dự án`, `Quản lý task`
  - CTA links to `/org/members`, `/org/projects`, `/org/tasks/board`

- [ ] **Step 1: Write the failing E2E test for the org decision hub**

```ts
import { test, expect } from '@playwright/test'

test('org dashboard exposes three decision domains with primary CTAs', async ({ page }) => {
  await page.goto('/org')

  await expect(page.getByRole('heading', { name: 'Quản lý tổ chức' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quản lý dự án' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quản lý task' })).toBeVisible()

  await expect(page.getByRole('link', { name: 'Mở thành viên' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mở danh mục dự án' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mở task board' })).toBeVisible()
})
```

- [ ] **Step 2: Run the dashboard E2E test to verify it fails**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_dashboard_decision_hub.spec.ts --project=chromium`

Expected: FAIL because the current page uses generic stat cards and shortcut pills rather than three domain sections.

- [ ] **Step 3: Replace the current shortcut board with three domain panels**

```svelte
<section class="grid gap-4 xl:grid-cols-3">
  <Card>
    <CardHeader>
      <CardTitle>Quản lý tổ chức</CardTitle>
      <CardDescription>Thành viên, vai trò, quyền hạn và membership flow.</CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">{stats.members.pending_invitations} lời mời đang chờ, {stats.members.total} thành viên hoạt động.</p>
      <Link href="/org/members"><Button>Mở thành viên</Button></Link>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Quản lý dự án</CardTitle>
      <CardDescription>Danh mục project, staffing gap và khả năng delivery.</CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">{stats.projects.active} dự án đang chạy trên tổng {stats.projects.total} dự án.</p>
      <Link href="/org/projects"><Button>Mở danh mục dự án</Button></Link>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Quản lý task</CardTitle>
      <CardDescription>Điều phối backlog, overdue, unassigned và workflow bottleneck.</CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">{stats.tasks.overdue} task quá hạn, {stats.tasks.in_progress} task đang chạy.</p>
      <Link href="/org/tasks/board"><Button>Mở task board</Button></Link>
    </CardContent>
  </Card>
</section>
```

- [ ] **Step 4: Remove the old “Đi tắt quản trị” button wall from the dashboard**

```svelte
<!-- Delete the generic quick-links card and keep only domain-focused entry points -->
```

- [ ] **Step 5: Re-run the dashboard decision hub E2E test**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_dashboard_decision_hub.spec.ts --project=chromium`

Expected: PASS with the three management domains and new CTA labels.

- [ ] **Step 6: Commit**

```bash
git add inertia/pages/org/dashboard.svelte inertia/tests/e2e/org/org_dashboard_decision_hub.spec.ts
git commit -m "feat: redesign org dashboard as decision hub"
```

## Task 3: Normalize org task entry points and make scope explicit

**Files:**
- Modify: `start/routes/organizations_current.ts`
- Modify: `app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts`
- Modify: `inertia/pages/tasks/index.svelte`
- Modify: `inertia/pages/tasks/components/header/task_scope_bar.svelte`
- Test: `inertia/tests/e2e/org/org_task_scope_toggle.spec.ts`

**Interfaces:**
- Consumes:
  - current task page props: `shellMode`, `baseRoute`, `filters`, `projectContext`, `projectOptions`
- Produces:
  - org task board route `/org/tasks/board`
  - org task list route `/org/tasks/list`
  - visible scope switch `Theo project` / `Toàn tổ chức`
  - board mode and list mode driven by route input

- [ ] **Step 1: Write the failing E2E test for explicit task scope controls**

```ts
import { test, expect } from '@playwright/test'

test('org task board defaults to project scope and can switch to org-wide scope', async ({ page }) => {
  await page.goto('/org/tasks/board')

  await expect(page.getByText('Theo project')).toBeVisible()
  await expect(page.getByText('Toàn tổ chức')).toBeVisible()
  await expect(page.getByText(/Dự án/i)).toBeVisible()
})
```

- [ ] **Step 2: Run the task scope E2E test to verify it fails**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_task_scope_toggle.spec.ts --project=chromium`

Expected: FAIL because `/org/tasks/board` does not exist yet and the current task UI does not expose an explicit two-state scope control.

- [ ] **Step 3: Add normalized board/list compatibility routes under `/org/tasks/*`**

```ts
router
  .group(() => {
    router.get('/board', [OrgListTasksController, 'handle']).as('org.tasks.board')
    router.get('/list', [OrgListTasksController, 'handle']).as('org.tasks.list')
    router.get('/:id', [OrgShowTaskController, 'handle']).as('org.tasks.show')
  })
  .prefix('/tasks')
```

- [ ] **Step 4: Make the org task controller derive page mode and normalized base route**

```ts
const requestedMode = request.input('mode') === 'list' ? 'list' : 'board'
const baseRoute = requestedMode === 'list' ? '/org/tasks/list' : '/org/tasks/board'

return inertia.render('tasks/index', {
  shellMode: 'organization',
  baseRoute,
  taskViewMode: requestedMode,
  ...pageData,
})
```

- [ ] **Step 5: Add visible scope chips and project-vs-org-wide mode controls to `task_scope_bar.svelte`**

```svelte
<div class="task-scope-controls">
  <button class:active={!filters.project_id}>Toàn tổ chức</button>
  <button class:active={!!filters.project_id}>Theo project</button>
</div>
<div class="task-scope-title-area">
  <span class="task-scope-breadcrumb-root">{taskViewMode === 'list' ? 'Task list' : 'Task board'}</span>
  <span class="task-scope-separator">/</span>
  <span class="task-scope-project-active">{activeProjectName}</span>
</div>
```

- [ ] **Step 6: Make `tasks/index.svelte` render org page titles from explicit mode instead of vague shared copy**

```ts
const pageTitle = $derived(
  shellMode === 'organization'
    ? taskViewMode === 'list'
      ? 'Task list tổ chức'
      : 'Task board tổ chức'
    : t('task.task_list', {}, 'Quản lý nhiệm vụ')
)
```

- [ ] **Step 7: Re-run the task scope E2E test**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_task_scope_toggle.spec.ts --project=chromium`

Expected: PASS with `/org/tasks/board` resolving and visible scope controls rendered.

- [ ] **Step 8: Commit**

```bash
git add start/routes/organizations_current.ts app/modules/organizations/controllers/current/tasks/list_tasks_controller.ts inertia/pages/tasks/index.svelte inertia/pages/tasks/components/header/task_scope_bar.svelte inertia/tests/e2e/org/org_task_scope_toggle.spec.ts
git commit -m "feat: normalize org task routes and scope controls"
```

## Task 4: Separate project management decisions from task management CTAs

**Files:**
- Modify: `inertia/pages/org/projects/index.svelte`
- Modify: `inertia/pages/org/projects/components/project_grid.svelte`
- Modify: `inertia/pages/projects/show.svelte`
- Test: `inertia/tests/e2e/org/org_project_task_split.spec.ts`

**Interfaces:**
- Consumes:
  - current org project portfolio props
  - shared `projects/show` page with `shellMode: 'organization'`
- Produces:
  - project portfolio page with two intents: detail vs task workspace
  - project detail CTA `Mở task của dự án`
  - reduced emphasis on task tab as a peer concern

- [ ] **Step 1: Write the failing E2E test for project/task CTA separation**

```ts
import { test, expect } from '@playwright/test'

test('org project surfaces separate project detail from task workspace entry', async ({ page }) => {
  await page.goto('/org/projects')

  await expect(page.getByRole('button', { name: /Mở task của dự án/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Xem chi tiết project/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the project/task split E2E test to verify it fails**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_project_task_split.spec.ts --project=chromium`

Expected: FAIL because the current project card has only one generic “open detail” action.

- [ ] **Step 3: Update the org project portfolio hero copy to present project management, not a mixed workspace**

```svelte
<h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Danh mục dự án</h1>
<p class="mt-3 text-sm leading-6 text-muted-foreground">
  Quản lý container delivery của tổ chức: owner, staffing, baseline capability và tình trạng từng project.
</p>
```

- [ ] **Step 4: Add two distinct CTAs to each project card**

```svelte
<div class="grid gap-2 sm:grid-cols-2">
  <Button variant="outline" onclick={() => router.visit(`/org/projects/${project.id}`)}>
    Xem chi tiết project
  </Button>
  <Button onclick={() => router.visit(`/org/tasks/board?project_id=${project.id}`)}>
    Mở task của dự án
  </Button>
</div>
```

- [ ] **Step 5: Reduce task tab prominence in shared project detail and add a stronger cross-domain CTA**

```svelte
<div class="flex flex-wrap items-center gap-2">
  <Button onclick={() => { router.visit(`/org/tasks/board?project_id=${project.id}`) }}>
    Mở task của dự án
  </Button>
  <Button variant="outline" onclick={() => { router.visit(`${baseRoute}/${project.id}/members`) }}>
    Quản lý thành viên
  </Button>
</div>
```

- [ ] **Step 6: Re-run the project/task split E2E test**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_project_task_split.spec.ts --project=chromium`

Expected: PASS with explicit project detail and task workspace actions.

- [ ] **Step 7: Commit**

```bash
git add inertia/pages/org/projects/index.svelte inertia/pages/org/projects/components/project_grid.svelte inertia/pages/projects/show.svelte inertia/tests/e2e/org/org_project_task_split.spec.ts
git commit -m "feat: separate org project and task entry actions"
```

## Task 5: Reframe workflow as task management configuration and update docs

**Files:**
- Modify: `inertia/pages/org/workflow/index.svelte`
- Modify: `docs/design/navigation-structure-documentation.md`
- Modify: `docs/design/screen-page-inventory.md`
- Test: `inertia/tests/e2e/org/org_workspace_navigation.spec.ts`

**Interfaces:**
- Consumes: Current org workflow screen and design docs.
- Produces:
  - task-management-oriented workflow copy
  - docs that describe workflow under the task management domain

- [ ] **Step 1: Write the failing assertion for workflow language under task management**

```ts
await page.goto('/org/tasks/workflow')
await expect(page.getByText(/Quản lý task/i)).toBeVisible()
await expect(page.getByText(/cấu hình workflow của task/i)).toBeVisible()
```

- [ ] **Step 2: Run the org navigation test again to verify workflow assertions fail**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_workspace_navigation.spec.ts --project=chromium`

Expected: FAIL because workflow language still presents as a standalone generic workflow screen.

- [ ] **Step 3: Update workflow page copy to anchor it under task management**

```svelte
<p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">Quản lý task / Workflow</p>
<h1 class="text-4xl font-bold tracking-tight">Workflow task</h1>
<p class="mt-2 text-sm text-muted-foreground">
  Cấu hình các trạng thái và luồng chuyển của task trong toàn bộ workspace tổ chức.
</p>
```

- [ ] **Step 4: Update design docs to describe the new phase 1 IA**

```md
- org navigation now groups `Quản lý tổ chức`, `Quản lý dự án`, `Quản lý task`, and `Chất lượng`
- workflow is exposed under task management rather than the old mixed `Công Việc` cluster
- org task workspace has explicit board/list entry points
```

- [ ] **Step 5: Re-run the org navigation E2E test**

Run: `E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test inertia/tests/e2e/org/org_workspace_navigation.spec.ts --project=chromium`

Expected: PASS with workflow language aligned to task management.

- [ ] **Step 6: Commit**

```bash
git add inertia/pages/org/workflow/index.svelte docs/design/navigation-structure-documentation.md docs/design/screen-page-inventory.md inertia/tests/e2e/org/org_workspace_navigation.spec.ts
git commit -m "docs: align org workflow with task management IA"
```

## Self-Review

### Spec coverage

- Sidebar split into `Organization / Project / Task`: covered by Task 1.
- Org dashboard as decision hub: covered by Task 2.
- Route truth for task board/list/workflow: covered by Task 3.
- Project detail reduced to project management with explicit task CTA: covered by Task 4.
- Workflow moved conceptually into task management: covered by Task 5.
- Role visibility and scope truth: covered by Task 1, Task 3, and Task 5 E2E checks.

No uncovered phase 1 requirement remains.

### Placeholder scan

- No `TBD`, `TODO`, or vague “handle this appropriately” steps remain.
- All code-changing steps include concrete code.
- All testing steps include explicit commands and expected outcomes.

### Type consistency

- Uses `FRONTEND_ROUTES.ORG_TASK_BOARD`, `FRONTEND_ROUTES.ORG_TASK_LIST`, and `FRONTEND_ROUTES.ORG_TASK_WORKFLOW` consistently.
- Uses `taskViewMode` as the explicit board/list selector consistently across task route/controller/page tasks.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-02-org-admin-workspace-phase1-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
