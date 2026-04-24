# DB / internal schema notes / Schema Test Audit

| Field | Value |
|---|---|
| Status | Current audit |
| Last Reviewed | 2026-07-14 |
| Scope | Test DB safety, `schema/migration evidence`, `database/schema.ts`, migrations, live `test database config`, schema-sensitive tests |
| Primary Sources | `docs_AI/integration_test_db_connect.md`, `schema/migration evidence`, `database/schema.ts`, `database/migrations/*`, `tests/helpers/test_datastore_guard.ts`, `scripts/start_e2e_server.sh` |

## Verdict

The project now has a safer DB test flow than the old docs implied, but DB truth still needs to be treated as multi-source evidence:

- integration and E2E flows force `database config = test database config`
- `suar_test` was checked read-only and contains the critical marketplace/sprint-review/review tables
- current `schema/migration evidence` and `database/schema.ts` include the sprint-review and parked marketplace tables that older audit text said were missing
- test coverage still does not fully prove static schema evidence, generated schema, Lucid models, migrations, and live DB stay synchronized automatically

## DB Connection Source Of Truth

For local DB connection and safe test DB usage, open this first:

```text
docs_AI/integration_test_db_connect.md
```

That file documents the actual env names, safe Node connection snippet, integration flow, E2E server flow, and `test database config` guard. This audit summarizes DB safety evidence; it is not the primary how-to for connecting to DB.

Layer reminder: a safe integration DB connection only proves integration tests are pointed at the intended test database. It does not imply E2E passes; E2E still needs Playwright/browser evidence against the test server and test DB.

## Current Evidence

| Evidence | Current Finding | Strength |
|---|---|---|
| `docs_AI/integration_test_db_connect.md` | Documents safe integration/E2E path: require `test database config`, migrate test DB, override `database config`, avoid unsafe dev-server reuse | strong |
| `tests/helpers/test_datastore_guard.ts` | `applyTestDatastoreOverrides()` sets `database config` to `test database config`; guard rejects DB names without `test` unless explicitly bypassed | strong |
| `scripts/db_test_migrate.sh` | Runs migrations with `database config="$test database config"` and `--no-schema-generate` | strong |
| `scripts/start_e2e_server.sh` | Playwright server loads `local runtime config`, requires `test database config`, exports `database config="$test database config"`, runs migrations unless skipped | strong |
| `playwright.config.ts` | E2E web server command is `sh scripts/start_e2e_server.sh`; reuse existing server requires explicit env | strong |
| `schema/migration evidence` | Contains `marketplace_applications`, `project_sprints`, `sprint_review_packages`, `sprint_manager_reviews`, `sprint_environment_reviews` | strong static snapshot |
| `database/schema.ts` | Contains generated classes for `MarketplaceApplicationSchema`, `ProjectSprintSchema`, `SprintReviewPackageSchema`, `SprintManagerReviewSchema`, `SprintEnvironmentReviewSchema`, `SprintReviewDisputeSchema` | strong static snapshot |
| Read-only `suar_test` query | Found `ai_dispute_evaluations`, `marketplace_applications`, `project_sprints`, `review_disputes`, `sprint_environment_reviews`, `sprint_manager_reviews`, `sprint_review_packages`, `task_applications`, `tasks` | strong live evidence |

Read-only live check output shape:

```json
{
  "database": "suar_test",
  "foundTables": [
    "ai_dispute_evaluations",
    "marketplace_applications",
    "project_sprints",
    "review_disputes",
    "sprint_environment_reviews",
    "sprint_manager_reviews",
    "sprint_review_packages",
    "task_applications",
    "tasks"
  ]
}
```

No DB password or connection credential was printed.

## Matrix

| ID | Risk / Behavior | Expected Proof | Current Evidence | Status |
|---|---|---|---|---|
| DB-001 | Integration tests must never run against normal dev DB by accident | Test bootstrap forces `database config = test database config` and rejects unsafe DB names | `tests/helpers/test_datastore_guard.ts`, `tests/helpers/bootstrap.ts` | covered |
| DB-002 | E2E must boot its own test server on test DB by default | Playwright web server uses `scripts/start_e2e_server.sh`; script requires `test database config` | `playwright.config.ts`, `scripts/start_e2e_server.sh` | covered |
| DB-003 | Test DB is migrated before integration/E2E | Safe scripts run `pnpm run db:test:migrate` | `scripts/test_integration_safe.sh`, `scripts/start_e2e_server.sh`, `scripts/db_test_migrate.sh` | covered |
| DB-004 | Static `schema/migration evidence` includes current critical sprint-review tables | schema evidence has table DDL and indexes | `schema/migration evidence` grep evidence | covered static |
| DB-005 | Generated `database/schema.ts` includes current critical sprint-review classes | Generated schema classes exist | `database/schema.ts` grep evidence | covered static |
| DB-006 | Live test DB includes critical tables | Read-only information_schema query against `suar_test` | live query output above | covered live |
| DB-007 | Marketplace storage truth is not confused by parked `marketplace_applications` | Tests prove apply/process/withdraw still mutate canonical runtime table | `marketplace_routes.spec.ts` route-level invariant; marketplace matrix row MKT-026 | covered integration |
| DB-008 | Static schema evidence and generated schema stay synchronized after future migrations | Automated test compares migration-created tables to schema evidence | No broad drift test found | missing |
| DB-009 | Lucid models match live DB nullability/defaults/checks | Model-schema drift test for high-risk tables | Some targeted schema tests exist; no broad model-vs-DB verifier | partial |
| DB-010 | Docs that cite `schema/migration evidence` do not rely on stale line-level claims | Docs refreshed or marked with review date | Old `docs/deep-doc-code-db-audit.md` F01 was stale until superseded | partial |

## Important Correction

`docs/deep-doc-code-db-audit.md` previously said `schema/migration evidence` did not contain `marketplace_applications`, `project_sprints`, `sprint_review_packages`, `sprint_manager_reviews`, or `sprint_environment_reviews`.

Current state contradicts that old finding. On 2026-07-14:

- `schema/migration evidence` contains those tables
- `database/schema.ts` contains generated schema classes for those tables
- `suar_test` contains those tables

The old warning is still useful as a class of risk: static DB artifacts can drift. It is no longer accurate for those specific tables.

## Existing Schema Tests With Real Value

- `app/modules/reviews/tests/backend/integration/project_sprint_schema.spec.ts` persists a sprint review package with manager and environment reviews.
- `app/modules/skills/tests/backend/integration/competency_schema_repair_audit.spec.ts` queries `information_schema.columns` for repaired competency/review columns.
- `app/modules/tasks/tests/backend/integration/create_task.spec.ts` checks required task schema columns before running task create tests.

These tests are better than pure mocked tests because they fail when the migrated test DB is missing required physical columns/tables.

## Weak Spots

- There is no broad test that checks every table created by current migrations exists in `schema/migration evidence` and `database/schema.ts`.
- There is no generated-schema freshness gate in `test:inventory`, `test:e2e:policy`, or module matrix generation.
- `scripts/db_test_migrate.sh` intentionally uses `--no-schema-generate`, so migration success does not update `database/schema.ts`.
- `scripts/export_runtime_schema_snapshot.mjs` writes `schema/migration evidence` from `database config`, not automatically from `test database config`; this is useful for runtime snapshots but can create ambiguity if the source DB is not named in review notes.

## Recommended Next Tests

1. Add `test:schema:drift`: parse migration-created table names after a cutoff and assert both `schema/migration evidence` and `database/schema.ts` contain them.
2. Add live schema verifier for high-risk tables: tasks, task applications, marketplace applications, project sprints, sprint review packages, review disputes, AI dispute evaluations.
3. Add CI gate that fails if `schema/migration evidence` is older than latest migration touching DB structure, or require an explicit stale marker.
4. Add a small docs check that warns when old audit docs contradict current static schema grep for the named tables.
