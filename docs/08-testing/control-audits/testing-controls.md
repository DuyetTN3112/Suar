# Testing Control Audit Matrix

| Field | Value |
|---|---|
| Status | Active control audit |
| Purpose | Separate test infrastructure, DB/schema safety, generated docs freshness, and false-pass policy from business-flow coverage |
| Last Reviewed | 2026-07-15 |

## Scope

Control audits use this hierarchy:

```text
Control family
└── Control objective
    └── Failure scenario
        └── Automated check
```

`covered` must not hide four different meanings. Use separate columns:

| Column | Meaning |
|---|---|
| Control implemented | Guard/tool exists |
| Direct automated test | Failure scenario has a specific test |
| Live verified | Current environment/data was checked |
| CI enforced | Command/gate is part of required workflow |

DB connection guidance lives outside this folder in `docs_AI/integration_test_db_connect.md`. Use that file as the source of truth for safe local DB connection, integration DB setup, and E2E test-server DB isolation before interpreting any control row below.

Control status is not product coverage status. For example, a working integration DB guard can make integration evidence safer, but it does not prove the matching E2E scenario passes in a browser.

## Matrix

| Control Family | Control Objective | Failure Scenario | Check ID | Evidence | Control implemented | Direct automated test | Live verified | CI enforced | Gap |
|---|---|---|---|---|---|---|---|---|---|
| Test DB safety | Integration tests cannot hit dev/prod DB | Missing `test database config` | CTRL-DB-TC001 | `app/modules/shared/tests/backend/unit/test_datastore_guard.spec.ts`, `scripts/test_integration_safe.sh`, `docs_AI/integration_test_db_connect.md`; command: `pnpm exec node --import=@poppinss/ts-exec bin/test.ts --suites=unit --files=app/modules/shared/tests/backend/unit/test_datastore_guard.spec.ts` | yes | yes | passed 2026-07-15 | partial | Add CI gate for this exact control spec. |
| Test DB safety | Integration tests require test-named DB | DB name lacks `test` | CTRL-DB-TC002 | `app/modules/shared/tests/backend/unit/test_datastore_guard.spec.ts`, `tests/helpers/test_datastore_guard.ts`, `docs_AI/integration_test_db_connect.md`; command above | yes | yes | passed 2026-07-15 | partial | Add CI gate for this exact control spec. |
| Test DB safety | Explicit bypass is visible and deliberate | Developer bypasses safety guard | CTRL-DB-TC003 | `app/modules/shared/tests/backend/unit/test_datastore_guard.spec.ts`, `tests/helpers/test_datastore_guard.ts`; bypass now requires `ALLOW_UNSAFE_TEST_DATASTORES_REASON` and logs it | yes | yes | passed 2026-07-15 | partial | Add CI gate for this exact control spec. |
| E2E server isolation | E2E should not reuse dev server by default | Playwright reuses unsafe running server | CTRL-E2E-TC001 | `docs_AI/integration_test_db_connect.md`, Playwright webServer behavior | yes | missing | failed current Playwright startup | partial | Add config/meta check for test DB server binding. |
| DB migration | Test DB is migrated before integration/E2E | Migration missing/stale | CTRL-DB-TC004 | `db:test:migrate`, `test_integration_safe.sh` | yes | partial | not current run | partial | Add explicit migration freshness assertion. |
| Static SQL snapshot | `schema/migration evidence` contains runtime tables | Snapshot omits marketplace/sprint tables | CTRL-SQL-TC001 | `db-docs-ai-schema-audit.md` | yes | missing | previously live checked | missing | Add schema evidence drift command to CI. |
| Generated schema | `database/schema.ts` matches migrations | Generated classes stale | CTRL-SCHEMA-TC001 | `db-docs-ai-schema-audit.md` | yes | missing | previously inspected | missing | Add schema generation diff gate. |
| Live schema | Test DB contains critical runtime tables | Live DB missing critical table | CTRL-LIVE-TC001 | `db-docs-ai-schema-audit.md` | N/A | missing | previously checked read-only | missing | Add read-only table-existence verifier. |
| Runtime storage invariant | Marketplace runtime uses `task_applications` not parked table | Tests assert wrong table | CTRL-STORAGE-TC001 | `marketplace-application-flow.md` | yes | yes | `marketplace_routes.spec.ts` applies, approves, withdraws, then checks no matching `marketplace_applications` rows | covered integration | Keep invariant in integration tests. |
| False-pass policy | New weak E2E patterns fail policy | New `hasRows || hasEmptyState` pattern added | CTRL-FP-TC001 | `scripts/tests/scan_false_pass_patterns.mjs`, `critical_e2e_policy.json` | yes | yes | direct scanner returned no offenders | yes via `test:e2e:policy` but webServer startup can block | Make scanner runnable outside Playwright webServer. |
| False-pass debt | Existing weak E2E patterns remain tracked | Allowed offender silently treated as clean | CTRL-FP-TC002 | `critical_e2e_policy.json` allowlist | yes | yes | allowlist exists | partial | Burn down allowed offenders to zero. |
| Generated inventory | Test inventory docs do not drift silently | Generated markdown/json stale | CTRL-INV-TC001 | `test:inventory` | yes | yes | command passed | partial | Require in CI. |
| Module inventory | Module counts not called coverage | Report says coverage from file counts | CTRL-INV-TC002 | `test:inventory:modules`, `module_suite_matrix.md` | yes | yes | command passed | partial | Keep wording as inventory only. |
| Module inventory | Frontend E2E specs map to business modules | E2E specs under `inertia/apps/user|org` all show as zero | CTRL-INV-TC003 | `scripts/tests/collect_module_suite_matrix.mjs`, `scripts/tests/assert_module_suite_matrix.mjs`, `docs/test/generated/module_suite_matrix.md` | yes | yes | passed 2026-07-15 | partial | Require `test:inventory:modules` in CI. |
| Command semantics | Backend aggregate is not mislabeled as full confidence | `test:full-confidence` only runs unit/integration | CTRL-CMD-TC001 | `package.json`, `scripts/tests/assert_module_suite_matrix.mjs`; command: `pnpm run test:inventory:modules` | yes | yes | passed 2026-07-15 | partial | Require command contract guard in CI. |

## Use Rule

Control rows prove safety of the testing system. They do not prove product behavior. Link them from business matrices only when the business claim depends on test infrastructure safety.
