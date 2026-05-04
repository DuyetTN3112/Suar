# Marketplace Module Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move marketplace runtime ownership into `app/modules/marketplace` while preserving `task_applications` storage and improving user vs organization marketplace UI.

**Architecture:** Marketplace becomes the route/controller/page-contract owner for task browsing, apply, and application review surfaces. It delegates task reads, task eligibility, task assignment, cache invalidation, and existing storage operations through thin adapters around current task module behavior. Phase 1 does not migrate to `marketplace_applications`.

**Tech Stack:** AdonisJS 7, Lucid, Inertia Svelte 5, Japa backend tests, Vitest/Svelte Testing Library component tests, GitNexus impact/detect-changes.

## Global Constraints

- Keep `task_applications` as runtime source of truth in phase 1.
- Do not wire `marketplace_applications` into `/marketplace/tasks`, apply, withdraw, process, ranking, or my-applications.
- Run `gitnexus impact <symbol>` before editing any existing function/class/method.
- Use TDD: write failing test, run and confirm failure, implement minimal code, rerun.
- Preserve existing API response shape for `/api/marketplace/tasks` and `/api/v1/marketplace/tasks`.
- Org recruiting talent APIs must enforce same admin-shell policy as `/org/talents`.

---

## File Structure

- Create `app/modules/marketplace/controllers/list_marketplace_tasks_controller.ts`: Inertia page controller for `/marketplace/tasks`.
- Create `app/modules/marketplace/controllers/list_marketplace_tasks_api_controller.ts`: JSON controller for `/api/marketplace/tasks` and `/api/v1/marketplace/tasks`.
- Create `app/modules/marketplace/controllers/apply_marketplace_task_controller.ts`: JSON apply controller for marketplace applications.
- Create `app/modules/marketplace/controllers/mappers/request/marketplace_task_request_mapper.ts`: request DTO builders copied/adapted from existing task request mapper.
- Create `app/modules/marketplace/controllers/mappers/response/marketplace_task_response_mapper.ts`: page/API response mappers copied/adapted from existing public task mapper, plus role context.
- Create `app/modules/marketplace/actions/queries/get_marketplace_tasks_query.ts`: wrapper around public task query behavior through task public reader adapter.
- Create `app/modules/marketplace/actions/commands/apply_marketplace_task_command.ts`: wrapper around existing apply command for phase 1 storage compatibility.
- Modify `app/modules/marketplace/bootstrap/marketplace_composition_root.ts`: expose new controllers' query/command factories.
- Modify `start/routes/marketplace.ts`: own `/marketplace` and redirect to `/marketplace/tasks`.
- Modify `start/routes/tasks.ts`: remove marketplace route ownership from tasks route file or point it to marketplace controllers.
- Modify `app/modules/users/controllers/talents_search_controller.ts`: enforce recruiter/admin access for org talent API routes.
- Modify `app/modules/users/controllers/talent_detail_controller.ts`: enforce recruiter/admin access for org talent detail API routes.
- Modify `inertia/pages/marketplace/tasks.svelte`: role-aware header/empty state.
- Modify `inertia/pages/marketplace/components/marketplace_task_card.svelte`: role-aware CTAs.
- Modify `inertia/pages/marketplace/components/marketplace_filters.svelte`: expose keyword and difficulty filters.
- Test `app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts`.
- Test `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`.
- Test `inertia/tests/component/marketplace/marketplace_tasks_page.test.ts`.
- Test `inertia/tests/component/marketplace/marketplace_task_card.test.ts`.

---

### Task 1: Marketplace Owns Listing Routes

**Files:**
- Create: `app/modules/marketplace/controllers/list_marketplace_tasks_controller.ts`
- Create: `app/modules/marketplace/controllers/list_marketplace_tasks_api_controller.ts`
- Create: `app/modules/marketplace/controllers/mappers/request/marketplace_task_request_mapper.ts`
- Create: `app/modules/marketplace/controllers/mappers/response/marketplace_task_response_mapper.ts`
- Create: `app/modules/marketplace/actions/queries/get_marketplace_tasks_query.ts`
- Modify: `app/modules/marketplace/bootstrap/marketplace_composition_root.ts`
- Modify: `start/routes/marketplace.ts`
- Modify: `start/routes/tasks.ts`
- Test: `app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts`

**Interfaces:**
- Consumes: existing `GetPublicTasksQuery`, `buildGetPublicTasksDTO` behavior, and `mapPublicTasksPageProps` response shape.
- Produces: `marketplaceCompositionRoot.makeGetMarketplaceTasksQuery(execCtx)`, `ListMarketplaceTasksController.handle(ctx)`, `ListMarketplaceTasksApiController.handle(ctx)`.

- [ ] **Step 1: Write failing backend route ownership test**

Create `app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts` with tests asserting:

```ts
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Marketplace module routes', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('/marketplace redirects to canonical marketplace tasks route', async ({ client }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/marketplace').loginAs(viewer)
    response.assertRedirectsTo('/marketplace/tasks')
  })

  test('marketplace module API keeps canonical marketplace tasks response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const visibleTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Marketplace owned task',
      description: 'Visible through marketplace module route',
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string; title: string }>
      pagination: { page: number; perPage: number; total: number }
    }

    assert.notProperty(body as Record<string, unknown>, 'success')
    assert.exists(body.data.find((task) => task.id === visibleTask.id))
    assert.deepInclude(body.pagination, { page: 1, perPage: 20, total: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts
```

Expected: FAIL because `/marketplace` does not redirect or marketplace controllers do not exist.

- [ ] **Step 3: Implement marketplace listing controllers and mappers**

Move/copy the public task list request/response behavior into marketplace controller/mappers. Use existing task query through a marketplace query wrapper to keep behavior stable.

- [ ] **Step 4: Move route ownership**

Update `start/routes/marketplace.ts` so it defines `/marketplace` redirect and `/marketplace/tasks`. Update `start/routes/tasks.ts` so task module no longer defines `/marketplace/tasks` listing routes.

- [ ] **Step 5: Run test to verify pass**

Run same Japa command. Expected: PASS.

---

### Task 2: Marketplace Owns Apply Route While Keeping Storage

**Files:**
- Create: `app/modules/marketplace/controllers/apply_marketplace_task_controller.ts`
- Create: `app/modules/marketplace/actions/commands/apply_marketplace_task_command.ts`
- Modify: `app/modules/marketplace/bootstrap/marketplace_composition_root.ts`
- Modify: `start/routes/marketplace.ts`
- Modify: `start/routes/tasks.ts`
- Test: `app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts`

**Interfaces:**
- Consumes: existing task apply command factory and response mapper.
- Produces: marketplace apply endpoint `/api/v1/tasks/:taskId/apply` served by marketplace controller but still writing `task_applications`.

- [ ] **Step 1: Add failing apply ownership/storage test**

Append a test to `marketplace_routes.spec.ts` that posts `/api/v1/tasks/:taskId/apply`, expects 201, then checks `task_applications` row exists and `marketplace_applications` is not required.

- [ ] **Step 2: Run test to verify it fails**

Run marketplace route spec. Expected: FAIL until marketplace controller owns route.

- [ ] **Step 3: Implement `ApplyMarketplaceTaskCommand`**

Implement `ApplyMarketplaceTaskCommand` in `app/modules/marketplace`; phase 1 may still use `task_applications` storage, but route/controller/use-case ownership belongs to marketplace.

- [ ] **Step 4: Route apply endpoint through marketplace controller**

Move `/api/v1/tasks/:taskId/apply` and `/api/tasks/:taskId/apply` route declarations from `start/routes/tasks.ts` to `start/routes/marketplace.ts`.

- [ ] **Step 5: Run test to verify pass**

Run marketplace route spec. Expected: PASS.

---

### Task 3: Lock Org Talent API Permissions

**Files:**
- Modify: `app/modules/users/controllers/talents_search_controller.ts`
- Modify: `app/modules/users/controllers/talent_detail_controller.ts`
- Test: `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`

**Interfaces:**
- Consumes: `organizationPublicApi.canAccessAdminShell()` and `resolveCurrentOrganizationId(ctx)`.
- Produces: org talent search/detail API denies `org_member` with 403.

- [ ] **Step 1: Write failing org member denial tests**

Add tests asserting:

```ts
const response = await client
  .get('/api/v1/me/organizations/current/talents/search')
  .loginAs(member)
response.assertStatus(403)
```

and:

```ts
const response = await client
  .get(`/api/v1/me/organizations/current/talents/${talent.id}`)
  .loginAs(member)
response.assertStatus(403)
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts
```

Expected: FAIL because org member can currently call search/detail.

- [ ] **Step 3: Implement shared access guard in both controllers**

Use current org id and membership role; throw `ForbiddenException('Bạn không có quyền truy cập danh bạ talent')` when admin shell access is denied.

- [ ] **Step 4: Run tests to verify pass**

Run same integration test. Expected: PASS.

---

### Task 4: Role-Aware Marketplace Page Props and UI

**Files:**
- Modify: `app/modules/marketplace/controllers/mappers/response/marketplace_task_response_mapper.ts`
- Modify: `inertia/pages/marketplace/tasks.svelte`
- Modify: `inertia/pages/marketplace/components/marketplace_task_card.svelte`
- Test: `inertia/tests/component/marketplace/marketplace_tasks_page.test.ts`
- Test: `inertia/tests/component/marketplace/marketplace_task_card.test.ts`

**Interfaces:**
- Consumes: page props `auth.user.current_organization_role`, task `organization.id`, current organization id when available.
- Produces: `marketplaceContext` prop with `mode: 'user' | 'organization'`, `canRecruit`, and `currentOrganizationId`.

- [ ] **Step 1: Write failing component tests**

Test normal user card shows `Gửi đề xuất` and does not show `Xem đề xuất`.

Test org admin + own org task shows `Xem đề xuất` and does not show `Gửi đề xuất`.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm vitest run inertia/tests/component/marketplace/marketplace_tasks_page.test.ts inertia/tests/component/marketplace/marketplace_task_card.test.ts
```

Expected: FAIL because role-aware CTAs are missing.

- [ ] **Step 3: Implement minimal role-aware props and card CTAs**

Add optional props to card:

```ts
marketplaceContext?: {
  mode: 'user' | 'organization'
  canRecruit: boolean
  currentOrganizationId?: string | null
}
```

Hide personal proposal CTA when `canRecruit` and task belongs to current org. Show link to `/tasks/${task.id}/applications`.

- [ ] **Step 4: Run tests to verify pass**

Run same Vitest command. Expected: PASS.

---

### Task 5: Marketplace Filters Match Backend Surface

**Files:**
- Modify: `inertia/pages/marketplace/components/marketplace_filters.svelte`
- Modify: `inertia/pages/marketplace/tasks.svelte`
- Test: `inertia/tests/component/marketplace/marketplace_tasks_page.test.ts`

**Interfaces:**
- Consumes: `filters.keyword`, `filters.difficulty`, `filters.sort_by`, `filters.sort_order`.
- Produces: router query params `keyword`, `difficulty`, `sort_by`, `sort_order`.

- [ ] **Step 1: Write failing filter preservation test**

Render marketplace page with keyword and difficulty filters. Assert previous/next pagination link includes `keyword`, `difficulty`, and sort params.

- [ ] **Step 2: Run test to verify failure**

Run marketplace page component test. Expected: FAIL because current UI omits keyword.

- [ ] **Step 3: Implement keyword input**

Add controlled input for keyword. Include it in `applyFilters`, `clearFilters`, `hasActiveFilters`, and pagination params.

- [ ] **Step 4: Run test to verify pass**

Run marketplace page component test. Expected: PASS.

---

### Task 6: Verification and Change Detection

**Files:**
- No new feature files.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verification evidence.

- [ ] **Step 1: Run focused backend tests**

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused frontend tests**

```bash
pnpm vitest run inertia/tests/component/marketplace/marketplace_tasks_page.test.ts inertia/tests/component/marketplace/marketplace_task_card.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run typecheck or targeted checks**

```bash
pnpm run typecheck
```

Expected: PASS or known unrelated failures documented with exact files.

- [ ] **Step 4: Run GitNexus change detection**

```bash
gitnexus detect-changes
```

Expected: changed symbols match marketplace/users route and UI work only.

- [ ] **Step 5: Summarize residual risks**

Report any parked `marketplace_applications` follow-up and any unrelated dirty worktree conflicts.
