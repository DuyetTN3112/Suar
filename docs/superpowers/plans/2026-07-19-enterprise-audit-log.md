# Enterprise Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scoped, structured, tamper-evident audit log foundation for user, organization, and system admin audit surfaces.

**Architecture:** Keep one authoritative `audit_events` store and add explicit `audit_event_scopes` projections. New audit writes fill legacy columns, enterprise metadata columns, deterministic hashes, and read scopes. Read paths prefer explicit scopes and keep legacy fallback for old rows.

**Tech Stack:** AdonisJS, TypeScript, Lucid/Knex migrations, PostgreSQL JSONB, Japa backend integration tests, Vitest/Svelte frontend tests, Playwright E2E.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-19-enterprise-audit-log-design.md`.
- Do not create separate user/org/system audit event tables.
- Preserve existing `audit_events` legacy reads and writes.
- Use TDD: write failing test, verify failure, implement, verify pass.
- Run `gitnexus impact <symbol>` before editing any existing function, class, method, or exported symbol.
- Do not use GitNexus MCP in this repo.
- Run `gitnexus detect-changes` before committing or claiming final scope.
- Current branch is dirty; stage only files changed for this audit-log feature.
- Critical audit write failures must throw; best-effort writes may log and continue.
- Audit timestamps must output ISO 8601 UTC.
- Sensitive fields must be redacted before persistence.

---

## File Structure

Create:

- `database/migrations/20260719090000_add_enterprise_audit_events.ts`
  Adds enterprise columns to `audit_events` and creates `audit_event_scopes`.

- `app/modules/audit/domain/audit_event_redaction.ts`
  Redacts sensitive fields recursively.

- `app/modules/audit/domain/audit_event_hash.ts`
  Canonicalizes audit payloads and computes SHA-256 hashes.

- `app/modules/audit/domain/audit_event_scope.ts`
  Derives `user`, `organization`, and `system` scopes from write input/context.

- `app/modules/audit/tests/backend/unit/audit_event_enterprise_helpers.spec.ts`
  Unit coverage for redaction, scope derivation, and hash stability.

Modify:

- `app/modules/audit/actions/audit_action_context.ts`
  Keep context as source for organization/request/trace/workflow metadata.

- `app/modules/audit/actions/write_audit_log.ts`
  Accept enterprise fields and `critical` option; redact input; forward metadata to repository.

- `app/modules/audit/infra/repositories/audit_log_repository_interface.ts`
  Extend create/query record contracts.

- `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts`
  Persist enterprise columns, scopes, and hashes.

- `app/modules/audit/infra/repositories/write/audit_log_writer_repository.ts`
  Forward enterprise metadata and critical behavior.

- `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts`
  Prefer explicit `audit_event_scopes`; keep legacy fallback.

- `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts`
  Map enterprise metadata to API result.

- `app/modules/admin/controllers/mappers/response/admin_api_response_mapper.ts`
  Extract investigation metadata from columns first, payload second.

- `app/modules/admin/tests/backend/integration/audit_logs.spec.ts`
  Add integration proof for scoped enterprise rows.

- `inertia/apps/admin/modules/audit_logs/audit_log_page.svelte`
  Show enterprise metadata already exposed by mapper.

- `inertia/apps/org/modules/audit_logs/audit_log_page.svelte`
  Keep org view behavior aligned with scoped data.

- `inertia/apps/user/modules/audit_logs/audit_log_page.svelte`
  Keep user view behavior aligned with scoped data.

- `inertia/apps/admin/tests/modules/audit_logs/console_model.test.ts`
  Verify metadata presentation remains stable.

- `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts`
  Add system admin enterprise metadata screenshot.

## Task 1: Enterprise Audit Helpers

**Files:**
- Create: `app/modules/audit/domain/audit_event_redaction.ts`
- Create: `app/modules/audit/domain/audit_event_hash.ts`
- Create: `app/modules/audit/domain/audit_event_scope.ts`
- Test: `app/modules/audit/tests/backend/unit/audit_event_enterprise_helpers.spec.ts`

**Interfaces:**
- Produces: `redactAuditValue(value: unknown): { value: unknown; redactionApplied: boolean }`
- Produces: `computeAuditEventHash(input: AuditEventHashInput): string`
- Produces: `deriveAuditEventScopes(input: AuditEventScopeInput): AuditEventScope[]`

- [ ] **Step 1: Write failing helper tests**

```ts
import { test } from '@japa/runner'

import { computeAuditEventHash } from '#modules/audit/domain/audit_event_hash'
import { redactAuditValue } from '#modules/audit/domain/audit_event_redaction'
import { deriveAuditEventScopes } from '#modules/audit/domain/audit_event_scope'

test.group('Unit | Enterprise audit helpers', () => {
  test('redacts sensitive fields recursively', ({ assert }) => {
    const result = redactAuditValue({
      email: 'person@example.com',
      password: 'secret',
      nested: { refresh_token: 'token-1' },
    })

    assert.isTrue(result.redactionApplied)
    assert.deepEqual(result.value, {
      email: 'person@example.com',
      password: '[REDACTED]',
      nested: { refresh_token: '[REDACTED]' },
    })
  })

  test('computes stable hash independent of object key order', ({ assert }) => {
    const left = computeAuditEventHash({
      event: { action: 'user.updated', target: { id: 'user-1', type: 'user' } },
      prevHash: 'previous-hash',
    })
    const right = computeAuditEventHash({
      event: { target: { type: 'user', id: 'user-1' }, action: 'user.updated' },
      prevHash: 'previous-hash',
    })

    assert.equal(left, right)
    assert.match(left, /^[a-f0-9]{64}$/)
  })

  test('derives system user and organization scopes', ({ assert }) => {
    const scopes = deriveAuditEventScopes({
      actorUserId: 'user-1',
      actorOrganizationId: 'org-1',
      targetType: 'task',
      targetId: 'task-1',
      targetOrganizationId: 'org-1',
      affectedUserIds: ['user-2'],
    })

    assert.deepEqual(scopes, [
      { surface: 'system', userId: null, organizationId: null },
      { surface: 'user', userId: 'user-1', organizationId: null },
      { surface: 'user', userId: 'user-2', organizationId: null },
      { surface: 'organization', userId: null, organizationId: 'org-1' },
    ])
  })
})
```

- [ ] **Step 2: Run helper tests and verify RED**

Run: `node ace test app/modules/audit/tests/backend/unit/audit_event_enterprise_helpers.spec.ts`

Expected: FAIL because helper modules do not exist.

- [ ] **Step 3: Implement helper modules**

Implement `redactAuditValue`, `computeAuditEventHash`, and `deriveAuditEventScopes` exactly with the interfaces above.

- [ ] **Step 4: Run helper tests and verify GREEN**

Run: `node ace test app/modules/audit/tests/backend/unit/audit_event_enterprise_helpers.spec.ts`

Expected: PASS.

## Task 2: Enterprise Audit Schema

**Files:**
- Create: `database/migrations/20260719090000_add_enterprise_audit_events.ts`
- Modify: `database/schema.ts` only if project generator updates it.

**Interfaces:**
- Consumes: existing `audit_events`.
- Produces: enterprise columns and `audit_event_scopes`.

- [ ] **Step 1: Write migration**

Create migration adding nullable enterprise columns and scope table from the spec.

- [ ] **Step 2: Run migration in test DB**

Run: `node ace migration:run --force`

Expected: migration succeeds.

- [ ] **Step 3: Verify schema visibility**

Run: `node ace migration:status`

Expected: new migration marked completed.

## Task 3: Enterprise Writer Contract

**Files:**
- Modify: `app/modules/audit/infra/repositories/audit_log_repository_interface.ts`
- Modify: `app/modules/audit/actions/write_audit_log.ts`
- Modify: `app/modules/audit/infra/repositories/write/audit_log_writer_repository.ts`
- Modify: `app/modules/audit/infra/repositories/postgres_audit_log_repository.ts`
- Test: `app/modules/admin/tests/backend/integration/audit_logs.spec.ts`

**Interfaces:**
- Produces: `WriteAuditLogInput.critical?: boolean`
- Produces: `WriteAuditLogInput.event_name?: string`
- Produces: `WriteAuditLogInput.target_organization_id?: string`
- Produces: `WriteAuditLogInput.affected_user_ids?: string[]`

- [ ] **Step 1: Run GitNexus impact before edits**

Run:

```bash
gitnexus impact writeAuditLog
gitnexus impact PostgresAuditLogRepository
```

Expected: report blast radius. If HIGH or CRITICAL, warn before edits.

- [ ] **Step 2: Write failing integration test for enterprise write**

Add a test that calls `auditPublicApi.write` with enterprise metadata and asserts:

- new metadata columns are persisted
- sensitive values are redacted
- scopes contain system, actor user, affected user, and organization rows
- `event_hash` is 64 lowercase hex chars

- [ ] **Step 3: Run integration test and verify RED**

Run: `node ace test app/modules/admin/tests/backend/integration/audit_logs.spec.ts --grep="enterprise audit write"`

Expected: FAIL because columns/scopes are not persisted.

- [ ] **Step 4: Implement writer contract**

Extend the interfaces and repository create path. Use helper modules from Task 1.

- [ ] **Step 5: Run integration test and verify GREEN**

Run: `node ace test app/modules/admin/tests/backend/integration/audit_logs.spec.ts --grep="enterprise audit write"`

Expected: PASS.

## Task 4: Scoped Read Repository

**Files:**
- Modify: `app/modules/audit/infra/repositories/read/audit_log_read_repository.ts`
- Modify: `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts`
- Test: `app/modules/admin/tests/backend/integration/audit_logs.spec.ts`

**Interfaces:**
- Consumes: `AdminAuditLogListParams.surface`
- Consumes: `AdminAuditLogListParams.actorUserId`
- Consumes: `AdminAuditLogListParams.organizationId`
- Produces: scoped rows via `audit_event_scopes`.

- [ ] **Step 1: Run GitNexus impact before edits**

Run:

```bash
gitnexus impact listAdminAuditLogs
gitnexus impact ListAuditLogsQuery
```

Expected: report blast radius. If HIGH or CRITICAL, warn before edits.

- [ ] **Step 2: Write failing scoped read tests**

Add tests proving:

- user surface returns only rows with `surface = user` and matching `user_id`
- organization surface returns only rows with `surface = organization` and matching `organization_id`
- system surface returns system-scoped rows
- old unscoped rows still use legacy fallback

- [ ] **Step 3: Run scoped read tests and verify RED**

Run: `node ace test app/modules/admin/tests/backend/integration/audit_logs.spec.ts --grep="enterprise audit scopes"`

Expected: FAIL because reads still rely on legacy filters.

- [ ] **Step 4: Implement scoped reads**

Join `audit_event_scopes` for scoped surfaces. Keep legacy fallback for rows that have no scope rows.

- [ ] **Step 5: Run scoped read tests and verify GREEN**

Run: `node ace test app/modules/admin/tests/backend/integration/audit_logs.spec.ts --grep="enterprise audit scopes"`

Expected: PASS.

## Task 5: Response Mapper And UI Metadata

**Files:**
- Modify: `app/modules/admin/controllers/mappers/response/admin_api_response_mapper.ts`
- Modify: `app/modules/admin/actions/audit_logs/queries/list_audit_logs_query.ts`
- Modify: `inertia/apps/admin/tests/modules/audit_logs/console_model.test.ts`
- Modify: `inertia/apps/admin/modules/audit_logs/audit_log_page.svelte`
- Modify: `inertia/apps/org/modules/audit_logs/audit_log_page.svelte`
- Modify: `inertia/apps/user/modules/audit_logs/audit_log_page.svelte`

**Interfaces:**
- Produces: `investigation.requestId`, `traceId`, `actorOrganizationId`, `targetScope`, `retentionClass`, `summary`.

- [ ] **Step 1: Run GitNexus impact before edits**

Run:

```bash
gitnexus impact mapAdminAuditLogResponse
gitnexus impact buildAdminAuditLogConsoleModel
```

Expected: report blast radius. If HIGH or CRITICAL, warn before edits.

- [ ] **Step 2: Write failing mapper/UI model tests**

Extend `console_model.test.ts` with an enterprise row and assert metadata labels show request, trace, retention, actor, and target.

- [ ] **Step 3: Run frontend unit test and verify RED**

Run: `pnpm vitest run inertia/apps/admin/tests/modules/audit_logs/console_model.test.ts`

Expected: FAIL until mapper/model fields support enterprise metadata.

- [ ] **Step 4: Implement mapper/model updates**

Prefer enterprise columns where present. Fall back to structured `new_values` parsing and legacy summary.

- [ ] **Step 5: Run frontend unit test and verify GREEN**

Run: `pnpm vitest run inertia/apps/admin/tests/modules/audit_logs/console_model.test.ts`

Expected: PASS.

## Task 6: E2E Roleplay And Screenshots

**Files:**
- Modify: `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts`
- Produce screenshots in Playwright test output.

**Interfaces:**
- Consumes: test seeding endpoints and audit routes.
- Produces: screenshot proof for system admin, org admin, user surfaces.

- [ ] **Step 1: Write failing E2E roleplay**

Add Playwright tests that:

- seed enterprise audit rows
- sign in as system admin and inspect `/admin/audit-logs`
- sign in as organization owner/admin and inspect `/org/audit-logs`
- sign in as regular user and inspect `/settings/audit-logs`
- capture screenshots for each surface

- [ ] **Step 2: Run E2E and verify RED if implementation incomplete**

Run: `pnpm playwright test inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts --grep="enterprise audit"`

Expected: FAIL until backend and UI expose enterprise metadata.

- [ ] **Step 3: Implement missing test support only if required**

If existing testing seed endpoint cannot create enterprise rows, extend `start/routes/testing.ts` with a test-only seeding path that inserts `audit_events` and `audit_event_scopes`.

- [ ] **Step 4: Run E2E and verify GREEN**

Run: `pnpm playwright test inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts --grep="enterprise audit"`

Expected: PASS with screenshots in Playwright output.

## Task 7: Final Verification

**Files:**
- All files touched above.

**Interfaces:**
- Produces: final evidence report.

- [ ] **Step 1: Run targeted unit tests**

Run:

```bash
node ace test app/modules/audit/tests/backend/unit/audit_event_enterprise_helpers.spec.ts
pnpm vitest run inertia/apps/admin/tests/modules/audit_logs/console_model.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run targeted integration tests**

Run: `node ace test app/modules/admin/tests/backend/integration/audit_logs.spec.ts`

Expected: PASS.

- [ ] **Step 3: Run targeted E2E**

Run: `pnpm playwright test inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts --grep="enterprise audit"`

Expected: PASS and screenshots generated.

- [ ] **Step 4: Run GitNexus detect changes**

Run: `gitnexus detect-changes`

Expected: affected symbols match audit/admin audit log scope only.

- [ ] **Step 5: Report roleplay findings**

Report:

- system admin experience
- organization admin experience
- regular user experience
- screenshot paths
- test commands run
- remaining production-hardening risks, if any
