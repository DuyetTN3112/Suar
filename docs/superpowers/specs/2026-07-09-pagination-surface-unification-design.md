# Pagination Surface Unification Design

Date: 2026-07-09

Current-state update 2026-07-17: this design predates the frontend multi-app split. Current pagination source lives in app-local copies under `inertia/apps/{user,org,admin}/shared/{lib,ui}`. Old `inertia/components/*`, `inertia/lib/*`, and `inertia/pages/*` references below are rollout history unless explicitly updated.

## Goal

Unify every pagination surface in Suar so backend contracts, Inertia page props, and frontend controls all follow one industrial-grade standard with low coupling between modules.

This design covers:

- canonical pagination contracts for backend boundaries
- frontend pagination component standardization
- migration of all existing paginated pages, nested lists, and embedded lists
- addition of missing pagination where list size and UX require it
- reduction of cross-module coupling exposed by the current pagination and auth seams

This design does not rewrite every internal query implementation. Internal query/repository shapes may remain transitional during rollout as long as boundary contracts become canonical and consistent.

## Current Problems

Repo audit shows pagination is more mature than before, but still fragmented.

### Backend contract drift

Current boundary shapes leak multiple dialects:

- offset page props with `currentPage/perPage/lastPage`
- offset page props with `page/limit/totalPages`
- legacy review and marketplace shapes with `per_page/current_page/last_page`
- cursor metadata exposed differently across modules

This means pages and API consumers still need module-specific knowledge, which violates the goal of low coupling.

### Frontend control drift

Current frontend uses multiple pagination patterns:

- app-local numeric pager primitives in `inertia/apps/{user,org,admin}/shared/ui/pagination.svelte`
- app-local cursor pager primitives in `inertia/apps/{user,org,admin}/shared/ui/cursor_pagination.svelte`
- app-local unified controls in `inertia/apps/{user,org,admin}/shared/ui/unified_offset_pagination.svelte`
- app-local unified controls in `inertia/apps/{user,org,admin}/shared/ui/unified_cursor_pagination.svelte`
- review-specific `simple_pagination.svelte`
- organization-specific `organization_pagination_controls.svelte`
- task and application pages with inline previous/next buttons
- pages with pagination data but inconsistent summaries and placement

Result:

- same user action looks different across modules
- accessibility and query-param preservation logic are duplicated
- some surfaces with long lists still do not expose consistent pagination controls

### Architecture drift

Historical backend quality checks also showed seam violations around auth/user coupling. Current 2026-07-17 code no longer has the cited `auth_middleware.ts -> #modules/users/infra/models/user` runtime import; boundary checks now live in:

- `scripts/check_backend_side_effect_boundary.mjs`
- `scripts/check_module_domain_boundary.mjs`
- `scripts/check_public_contract_surface.mjs`

This design remains useful as rollout intent, but current-state evidence should come from `docs/12-evidence/pagination-surface-audit.md`.

## Design Principles

### 1. Boundary-first convergence

Internal modules may keep temporary local pagination DTOs during migration, but every boundary must converge first:

- public API JSON
- admin API JSON
- Inertia page props
- frontend component props

No page or API consumer should need to know whether a source module internally used `limit`, `per_page`, or `currentPage`.

### 2. Two pagination modes only

Suar will support only two canonical pagination modes:

- `offset`
- `cursor`

Every paginated surface must explicitly belong to one of these modes.

No hybrid mode is allowed.

### 3. Shared controls, no bespoke pagers

Frontend must converge on one component family:

- `UnifiedOffsetPagination`
- `UnifiedCursorPagination`

Legacy per-feature pagination components must either become thin wrappers around these or be removed.

### 4. Presenters own contract mapping

Queries and repositories produce pagination facts.

Presenters/mappers own:

- contract naming
- casing
- mode discrimination
- cursor field exposure
- compatibility adaptation during migration

This keeps modules decoupled from transport and UI.

### 5. Missing pagination is a defect

Any list that spans more than one real result page and is visible to users must expose standardized pagination controls unless the surface deliberately uses virtualization or infinite scroll. No such exception is assumed in current rollout.

## Canonical Backend Contracts

## Inertia Page Props Contract

All paginated Inertia pages must receive:

```ts
interface CanonicalPagination {
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

Rules:

- `page`, `perPage`, `total`, `lastPage`, `hasNextPage`, `hasPreviousPage` always exist
- `cursor` exists only when `mode === 'cursor'`
- snake_case fields must not leak into Svelte page props
- `limit` and `totalPages` must not leak into Svelte page props

Reason:

- pages can use one shared rendering contract
- wrappers and adapters become trivial
- tests can assert one stable shape for all page families

## Public/Admin JSON Contract

All paginated JSON responses must expose:

```ts
interface CanonicalApiPagination {
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
```

Rules:

- external casing is always camelCase
- `nextCursor` and `previousCursor` are `null` for offset mode
- no `per_page/current_page/last_page` in canonical API payloads
- no module-specific pagination envelopes

Reason:

- public and admin APIs stay consistent
- frontend hooks and tests can share one parser
- future NestJS migration keeps one stable transport DTO

## Internal Query/Repository Policy

Allowed during migration:

- repositories return local shapes
- legacy review or marketplace queries keep local pagination DTOs temporarily

Required:

- each controller/page-query must map local shape into canonical boundary shape before returning
- new code must not introduce additional pagination dialects

## Canonical Frontend Components

## UnifiedOffsetPagination

Responsibility:

- render all page-number pagination surfaces
- preserve query params
- expose consistent summary text and button layout
- support use in page body, tab panes, modal lists, and embedded panels

Required behavior:

- show summary `x-y / total`
- show current page `page / lastPage`
- support `first`, `previous`, `next`, `last`
- support disabled states
- support accessible labels
- support custom page param names only through config, not custom markup

Usage targets:

- admin organizations
- admin packages
- admin users
- organization invitations
- organization members
- organization projects
- organizations listing surfaces
- projects list
- marketplace offset lists
- user/admin modal or embedded lists with multiple pages

## UnifiedCursorPagination

Responsibility:

- render queue/feed/timeline traversal surfaces
- support older/newer/newest semantics
- never pretend cursor windows are page numbers

Required behavior:

- show window summary using canonical pagination props
- show `Mới hơn`
- show `Mới nhất` when applicable
- show `Cũ hơn`
- preserve active query params and filters
- support href-driven or callback-driven navigation

Usage targets:

- admin audit logs
- notifications
- admin disputes
- org disputes
- flagged review queues
- reverse review cursor surfaces

## Removal and Replacement Rules

The following kinds of components must not remain as independent pagination systems after rollout:

- review-specific pagination components
- organization-specific pagination components
- task/application inline pager markup
- page-local previous/next button groups that duplicate shared behavior

They may temporarily survive only as thin wrappers that delegate to canonical components with canonical props.

## Surface Inventory Policy

Every paginated surface must be classified into one of these buckets:

- top-level page list
- tab-contained list
- modal/embedded list
- queue/timeline cursor list

For each bucket:

- if total results fit one page, control stays hidden
- if more than one page exists, canonical control is required

No exceptions for “secondary” or “nested” surfaces.

## Missing Pagination Policy

During rollout, audit all visible lists and mark each as:

- already paginated and canonicalized
- paginated but non-canonical
- missing pagination
- intentionally single-page because dataset is capped by product design

A visible multi-page list left in “missing pagination” status blocks completion.

## Coupling Reduction Design

## Presenter-first normalization

Create or extend shared pagination mappers so module code can call one normalization seam rather than constructing ad hoc props.

Expected layering:

- repositories/queries: local pagination facts
- module response mapper/page mapper: convert to canonical pagination
- frontend page/component: consume canonical pagination only

This minimizes coupling because UI no longer depends on module-specific pagination DTO naming.

## Auth seam fix

Replace direct import of `#modules/users/infra/models/user` inside auth middleware with a local port/public contract seam owned by auth or users.

Target rule:

- auth depends on an intentional reader seam
- auth does not depend on users infra/model internals

This change is required in the same rollout because the objective explicitly includes low inter-module coupling as part of industrial consistency.

## Search boundary consistency

Search module remains the shared search engine boundary.

This rollout does not redesign search relevance or indexing. It does require that paginated search consumers expose canonical pagination contracts at the boundary.

If a search-driven list uses offset mode:

- page props and API response must still use canonical offset contract

If a search-driven list later moves to cursor mode:

- migration must still preserve canonical contract naming

## Rollout Scope

## Included

- shared canonical pagination types and mapper helpers
- backend presenter/mapper migration for all paginated Inertia pages
- backend presenter/mapper migration for paginated JSON responses in scope
- frontend migration to canonical pagination components
- removal or wrapping of bespoke pagination components
- audit and implementation of missing pagination for visible lists
- auth seam fix for cross-module internal import
- verification updates for typecheck, lint, architecture, and API checks

## Not Included

- rewriting every repository/query to identical internal code
- replacing cursor pagination with offset or vice versa where current mode is architecturally correct
- redesigning unrelated visual systems outside pagination controls
- solving every unrelated lint issue in repo if not blocking pagination rollout or seam checks

## Acceptance Criteria

Completion requires all of the following to be true:

### Backend

- every paginated Inertia page prop uses canonical pagination contract
- every canonical paginated JSON response uses canonical pagination contract
- no snake_case pagination fields leak to Svelte pages
- no `page/limit/totalPages` or other legacy pagination props leak to Svelte pages
- `app/modules/auth/middleware/auth_middleware.ts` no longer imports users infra/model internals
- no new module cross-import seam is introduced

### Frontend

- all page-number lists use shared offset pagination component or a thin wrapper over it
- all cursor lists use shared cursor pagination component or a thin wrapper over it
- no inline previous/next pagination markup remains for production surfaces
- no long visible list remains without pagination controls
- pagination summaries, disabled states, and query preservation are visually and behaviorally consistent

### Verification

- `pnpm run typecheck` passes
- frontend lint passes
- relevant backend lint passes for files touched by rollout
- `pnpm run check:arch:frontend` passes
- `pnpm run check:arch:backend:module-domain-boundary` passes
- `pnpm run check:arch:backend:public-contract-surface` passes
- `pnpm run check:api` passes
- final audit documents every paginated surface and its canonicalized status

## Risks

### 1. Dirty worktree interference

Repo currently contains broad unrelated changes. Rollout must avoid reverting unrelated work and should scope edits carefully.

### 2. Hidden embedded lists

Some nested or modal lists may not be obvious from grep alone. Implementation must inspect all known list-bearing pages and supporting child components, not only top-level routes.

### 3. Contract breakage during migration

Changing page props from legacy dialects to canonical props can break pages if frontend migration is incomplete. Rollout must migrate mappers and pages together.

### 4. Over-normalizing internal layers too early

Forcing every query/repository to share one internal DTO in same wave would add risk without improving boundary quality enough. Boundary-first convergence is preferred.

## Recommended Implementation Order

1. Introduce canonical pagination types and shared mapper helpers
2. Migrate shared frontend pagination components
3. Migrate highest-reuse page families and wrapper components
4. Migrate remaining page surfaces and embedded lists
5. Add missing pagination where absent
6. Fix auth seam and other blocking coupling issues
7. Run full verification and produce final surface audit

## Success Definition

Suar is considered standardized for this rollout when a reviewer can inspect any paginated surface, backend or frontend, and see the same pagination language, the same control family, and no module-specific pagination dialect leaking across boundaries.
