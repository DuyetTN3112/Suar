# Pagination Core Design

Date: 2026-07-05

## Goal

Standardize pagination behavior across Suar with a shared pagination core module in `app/modules/pagination`.

The core must:

- remove repeated `DEFAULT_PAGE / DEFAULT_PER_PAGE / MAX_PER_PAGE` copies
- centralize page/per-page normalization
- centralize last-page calculation
- preserve each module's existing public constant names during rollout
- define when Suar must use offset pagination versus cursor/keyset pagination
- define DB index patterns required for production-safe pagination

## Industrial Decision Matrix

### Use cursor/keyset pagination when

- list is ordered by time or monotonic identity
- new rows can appear while user is paging
- queue/feed/stream behavior matters more than jump-to-page
- large offsets would cause performance drift
- duplicate / skipped rows between windows are unacceptable

Examples in Suar:

- admin audit logs
- notifications
- review disputes
- flagged reviews
- reverse reviews

### Keep offset pagination when

- users need stable jump-to-page semantics
- dataset is more catalog/report/list than feed
- filters/search materially reshape the result set and random access still matters
- ordering is not naturally keyset-friendly

Examples in Suar:

- users
- organizations
- projects
- org members / invitations
- package/admin catalog pages

### Anti-patterns to avoid

- hybrid first-page offset then next-page cursor
- cursor built from unstable sort keys
- cursor pagination without matching composite index
- offset pagination on append-heavy timelines
- frontend pretending cursor data is page-number data

## Canonical Cursor Contract

For cursor pages, API shape should include:

- `next_cursor`
- `previous_cursor`
- `has_next_page`
- `has_previous_page`

Frontend query params:

- `after`: move to older window
- `before`: move to newer window

Canonical sort:

- `ORDER BY <timestamp> DESC, id DESC`

Window rules:

- newest window: no `previous_cursor`
- older traversal: `after=<next_cursor>`
- newer traversal: `before=<previous_cursor>`
- when serving `before`, query ascending internally, then reverse rows for UI

## Database Rules

Cursor pagination must ship with a matching composite index that follows the sort and leading filters.

Recommended patterns:

- global timeline:
  - `(<timestamp> DESC, id DESC)`
- filtered timeline:
  - `(<filter_column>, <timestamp> DESC, id DESC)`
- tenant-scoped timeline:
  - `(<tenant_or_user_id>, <timestamp> DESC, id DESC)`

Applied rollout so far:

- `audit_events`
- `notifications`
- `review_disputes`
- `flagged_reviews`
- `reverse_reviews`

## Current Problems

- `admin`, `notifications`, `organizations`, `projects`, `reviews`, `tasks`, and `users` each define nearly identical pagination constants.
- Controllers and queries repeatedly implement `toNumber`, `Math.max`, `Math.min`, and `Math.ceil(total / perPage)`.
- Some modules use `limit`, some use `perPage`, some use `per_page`, which is acceptable at the boundary but should not require duplicated math in every module.

## Design

### Shared module

Add `app/modules/pagination/public_contracts/pagination.ts` with:

- `PaginationPolicy`
- `definePaginationPolicy()`
- `toPageNumber()`
- `toPerPageNumber()`
- `toLastPage()`
- `toOffset()`

### Module-level compatibility

Existing module constants stay in place:

- `ADMIN_PAGINATION`
- `NOTIFICATION_PAGINATION`
- `ORGANIZATION_PAGINATION`
- `PROJECT_PAGINATION`
- `REVIEW_PAGINATION`
- `TASK_PAGINATION`
- `USER_PAGINATION`

But each becomes a thin wrapper over `definePaginationPolicy()`.

This keeps import paths stable while centralizing the actual defaults.

### Rollout order

1. Introduce shared module
2. Repoint module constants to shared factory
3. Replace hand-written normalization in selected controllers/queries
4. Expand gradually to request mappers and remaining query classes

## Representative migrations in this wave

- notifications v1 list controller
- admin audit log query
- projects list query
- review disputes
- flagged reviews
- reverse reviews

These three cover:

- controller-side query parsing
- query-side last-page calculation
- `limit`-based pagination variant

## Risks

GitNexus impact snapshots:

- `TASK_PAGINATION`: MEDIUM, 8 direct callers
- `PROJECT_PAGINATION`: MEDIUM, 6 direct callers
- `ORGANIZATION_PAGINATION`: MEDIUM, 9 direct callers
- `ADMIN_PAGINATION`: MEDIUM, 7 direct callers

Main risk:

- silently changing per-page clamping or last-page behavior
- silently changing queue traversal semantics between older/newer windows

## Rollout Status

### Cursor-standardized

- notifications
- admin audit logs
- admin review disputes
- org review disputes
- flagged reviews
- reverse reviews

### Offset-standardized with shared frontend/backend primitives

- users
- organizations
- projects
- org members
- org invitations
- admin organizations
- admin packages

### Remaining audit focus

- verify no queue-like page still renders numeric pagination over cursor-style data
- verify every timeline query has supporting composite index for its main filters
- verify controller/API response mappers expose one consistent cursor contract across modules

## Verification

- imports remain stable for existing module constants
- normalized page/per-page values still clamp to current bounds
- last-page never drops below `1`
- cursor windows never overlap when moving older/newer
- frontend keeps active filters when traversing cursor windows
