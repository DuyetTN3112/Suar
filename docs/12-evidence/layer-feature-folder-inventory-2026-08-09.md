# Layer-Feature Folder Inventory

| Field | Value |
|---|---|
| Date | 2026-08-09 |
| Scope | `app/modules/*` and `app/composition/*` |
| Purpose | Establish the repository-wide feature vocabulary before moving source files |
| Status | Initial inventory |
| Source state | Worktree contains pre-existing modified and untracked files; this inventory does not claim ownership of those changes |

## 1. Canonical placement

```text
existing layer -> module-owned feature -> files
```

The feature folder is added below the existing layer. It must not replace the layer with a
repository-wide `features` tree.

## 2. Module and layer inventory

| Module | Existing top-level layers | Initial capability vocabulary status |
|---|---|---|
| `accomplishments` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: lifecycle governance, verified work, publication, public projection, search projection |
| `admin` | `audit_logs`, `dashboard`, `disputes`, `organizations`, `packages`, `permissions`, `proficiency`, `reviews`, `tests`, `users` | Already capability-oriented; preserve these names and group files inside each technical owner only where needed |
| `audit` | `actions`, `domain`, `events`, `infra`, `listeners`, `middleware`, `public_contracts`, `tests` | Candidate flows: audit ingestion, audit projection, retention, event observation |
| `auth` | `actions`, `boundary`, `controllers`, `domain`, `infra`, `listeners`, `middleware`, `observability`, `tests` | Candidate flows: login, logout, session, identity observation, authentication boundary |
| `authorization` | `actions`, `constants`, `controllers`, `domain`, `infra`, `middleware`, `public_contracts`, `tests` | Candidate flows: permission evaluation, role management, project access, system access |
| `cache` | `actions`, `domain`, `events`, `health_checks`, `infra`, `public_contracts`, `tests` | Candidate flows: cache invalidation, cache reads, replay, health |
| `contracts` | `public_contracts`, `tests` | Candidate contracts should follow the owning business capability; avoid generic contract buckets |
| `errors` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: validation, HTTP error mapping, error event retention |
| `events` | `actions`, `bootstrap`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: outbox, event staging, event consumption, event contracts |
| `filtering` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: filter definitions, saved views, alerts, filter execution |
| `http` | `actions`, `adapters`, `api_v1`, `boundary`, `constants`, `controllers`, `errors`, `exceptions`, `health_checks`, `infra`, `middleware`, `public_contracts`, `tests` | Candidate flows: API boundary, health, exception handling, transport errors |
| `logger` | `domain`, `infra`, `listeners`, `public_contracts`, `tests` | Candidate flows: structured logging, event logging, runtime sinks |
| `marketplace` | `actions`, `controllers`, `domain`, `infra`, `tests`, `types`, `validators` | Candidate flows: public task discovery, applications, skill catalog, marketplace access |
| `notifications` | `actions`, `controllers`, `domain`, `infra`, `listeners`, `observability`, `public_contracts`, `tests` | Candidate flows: notification delivery, fanout, preferences, projection |
| `observability` | `actions`, `contracts`, `infra`, `public_contracts`, `tests` | Candidate flows: metrics, runtime health, operational evidence |
| `organizations` | `access`, `dashboard`, `directory`, `invitations`, `members`, `projects`, `settings`, `sprints`, `tasks`, `tests`, `workflow` | Already capability-oriented; retain domain capability names and align technical layers where files are flat |
| `pagination` | `public_contracts`, `tests` | Candidate contract families: cursor, page, sorting, pagination errors |
| `projects` | `actions`, `bootstrap`, `controllers`, `domain`, `infra`, `middleware`, `observability`, `public_contracts`, `tests`, `types`, `validators` | Candidate flows: project lifecycle, membership, workspace, settings, project access |
| `reviews` | `actions`, `controllers`, `domain`, `events`, `infra`, `listeners`, `observability`, `public_contracts`, `tests`, `types`, `validators` | Candidate flows: review session, submission review, observation, dispute, governance |
| `search` | `actions`, `controllers`, `domain`, `infra`, `listeners`, `observability`, `public_contracts`, `tests` | Candidate flows: discovery, indexing, projection, reconciliation, search health |
| `settings` | `actions`, `controllers`, `infra`, `public_contracts`, `tests`, `types` | Candidate flows: user settings, organization settings, preferences |
| `skills` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: skill catalog, taxonomy, proficiency, project skill requirements |
| `sprints` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests`, `types` | Candidate flows: sprint lifecycle, backlog planning, scope change, delivery |
| `tasks` | `actions`, `controllers`, `domain`, `filtering`, `infra`, `observability`, `public_contracts`, `tests`, `types`, `validators` | Candidate flows: authoring, status, assignment, application, submission, comment, attachment, audit, search |
| `taxonomy` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: taxonomy governance, revisions, migration, category assignment |
| `testing` | `actions`, `controllers`, `domain`, `infra`, `public_contracts`, `tests` | Candidate flows: test authentication, fixtures, test-only contracts |
| `users` | `actions`, `controllers`, `domain`, `infra`, `listeners`, `public_contracts`, `tests`, `types`, `validators` | Candidate flows: profile, talent directory, recruiting, bookmarks, user lifecycle |

## 3. Composition inventory

`app/composition` is a separate composition layer. It is not required to mirror every module
directory, but each composition file must have an identifiable capability owner.

| Composition area | Current evidence | Target grouping rule |
|---|---|---|
| `adapters/` | 142 adapter files | Group by module capability when the adapter is capability-specific; retain cross-module adapters at a broader owner |
| `factories/` | 31 factory files | Group by module/capability when a factory wires one capability; keep shared providers at composition root |
| `command_support/` | 4 runtime support files | Keep as composition support unless a file is clearly owned by one capability |
| root composition files | module/application providers and feature compositions | Move only capability-specific files; do not force cross-feature providers into a feature folder |

Representative composition capability families already visible in filenames include `tasks`,
`reviews`, `users`, `search`, `skills`, `taxonomy`, `sprints`, `projects`, `organizations`,
`notifications`, `auth`, and `accomplishments`.

## 4. First implementation batch

The first batch is intentionally small and must be selected from this inventory after checking
current consumers and dirty-worktree ownership. The selection criteria are:

1. one bounded capability;
2. at least two files in one or more layers;
3. clear imports and tests;
4. no ambiguous shared ownership;
5. no need to change symbol bodies.

The first batch selected after inspection is `accomplishments/publication`. It was selected because
the current flow has a clear controller, request mapper, inbound port, commands, publication ports,
publication domain rules, publication repository/model, composition provider/adapter, contracts, and
focused tests.

The batch now uses these paths:

```text
app/modules/accomplishments/controllers/publication/
app/modules/accomplishments/controllers/mappers/request/publication/
app/modules/accomplishments/actions/commands/publication/
app/modules/accomplishments/actions/ports/inbound/publication/
app/modules/accomplishments/actions/ports/outbound/publication/
app/modules/accomplishments/domain/publication/
app/modules/accomplishments/infra/adapters/publication/
app/modules/accomplishments/infra/models/publication/
app/modules/accomplishments/infra/repositories/publication/
app/modules/accomplishments/public_contracts/publication/
app/modules/accomplishments/tests/backend/{unit,integration,contract}/publication/
app/composition/accomplishments/publication/
app/composition/adapters/accomplishments/publication/
```

The same module now has two additional completed feature groupings:

```text
app/modules/accomplishments/actions/commands/lifecycle/
app/modules/accomplishments/actions/ports/outbound/lifecycle/
app/modules/accomplishments/domain/lifecycle/
app/modules/accomplishments/infra/models/lifecycle/
app/modules/accomplishments/infra/repositories/lifecycle/
app/modules/accomplishments/public_contracts/lifecycle/
app/modules/accomplishments/tests/backend/{unit,integration}/lifecycle/

app/modules/accomplishments/actions/commands/verified-work/
app/modules/accomplishments/actions/mappers/verified-work/
app/modules/accomplishments/actions/ports/outbound/verified-work/
app/modules/accomplishments/domain/verified-work/
app/modules/accomplishments/infra/adapters/verified-work/
app/modules/accomplishments/infra/models/verified-work/
app/modules/accomplishments/infra/repositories/verified-work/
app/modules/accomplishments/public_contracts/verified-work/
app/modules/accomplishments/tests/backend/{unit,integration}/verified-work/
app/composition/accomplishments/verified-work/
```

Lifecycle verification: 12 unit tests passed. Verified-work verification: 50 unit tests and 12
integration tests passed. The shared `accomplishment_transaction`, `json_column`, content hasher,
and cross-feature schema files remain at their broader owner because they are consumed by multiple
capabilities.

The next completed cross-module slice is `reviews/observation`:

```text
app/modules/reviews/controllers/observation/
app/modules/reviews/controllers/mappers/request/observation/
app/modules/reviews/actions/commands/observation/
app/modules/reviews/actions/ports/outbound/observation/
app/modules/reviews/domain/observation/
app/modules/reviews/infra/adapters/observation/
app/modules/reviews/infra/models/observation/
app/modules/reviews/infra/repositories/observation/
app/modules/reviews/tests/backend/{architecture,unit,integration}/observation/
```

Observation verification: 13 unit tests, 11 integration tests, and 1 architecture-boundary test
passed. The shared review action factory remains at the composition root because it wires many
review capabilities; only capability-specific composition files should move into a feature folder.

The next completed slice is `tasks/task-authoring`, using the original example flow:

```text
app/modules/tasks/controllers/task-authoring/
app/modules/tasks/actions/commands/task-authoring/
app/modules/tasks/actions/dtos/request/task-authoring/
app/modules/tasks/actions/mapper/task-authoring/
app/modules/tasks/actions/ports/outbound/task-authoring/
app/modules/tasks/domain/task-authoring/
app/modules/tasks/infra/adapters/task-authoring/
app/modules/tasks/infra/models/task-authoring/
app/modules/tasks/tests/backend/{support,unit,integration,contract}/task-authoring/
app/composition/tasks/task-authoring/
```

The shared `task_request_mapper`, response mappers, task factories, task external dependency
composition, and lifecycle/query ports remain at their broader owner because they serve multiple
Task flows. Task authoring verification: 37 unit tests, 29 integration tests, and 1 contract test
passed.

The next module slice is `projects/project-context`:

```text
app/modules/projects/controllers/project-context/
app/modules/projects/controllers/mappers/project-context/
app/modules/projects/controllers/mappers/request/project-context/
app/modules/projects/actions/commands/project-context/
app/modules/projects/actions/ports/inbound/project-context/
app/modules/projects/actions/ports/outbound/project-context/
app/modules/projects/domain/project-context/
app/modules/projects/infra/adapters/project-context/
app/modules/projects/infra/models/project-context/
app/modules/projects/public_contracts/project-context/
app/modules/projects/tests/backend/{unit,integration,contract}/project-context/
app/composition/projects/project-context/
```

Project-context verification: 17 unit tests, 15 integration tests, and 2 contract tests passed.
Project lifecycle, membership, work-package, and shared project composition remain outside this
slice.

The next completed slice is `skills/rubric-and-proficiency`:

```text
app/modules/skills/controllers/rubric-and-proficiency/
app/modules/skills/actions/commands/rubric-and-proficiency/
app/modules/skills/actions/ports/outbound/rubric-and-proficiency/
app/modules/skills/actions/queries/rubric-and-proficiency/
app/modules/skills/infra/{adapters,models,repositories,seed}/rubric-and-proficiency/
app/modules/skills/public_contracts/rubric-and-proficiency/
app/modules/skills/tests/backend/unit/rubric-and-proficiency/
```

This slice groups skill rubric versioning and proficiency-scale reads/writes while retaining the
existing layer-first structure. Shared skill catalog, project-skill, role, transaction, and mixed
skill composition files remain at their broader owners. Verification: 9 focused unit tests passed;
the full typecheck has no errors from this relocation. Existing unrelated typecheck findings remain
in search/users code.

The next completed slice is `users/profile-skills`:

```text
app/modules/users/controllers/profile-skills/
app/modules/users/actions/{commands,dtos/request,ports/outbound,queries}/profile-skills/
app/modules/users/infra/{adapters,models,repositories}/profile-skills/
app/modules/users/infra/repositories/{read,write}/profile-skills/
app/modules/users/tests/backend/{unit,integration}/profile-skills/
app/composition/users/profile-skills/
```

This slice groups profile skill mutations, reads, catalog projection, persistence, and composition
adapter. Shared user profile queries, profile repositories, external dependency ports, and mixed
user composition remain at their broader owners. Verification: 4 focused unit tests, 12 integration
tests, and full `tsc --noEmit` passed.

The next completed slice is `marketplace/marketplace-application`:

```text
app/modules/marketplace/controllers/marketplace-application/
app/modules/marketplace/controllers/mappers/{request,response}/marketplace-application/
app/modules/marketplace/actions/{commands,dtos,queries}/marketplace-application/
app/modules/marketplace/actions/ports/outbound/marketplace-application/
app/modules/marketplace/validators/marketplace-application/
app/modules/marketplace/tests/backend/unit/marketplace-application/
app/composition/marketplace/marketplace-application/
```

This slice groups marketplace application submission, decision, withdrawal, applicant reads,
ranking, transport mapping, and the task application boundary adapter. Marketplace task listing and
shared action-factory wiring remain broader. Verification: 26 focused unit tests and 12 marketplace
architecture integration tests passed. The relocation introduced no new typecheck errors; unrelated
existing findings remain in filtering/reviews/skills/sprints.

The next completed slice is `notifications/notification-feed`:

```text
app/modules/notifications/controllers/notification-feed/
app/modules/notifications/controllers/mappers/response/notification-feed/
app/modules/notifications/actions/{ports/outbound,queries}/notification-feed/
app/modules/notifications/infra/{cache,repositories,resilience,search,security}/notification-feed/
app/modules/notifications/observability/notification-feed/
app/modules/notifications/tests/backend/{unit,integration}/notification-feed/
app/composition/notifications/notification-feed/
```

This slice groups notification feed reads, pagination/cursor handling, resilient canonical/search
readers, fallback admission, feed telemetry, and feed composition. Notification mutations, outbox,
projection, and shared action-factory wiring remain broader. Verification: 25 focused unit tests
passed; 3 Redis integration tests were correctly skipped because the configured cache driver was not
Redis. No typecheck error was introduced by this relocation.

The next completed slice is `taxonomy/taxonomy-governance`:

```text
app/modules/taxonomy/controllers/taxonomy-governance/
app/modules/taxonomy/controllers/mappers/request/taxonomy-governance/
app/modules/taxonomy/actions/{commands,ports/inbound,ports/outbound,queries}/taxonomy-governance/
app/modules/taxonomy/domain/taxonomy-governance/
app/modules/taxonomy/infra/{adapters,repositories}/taxonomy-governance/
app/modules/taxonomy/public_contracts/taxonomy-governance/
app/modules/taxonomy/tests/backend/{contract,integration,unit}/taxonomy-governance/
app/composition/taxonomy/taxonomy-governance/
```

Taxonomy is currently a single bounded governance capability, so its domain rules and public
contracts share the same feature vocabulary. Verification: 31 unit tests and 10 integration tests
passed; full `tsc --noEmit` passed after the relocation.

The next completed slice is `auth/social-auth`:

```text
app/modules/auth/controllers/{social-auth,mappers/request/social-auth,mappers/response/social-auth,ports/social-auth}/
app/modules/auth/actions/{commands,dtos/request,ports/outbound}/social-auth/
app/modules/auth/domain/social-auth/
app/modules/auth/infra/{adapters,models,oauth}/social-auth/
app/modules/auth/tests/backend/{unit,integration}/social-auth/
```

This slice groups OAuth redirect/callback transport, social login orchestration, provider identity
rules, persistence, and OAuth adapters. Session-token, logout, middleware, and shared identity
composition remain broader. Verification: 15 unit tests and 16 integration tests passed. The current
typecheck has one unrelated existing finding in filtering.

The next completed slice is `authorization/custom-system-role`:

```text
app/modules/authorization/actions/{commands,mappers,ports/outbound,queries}/custom-system-role/
app/modules/authorization/infra/{cache,models,repositories}/custom-system-role/
app/modules/authorization/public_contracts/custom-system-role/
app/modules/authorization/tests/backend/{unit,integration}/custom-system-role/
```

This slice groups custom system-role CRUD, permission cache behavior, and its public API boundary.
Authorization middleware and shared access policies remain broader. Verification: 4 unit tests and
2 integration tests passed; no route behavior changed.

The next completed slice is `events/domain-event-outbox-administration`:

```text
app/modules/events/actions/{commands,dtos,mappers,ports/outbound,queries}/domain-event-outbox-administration/
app/modules/events/domain/domain-event-outbox-administration/
app/modules/events/infra/repositories/domain-event-outbox-administration/
app/modules/events/tests/backend/{unit,integration}/domain-event-outbox-administration/
app/composition/{adapters,command_support}/domain-event-outbox-administration/
```

This slice groups bounded dead-letter replay, retention preview/purge, audit mapping, and their
composition adapters. Core event staging, dispatch, workers, and public event protocols remain
broader. Verification: 16 unit tests and 7 integration tests passed.

The initial guard is available as `pnpm run check:arch:backend:feature-folders`. It currently
ratchets compound feature names such as `task-authoring`, `verified-work`, and `project-context`
without failing on legacy single-word or owner-specific directories that still need module-level
classification.

Only import paths and file locations were changed in this batch. No command, controller, domain
rule, adapter, repository, route behavior, or public contract body was intentionally changed.

The next completed slices are `settings/*-settings` and `organizations/access`:

```text
app/modules/settings/actions/{commands,queries}/{account-settings,profile-settings,user-settings}/
app/modules/settings/controllers/{account-settings,profile-settings,notification-settings,user-settings}/
app/modules/organizations/actions/{commands,queries,ports/inbound,ports/outbound}/access/
app/modules/organizations/controllers/access/
app/modules/organizations/{domain,infra,public_contracts,boundary,middleware}/access/
app/modules/organizations/tests/backend/{unit,integration}/access/
app/composition/{organizations/access}/
```

These slices group user settings flows and organization access/switching flows while retaining the
existing layer-first module structure. Shared settings ports, mappers, and organization directory,
member, invitation, and dashboard capabilities remain broad or in their own existing feature
folders. Verification: the settings agent reported scoped lint and smoke checks passing; organization
access reported 30 unit and 13 integration tests passing. The action subfolders were normalized to
`actions/commands/access`, `actions/queries/access`, and `actions/ports/*/access` after review.

The next completed slice is `sprints/project-sprint`:

```text
app/modules/sprints/actions/{commands,queries}/project-sprint/
app/modules/sprints/controllers/project-sprint/
app/modules/sprints/controllers/mappers/request/project-sprint/
app/modules/sprints/domain/project-sprint/
app/modules/sprints/infra/repositories/project-sprint/
app/modules/sprints/tests/backend/{unit,integration}/project-sprint/
```

This slice groups project-sprint creation, lifecycle transitions, controllers, policy rules,
repository access, and lifecycle tests. Sprint boards, project backlog, task assignment history,
and review-domain flows remain separate capabilities. Full `tsc --noEmit` passed after the move;
focused execution is pending the repository's test-runner suite configuration.

The next completed slice is `filtering/filtering-observability`:

```text
app/modules/filtering/observability/filtering-observability/
app/modules/filtering/tests/backend/unit/observability/
```

This slice groups filter event construction, outcome sampling, bounded log payload conversion, and
the logger sink under one observability capability. Verification: full `tsc --noEmit` and the feature
folder guard passed; no route or filtering execution contract changed.

The next completed slices are `sprints/project-backlog` and `http/search-discovery`:

```text
app/modules/sprints/actions/{commands,queries,ports/outbound}/project-backlog/
app/modules/sprints/controllers/project-backlog/
app/modules/sprints/infra/repositories/read/project-backlog/
app/modules/sprints/tests/backend/{unit,integration}/project-backlog/

app/modules/http/controllers/search-discovery/
app/modules/http/controllers/mappers/request/search-discovery/
app/modules/http/actions/{dtos,queries,ports/outbound}/search-discovery/
app/modules/http/tests/backend/unit/search-discovery/
```

The sprint slice groups backlog reads and reorder operations while leaving shared sprint-board and
project-sprint contracts broad. The HTTP slice groups the search page/discovery transport and query
boundary while leaving generic search APIs and infrastructure broad. Verification: backlog 4 unit
and 1 integration test passed; search-discovery 18 focused tests and scoped ESLint passed; both
slices passed typecheck, feature-folder, side-effect, and stale-path checks.

The next reviewed slices are `sprints/sprint-board` and `organizations/members`:

```text
app/modules/sprints/actions/{ports/outbound,queries}/sprint-board/
app/modules/sprints/controllers/mappers/request/sprint-board/
app/modules/sprints/controllers/sprint-board/
app/modules/sprints/infra/repositories/read/sprint-board/
app/modules/sprints/tests/backend/{unit,integration}/sprint-board/

app/modules/organizations/actions/{commands,dtos,ports/inbound,ports/outbound,queries}/members/
app/modules/organizations/controllers/{members,mappers/request/members,mappers/response/members}/
app/modules/organizations/infra/{models,repositories,repositories/read}/members/
app/modules/organizations/public_contracts/members/
app/modules/organizations/tests/backend/{unit,integration,support}/members/
```

These moves continue converting legacy feature-first ownership trees into layer-first feature
folders. Shared organization action context, contracts, and observability remain at the broadest
accurate owner. Verification: feature-folder and side-effect guards pass; full typecheck is
currently limited by pre-existing accomplishment-publication audit typing findings.

Verification evidence for the batch:

- publication unit tests: 18 passed;
- publication contract test: 1 passed;
- publication integration tests: 8 passed;
- side-effect boundary: passed;
- full typecheck: one pre-existing unrelated error remains in
  `app/modules/tasks/tests/backend/unit/get_public_tasks_query.spec.ts`;
- module-layer placement: one pre-existing unrelated finding remains for
  `app/modules/accomplishments/actions/legacy_accomplishment_backfill.ts`.

The next completed slices are `sprints/task-sprint-assignment`, `organizations/invitations`, and
`admin/reviews`:

```text
app/modules/sprints/actions/{commands,queries}/task-sprint-assignment/
app/modules/sprints/controllers/task-sprint-assignment/
app/modules/sprints/controllers/mappers/request/task-sprint-assignment/
app/modules/sprints/public_contracts/task-sprint-assignment/
app/modules/sprints/tests/backend/{unit,integration}/task-sprint-assignment/

app/modules/organizations/actions/{commands,dtos,ports/inbound,ports/outbound,queries}/invitations/
app/modules/organizations/controllers/invitations/
app/modules/organizations/controllers/mappers/{request,response}/invitations/
app/modules/organizations/infra/repositories/invitations/
app/modules/organizations/observability/invitations/
app/modules/organizations/validators/invitations/
app/modules/organizations/tests/backend/{unit,integration}/invitations/

app/modules/admin/reviews/actions/{commands,dtos,ports/inbound,ports/outbound,queries}/reviews/
app/modules/admin/reviews/controllers/reviews/
app/modules/admin/reviews/controllers/mappers/request/reviews/
app/modules/admin/reviews/domain/reviews/
app/modules/admin/tests/backend/integration/reviews/
```

These slices group sprint task assignment history/mutations, organization invitation and join-request
flows, and administrative review moderation by capability while retaining shared action contexts and
module-wide contracts at their broadest accurate layer. Verification: full typecheck, feature-folder
guard, side-effect guard, `git diff --check`, and `gitnexus detect-changes` pass after import recovery;
the focused sprint request-mapper suite passed 7 tests.

The current implementation batch additionally covers `organizations/directory`, `admin/packages`, and
`organizations/settings`:

```text
app/modules/organizations/actions/{commands,mappers,ports/inbound,ports/outbound,queries}/directory/
app/modules/organizations/actions/dtos/{common,request,response}/directory/
app/modules/organizations/controllers/directory/
app/modules/organizations/controllers/mappers/{request,response}/directory/
app/modules/organizations/domain/directory/
app/modules/organizations/infra/{adapters,mapper,models,repositories}/directory/
app/modules/organizations/infra/repositories/{read,write}/directory/
app/modules/organizations/observability/directory/
app/modules/organizations/public_contracts/directory/
app/modules/organizations/validators/directory/
app/modules/organizations/tests/backend/{unit,integration}/directory/

app/modules/admin/packages/actions/{commands,ports/inbound,ports/outbound,queries}/packages/
app/modules/admin/packages/actions/dtos/common/packages/
app/modules/admin/packages/controllers/packages/
app/modules/admin/packages/controllers/mappers/request/packages/
app/modules/admin/packages/{constants,domain}/packages/
app/modules/admin/packages/infra/repositories/{read,write}/packages/
app/modules/admin/tests/backend/{unit,integration}/packages/

app/modules/organizations/settings/actions/{commands,ports/inbound,ports/outbound,queries}/settings/
app/modules/organizations/settings/actions/dtos/request/settings/
app/modules/organizations/settings/controllers/settings/
app/modules/organizations/settings/controllers/mappers/request/settings/
app/modules/organizations/settings/infra/repositories/write/settings/
app/modules/organizations/tests/backend/unit/settings/
```

Directory keeps the shared organization action context at `app/modules/organizations/actions`, while
its business actions, transport, domain, infrastructure, contracts, validators, and tests are grouped
under the directory feature. Package administration and organization settings now follow the same
layer-first convention. Verification for this batch: typecheck, feature-folder guard, side-effect
guard, `git diff --check`, and GitNexus change detection pass; package, settings, and directory-focused
tests were run by the migration workers and passed.

The following implementation batch is now also in place:

```text
app/modules/admin/dashboard/actions/{commands,ports/inbound,ports/outbound,queries}/dashboard/
app/modules/admin/dashboard/actions/dtos/common/dashboard/
app/modules/admin/dashboard/controllers/dashboard/
app/modules/admin/dashboard/controllers/mappers/{request,response}/dashboard/
app/modules/admin/dashboard/infra/repositories/read/dashboard/

app/modules/organizations/projects/actions/{commands,ports/inbound,ports/outbound,queries}/projects/
app/modules/organizations/projects/actions/dtos/{common,request,response}/projects/
app/modules/organizations/projects/controllers/projects/
app/modules/organizations/projects/controllers/mappers/{request,response}/projects/
app/modules/organizations/tests/backend/{unit,integration}/projects/

app/modules/organizations/actions/{commands,queries}/tasks/
app/modules/organizations/actions/dtos/{common,request,response}/tasks/
app/modules/organizations/actions/ports/{inbound,outbound}/tasks/
app/modules/organizations/controllers/tasks/
app/modules/organizations/controllers/mappers/request/tasks/
app/modules/organizations/tests/backend/unit/tasks/
```

The dashboard move was reviewed and normalized to remain inside `app/modules/admin/dashboard`; no
flattening into `app/modules/admin/actions` is allowed by this taxonomy. Verification: typecheck,
feature-folder guard, side-effect guard, diff check, and GitNexus change detection pass; task mapper
tests passed 2 tests and project/settings focused tests passed 5 tests.

The next implementation batch adds the following feature folders:

```text
app/modules/admin/users/actions/{commands,ports/inbound,ports/outbound,queries}/users/
app/modules/admin/users/actions/dtos/common/users/
app/modules/admin/users/controllers/users/
app/modules/admin/users/controllers/mappers/{request,response}/users/
app/modules/admin/users/domain/users/
app/modules/admin/users/tests/backend/unit/users/

app/modules/admin/permissions/actions/{commands,ports/inbound,ports/outbound,queries}/permissions/
app/modules/admin/permissions/actions/dtos/common/permissions/
app/modules/admin/permissions/controllers/permissions/
app/modules/admin/permissions/controllers/mappers/request/permissions/
app/modules/admin/permissions/domain/permissions/

app/modules/organizations/workflow/actions/{commands,ports/inbound,ports/outbound,queries}/workflow/
app/modules/organizations/workflow/actions/dtos/{request,response}/workflow/
app/modules/organizations/workflow/controllers/workflow/
app/modules/organizations/workflow/controllers/mappers/{request,response}/workflow/
```

These migrations preserve the existing `admin/users`, `admin/permissions`, and
`organizations/workflow` module roots while grouping commands, queries, ports, controllers, mappers,
domain policy, DTOs, and tests by capability. Verification: 6 focused tests, typecheck, feature-folder
guard, side-effect guard, diff check, and GitNexus change detection pass.

The current batch additionally covers organization dashboard/sprint capabilities and administrative
audit/dispute capabilities:

```text
app/modules/organizations/dashboard/actions/{commands,ports/inbound,ports/outbound,queries}/dashboard/
app/modules/organizations/dashboard/controllers/dashboard/

app/modules/organizations/sprints/actions/{commands,ports/outbound,queries}/sprints/
app/modules/organizations/sprints/controllers/sprints/

app/modules/admin/audit_logs/actions/{commands,ports/inbound,ports/outbound,queries}/audit_logs/
app/modules/admin/audit_logs/actions/dtos/common/audit_logs/
app/modules/admin/audit_logs/controllers/audit_logs/
app/modules/admin/audit_logs/controllers/mappers/{request,response}/audit_logs/
app/modules/admin/audit_logs/filtering/audit_logs/
app/modules/admin/audit_logs/observability/audit_logs/
app/modules/admin/tests/backend/{unit,integration}/audit_logs/

app/modules/admin/disputes/actions/{commands,ports/inbound,ports/outbound,queries}/disputes/
app/modules/admin/disputes/controllers/disputes/
app/modules/admin/disputes/controllers/mappers/request/disputes/
app/modules/admin/tests/backend/unit/disputes/
```

All four module roots remain intact; only their internal layer ownership was reorganized. Verification:
9 focused tests passed, typecheck passed during import recovery, feature-folder and side-effect guards
passed, diff check passed, and GitNexus change detection passed.

The remaining administrative feature roots in this implementation pass are now organized as:

```text
app/modules/admin/organizations/actions/{commands,ports/inbound,ports/outbound,queries}/organizations/
app/modules/admin/organizations/actions/dtos/common/organizations/
app/modules/admin/organizations/controllers/organizations/
app/modules/admin/organizations/controllers/mappers/response/organizations/
app/modules/admin/organizations/infra/repositories/read/organizations/

app/modules/admin/proficiency/actions/{commands,ports/inbound,ports/outbound,queries}/proficiency/
app/modules/admin/proficiency/controllers/proficiency/
app/modules/admin/proficiency/controllers/mappers/{request,response}/proficiency/
```

These moves preserve module-local action contexts and interfaces while making the business capability
explicit at every concrete layer. The focused administrative test batch passed 22 tests; feature-folder
and side-effect guards, diff check, and GitNexus change detection passed. The only remaining typecheck
finding is the pre-existing accomplishment publication audit-writer test typing issue.

Finally, the remaining root-level application mappers with clear ownership were grouped as follows:

```text
app/modules/projects/actions/mappers/project-context/project_application_mapper.ts
app/modules/tasks/actions/mappers/task-authoring/task_create_persistence_mapper.ts
app/modules/tasks/actions/mappers/task-authoring/task_dto_mapper.ts
app/modules/tasks/actions/mappers/task-comments/task_comment_mention_mapper.ts
app/modules/tasks/actions/mappers/task-reading/{task_permission_filter,task_query_output,task_user_projection}_mapper.ts
app/modules/tasks/actions/mappers/task-requirements/task_requirement_projection_mapper.ts
app/modules/users/actions/mappers/user-lifecycle/user_application_mapper.ts
```

The mapper moves preserve their existing contracts and only change ownership paths/imports. Focused
task mapper tests passed 9 tests; typecheck, both architecture guards, diff check, and GitNexus change
detection passed.

## 5. Review questions before each move

| Question | Evidence |
|---|---|
| What business capability owns the file? | Execution flow, symbol consumers, and module contract |
| Is the file shared? | GitNexus context/impact plus import search |
| Which existing layer owns it? | Current module-layer contract |
| What feature name is used in other layers? | This inventory and module owner decision |
| Does composition wire only this capability? | Composition consumers and factory graph |
| What proves behavior is unchanged? | Focused tests, typecheck, diff, and `gitnexus detect-changes` |

## 6. Composition feature grouping

The composition root now follows the same module/feature convention for capability-owned wiring,
while genuinely cross-module adapters remain under `app/composition/adapters`:

```text
app/composition/organizations/{access,dashboard,directory,invitations,members,persistence,projects,search,settings,tasks,workflow}/
app/composition/http/cache/factories/
app/composition/projects/project-context/factories/
app/composition/reviews/{disputes,events,sprints,tasks}/factories/
app/composition/sprints/project-sprint/factories/
app/composition/users/{administration,bookmarks,lifecycle}/factories/
```

The organization adapters, factories, and composition orchestrators were moved together so a feature
can be located from its module and capability name without changing module boundaries. Root composition
files remain only where they coordinate multiple features or modules. Verification for this batch:
typecheck, feature-folder guard, side-effect guard, diff check, and GitNexus change detection.

## 7. Additional implementation batches

The follow-up implementation continued the same taxonomy through the previously dense action/domain
roots:

```text
app/modules/tasks/actions/commands/{task-assignment,task-applications,task-attachments,task-authoring,task-comments,task-requirements,task-status,task-submissions,task-workflow}/
app/modules/tasks/actions/queries/{task-applications,task-assignment,task-authoring,task-comments,task-reading,task-requirements,task-status,task-submissions,task-workflow}/
app/modules/tasks/domain/{task-assignment,task-authoring,task-requirements,task-status,task-submissions}/

app/modules/reviews/actions/{commands,queries}/{disputes,moderation,review-core,review-session,review-submission,self-assessment,sprint-review,task-review}/
app/modules/reviews/domain/{disputes,review-core,review-session,review-submission,sprint-review,task-review}/

app/modules/projects/actions/{commands,queries}/{marketplace,project-context,project-members,work-package}/
app/modules/projects/domain/{project-context,project-members}/

app/modules/users/actions/{commands,queries}/{administration,bookmarks,profile,profile-skills,recruiting,search,talent,user-lifecycle}/
app/modules/users/domain/{administration,profile,recruiting,talent,user-lifecycle}/

app/modules/notifications/actions/{commands,queries}/{legacy,notification-feed,notification-outbox}/
app/modules/notifications/domain/{legacy,notification-feed,notification-outbox}/
app/modules/search/actions/{commands,queries}/{entity-search,global-search,index-administration,search-discovery}/
app/modules/search/domain/{entity-search,index-administration,projection-generation,quality,search-discovery}/
```

These changes preserve each module root and only refine the internal feature ownership. The remaining
root files are the next migration queue and should be reviewed for shared contracts or compatibility
before moving.

## 8. Final root-layer sweep

The remaining root files were confirmed as capability-owned and moved into feature folders:

```text
app/modules/accomplishments/domain/verified-work/accomplishment_projection_identity.ts
app/modules/cache/domain/cache-runtime/{cache_dependency_log_policy,cache_generation_control_policy,
cache_generation_policy,cache_single_flight_policy,cache_ttl_policy,redis_endpoint_identity,
redis_production_policy}.ts
app/modules/sprints/domain/project-backlog/product_backlog_rules.ts
```

At the end of this sweep, `app/modules/*/domain`, `actions/commands`, and `actions/queries` have no
direct files at their layer roots. The remaining typecheck findings are non-path typing errors in
HTTP, skills, taxonomy, and one integration test; there are no `TS2307` module-resolution errors.
Feature-folder taxonomy, side-effect boundary, `git diff --check`, and GitNexus change detection pass.
