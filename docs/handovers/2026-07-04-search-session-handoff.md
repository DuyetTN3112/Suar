# Search Module Handoff — 2026-07-04

> Historical handoff snapshot.
>
> Dùng file này để hiểu session state và next steps ở thời điểm 2026-07-04, không dùng làm source of truth hiện tại.
>
> Trước khi tin bất kỳ claim nào trong file này, đối chiếu lại với:
> - `docs/12-evidence/workstream-status-audit.md`
> - `docs/03-architecture/architecture-overview.md`
> - `docs/09-operations/runbook-monitoring-maintenance.md`

## Goal

Continue Elasticsearch rollout for Suar so search is reusable across many surfaces, not only marketplace.

Repo root: `/home/tranngocduyet/Projects/Suar`

Local infra assumption:
- Elasticsearch already running at `http://127.0.0.1:9200`
- Docker compose infra belongs to user and is already up

---

## What is already done and verified

### Search module foundation

Implemented shared search module with config/client/health/reindex support:

- `config/search.ts`
- `start/env.ts`
- `start/health.ts`
- `commands/search_ping.ts`
- `commands/search_reindex.ts`
- `app/modules/http/health_checks/search_health_check.ts`

### Indexed entities already working

These are implemented and were verified in earlier session turns:

- `talents`
- `tasks` public marketplace
- `projects`
- `skills`
- `organizations`
- global `/api/search`
- internal org/task list search for tasks

Important files added earlier:

- `app/modules/search/domain/*`
- `app/modules/search/infra/talents/*`
- `app/modules/search/infra/tasks/*`
- `app/modules/search/infra/projects/*`
- `app/modules/search/infra/skills/*`
- `app/modules/search/infra/organizations/*`
- `app/modules/search/actions/queries/*`
- `app/modules/search/public_contracts/search_public_api.ts`

### Verified commands/tests that passed before this handoff

All were run successfully earlier in this long session:

- `node ace search:ping`
- `node ace search:reindex --index=talents`
- `node ace search:reindex --index=tasks`
- `node ace search:reindex --index=projects`
- `node ace search:reindex --index=skills`
- `node ace search:reindex --index=organizations`

Focused tests that passed earlier:

- `tests/integration/marketplace/talent_search_engine.spec.ts`
- `tests/integration/marketplace/talent_search.spec.ts`
- `tests/integration/marketplace/talent_directory_access_and_filters.spec.ts`
- `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
- `tests/integration/marketplace/public_task_search_engine.spec.ts`
- `app/modules/projects/tests/backend/integration/project_search_engine.spec.ts`
- `app/modules/projects/tests/backend/integration/create_project.spec.ts`
- `app/modules/projects/tests/backend/integration/delete_project.spec.ts`
- `tests/integration/search/global_search_api.spec.ts`
- `app/modules/skills/tests/backend/integration/skill_search_engine.spec.ts`
- `app/modules/skills/tests/backend/contract/skills_v1_read_api_standardization.contract.spec.ts`
- `app/modules/organizations/tests/backend/integration/organization_search_engine.spec.ts`
- `app/modules/organizations/tests/backend/integration/organization_search_reindex_hooks.spec.ts`
- `app/modules/organizations/tests/backend/contract/organization_api_standardization.contract.spec.ts`
- `app/modules/tasks/tests/backend/integration/list_tasks.spec.ts`

Note:
- HTTP/integration tests in this repo collide on `127.0.0.1:3333` if run in parallel.
- Run them sequentially.

---

## Current work in progress when session stopped

### Target slice

Create **generic user-directory search** and wire it into **organization members search**.

Reason:
- organization member search currently uses SQL `ILIKE`
- talent bookmarks and other user lists can later reuse same user-directory index

### State of WIP

Partially wired, **not finished yet**.

These files were already modified toward the user-directory slice:

- `app/modules/search/domain/search_index_names.ts`
  - already contains `buildUserDirectorySearchIndexName()`
- `app/modules/search/public_contracts/search_public_api.ts`
  - already imports user-directory symbols
  - already references methods like `reindexAllUserDirectoryDocuments()`
  - **but referenced user-directory files do not exist yet**
- `commands/search_reindex.ts`
  - already supports `--index=users`
- `app/modules/organizations/actions/queries/get_organization_members_query.ts`
  - already tries to use `SearchUsersViaEngineQuery`
- `app/modules/organizations/actions/queries/get_organization_members_api_query.ts`
  - already accepts optional raw query and tries engine path
- `app/modules/organizations/actions/services/organization_public_api.ts`
  - already forwards optional `rawQuery`
- `app/modules/http/controllers/get_organization_members_api_controller.ts`
  - already reads `q`
- `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts`
  - already supports `userIds?: string[]`
  - already has `findMembersWithUserByIds()`
- `app/modules/http/tests/backend/contract/user_context_api_standardization.contract.spec.ts`
  - already has new test for `/api/organization-members/:id?q=elastic`
- `app/modules/users/tests/backend/integration/user_directory_search_engine.spec.ts`
  - new test file already exists

### What is missing / broken right now

The following files are **referenced but not created yet**:

- `app/modules/search/domain/user_directory_search_document.ts`
- `app/modules/search/infra/users/user_directory_search_document_builder.ts`
- `app/modules/search/infra/users/user_directory_search_index_repository.ts`
- `app/modules/search/actions/queries/search_users_via_engine_query.ts`

Because of that, current branch is likely in a **compile-broken state** until those files are added.

Also not yet wired:

- `app/modules/users/actions/commands/register_user_command.ts`
- `app/modules/users/actions/commands/update_user_profile_command.ts`
- `app/modules/users/actions/commands/approve_user_command.ts`
- `app/modules/users/actions/commands/deactivate_user_command.ts`

Desired wiring:
- call `searchPublicApi.reindexUserDirectoryDocumentQuietly(userId)` after successful user lifecycle changes

---

## Exact next steps for new session

### 1. Finish missing user-directory files

Create:

- `app/modules/search/domain/user_directory_search_document.ts`
- `app/modules/search/infra/users/user_directory_search_document_builder.ts`
- `app/modules/search/infra/users/user_directory_search_index_repository.ts`
- `app/modules/search/actions/queries/search_users_via_engine_query.ts`

Suggested document shape:

```ts
interface UserDirectorySearchDocument {
  user_id: string
  username: string
  email: string | null
  status: string
  deleted_at: string | null
  updated_at: string
}
```

Search fields:
- `username^5`
- `email^4`

Filter:
- exclude `deleted_at`

### 2. Finish SearchPublicApi user-directory methods

In `app/modules/search/public_contracts/search_public_api.ts`, complete:

- `userDirectoryIndexName()`
- `reindexUserDirectoryDocument()`
- `reindexUserDirectoryDocumentQuietly()`
- `removeUserDirectoryDocumentQuietly()`
- `reindexAllUserDirectoryDocuments()`

Use `User.query()` same style as other entity reindex methods.

### 3. Wire user lifecycle hooks

Add user-directory reindex calls to:

- `register_user_command.ts`
- `update_user_profile_command.ts`
- `approve_user_command.ts`
- `deactivate_user_command.ts`

### 4. Verify organization-members search path

Run sequentially:

```bash
node --import=@poppinss/ts-exec bin/test.ts --files="app/modules/users/tests/backend/integration/user_directory_search_engine.spec.ts"
node --import=@poppinss/ts-exec bin/test.ts --files="app/modules/http/tests/backend/contract/user_context_api_standardization.contract.spec.ts"
node ace search:reindex --index=users
```

If contract test passes, also add one focused integration test for `GetOrganizationMembersQuery` search path if needed.

---

## Notes about current architecture choices

### Search design used consistently so far

- Elasticsearch only returns candidate ids / ranking
- PostgreSQL remains source of truth for hydrated data and permission filtering
- fallback to SQL path when:
  - search disabled
  - engine error
  - engine returns zero usable rows
  - index stale and candidate ids no longer exist in DB

### Task internal search lesson

Already fixed one bug in internal task search:
- do **not** apply engine `task_ids` and SQL `ILIKE search` at same time
- when engine path returns ids, pass `search: undefined` to SQL layer
- otherwise required-skill-only matches get filtered out accidentally

Same principle should be used for organization members search:
- if engine path returns `userIds`, then DB query should filter by `userIds`
- and should **not** also apply legacy `ILIKE`

---

## Useful existing files to copy patterns from

For entity search pattern:

- `app/modules/search/infra/skills/skill_search_index_repository.ts`
- `app/modules/search/infra/organizations/organization_search_index_repository.ts`
- `app/modules/search/actions/queries/search_skills_via_engine_query.ts`
- `app/modules/search/actions/queries/search_organizations_via_engine_query.ts`

For fallback logic:

- `app/modules/skills/actions/queries/list_active_skills_catalog_query.ts`
- `app/modules/tasks/actions/queries/get_tasks_list_query.ts`
- `app/modules/organizations/actions/queries/get_all_organizations_query.ts`

For current org members path:

- `app/modules/organizations/actions/queries/get_organization_members_query.ts`
- `app/modules/organizations/actions/queries/get_organization_members_api_query.ts`
- `app/modules/organizations/infra/repositories/organization_user_repository/read/listing_queries.ts`

---

## Warning

Repo has many unrelated dirty files from broader ongoing work. Do **not** revert unrelated changes.

Also note:
- some paths appear as `??` in `git status` because broader repo state is already very dirty
- verify only the files relevant to search slice before making claims
