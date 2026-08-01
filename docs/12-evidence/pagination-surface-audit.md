# Pagination Surface Audit

> Historical pagination snapshot. A listed route that has since been retired is not authorization
> to restore that page; current board/realm routes are defined by
> `frontend-ui-audit-2026-07-26.md` and current route guards.

| Field | Value |
|---|---|
| Status | Historical snapshot; current only for still-registered surfaces |
| Last reviewed | 2026-07-17 |
| Source of truth | Current code, targeted tests, E2E screenshots |
| Scope | Backend pagination module, Inertia pagination controls, visible multi-page list surfaces |

## Completion Rule

Every visible multi-page list must be one of:

- `canonicalized`: uses shared pagination public API/backend mapper and shared Inertia pagination control.
- `intentionally_capped`: product flow deliberately returns a bounded top-N result set and shows that state.
- `intentionally_local`: embedded detail list paginates local in-memory data through shared frontend helpers.
- `intentionally_single_page`: bounded configuration/detail/preview list where pagination would add noise.

No production pagination surface may remain `unknown`, `missing`, or `non_canonical`.

## Backend Contract

Status: `canonicalized`

Canonical module:

- `app/modules/pagination/public_contracts/pagination_public_api.ts`
- `app/modules/pagination/public_contracts/pagination.ts`
- `app/modules/pagination/public_contracts/pagination_boundary.ts`

Current rule:

- Other modules import pagination through `pagination_public_api`.
- Boundary helpers clamp invalid page values to safe canonical values.
- Legacy snake-case API metadata is normalized before crossing page/API boundaries.

Architecture guard:

- `app/modules/pagination/tests/backend/unit/pagination_architecture.spec.ts`

## Frontend Contract

Status: `canonicalized`

Canonical helpers/components:

- `inertia/apps/{user,org,admin}/shared/lib/pagination.ts`
- `inertia/apps/{user,org,admin}/shared/ui/unified_offset_pagination.svelte`
- `inertia/apps/{user,org,admin}/shared/ui/unified_cursor_pagination.svelte`
- low-level primitives remain beside the unified controls as `pagination.svelte` and `cursor_pagination.svelte` in each app shared UI folder

Current rule:

- Offset pagination UI uses `UnifiedOffsetPagination`.
- Cursor pagination UI uses `UnifiedCursorPagination`.
- Domain wrappers may remain only when they delegate to unified components.
- Low-level primitive imports are limited to app-local unified components.

Architecture guard:

- `app/modules/pagination/tests/backend/unit/pagination_architecture.spec.ts`

## Audited Paginated Surfaces

| Surface group | Mode | Status | Notes |
|---|---:|---|---|
| Admin audit logs | cursor | `canonicalized` | `UnifiedCursorPagination` via audit log page/component |
| Admin disputes | cursor/offset embedded | `canonicalized` | Queue uses cursor; detail tabs use offset helpers |
| Admin organizations | offset | `canonicalized` | Shared offset control |
| Admin packages/subscriptions | offset | `canonicalized` | Shared offset control |
| Admin users | offset | `canonicalized` | Shared offset control |
| Admin/review flagged queues | offset wrapper | `canonicalized` | `SimplePagination` delegates to unified controls |
| Marketplace tasks | offset | `canonicalized` | Shared offset control with filters preserved |
| My applications / task applications | offset | `canonicalized` | Shared offset control |
| Organization bookmarks | offset | `canonicalized` | Shared offset control |
| Organization disputes | offset wrapper | `canonicalized` | `SimplePagination` delegates to unified controls |
| Organization invitations / requests | offset | `canonicalized` | Shared offset control |
| Organization members | offset | `canonicalized` | Shared offset control |
| Organization projects | offset | `canonicalized` | Shared offset control |
| Organization talents | offset | `canonicalized` | Shared offset control |
| Organizations all/index/show | offset wrapper | `canonicalized` | Organization wrapper delegates to unified controls |
| Profile invitations | offset | `canonicalized` | Shared offset control |
| Profile work history embedded lists | local offset | `intentionally_local` | Uses shared frontend pagination helpers and unified offset UI |
| Projects index | offset | `canonicalized` | Shared offset control |
| Project sprint panel | offset embedded | `canonicalized` | Shared offset control |
| Review evidence/comments/dispute detail tabs | local offset | `intentionally_local` | Uses shared frontend pagination helpers and unified offset UI |
| Review pending/my/user/reverse lists | offset wrapper | `canonicalized` | `SimplePagination` delegates to unified controls |
| Sprint review package lists | offset | `canonicalized` | Shared offset control |
| Task list/status board | offset | `canonicalized` | Shared offset control |
| Task discussion/files detail tabs | local offset | `intentionally_local` | Uses shared frontend pagination helpers and unified offset UI |
| Users list/add modal/pending approval | offset/local offset | `canonicalized` | Shared offset control and shared helper calculations |
| Notifications | cursor | `canonicalized` | Shared cursor control |

## Intentionally No Pagination

| Surface | Status | Reason |
|---|---|---|
| Search Center | `intentionally_capped` | Backend fanout caps each source and ranked center result count. UI shows "Top results shown" with `resultLimit` and `candidateResultCount`; users refine by domain/field instead of paging ranked candidates. |
| Detail metadata panels | `intentionally_single_page` | Small bounded state snapshots, badges, roles, permissions, or metrics. |
| Kanban/status columns | `intentionally_single_page` | Board layout is task workflow navigation, not page-by-page browsing. |
| Form option lists and filter menus | `intentionally_single_page` | Interactive controls, not result collections. |
| Dashboard cards/charts | `intentionally_single_page` | Summary visualizations; pagination would not match purpose. |

## Screenshot Evidence

Authenticated E2E screenshot audit ran against representative pagination-heavy routes via
`inertia/apps/org/tests/e2e/meta/pagination_surface_screenshot_audit.spec.ts`:

- `/marketplace/tasks`
- `/applications/my-applications`
- `/org/talents`
- `/org/bookmarks`
- `/reviews/reverse-reviews`
- `/org/tasks/list`

Captured files:

- `test-results/pagination-surface-marketplace-tasks.png`
- `test-results/pagination-surface-my-applications.png`
- `test-results/pagination-surface-org-talents.png`
- `test-results/pagination-surface-org-bookmarks.png`
- `test-results/pagination-surface-reviews-reverse-reviews.png`
- `test-results/pagination-surface-org-tasks-list.png`

Observed result:

- no server error page
- no broken disabled pagination controls
- one-page datasets hide navigation controls while retaining useful range summary
- empty application list intentionally hides pagination entirely
- empty task/talent/bookmark/review lists show `0-0 / 0` summary and hide page navigation controls

## Verification Evidence

Passed checks:

- `pnpm run typecheck`
- `pnpm run test:unit -- --files app/modules/pagination/tests/backend/unit/pagination.spec.ts`
- `pnpm run test:unit -- --files app/modules/pagination/tests/backend/unit/pagination_architecture.spec.ts`
- `pnpm run test:ui:runnable`
- `pnpm exec playwright test inertia/apps/org/tests/e2e/meta/pagination_surface_screenshot_audit.spec.ts --project=chromium`
- `pnpm exec playwright test inertia/apps/org/tests/e2e/meta/cross_surface_smoke.spec.ts --project=chromium`

Targeted backend consumers also passed for tasks, reviews, and user mapper pagination normalization.

## Completion Summary

| Metric | Count |
|---|---:|
| Files matching pagination signals under `inertia/apps` and `app/modules` | 397 |
| App-local canonical pagination helper/control files | 15 |
| Missing production pagination surfaces | 0 |
| Non-canonical primitive imports outside unified controls | 0 |
| Search result pagination gaps | 0 |

Current conclusion:

Pagination now has its own backend public contract module and frontend UI/helpers. Modules that need pagination call the shared contract; specialized surfaces can still wrap or localize behavior, but wrappers must delegate to unified pagination.
