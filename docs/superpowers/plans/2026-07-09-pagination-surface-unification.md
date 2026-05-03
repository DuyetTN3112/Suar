# Pagination Surface Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all Suar pagination surfaces so backend boundaries, Inertia page props, and frontend controls use one canonical pagination contract with low inter-module coupling.

**Architecture:** Introduce shared canonical pagination contracts and mapper helpers at backend boundaries, then migrate frontend surfaces onto two shared pagination components: one for offset mode and one for cursor mode. Keep internal query/repository pagination shapes transitional where needed, but stop all legacy dialects from leaking into page props and API contracts.

**Tech Stack:** AdonisJS, TypeScript, Inertia.js, Svelte, ESLint, Vitest/Japa, GitNexus audit checks

## Global Constraints

- Public/admin JSON pagination uses one camelCase canonical contract only.
- Inertia page props pagination uses one canonical contract only.
- Frontend supports only two pagination modes: `offset` and `cursor`.
- No production page keeps bespoke inline previous/next controls after rollout.
- All visible multi-page lists must expose canonical pagination controls.
- Cross-module coupling must be reduced, including removal of auth -> users infra import.
- Do not revert unrelated dirty worktree changes.

---

### Task 1: Inventory Every Paginated Surface and Missing Surface

**Files:**
- Create: `docs/evidence/2026-07-09-pagination-surface-audit.md`
- Modify: `docs/superpowers/specs/2026-07-09-pagination-surface-unification-design.md`

**Interfaces:**
- Consumes: grep findings from `inertia/pages`, `inertia/components`, `app/modules`
- Produces: audited surface list with classification `canonicalized | non_canonical | missing | intentionally_single_page`

- [ ] **Step 1: Write the failing audit expectation**

Add this section stub to `docs/evidence/2026-07-09-pagination-surface-audit.md`:

```md
# Pagination Surface Audit

## Required Columns

- Surface
- Mode
- Current Contract
- Current UI Control
- Status
- Target Component
- Target Mapper

## Completion Rule

This audit is complete only when every visible multi-page list is classified and no production surface remains `unknown`.
```

- [ ] **Step 2: Build the first raw inventory**

Run:

```bash
grep -n "Pagination|CursorPagination|SimplePagination|pagination|current_page|last_page|per_page|totalPages|currentPage|lastPage" inertia/pages inertia/components app/modules
```

Expected: a long hit list covering page-level lists, cursor queues, embedded lists, and custom pagers.

- [ ] **Step 3: Write the normalized audit entries**

Populate `docs/evidence/2026-07-09-pagination-surface-audit.md` with sections like:

```md
## Offset Surfaces

- `inertia/pages/admin/organizations/index.svelte`
  - Mode: `offset`
  - Current contract: `currentPage/perPage/lastPage`
  - Current UI control: shared numeric pager
  - Status: `non_canonical`
  - Target component: `UnifiedOffsetPagination`
  - Target mapper: shared canonical page-prop mapper

- `inertia/pages/projects/index.svelte`
  - Mode: `offset`
  - Current contract: `page/limit/totalPages`
  - Current UI control: shared numeric pager
  - Status: `non_canonical`
  - Target component: `UnifiedOffsetPagination`
  - Target mapper: shared canonical page-prop mapper
```

- [ ] **Step 4: Add missing-pagination surfaces explicitly**

For each list found without a canonical pager, add entries like:

```md
- `inertia/pages/tasks/applications.svelte`
  - Mode: `offset`
  - Current contract: `per_page/current_page/last_page`
  - Current UI control: inline custom previous/next
  - Status: `non_canonical`
  - Target component: `UnifiedOffsetPagination`
```

and, if a list is truly missing pagination:

```md
- `inertia/pages/<surface>.svelte`
  - Mode: `offset`
  - Current contract: `none`
  - Current UI control: `none`
  - Status: `missing`
  - Target component: `UnifiedOffsetPagination`
```

- [ ] **Step 5: Verify the audit is exhaustive**

Run:

```bash
grep -n "Status: `missing`|Status: `non_canonical`|Status: `canonicalized`" docs/evidence/2026-07-09-pagination-surface-audit.md
```

Expected: every discovered pagination surface has a status and no `unknown` entries remain.

- [ ] **Step 6: Commit**

```bash
git add docs/evidence/2026-07-09-pagination-surface-audit.md docs/superpowers/specs/2026-07-09-pagination-surface-unification-design.md
git commit -m "docs: audit pagination surfaces"
```

### Task 2: Introduce Canonical Pagination Contracts and Shared Mapper Helpers

**Files:**
- Create: `app/modules/pagination/public_contracts/pagination_boundary.ts`
- Modify: `app/modules/pagination/public_contracts/pagination.ts`
- Modify: `app/modules/http/api_v1/response_mappers.ts`
- Modify: `app/modules/admin/controllers/mappers/response/admin_api_response_mapper.ts`
- Modify: `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts`
- Modify: `app/modules/reviews/controllers/mappers/response/review_dispute_response_mapper.ts`
- Test: `app/modules/pagination/tests/backend/unit/pagination_boundary.spec.ts`

**Interfaces:**
- Consumes: `buildPaginationMeta`, existing cursor metadata from modules
- Produces:
  - `CanonicalPagePagination`
  - `CanonicalApiPagination`
  - `toCanonicalPagePagination(meta)`
  - `toCanonicalApiPagination(meta)`

- [ ] **Step 1: Write the failing unit tests**

Create `app/modules/pagination/tests/backend/unit/pagination_boundary.spec.ts`:

```ts
import { test } from '@japa/runner'
import {
  toCanonicalApiPagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_boundary'

test('maps offset pagination to canonical page shape', ({ assert }) => {
  const result = toCanonicalPagePagination({
    total: 45,
    perPage: 10,
    currentPage: 2,
    lastPage: 5,
  })

  assert.deepEqual(result, {
    mode: 'offset',
    page: 2,
    perPage: 10,
    total: 45,
    lastPage: 5,
    hasNextPage: true,
    hasPreviousPage: true,
  })
})

test('maps cursor pagination to canonical api shape', ({ assert }) => {
  const result = toCanonicalApiPagination({
    total: 20,
    perPage: 5,
    currentPage: 2,
    lastPage: 4,
    cursor: {
      nextCursor: 'next',
      previousCursor: 'prev',
      hasNextPage: true,
      hasPreviousPage: true,
    },
  })

  assert.deepEqual(result, {
    mode: 'cursor',
    page: 2,
    perPage: 5,
    total: 20,
    lastPage: 4,
    hasNextPage: true,
    hasPreviousPage: true,
    nextCursor: 'next',
    previousCursor: 'prev',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts --files app/modules/pagination/tests/backend/unit/pagination_boundary.spec.ts
```

Expected: FAIL with missing module or missing exports from `pagination_boundary.ts`.

- [ ] **Step 3: Write minimal implementation**

Create `app/modules/pagination/public_contracts/pagination_boundary.ts` with:

```ts
export interface CanonicalPagePagination {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  cursor?: {
    nextCursor: string | null
    previousCursor: string | null
  }
}

export interface CanonicalApiPagination {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor: string | null
  previousCursor: string | null
}

interface CursorLike {
  nextCursor?: string | null
  previousCursor?: string | null
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

interface PaginationMetaLike {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  cursor?: CursorLike
}

export function toCanonicalPagePagination(meta: PaginationMetaLike): CanonicalPagePagination {
  const mode = meta.cursor ? 'cursor' : 'offset'

  return {
    mode,
    page: meta.currentPage,
    perPage: meta.perPage,
    total: meta.total,
    lastPage: meta.lastPage,
    hasNextPage: meta.cursor?.hasNextPage ?? meta.currentPage < meta.lastPage,
    hasPreviousPage: meta.cursor?.hasPreviousPage ?? meta.currentPage > 1,
    ...(meta.cursor
      ? {
          cursor: {
            nextCursor: meta.cursor.nextCursor ?? null,
            previousCursor: meta.cursor.previousCursor ?? null,
          },
        }
      : {}),
  }
}

export function toCanonicalApiPagination(meta: PaginationMetaLike): CanonicalApiPagination {
  return {
    mode: meta.cursor ? 'cursor' : 'offset',
    page: meta.currentPage,
    perPage: meta.perPage,
    total: meta.total,
    lastPage: meta.lastPage,
    hasNextPage: meta.cursor?.hasNextPage ?? meta.currentPage < meta.lastPage,
    hasPreviousPage: meta.cursor?.hasPreviousPage ?? meta.currentPage > 1,
    nextCursor: meta.cursor?.nextCursor ?? null,
    previousCursor: meta.cursor?.previousCursor ?? null,
  }
}
```

- [ ] **Step 4: Rewire existing shared mappers**

Update existing mappers so they call the new helpers instead of hand-building pagination objects. Replace ad hoc blocks with:

```ts
import { toCanonicalApiPagination } from '#modules/pagination/public_contracts/pagination_boundary'
```

and:

```ts
pagination: toCanonicalApiPagination(meta)
```

- [ ] **Step 5: Run tests to verify it passes**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts --files app/modules/pagination/tests/backend/unit/pagination_boundary.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/modules/pagination/public_contracts/pagination_boundary.ts app/modules/pagination/public_contracts/pagination.ts app/modules/http/api_v1/response_mappers.ts app/modules/admin/controllers/mappers/response/admin_api_response_mapper.ts app/modules/reviews/controllers/mappers/response/review_response_mapper.ts app/modules/reviews/controllers/mappers/response/review_dispute_response_mapper.ts app/modules/pagination/tests/backend/unit/pagination_boundary.spec.ts
git commit -m "feat: add canonical pagination boundary mappers"
```

### Task 3: Canonicalize Inertia Page Props for Offset Surfaces

**Files:**
- Modify: `app/modules/projects/controllers/mappers/response/project_response_mapper.ts`
- Modify: `app/modules/organizations/controllers/current/members/mappers/response/list_members_response_mapper.ts`
- Modify: `app/modules/organizations/controllers/current/invitations/mappers/response/*.ts`
- Modify: `app/modules/organizations/controllers/mappers/response/organization_page_props_mapper.ts`
- Modify: `app/modules/admin/controllers/*/list_*_controller.ts`
- Test: `tests/unit/controllers/controller_adapter_mappers.spec.ts`

**Interfaces:**
- Consumes: local legacy pagination result objects
- Produces: all page props with `pagination: CanonicalPagePagination`

- [ ] **Step 1: Write failing assertions for page-prop contract**

Add tests like:

```ts
assert.deepInclude(page.props.pagination, {
  mode: 'offset',
  page: 1,
  perPage: 20,
  total: 42,
  lastPage: 3,
  hasNextPage: true,
  hasPreviousPage: false,
})

assert.notProperty(page.props.pagination, 'currentPage')
assert.notProperty(page.props.pagination, 'lastPageLegacy')
assert.notProperty(page.props.pagination, 'limit')
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:unit -- --files tests/unit/controllers/controller_adapter_mappers.spec.ts
```

Expected: FAIL because mappers still expose legacy pagination shapes.

- [ ] **Step 3: Update page mappers to canonical props**

For each mapper, replace direct pass-through with:

```ts
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_boundary'
```

and:

```ts
return {
  ...rest,
  pagination: toCanonicalPagePagination(result.pagination),
}
```

or, where the page still uses `meta`, normalize to:

```ts
return {
  ...rest,
  pagination: toCanonicalPagePagination({
    total: result.meta.total,
    perPage: result.meta.per_page,
    currentPage: result.meta.current_page,
    lastPage: result.meta.last_page,
    cursor: result.meta.cursor
      ? {
          nextCursor: result.meta.cursor.next_cursor,
          previousCursor: result.meta.cursor.previous_cursor,
          hasNextPage: result.meta.cursor.has_next_page,
          hasPreviousPage: result.meta.cursor.has_previous_page,
        }
      : undefined,
  }),
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test:unit -- --files tests/unit/controllers/controller_adapter_mappers.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/projects/controllers/mappers/response/project_response_mapper.ts app/modules/organizations/controllers/current/members/mappers/response/ app/modules/organizations/controllers/mappers/response/ app/modules/admin/controllers/ tests/unit/controllers/controller_adapter_mappers.spec.ts
git commit -m "feat: canonicalize inertia pagination props"
```

### Task 4: Replace Frontend Offset Pager Variants with UnifiedOffsetPagination

**Files:**
- Create: `inertia/components/ui/unified_offset_pagination.svelte`
- Modify: `inertia/components/ui/pagination.svelte`
- Modify: `inertia/pages/admin/organizations/index.svelte`
- Modify: `inertia/pages/admin/packages/index.svelte`
- Modify: `inertia/pages/admin/users/index.svelte`
- Modify: `inertia/pages/org/invitations/index.svelte`
- Modify: `inertia/pages/org/members/index.svelte`
- Modify: `inertia/pages/org/projects/index.svelte`
- Modify: `inertia/pages/organizations/all.svelte`
- Modify: `inertia/pages/projects/index.svelte`
- Modify: `inertia/pages/org/talents/index.svelte`
- Modify: `inertia/pages/tasks/applications.svelte`
- Modify: `inertia/pages/applications/my-applications.svelte`
- Modify: `inertia/components/organization_pagination_controls.svelte`
- Test: `inertia/tests/unified_offset_pagination.spec.ts`

**Interfaces:**
- Consumes: `CanonicalPagePagination`
- Produces: uniform offset pagination UI with page summary and query preservation

- [ ] **Step 1: Write failing component tests**

Create `inertia/tests/unified_offset_pagination.spec.ts`:

```ts
import { render, screen } from '@testing-library/svelte'
import UnifiedOffsetPagination from '@/components/ui/unified_offset_pagination.svelte'

test('renders page summary and navigation for offset pagination', () => {
  render(UnifiedOffsetPagination, {
    pagination: {
      mode: 'offset',
      page: 2,
      perPage: 10,
      total: 45,
      lastPage: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    },
    baseUrl: '/projects',
  })

  screen.getByText('11-20 / 45')
  screen.getByText('2 / 5')
  screen.getByLabelText('First page')
  screen.getByLabelText('Previous page')
  screen.getByLabelText('Next page')
  screen.getByLabelText('Last page')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run inertia/tests/unified_offset_pagination.spec.ts
```

Expected: FAIL because component does not exist yet.

- [ ] **Step 3: Implement unified component**

Create `inertia/components/ui/unified_offset_pagination.svelte` with:

```svelte
<script lang="ts">
  import Pagination from '@/components/ui/pagination.svelte'

  interface Props {
    pagination: {
      mode: 'offset'
      page: number
      perPage: number
      total: number
      lastPage: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
    baseUrl: string
    pageParam?: string
    queryParams?: Record<string, unknown>
    class?: string
  }

  const { pagination, baseUrl, pageParam = 'page', queryParams = {}, class: className = '' }: Props = $props()

  const from = $derived(pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1)
  const to = $derived(Math.min(pagination.page * pagination.perPage, pagination.total))
</script>

{#if pagination.lastPage > 1}
  <div class={`flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
    <span class="text-sm text-muted-foreground">{from}-{to} / {pagination.total}</span>
    <div class="flex items-center gap-3">
      <span class="text-sm text-muted-foreground">{pagination.page} / {pagination.lastPage}</span>
      <Pagination
        baseUrl={baseUrl}
        currentPage={pagination.page}
        totalPages={pagination.lastPage}
        queryParams={queryParams}
        pageParam={pageParam}
        class="justify-end"
      />
    </div>
  </div>
{/if}
```

- [ ] **Step 4: Migrate page surfaces**

Replace page-local pagination blocks with:

```svelte
<UnifiedOffsetPagination
  pagination={pagination}
  baseUrl="/admin/organizations"
  queryParams={{ search: filters.search ?? undefined }}
/>
```

Repeat for every offset page in scope.

- [ ] **Step 5: Remove or wrap old custom offset pagers**

For each custom pager helper, either delete it or reduce it to:

```svelte
<UnifiedOffsetPagination
  pagination={pagination}
  baseUrl={baseUrl}
  pageParam={pageParam}
  queryParams={queryParams}
/>
```

- [ ] **Step 6: Run tests to verify it passes**

Run:

```bash
pnpm exec vitest run inertia/tests/unified_offset_pagination.spec.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add inertia/components/ui/unified_offset_pagination.svelte inertia/components/ui/pagination.svelte inertia/pages/admin/organizations/index.svelte inertia/pages/admin/packages/index.svelte inertia/pages/admin/users/index.svelte inertia/pages/org/invitations/index.svelte inertia/pages/org/members/index.svelte inertia/pages/org/projects/index.svelte inertia/pages/organizations/all.svelte inertia/pages/projects/index.svelte inertia/pages/org/talents/index.svelte inertia/pages/tasks/applications.svelte inertia/pages/applications/my-applications.svelte inertia/components/organization_pagination_controls.svelte inertia/tests/unified_offset_pagination.spec.ts
git commit -m "feat: unify offset pagination ui"
```

### Task 5: Replace Cursor Pager Variants with UnifiedCursorPagination

**Files:**
- Create: `inertia/components/ui/unified_cursor_pagination.svelte`
- Modify: `inertia/components/ui/cursor_pagination.svelte`
- Modify: `inertia/pages/admin/audit_logs/components/pagination_controls.svelte`
- Modify: `inertia/pages/admin/disputes/index.svelte`
- Modify: `inertia/pages/org/disputes/index.svelte`
- Modify: `inertia/pages/notifications/components/notification_pagination.svelte`
- Modify: `inertia/pages/reviews/components/simple_pagination.svelte`
- Test: `inertia/tests/unified_cursor_pagination.spec.ts`

**Interfaces:**
- Consumes: `CanonicalPagePagination` with `mode: 'cursor'`
- Produces: consistent cursor navigation UI for all queue-like surfaces

- [ ] **Step 1: Write failing component tests**

Create `inertia/tests/unified_cursor_pagination.spec.ts`:

```ts
import { render, screen } from '@testing-library/svelte'
import UnifiedCursorPagination from '@/components/ui/unified_cursor_pagination.svelte'

test('renders cursor controls without page-number fiction', () => {
  render(UnifiedCursorPagination, {
    pagination: {
      mode: 'cursor',
      page: 2,
      perPage: 5,
      total: 20,
      lastPage: 4,
      hasNextPage: true,
      hasPreviousPage: true,
      cursor: {
        nextCursor: 'next',
        previousCursor: 'prev',
      },
    },
  })

  screen.getByText('Mới hơn')
  screen.getByText('Cũ hơn')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run inertia/tests/unified_cursor_pagination.spec.ts
```

Expected: FAIL because unified component does not exist yet.

- [ ] **Step 3: Implement unified component**

Create `inertia/components/ui/unified_cursor_pagination.svelte` as a canonical wrapper over the low-level cursor control:

```svelte
<script lang="ts">
  import CursorPagination from '@/components/ui/cursor_pagination.svelte'

  interface Props {
    pagination: {
      mode: 'cursor'
      page: number
      perPage: number
      total: number
      lastPage: number
      hasNextPage: boolean
      hasPreviousPage: boolean
      cursor: {
        nextCursor: string | null
        previousCursor: string | null
      }
    }
    newerHref?: string | null
    newestHref?: string | null
    olderHref?: string | null
    onLoadNewer?: () => void
    onLoadNewest?: () => void
    onLoadOlder?: () => void
    summary?: string
  }

  const { pagination, newerHref, newestHref, olderHref, onLoadNewer, onLoadNewest, onLoadOlder, summary }: Props = $props()
</script>

<CursorPagination
  hasPreviousPage={pagination.hasPreviousPage}
  hasNextPage={pagination.hasNextPage}
  newerHref={newerHref}
  newestHref={newestHref}
  olderHref={olderHref}
  onLoadNewer={onLoadNewer}
  onLoadNewest={onLoadNewest}
  onLoadOlder={onLoadOlder}
  showNewestShortcut={pagination.hasPreviousPage}
  summary={summary ?? `Cửa sổ ${pagination.perPage} mục / ${pagination.total}`}
/>
```

- [ ] **Step 4: Migrate cursor surfaces**

Replace page-local cursor markup with:

```svelte
<UnifiedCursorPagination
  pagination={pagination}
  newerHref={...}
  newestHref={...}
  olderHref={...}
/>
```

and convert review `SimplePagination` to delegate rather than remain a separate system.

- [ ] **Step 5: Run tests to verify it passes**

Run:

```bash
pnpm exec vitest run inertia/tests/unified_cursor_pagination.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add inertia/components/ui/unified_cursor_pagination.svelte inertia/components/ui/cursor_pagination.svelte inertia/pages/admin/audit_logs/components/pagination_controls.svelte inertia/pages/admin/disputes/index.svelte inertia/pages/org/disputes/index.svelte inertia/pages/notifications/components/notification_pagination.svelte inertia/pages/reviews/components/simple_pagination.svelte inertia/tests/unified_cursor_pagination.spec.ts
git commit -m "feat: unify cursor pagination ui"
```

### Task 6: Canonicalize Legacy Review, Marketplace, Task, and Application Page Contracts

**Files:**
- Modify: `inertia/pages/reviews/types.svelte.ts`
- Modify: `inertia/pages/marketplace/types.svelte.ts`
- Modify: `inertia/pages/reviews/*.svelte`
- Modify: `inertia/pages/marketplace/tasks.svelte`
- Modify: `inertia/pages/org/talents/index.svelte`
- Modify: `inertia/pages/tasks/applications.svelte`
- Modify: `inertia/pages/applications/my-applications.svelte`
- Test: `inertia/tests/page_pagination_contracts.spec.ts`

**Interfaces:**
- Consumes: canonical page-prop pagination
- Produces: all Svelte pages read `pagination` in one canonical shape

- [ ] **Step 1: Write failing page contract tests**

Create tests asserting pages no longer depend on snake_case fields:

```ts
expect(pageProps.pagination).toEqual(
  expect.objectContaining({
    mode: expect.any(String),
    page: expect.any(Number),
    perPage: expect.any(Number),
    total: expect.any(Number),
    lastPage: expect.any(Number),
  })
)
```

and explicit negative checks in fixtures:

```ts
expect('per_page' in pageProps.pagination).toBe(false)
expect('current_page' in pageProps.pagination).toBe(false)
expect('last_page' in pageProps.pagination).toBe(false)
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run inertia/tests/page_pagination_contracts.spec.ts
```

Expected: FAIL because legacy types and pages still read snake_case props.

- [ ] **Step 3: Migrate page types and page code**

Change page contracts from:

```ts
interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}
```

to:

```ts
interface PaginationMeta {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  cursor?: {
    nextCursor: string | null
    previousCursor: string | null
  }
}
```

and replace page reads like:

```ts
meta.current_page
meta.per_page
meta.last_page
```

with:

```ts
pagination.page
pagination.perPage
pagination.lastPage
```

- [ ] **Step 4: Re-run tests**

Run:

```bash
pnpm exec vitest run inertia/tests/page_pagination_contracts.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add inertia/pages/reviews/types.svelte.ts inertia/pages/marketplace/types.svelte.ts inertia/pages/reviews/ inertia/pages/marketplace/ inertia/pages/tasks/applications.svelte inertia/pages/applications/my-applications.svelte inertia/tests/page_pagination_contracts.spec.ts
git commit -m "feat: canonicalize page pagination contracts"
```

### Task 7: Add Missing Pagination to Visible Multi-Page Embedded Lists

**Files:**
- Modify: every surface marked `missing` in `docs/evidence/2026-07-09-pagination-surface-audit.md`
- Test: `docs/evidence/2026-07-09-pagination-surface-audit.md`
- Test: relevant UI tests for touched surfaces

**Interfaces:**
- Consumes: inventory from Task 1
- Produces: no `missing` production surfaces in final audit

- [ ] **Step 1: Write the failing completion condition**

In `docs/evidence/2026-07-09-pagination-surface-audit.md`, mark all current missing surfaces explicitly:

```md
## Missing Surfaces

- `inertia/pages/<surface>.svelte`
  - Status: `missing`
```

- [ ] **Step 2: Implement pagination for each missing surface**

For each missing surface:

- add canonical pagination prop at mapper/controller boundary
- add `UnifiedOffsetPagination` or `UnifiedCursorPagination` in the Svelte surface
- preserve filters/query params

Use this insertion shape:

```svelte
<UnifiedOffsetPagination
  pagination={pagination}
  baseUrl={window.location.pathname}
  queryParams={buildQueryParams() }
/>
```

- [ ] **Step 3: Update the audit status**

Replace each:

```md
Status: `missing`
```

with:

```md
Status: `canonicalized`
```

only after code and UI are wired.

- [ ] **Step 4: Verify no missing surface remains**

Run:

```bash
grep -n "Status: `missing`" docs/evidence/2026-07-09-pagination-surface-audit.md
```

Expected: no matches

- [ ] **Step 5: Commit**

```bash
git add docs/evidence/2026-07-09-pagination-surface-audit.md inertia/pages/ inertia/components/
git commit -m "feat: add missing pagination surfaces"
```

### Task 8: Fix Auth Boundary Coupling and Related Blocking Architecture Violations

**Files:**
- Create: `app/modules/auth/application/ports/session_user_reader.ts`
- Create: `app/modules/auth/infra/adapters/lucid_session_user_reader.ts`
- Modify: `app/modules/auth/middleware/auth_middleware.ts`
- Modify: `app/modules/users/public_contracts/user_model.ts` or equivalent seam file if needed
- Test: `app/modules/auth/tests/backend/unit/auth_middleware.spec.ts`

**Interfaces:**
- Consumes: auth middleware fallback needs user lookup by session id
- Produces:
  - `SessionUserReader.findById(userId: string): Promise<... | null>`
  - auth middleware depends on port/adapter, not users infra model

- [ ] **Step 1: Write the failing architecture check**

Run:

```bash
npm run check:arch:backend:module-domain-boundary
```

Expected: FAIL at `app/modules/auth/middleware/auth_middleware.ts -> imports #modules/users/infra/models/user`

- [ ] **Step 2: Write the reader port and failing middleware test**

Create a test seam like:

```ts
const sessionUserReader = {
  findById: async (userId: string) =>
    userId === 'user-1'
      ? {
          id: 'user-1',
          load: async () => {},
        }
      : null,
}
```

Assert middleware session fallback authenticates through injected reader without importing User model.

- [ ] **Step 3: Implement the port and adapter**

Create:

```ts
export interface SessionUserReader {
  findById(userId: string): Promise<UserLike | null>
}
```

and adapter that encapsulates Lucid lookup.

Inject into middleware constructor:

```ts
constructor(private readonly sessionUserReader: SessionUserReader = new LucidSessionUserReader()) {}
```

Replace:

```ts
const user = await User.query().where('id', sessionUserId).first()
```

with:

```ts
const user = await this.sessionUserReader.findById(sessionUserId)
```

- [ ] **Step 4: Re-run architecture and unit tests**

Run:

```bash
npm run check:arch:backend:module-domain-boundary
npm run test:unit -- --files app/modules/auth/tests/backend/unit/auth_middleware.spec.ts
```

Expected:

- architecture check PASS
- middleware unit test PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/auth/application/ports/session_user_reader.ts app/modules/auth/infra/adapters/lucid_session_user_reader.ts app/modules/auth/middleware/auth_middleware.ts app/modules/auth/tests/backend/unit/auth_middleware.spec.ts app/modules/users/public_contracts/
git commit -m "refactor: remove auth dependency on users infra"
```

### Task 9: Run Verification Gates and Repair Remaining Pagination-Scope Regressions

**Files:**
- Modify: touched files from earlier tasks
- Modify: `docs/evidence/2026-07-09-pagination-surface-audit.md`

**Interfaces:**
- Consumes: all rollout changes
- Produces: verified green checks for pagination standardization scope

- [ ] **Step 1: Run type and frontend architecture checks**

Run:

```bash
npm run typecheck
npm run check:arch:frontend
```

Expected: both PASS

- [ ] **Step 2: Run backend architecture and API checks**

Run:

```bash
npm run check:arch:backend:module-domain-boundary
npm run check:arch:backend:public-contract-surface
npm run check:api
```

Expected: all PASS

- [ ] **Step 3: Run frontend and targeted backend lint**

Run:

```bash
pnpm run lint:frontend
pnpm run lint:backend:app -- --no-cache app/modules/pagination app/modules/http app/modules/admin app/modules/reviews app/modules/auth
pnpm run lint:backend:rest -- --no-cache start
```

Expected: PASS for touched rollout scope

- [ ] **Step 4: Run targeted tests**

Run:

```bash
pnpm exec vitest run inertia/tests/unified_offset_pagination.spec.ts inertia/tests/unified_cursor_pagination.spec.ts inertia/tests/page_pagination_contracts.spec.ts
node --import=@poppinss/ts-exec bin/test.ts --files app/modules/pagination/tests/backend/unit/pagination_boundary.spec.ts
node --import=@poppinss/ts-exec bin/test.ts --files app/modules/auth/tests/backend/unit/auth_middleware.spec.ts
```

Expected: PASS

- [ ] **Step 5: Repair any failing pagination-scope regression**

If any command fails, patch only the files inside rollout scope and rerun the exact failing command before proceeding.

- [ ] **Step 6: Commit**

```bash
git add app/ inertia/ start/ docs/evidence/2026-07-09-pagination-surface-audit.md
git commit -m "test: verify pagination unification rollout"
```

### Task 10: Final Completion Audit

**Files:**
- Modify: `docs/evidence/2026-07-09-pagination-surface-audit.md`
- Modify: `README.md` if repo guidance needs pagination-standard note

**Interfaces:**
- Consumes: final code state and verification outputs
- Produces: authoritative audit proving rollout completion

- [ ] **Step 1: Record final verification evidence**

Append to `docs/evidence/2026-07-09-pagination-surface-audit.md`:

```md
## Verification Evidence

- `pnpm run typecheck`: PASS
- `pnpm run check:arch:frontend`: PASS
- `pnpm run check:arch:backend:module-domain-boundary`: PASS
- `pnpm run check:arch:backend:public-contract-surface`: PASS
- `pnpm run check:api`: PASS
- targeted lint: PASS
- pagination unit/ui tests: PASS
```

- [ ] **Step 2: Prove completion against the inventory**

Add:

```md
## Completion Summary

- Total surfaces audited: <number>
- Canonicalized: <number>
- Intentionally single-page: <number>
- Missing: 0
- Non-canonical: 0
```

- [ ] **Step 3: Verify no incomplete statuses remain**

Run:

```bash
grep -n "Status: `missing`|Status: `non_canonical`|unknown" docs/evidence/2026-07-09-pagination-surface-audit.md
```

Expected: no matches

- [ ] **Step 4: Update README guidance if needed**

If `README.md` currently lacks the new pagination standard, add a short section like:

```md
## Pagination Standard

- All visible multi-page lists must use canonical pagination contracts.
- Frontend uses only shared offset/cursor pagination components.
- Module-specific pagination dialects must not cross backend or frontend boundaries.
```

- [ ] **Step 5: Final commit**

```bash
git add docs/evidence/2026-07-09-pagination-surface-audit.md README.md
git commit -m "docs: record pagination unification completion"
```

## Self-Review

### Spec coverage

Covered:

- canonical backend boundary contracts
- two shared frontend pagination component families
- migration of all paginated top-level, nested, and embedded surfaces
- explicit missing-pagination remediation
- auth seam decoupling
- final verification and inventory audit

No spec section is left without a corresponding task.

### Placeholder scan

Plan uses exact file paths, exact commands, concrete code blocks, explicit expected outcomes, and explicit completion conditions. No `TODO`, `TBD`, or “similar to Task N” placeholders remain.

### Type consistency

Canonical names are consistent throughout plan:

- `mode`
- `page`
- `perPage`
- `total`
- `lastPage`
- `hasNextPage`
- `hasPreviousPage`
- `cursor.nextCursor`
- `cursor.previousCursor`
- `nextCursor`
- `previousCursor`

Execution order ensures boundary helpers land before page and component migration.
