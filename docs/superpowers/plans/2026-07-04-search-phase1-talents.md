# Search Rollout And Decoupling Handoff

> **Purpose:** This file is no longer a "phase 1 talents" plan. It is the current checkpoint for the ongoing `search` rollout and decoupling work so a new session can continue immediately without re-discovery.

## Current Goal

Continue evolving `app/modules/search` into a low-coupling, reusable module that can serve many surfaces:

- marketplace talent search
- public task search
- project search
- skill search
- organization search
- organization member search
- global `/api/search`

Primary architectural target:

- `search` owns indexing, engine query execution, and search-runtime orchestration
- feature modules remain source of truth for domain data and permissions
- cross-module coupling is pushed toward ports, adapters, events, and thin public contracts
- consumer-facing orchestration should live at the consumer/BFF layer, not inside `search`

## Important Constraints

- Keep PostgreSQL as source of truth for hydration and permission filtering.
- Elasticsearch should return ids/ranking, not hydrated records.
- Fall back safely to SQL when search is disabled, unavailable, stale, or returns unusable ids.
- Avoid increasing direct imports from `search` into foreign ORM models.
- Prefer domain-owned ports/adapters over `SearchPublicApi` reaching into other modules.
- HTTP tests in this repo collide on `127.0.0.1:3333`; run them sequentially.

## What Is Already Done

### Search foundation and surfaces

Implemented and previously verified:

- search config/client/health/reindex support
- talent search
- public task search
- project search
- skill search
- organization search
- global `/api/search`
- generic user-directory search
- organization member search via engine candidate ids + DB hydration

Key files already exist:

- `config/search.ts`
- `commands/search_ping.ts`
- `commands/search_reindex.ts`
- `app/modules/http/health_checks/search_health_check.ts`
- `app/modules/search/domain/*`
- `app/modules/search/infra/talents/*`
- `app/modules/search/infra/tasks/*`
- `app/modules/search/infra/projects/*`
- `app/modules/search/infra/skills/*`
- `app/modules/search/infra/organizations/*`
- `app/modules/search/infra/users/*`
- `app/modules/search/actions/queries/*`
- `app/modules/search/actions/services/*`
- `app/modules/search/public_contracts/search_public_api.ts`

### Decoupling work already completed

#### 1. Search orchestration moved out of `search` where appropriate

Global search orchestration was moved to HTTP/BFF layer:

- added `app/modules/http/actions/queries/global_search_query.ts`
- updated `app/modules/http/controllers/search_api_controller.ts`
- removed old `app/modules/search/actions/queries/global_search_query.ts`

Reason:

- `search` should provide search capabilities, not own cross-surface HTTP orchestration

#### 2. `SearchPublicApi` is now a thin facade

`app/modules/search/public_contracts/search_public_api.ts` was split into:

- runtime service
- per-projection services
- thin public facade delegating to those services

Key services:

- `search_runtime_service.ts`
- `talent_search_projection_service.ts`
- `task_search_projection_service.ts`
- `project_search_projection_service.ts`
- `skill_search_projection_service.ts`
- `organization_search_projection_service.ts`
- `user_directory_search_projection_service.ts`

Reason:

- easier to replace dependencies per projection
- lower coupling than one giant public API class reaching into every module

#### 3. User lifecycle events now go through port + adapter

Added:

- `app/modules/users/application/ports/user_event_publisher.ts`
- `app/modules/users/infra/adapters/in_process_user_event_publisher.ts`

Refactored commands:

- `register_user_command.ts`
- `approve_user_command.ts`
- `deactivate_user_command.ts`
- `update_user_profile_command.ts`
- `update_user_details_command.ts`

Reason:

- commands no longer call raw `emitter.emit('user:*')`
- search and other listeners can depend on user events instead of direct command coupling

#### 4. Task lifecycle events now go through port + adapter in the refactored slice

Standardized use of `TaskEventPublisher` for remaining task write paths already touched in this effort.

Refactored commands include:

- `revoke_task_access_command.ts`
- `batch_update_task_status_command.ts`
- `update_task_sort_order_command.ts`
- `update_task_time_command.ts`

Reason:

- search reindex listeners can subscribe to task events instead of more invasive direct coupling

#### 5. Domain-owned sync readers added for bulk reindex

Completed ports/adapters:

- users:
  - `app/modules/users/application/ports/user_search_sync_reader.ts`
  - `app/modules/users/infra/adapters/lucid_user_search_sync_reader.ts`
- tasks:
  - `app/modules/tasks/application/ports/task_search_sync_reader.ts`
  - `app/modules/tasks/infra/adapters/lucid_task_search_sync_reader.ts`
- projects:
  - `app/modules/projects/application/ports/project_search_sync_reader.ts`
  - `app/modules/projects/infra/adapters/lucid_project_search_sync_reader.ts`
- organizations:
  - `app/modules/organizations/application/ports/organization_search_sync_reader.ts`
  - `app/modules/organizations/infra/adapters/lucid_organization_search_sync_reader.ts`
- skills:
  - `app/modules/skills/application/ports/skill_search_sync_reader.ts`
  - `app/modules/skills/infra/adapters/lucid_skill_search_sync_reader.ts`

Already refactored services:

- `talent_search_projection_service.ts`
- `user_directory_search_projection_service.ts`
- `task_search_projection_service.ts`
- `project_search_projection_service.ts`
- `organization_search_projection_service.ts`
- `skill_search_projection_service.ts`

Reason:

- bulk reindex no longer reaches directly into `User.query()`, `Task.query()`, `Project.query()`, `Organization.query()`, or `Skill.query()` from `search`
- domain module owns how search reads sync data for reindex

#### 6. Organization and skill document builders now read through domain ports

Added:

- `app/modules/organizations/application/ports/organization_search_document_reader.ts`
- `app/modules/organizations/infra/adapters/lucid_organization_search_document_reader.ts`
- `app/modules/skills/application/ports/skill_search_document_reader.ts`
- `app/modules/skills/infra/adapters/lucid_skill_search_document_reader.ts`

Refactored:

- `app/modules/search/infra/organizations/organization_search_document_builder.ts`
- `app/modules/search/infra/skills/skill_search_document_builder.ts`

Reason:

- single-document reindex paths for organizations and skills no longer import foreign ORM models directly inside `search`
- builder mapping logic now depends on domain-owned reader contracts with thin Lucid adapters

#### 7. User-directory and project document builders now read through domain ports

Added:

- `app/modules/users/application/ports/user_directory_search_document_reader.ts`
- `app/modules/users/infra/adapters/lucid_user_directory_search_document_reader.ts`
- `app/modules/projects/application/ports/project_search_document_reader.ts`
- `app/modules/projects/infra/adapters/lucid_project_search_document_reader.ts`

Refactored:

- `app/modules/search/infra/users/user_directory_search_document_builder.ts`
- `app/modules/search/infra/projects/project_search_document_builder.ts`

Reason:

- single-document reindex paths for user directory and projects no longer import foreign ORM models directly inside `search`
- deleted-user and deleted-project document flows remain available, but model access now sits behind domain-owned reader contracts

#### 8. Task and talent document builders now read through domain ports

Added:

- `app/modules/tasks/application/ports/task_search_document_reader.ts`
- `app/modules/tasks/infra/adapters/lucid_task_search_document_reader.ts`
- `app/modules/users/application/ports/talent_search_document_reader.ts`
- `app/modules/users/infra/adapters/lucid_talent_search_document_reader.ts`

Refactored:

- `app/modules/search/infra/tasks/task_search_document_builder.ts`
- `app/modules/search/infra/talents/talent_search_document_builder.ts`

Reason:

- `search` no longer imports foreign ORM models directly anywhere in `app/modules/search`
- preload logic and explainability summary lookup for talent/task document assembly now live behind domain-owned reader contracts

#### 9. Admin and org-project search consumers now use local ports + engine adapters

Added:

- `app/modules/admin/actions/ports/admin_search_candidate_readers.ts`
- `app/modules/admin/infra/adapters/engine_admin_search_candidate_readers.ts`
- `app/modules/organizations/actions/ports/organization_project_search_candidate_reader.ts`
- `app/modules/organizations/infra/adapters/engine_organization_project_search_candidate_reader.ts`

Refactored:

- `app/modules/admin/actions/users/queries/list_users_query.ts`
- `app/modules/admin/actions/organizations/queries/list_organizations_query.ts`
- `app/modules/organizations/actions/current/projects/queries/list_projects_query.ts`

Reason:

- consumer queries no longer depend directly on `SearchUsersViaEngineQuery`, `SearchOrganizationsViaEngineQuery`, or `SearchProjectsViaEngineQuery`
- local consumer-facing ports now own the "search candidate ids" boundary, while thin adapters bridge to search engine query objects
- this keeps engine orchestration at consumer layer without teaching those queries about search-module implementation classes

#### 10. Organization member search consumers now use local ports + engine adapters

Added:

- `app/modules/organizations/actions/ports/organization_member_search_candidate_reader.ts`
- `app/modules/organizations/infra/adapters/engine_organization_member_search_candidate_reader.ts`

Refactored:

- `app/modules/organizations/actions/current/members/queries/list_organization_members_query.ts`
- `app/modules/organizations/actions/queries/get_organization_members_query.ts`
- `app/modules/organizations/actions/queries/get_organization_members_api_query.ts`

Reason:

- organization member consumers no longer instantiate `SearchUsersViaEngineQuery` directly
- one org-local candidate-reader seam now owns ranked member-id lookup for current-page, paginated, and API member list surfaces
- constructor-level dependency injection for the heavier queries makes the engine-id branch directly unit-testable without booting DB/search runtime

#### 11. Organization basic-list and project list consumers now use local ports + engine adapters

Added:

- `app/modules/organizations/actions/ports/organization_search_candidate_reader.ts`
- `app/modules/organizations/infra/adapters/engine_organization_search_candidate_reader.ts`
- `app/modules/projects/actions/ports/project_search_candidate_reader.ts`
- `app/modules/projects/infra/adapters/engine_project_search_candidate_reader.ts`

Refactored:

- `app/modules/organizations/actions/queries/get_all_organizations_query.ts`
- `app/modules/projects/actions/queries/get_projects_list_query.ts`

Reason:

- organization basic-list search and project list search no longer instantiate concrete `SearchOrganizationsViaEngineQuery` or `SearchProjectsViaEngineQuery` classes inside consumer queries
- local module-owned candidate-reader ports now hide search-engine implementation details while preserving engine-id-first + DB fallback behavior
- `GetProjectsListQuery` keeps existing engine-backed integration coverage while gaining a direct unit seam for the ranked-id branch

#### 12. Task and talent consumer queries now use local ports + engine adapters

Added:

- `app/modules/tasks/actions/ports/task_search_candidate_readers.ts`
- `app/modules/tasks/infra/adapters/engine_task_search_candidate_readers.ts`
- `app/modules/users/actions/ports/talent_search_candidate_reader.ts`
- `app/modules/users/infra/adapters/engine_talent_search_candidate_reader.ts`

Refactored:

- `app/modules/tasks/actions/queries/get_public_tasks_query.ts`
- `app/modules/tasks/actions/queries/get_tasks_list_query.ts`
- `app/modules/users/actions/queries/search_talents_query.ts`

Reason:

- public task search, organization task list search, and talent search no longer instantiate concrete `SearchPublicTasksViaEngineQuery`, `SearchTasksViaEngineQuery`, or `SearchTalentsViaEngineQuery` classes inside consumer queries
- task and user modules now own their own candidate-reader seams, matching the boundary style already applied to admin, organization, and project consumers
- existing marketplace/org integration coverage stayed green after the refactor, proving the engine-backed paths still work end-to-end

#### 13. Runtime wiring now creates search-backed consumers in bootstrap/factory layer

Added:

- `app/modules/tasks/bootstrap/task_query_factory.ts`
- `app/modules/users/bootstrap/user_query_factory.ts`

Refactored:

- `app/modules/http/actions/queries/global_search_query.ts`
- `app/modules/marketplace/controllers/list_marketplace_tasks_controller.ts`
- `app/modules/marketplace/controllers/list_marketplace_tasks_api_controller.ts`
- `app/modules/tasks/actions/queries/get_task_status_board_page_query.ts`
- `app/modules/tasks/actions/queries/get_tasks_page_query.ts`
- `app/modules/tasks/actions/services/task_public_api.ts`
- `app/modules/users/controllers/talents_search_controller.ts`
- `app/modules/users/controllers/org_talents_page_controller.ts`
- `app/modules/users/actions/queries/get_talent_directory_page_query.ts`

Reason:

- runtime app paths no longer rely on consumer queries silently constructing concrete search adapters themselves
- concrete `Engine*SearchCandidateReader` classes are now created in bootstrap/factory code, while action queries depend on ports
- app-level `new SearchTalentsQuery(...)`, `new GetPublicTasksQuery(...)`, `new GetTasksListQuery(...)`, and `new GetTalentDirectoryPageQuery(...)` usage is now isolated to bootstrap factories rather than scattered across controllers/BFF queries

### Tests that were verified green earlier in this workstream

Focused tests that passed in earlier turns:

- `tests/integration/marketplace/talent_search_engine.spec.ts`
- `tests/integration/marketplace/talent_search.spec.ts`
- `tests/integration/marketplace/talent_directory_access_and_filters.spec.ts`
- `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
- `tests/integration/marketplace/public_task_search_engine.spec.ts`
- `app/modules/projects/tests/backend/integration/project_search_engine.spec.ts`
- `tests/integration/search/global_search_api.spec.ts`
- `app/modules/skills/tests/backend/integration/skill_search_engine.spec.ts`
- `app/modules/organizations/tests/backend/integration/organization_search_engine.spec.ts`
- `app/modules/organizations/tests/backend/integration/organization_search_reindex_hooks.spec.ts`
- `app/modules/users/tests/backend/integration/user_directory_search_engine.spec.ts`
- `app/modules/http/tests/backend/contract/user_context_api_standardization.contract.spec.ts`
- `app/modules/http/tests/backend/unit/global_search_query.spec.ts`
- `app/modules/search/tests/backend/unit/search_public_api.spec.ts`
- `app/modules/search/tests/backend/unit/user_projection_services.spec.ts`
- `app/modules/search/tests/backend/unit/task_projection_service.spec.ts`
- `app/modules/search/tests/backend/unit/project_projection_service.spec.ts`
- `app/modules/search/tests/backend/unit/organization_projection_service.spec.ts`
- `app/modules/search/tests/backend/unit/skill_projection_service.spec.ts`
- `app/modules/search/tests/backend/unit/organization_document_builder.spec.ts`
- `app/modules/search/tests/backend/unit/skill_document_builder.spec.ts`
- `app/modules/search/tests/backend/unit/user_directory_document_builder.spec.ts`
- `app/modules/search/tests/backend/unit/project_document_builder.spec.ts`
- `app/modules/search/tests/backend/unit/task_document_builder.spec.ts`
- `app/modules/search/tests/backend/unit/talent_document_builder.spec.ts`
- `app/modules/users/tests/backend/integration/user_event_publisher.spec.ts`
- `app/modules/tasks/tests/backend/integration/revoke_task_access.spec.ts`
- `app/modules/tasks/tests/backend/integration/task_status.spec.ts`
- `app/modules/tasks/tests/backend/integration/task_sort_order.spec.ts`
- `app/modules/tasks/tests/backend/integration/update_task_time.spec.ts`
- `app/modules/admin/tests/backend/unit/list_users_query.spec.ts`
- `app/modules/admin/tests/backend/unit/list_organizations_query.spec.ts`
- `app/modules/organizations/tests/backend/unit/current_projects_list_query.spec.ts`
- `app/modules/organizations/tests/backend/unit/list_organization_members_query.spec.ts`
- `app/modules/organizations/tests/backend/unit/get_organization_members_query.spec.ts`
- `app/modules/organizations/tests/backend/unit/get_organization_members_api_query.spec.ts`
- `app/modules/organizations/tests/backend/unit/get_all_organizations_query.spec.ts`
- `app/modules/projects/tests/backend/unit/get_projects_list_query.spec.ts`
- `app/modules/tasks/tests/backend/unit/get_public_tasks_query.spec.ts`
- `app/modules/tasks/tests/backend/unit/get_tasks_list_query.spec.ts`
- `app/modules/users/tests/backend/unit/search_talents_query.spec.ts`
- `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts`
- `app/modules/tasks/tests/backend/integration/list_tasks.spec.ts`
- `tests/integration/marketplace/public_task_search_engine.spec.ts`
- `tests/integration/marketplace/talent_search.spec.ts`
- `tests/integration/marketplace/talent_directory_access_and_filters.spec.ts`

## Current Code Reality

### Search reindex listeners are preferred direction

Search already listens to domain events and reindexes on the consumer side. That direction should continue.

Important file:

- `app/modules/search/listeners/search_reindex_listener.ts`

Principle:

- domain command publishes event
- search listener reacts
- no need for domain command to know search internals

### Remaining high-value decoupling gaps inside `search`

Bulk-reindex service coupling is now cleaned up across talents, tasks, projects, organizations, skills, and user directory.

Direct cross-module model imports inside `app/modules/search` are now removed.

Current remaining gaps are no longer inside `search` internals, and current known consumer queries no longer instantiate concrete search-engine query classes directly outside adapters/tests.

Main remaining work is higher-level verification and future-surface hygiene:

- add/expand HTTP or page-level regression coverage for key search-backed surfaces where only focused unit coverage exists today
- keep auditing new consumers as they appear so they adopt local ports/adapters instead of concrete search query classes from day one

## Exact Next Steps For New Session

### Step 1. Audit document-builder coupling

This slice is complete for current known builders.

Evidence:

- `rg -n "import .*#modules/(users|tasks|projects|skills|organizations)/infra/models" app/modules/search`
  should now return no results.

### Step 2. Re-audit orchestration boundaries

Search for:

- orchestration that belongs in HTTP/consumer layers
- page-specific response shaping that drifted into `search`
- direct domain-command writes into `search` APIs where listener/event flow would be cleaner

Preferred replacements:

- port + adapter
- listener + event publisher
- consumer/BFF query layer

Current audit result:

- aligned:
  - `app/modules/http/actions/queries/global_search_query.ts`
  - `app/modules/organizations/actions/current/members/queries/list_organization_members_query.ts`
  - `app/modules/organizations/actions/queries/get_organization_members_query.ts`
  - `app/modules/organizations/actions/queries/get_organization_members_api_query.ts`
  - `app/modules/admin/actions/users/queries/list_users_query.ts`
  - `app/modules/admin/actions/organizations/queries/list_organizations_query.ts`
  - `app/modules/organizations/actions/current/projects/queries/list_projects_query.ts`
  - `app/modules/organizations/actions/queries/get_all_organizations_query.ts`
  - `app/modules/projects/actions/queries/get_projects_list_query.ts`
  - `app/modules/users/actions/queries/search_talents_query.ts`
  - `app/modules/tasks/actions/queries/get_public_tasks_query.ts`
  - `app/modules/tasks/actions/queries/get_tasks_list_query.ts`
  - `app/modules/skills/actions/queries/list_active_skills_catalog_query.ts`
- no current known consumer query in `app/modules/*/actions/queries` still instantiates concrete `Search*ViaEngineQuery` classes directly
- app runtime construction of search-backed consumer queries is now centralized in:
  - `app/modules/tasks/bootstrap/task_query_factory.ts`
  - `app/modules/users/bootstrap/user_query_factory.ts`
- concrete `Engine*SearchCandidateReader` imports for these consumer paths are now limited to adapters + bootstrap/factory wiring

### Step 3. Frontend/API follow-through

Do not focus only on backend.

Check whether current UI surfaces are now aligned with the reusable search boundaries:

- organization members search
- global search UI/API
- any org/admin/member list surfaces that still hardcode SQL-only search flows

Principle:

- UI/API contract remains stable
- consumer module decides when to use engine query + DB hydration fallback
- `search` module should not own page-specific response shaping

Practical next move:

- add higher-level regression tests for surfaces that already have the right boundary shape but only focused unit proof today
- keep id-filter + SQL fallback pattern and local candidate-reader seams as the default for any new search-backed consumer

### Boundary rule of thumb

- if `search` needs domain records for indexing or document building, prefer domain-owned `application/ports` + `infra/adapters`
- if a consumer surface needs ranked ids from search, prefer a consumer-local port with a thin adapter to the concrete engine query
- keep `public_api` for broad monolith capabilities when needed, but do not make consumer queries depend directly on search implementation classes when a local port can hide that seam

## Safe Working Rules For Next Session

- Run impact analysis before editing symbols if GitNexus is healthy.
- If GitNexus is still noisy/broken, do not block the search work on it; continue with repo code and focused tests.
- Run HTTP/integration tests sequentially because of `127.0.0.1:3333` collisions.
- Do not revert unrelated dirty files.
- Verify only files touched by current slice before claiming completion.

## Quick Resume Commands

Use these first in the next session:

```bash
git status --short
rg -n "import .*#modules/(users|tasks|projects|skills|organizations)/infra/models" app/modules/search
read app/modules/admin/actions/users/queries/list_users_query.ts
read app/modules/admin/actions/organizations/queries/list_organizations_query.ts
read app/modules/organizations/actions/current/projects/queries/list_projects_query.ts
```

Then decide whether next slice is builder ports/adapters or frontend/API alignment.

## Session Notes

- Generic user-directory search is already in repo; old handoff notes saying those files are missing are outdated.
- `search_users_via_engine_query.ts` exists and is already wired into organization member search paths.
- Organization and skill bulk-reindex decoupling are now done and verified.
- Organization and skill single-document builder decoupling are now also done and verified.
- User-directory and project single-document builder decoupling are now also done and verified.
- Task and talent single-document builder decoupling are now also done and verified.
- Admin users/admin organizations/org-project list now use engine-id-first candidate ids with DB fallback through local ports + engine adapters.
- Organization member current-page, paginated, and API list queries now also use engine-id-first candidate ids through one org-local port + engine adapter seam.
- Organization basic-list search and project list search now also use local candidate-reader ports + engine adapters.
- Public task search, org task list search, and talent search now also use local candidate-reader ports + engine adapters.
- Runtime wiring for public task search, org task list search, talent search, and talent directory search now lives in bootstrap/factory files instead of controllers or action queries constructing concrete engine adapters inline.
- Admin API regression coverage is green, but there is still no dedicated higher-level search-path test for `GET /org/projects`; only focused unit coverage exists for that consumer today.
- Organization member consumers currently have focused unit coverage for the engine-id branch, but no dedicated higher-level HTTP regression spec asserting that search path end-to-end.
- `GetProjectsListQuery` kept its existing engine-backed integration coverage green after the port refactor: `app/modules/projects/tests/backend/integration/project_search_engine.spec.ts`.
- `GetAllOrganizationsQuery.searchBasicList` currently has focused unit coverage for the engine-id branch, but no dedicated higher-level HTTP regression spec for `GET /api/organizations?q=...`.
- `GetPublicTasksQuery`, `GetTasksListQuery`, `SearchTalentsQuery`, and `GetTalentDirectoryPageQuery` kept engine-backed integration coverage green after the port/factory refactors.
- There was ongoing GitNexus indexing noise around generated artifacts; that is not the priority for the next session unless it blocks impact analysis.
