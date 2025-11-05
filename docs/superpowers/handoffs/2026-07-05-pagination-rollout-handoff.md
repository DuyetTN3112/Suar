# Pagination Rollout Handoff

Date: 2026-07-05

## Continuation Update

This handoff is now partially stale.

The in-progress admin flagged reviews migration called out below has been verified and fixed.

Additional verified progress since this handoff:

- admin `/admin/reviews` flagged reviews cursor migration fixed and covered
- shared flagged review cursor repository now preserves legacy admin filters:
  - `search`
  - `flagType`
  - `severity`
  - `status`
- controller-side pagination parsing was standardized onto shared pagination helpers across active surfaces:
  - admin users
  - admin organizations
  - admin packages
  - admin audit logs
  - admin disputes
  - admin flagged reviews
  - org disputes page/API
  - reverse reviews page/API
  - org members / invitations / projects request mappers
  - org join requests
  - public all-organizations
  - users fallback list page

Targeted verification already run after these follow-up changes:

- admin flagged reviews integration
- admin read API standardization integration
- admin audit logs integration
- org dispute queue access integration
- review disputes API standardization integration
- reverse review collection API standardization integration
- org join requests integration
- admin/org dispute component tests
- admin users / organizations / packages / audit logs component tests
- org members / projects / invitations component tests

Cursor/index audit status now verified for primary timeline flows:

- `audit_events`
- `notifications`
- `review_disputes`
- `flagged_reviews`
- `reverse_reviews`

Confirmed migration files:

- `database/migrations/20260705203000_add_audit_log_pagination_indexes.ts`
- `database/migrations/20260705214500_add_notification_pagination_indexes.ts`
- `database/migrations/20260705194000_add_pagination_indexes_for_reviews.ts`
- `database/migrations/20260705231000_add_flagged_review_pagination_indexes.ts`

Remaining meaningful gaps before calling rollout complete:

- duplicate admin flagged review surfaces still not product-decided:
  - `/admin/flagged-reviews`
  - `/admin/reviews`
- repo-wide completion proof still needs final audit pass for any last low-signal pagination drift outside active surfaces
- completion not yet proven for every pagination-related screen in repo; current evidence is strong for highest-risk active flows only

Latest audit read on remaining drift:

- no more obvious high-signal active-surface controller mismatches were found in:
  - admin
  - org
  - reviews
  - notifications
- active queue/feed pages now appear to use cursor-aware UI correctly:
  - admin disputes
  - org disputes
  - admin audit logs
  - notifications
  - reverse reviews
  - admin flagged reviews
- remaining scan hits are mostly:
  - already-standardized `normalizePagination(...)` call sites
  - lower-level request-mapper helpers
  - modules outside the highest-risk rollout surfaces

Practical meaning:

- next session should not start with another broad rewrite pass
- next session should start with completion audit / proof checklist
- only make more code changes if that audit finds a concrete mismatch

## Goal

Continue repo-wide pagination modernization for Suar.

Target direction:

- avoid old hybrid/fragile pagination
- use industrial-grade cursor/keyset pagination for queue/feed/timeline screens
- keep offset pagination only for true catalog/report/jump-to-page use cases
- standardize frontend pagination UI and backend pagination contracts
- ensure DB indexes match pagination strategy

## Current Status

### Cursor/keyset flows already standardized

- admin audit logs
- notifications
- admin review disputes
- org review disputes
- flagged reviews (`/admin/flagged-reviews`)
- reverse reviews
- user activity repository layer

### Shared frontend pagination primitives

- `inertia/components/ui/pagination.svelte`
  - offset/page-number
- `inertia/components/ui/cursor_pagination.svelte`
  - cursor/newer/older/newest
- `inertia/pages/reviews/components/simple_pagination.svelte`
  - wrapper that switches between offset and cursor

### Shared backend pagination core

- `app/modules/pagination/public_contracts/pagination.ts`

### Spec / design docs

- `docs/superpowers/specs/2026-07-05-pagination-core-design.md`

This spec now includes:

- offset vs cursor decision matrix
- canonical cursor contract
- DB index rules
- rollout status

## Important Work Completed In This Session

### 1. Review disputes moved to bidirectional cursor pagination

Files:

- `app/modules/reviews/actions/queries/list_admin_review_disputes_query.ts`
- `app/modules/reviews/actions/queries/list_org_review_disputes_query.ts`
- `app/modules/reviews/controllers/list_admin_review_disputes_controller.ts`
- `app/modules/reviews/controllers/list_org_review_disputes_controller.ts`
- `app/modules/reviews/controllers/show_org_disputes_page_controller.ts`
- `app/modules/admin/controllers/disputes/admin_disputes_controller.ts`
- `inertia/pages/admin/disputes/index.svelte`
- `inertia/pages/org/disputes/index.svelte`

Behavior:

- supports `after` and `before`
- uses stable sort `created_at desc, id desc`
- uses asc query + reverse when serving newer window
- admin/org dispute UIs now use shared `CursorPagination`

### 2. Flagged reviews moved to bidirectional cursor pagination

Files:

- `app/modules/reviews/infra/repositories/read/flagged_review_queries.ts`
- `app/modules/reviews/actions/queries/get_flagged_reviews_query.ts`
- `app/modules/reviews/controllers/mappers/request/review_request_mapper.ts`
- `app/modules/reviews/controllers/list_flagged_reviews_controller.ts`
- `database/migrations/20260705231000_add_flagged_review_pagination_indexes.ts`

Behavior:

- supports `after` and `before`
- queue semantics align with disputes/notifications/audit

### 3. Reverse reviews moved to bidirectional cursor pagination

Files:

- `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts`
- `app/modules/reviews/controllers/list_reverse_reviews_controller.ts`
- `app/modules/reviews/controllers/show_reverse_reviews_page_controller.ts`
- `inertia/pages/reviews/components/reverse_review_list.svelte`
- `inertia/pages/reviews/reverse-reviews.svelte`
- `inertia/pages/org/reverse-reviews.svelte`
- `inertia/pages/admin/reviews/reverse-reviews.svelte`

Behavior:

- supports `after` and `before`
- review list page props now accept cursor metadata

### 4. Reviews API collection mapper standardized further

Files:

- `app/modules/reviews/controllers/mappers/response/shared.ts`
- `app/modules/reviews/controllers/mappers/response/review_response_mapper.ts`

Behavior:

- `mapReviewCollectionApiBody(...)` now emits standardized `pagination`
- shape closer to admin API:
  - `page`
  - `perPage`
  - `total`
  - `lastPage`
  - `hasNextPage`
  - optional `cursor`

### 5. User activity repository made cursor-ready

Files:

- `app/modules/user_activity/infra/repositories/user_activity_repository_interface.ts`
- `app/modules/user_activity/infra/repositories/postgres_user_activity_log_repository.ts`
- `database/migrations/20260706001000_add_user_activity_pagination_indexes.ts`
- `app/modules/user_activity/tests/backend/integration/user_activity_cursor.spec.ts`

Behavior:

- existing offset API preserved
- new cursor repository method added:
  - `findByUserCursor(...)`

## Work In Progress Right Before Handoff

Started migrating legacy admin flagged reviews route `/admin/reviews` to the same cursor-first moderation semantics.

Edited files:

- `app/modules/admin/actions/reviews/queries/list_flagged_reviews_query.ts`
- `app/modules/admin/controllers/reviews/list_flagged_reviews_controller.ts`
- `inertia/pages/admin/reviews/flagged.svelte`
- `app/modules/admin/tests/backend/integration/flagged_reviews.spec.ts`

Intent of these edits:

- stop using separate offset-only admin moderation flow
- reuse cursor-first `FlaggedReviewRepository.paginateWithRelations(...)`
- add pagination UI to `inertia/pages/admin/reviews/flagged.svelte`
- add integration coverage for admin moderation cursor traversal

This area needs immediate verification in next session.

## First Things To Do In Next Session

### 1. Verify and fix the in-progress admin flagged reviews migration

Run:

```bash
pnpm exec eslint \
  app/modules/admin/actions/reviews/queries/list_flagged_reviews_query.ts \
  app/modules/admin/controllers/reviews/list_flagged_reviews_controller.ts \
  inertia/pages/admin/reviews/flagged.svelte \
  app/modules/admin/tests/backend/integration/flagged_reviews.spec.ts

node ace test --files app/modules/admin/tests/backend/integration/flagged_reviews.spec.ts
```

Likely things to inspect:

- query currently maps `result.flaggedReviews`, but repository now returns `data`
- page currently adapts `meta` to `SimplePagination`; verify prop shape and rendering
- ensure route `/admin/reviews` keeps filters while paging

### 2. Decide whether to fully retire duplicate admin flagged reviews stack

There are two admin flagged-review surfaces:

- `/admin/flagged-reviews` using reviews module
- `/admin/reviews` using admin module

Need decision:

- either keep both but same semantics
- or consolidate one into the other later

### 3. Continue repo-wide pagination audit for remaining offset lists

Highest-value remaining audit targets:

- org/admin project lists
- organization member/invitation lists
- admin organizations/users/packages
- any list ordered by time that still uses large offsets

Rule:

- if it is a queue/feed/timeline, prefer cursor
- if it is a catalog or users need jump-to-page, offset is acceptable

## Tests Already Green

These were green before handoff:

```bash
node ace test --files app/modules/reviews/tests/backend/integration/flagged_reviews_cursor.spec.ts --files app/modules/reviews/tests/backend/integration/org_dispute_queue_access.spec.ts

node ace test --files app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts

node ace test --files app/modules/reviews/tests/backend/integration/reverse_review_reads.spec.ts --files app/modules/reviews/tests/backend/integration/review_collection_api_standardization.spec.ts

node ace test --files app/modules/reviews/tests/backend/unit/review_controller_mappers.spec.ts --files app/modules/reviews/tests/backend/integration/review_collection_api_standardization.spec.ts

node ace test --files app/modules/user_activity/tests/backend/integration/user_activity_cursor.spec.ts

pnpm exec vitest run \
  inertia/tests/component/reviews/simple_pagination.test.ts \
  inertia/tests/component/admin/admin_disputes_page.test.ts \
  inertia/tests/component/org/org_disputes_page.test.ts
```

## Known Repo Conditions

- worktree is already very dirty outside pagination scope
- do not trust `git status` volume as signal for this task alone
- repo-wide `svelte-check` still fails due to unrelated existing issues
- repo-wide `lint` scripts may report many unrelated errors because they lint broad paths
- prefer targeted `eslint` / targeted `ace test` commands

## Files Most Relevant For Pagination Direction

- `app/modules/pagination/public_contracts/pagination.ts`
- `docs/superpowers/specs/2026-07-05-pagination-core-design.md`
- `inertia/components/ui/pagination.svelte`
- `inertia/components/ui/cursor_pagination.svelte`
- `inertia/pages/reviews/components/simple_pagination.svelte`

## Migration Pattern To Reuse

When converting an offset timeline to industrial cursor pagination:

1. sort by `<timestamp> desc, id desc`
2. support:
   - `after` for older window
   - `before` for newer window
3. for `before`:
   - query ascending
   - `limit + 1`
   - reverse rows before returning
4. emit:
   - `nextCursor`
   - `previousCursor`
   - `hasNextPage`
   - `hasPreviousPage`
5. add matching composite index
6. switch UI to `CursorPagination` or `SimplePagination`
