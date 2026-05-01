# WP-14 / WP-10 Evidence — 2026-08-07

**Scope:** Filter Platform HTTP transport (WP-14) and the operational SQL pilot's
differential parity gap (WP-10). Working tree only; no commit was created.

## Environment

- PostgreSQL: `my-postgres-container` (localhost:5432)
- Elasticsearch test plane: started for this session on `localhost:9201`
  (`docker.elastic.co/elasticsearch/elasticsearch:8.15.0`, 256 MiB heap).
  Before it was started, every `IT-ES` suite failed with `ECONNREFUSED 127.0.0.1:9201`.
  That was a pre-existing environment gap, not a regression.

## What was missing before this session

The Filter Platform had a complete semantic kernel and a registry, but **no HTTP
boundary at all**: no controller, no composition root, no route. Every
`API` / `RP` / `VS` / `AX` layer in the test matrix was therefore unreachable,
regardless of how many unit tests were green.

The admin audit SQL executor had a contract spec that only compared *capability
declarations*. Nothing proved the SQL executor and the reference evaluator agreed
on an eligible ID set, so the `DIFF` layer had no evidence.

## WP-14 — delivered

Files added:

```text
app/modules/filtering/controllers/filter_contexts_controller.ts
app/modules/filtering/controllers/filter_query_controller.ts
app/modules/filtering/controllers/filter_http_principal.ts
app/modules/filtering/controllers/filter_http_problem.ts
app/modules/filtering/controllers/mappers/filter_request_mapper.ts
app/composition/filtering_composition.ts
app/modules/admin/audit_logs/filtering/lucid_admin_audit_authorization_reader.ts
```

Files modified:

```text
start/routes/api_v1.ts                                                   (2 routes)
app/modules/admin/audit_logs/filtering/admin_audit_filter_context_provider.ts
                                          (exported the definition for registration)
```

Routes: `GET /api/v1/filter/contexts/:context`, `POST /api/v1/filter/query`.

Security properties proven by test, not by inspection:

- the principal is resolved server-side; a payload-supplied `principal` is rejected;
- an unknown context and an unauthorized context return the *same* status, so
  discovery is not an enumeration side channel;
- criteria keys are allowlisted, so raw provider DSL (`query`, `aggs`) is refused;
- `cursor` + `offset` together are refused (Filter Platform section 5.2);
- `LucidAdminAuditAuthorizationReader` re-reads the actor's system role on every
  execution, so a revoked administrator loses access without a stale session.

### Commands

```bash
node --import=@poppinss/ts-exec bin/test.ts contract \
  --files app/modules/filtering/tests/backend/contract/filter_api.contract.spec.ts
# RED before implementation: expected 401, received 404 (no route existed)
# GREEN after: 4 passed

node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/filtering/tests/backend/integration/filter_api_permissions.spec.ts
# 6 passed
```

The integration suite is the meaningful one. It logs in a real superadmin via
`loginAs`, seeds three `audit_events` rows, and asserts that a criteria request
returns **exactly** the two matching IDs with `total.value === 2`, and that the
redacted payload secret never appears anywhere in the HTTP response body. An
empty database would not satisfy those assertions.

## WP-10 — differential parity closed

`app/modules/admin/tests/backend/contract/admin_audit_filter_differential.contract.spec.ts`

The shared `defineFilterExecutorConformanceSuite` requires `preferences` and
`relations` capabilities that the audit context deliberately does not declare, so
that suite cannot host this adapter. Parity is proven directly instead: the
PostgreSQL executor and the pure reference evaluator run the same canonical AST
over the same seeded population and must return identical eligible IDs and totals.

Scenarios: single equality, nested AND, nested OR inside AND, exclusion effect.

### Mutation check

To prove the test is not decorative, `conditionFragment` was temporarily mutated
so the `exclude` effect was ignored:

```text
- const resolved = condition.effect === 'exclude' ? `not (${predicate.sql})` : predicate.sql
+ const resolved = predicate.sql
```

Result: `3 passed, 1 failed` — the exclusion scenario failed with an eligible-ID
mismatch. The mutation was reverted and `git diff` for that file is empty.

## Verification

```bash
npx tsc --noEmit                                    # exit 0 (5094 files)
pnpm exec eslint <changed paths>                    # clean
bin/test.ts contract  (filter API + audit differential + audit conformance
                       + reference conformance)     # 40 passed
bin/test.ts integration (filter API + saved views
                       + admin audit executor)      # 17 passed
bin/test.ts integration (search discovery HTTP
                       + elasticsearch filter executor)  # 7 passed
bin/test.ts contract  (elasticsearch conformance)   # 9 passed
```

## Explicitly NOT proven

These layers remain open and no status should claim them:

- `RP` / `VS` / `AX`: no Playwright role-play, screenshot, or accessibility run.
- `PERF`: no benchmark or capacity measurement.
- UI adoption: `search_center.svelte` still derives `filteredResults` on the
  client over a bounded result page, so its counts are not authoritative.
- Saved-view HTTP surface (WP-18) is not routed.
