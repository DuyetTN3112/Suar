import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import {
  ADMIN_AUDIT_FILTER_CONTEXT,
  AdminAuditFilterContextProvider,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import type { AdminAuditAuthorizationReader } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import { PostgresAuditLogFilterExecutor } from '#modules/audit/infra/adapters/filtering/postgres_audit_log_filter_executor'
import { FilterAuditLogsQuery } from '#modules/audit/infra/repositories/read/filter_audit_logs_query'
import { assertFilterContextExecutorCompatibility } from '#modules/filtering/infra/adapters/filtering-runtime/in_memory_filter_context_registry'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import { referenceAuthorizationBinding } from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'

const authorizationReader: AdminAuditAuthorizationReader = {
  resolve: () =>
    Promise.resolve({
      allowed: true,
      sessionActive: true,
      authorizationVersion: 'admin-contract-v1',
    }),
}

test.group('Contract | Admin audit PostgreSQL Filter executor', () => {
  test('advertises exactly the domain context capabilities supported by the SQL binding allowlist', async ({
    assert,
  }) => {
    const definition = await new AdminAuditFilterContextProvider(
      authorizationReader
    ).getEffectiveDefinition({
      context: ADMIN_AUDIT_FILTER_CONTEXT,
      principal: { kind: 'user', id: 'contract-admin' },
    })
    const executor = new PostgresAuditLogFilterExecutor({ query: new FilterAuditLogsQuery() })
    const capabilities = executor.describeCapabilities()

    assert.equal(executor.profile, definition.executionProfile)
    assert.isTrue(capabilities.text)
    assert.isTrue(capabilities.facets)
    assert.isTrue(capabilities.nestedGroups)
    assert.isTrue(capabilities.relativeTime)
    assert.isFalse(capabilities.preferences)
    assert.isFalse(capabilities.relations)
    assert.deepEqual(capabilities.pagination, ['offset'])
    assert.deepEqual(capabilities.totalRelations, ['eq'])
    assert.doesNotThrow(() => assertFilterContextExecutorCompatibility(definition, capabilities))
    for (const field of definition.fields) {
      assert.deepEqual(capabilities.fieldOperators[field.key], field.operators, field.key)
    }
  })

  test('reuses WP-08 authorization evidence semantics and aborts without fabricated empty truth', async ({
    assert,
  }) => {
    const executor = new PostgresAuditLogFilterExecutor({ query: new FilterAuditLogsQuery() })
    const definition = await new AdminAuditFilterContextProvider(
      authorizationReader
    ).getEffectiveDefinition({
      context: ADMIN_AUDIT_FILTER_CONTEXT,
      principal: { kind: 'user', id: 'contract-admin' },
    })
    const authorizationBinding = referenceAuthorizationBinding({
      context: definition.key,
      schemaVersion: definition.version,
      authorizationVersion: 'admin-contract-v1',
    })
    const input = {
      definition,
      criteria: {
        context: definition.key,
        schemaVersion: definition.version,
        filter: {
          kind: 'condition' as const,
          field: 'audit.resourceType',
          operator: 'eq',
          effect: 'require' as const,
          unknown: 'exclude' as const,
          value: { kind: 'scalar' as const, value: `absent-${randomUUID()}` },
        },
        sort: [{ field: 'audit.createdAt', direction: 'desc' as const }],
        page: { size: 10, offset: 0 },
      },
      authorizationBinding,
      requestId: randomUUID(),
    }
    const result = await executor.execute(input)

    assert.strictEqual(result.authorizationEvidence.hits, authorizationBinding)
    assert.strictEqual(result.authorizationEvidence.total, authorizationBinding)
    assert.strictEqual(result.authorizationEvidence.facets, authorizationBinding)
    assert.strictEqual(result.authorizationEvidence.suggestions, authorizationBinding)
    assert.strictEqual(result.authorizationEvidence.page, authorizationBinding)
    assert.deepEqual(result.total, { value: 0, relation: 'eq' })

    const controller = new AbortController()
    controller.abort()
    const error = await executor
      .execute({ ...input, signal: controller.signal })
      .catch((caught: unknown) => caught)
    assert.instanceOf(error, FilterExecutionError)
    assert.equal((error as FilterExecutionError).code, 'FILTER_REQUEST_ABORTED')
  })
})
