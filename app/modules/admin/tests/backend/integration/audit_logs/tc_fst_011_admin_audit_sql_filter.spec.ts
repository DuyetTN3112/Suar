import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  ADMIN_AUDIT_FILTER_CONTEXT,
  AdminAuditFilterContextProvider,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import {
  AdminAuditPermissionProvider,
  type AdminAuditAuthorizationReader,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import { PostgresAuditLogFilterExecutor } from '#modules/audit/infra/adapters/filtering/postgres_audit_log_filter_executor'
import { FilterAuditLogsQuery } from '#modules/audit/infra/repositories/read/filter_audit_logs_query'
import type { AdminAuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>

const principal = {
  kind: 'user' as const,
  id: 'tc-fst-011-admin',
  authorizationVersion: 'tc-fst-011-v1',
}

const authorizationReader: AdminAuditAuthorizationReader = {
  resolve: () =>
    Promise.resolve({
      allowed: true,
      sessionActive: true,
      authorizationVersion: 'tc-fst-011-v1',
    }),
}

function actionFilter(action: string): FilterExpression {
  return {
    kind: 'condition',
    field: 'audit.action',
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value: action },
  }
}

function resourceTypeFilter(resourceType: string): FilterExpression {
  return {
    kind: 'condition',
    field: 'audit.resourceType',
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value: resourceType },
  }
}

function allOf(...children: FilterExpression[]): FilterExpression {
  return { kind: 'group', combinator: 'and', children }
}

function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: ADMIN_AUDIT_FILTER_CONTEXT,
    schemaVersion: 1,
    sort: [{ field: 'audit.createdAt', direction: 'desc' }],
    page: { size: 1, offset: 0 },
    ...overrides,
  }
}

function makeQuery(): ExecuteFilterQuery {
  const executor = new PostgresAuditLogFilterExecutor({
    query: new FilterAuditLogsQuery(),
    clock: () => new Date('2026-08-01T00:00:00.000Z'),
  })

  return new ExecuteFilterQuery({
    contextProvider: new AdminAuditFilterContextProvider(authorizationReader),
    permissionProvider: new AdminAuditPermissionProvider(authorizationReader),
    executorResolver: {
      getExecutor: (profile) => (profile === executor.profile ? executor : undefined),
    },
    timeoutMs: 5_000,
    hashGenerator: new NodeFilterHashGenerator(),
  })
}

test.group('Integration | TC-FST-011 admin audit SQL filter', (group) => {
  const insertedIds = new Set<string>()

  group.each.teardown(async () => {
    if (insertedIds.size === 0) return
    await db.from('audit_events').whereIn('id', [...insertedIds]).delete()
    insertedIds.clear()
  })

  test('filters the full server population before offset pagination and preserves detail fields', async ({
    assert,
  }) => {
    const token = randomUUID()
    const newerId = randomUUID()
    const targetId = randomUUID()
    const oldestId = randomUUID()
    const resourceType = `tc_fst_011_resource_${token}`
    const targetAction = `tc_fst_011.target.${token}`
    const targetRequestId = `tc-fst-011-request-${token}`
    const targetTraceId = `tc-fst-011-trace-${token}`

    await db.table('audit_events').insert([
      {
        id: newerId,
        action: `tc_fst_011.decoy.newer.${token}`,
        entity_type: resourceType,
        entity_id: `newer-${token}`,
        event_name: 'tc_fst_011.decoy',
        occurred_at: new Date('2026-07-31T10:02:00.000Z'),
        old_values: JSON.stringify({ state: 'before' }),
        new_values: JSON.stringify({ state: 'after' }),
      },
      {
        id: targetId,
        action: targetAction,
        entity_type: resourceType,
        entity_id: `target-${token}`,
        event_name: 'tc_fst_011.target_found',
        stage: 'completed',
        outcome: 'success',
        request_id: targetRequestId,
        trace_id: targetTraceId,
        occurred_at: new Date('2026-07-31T10:01:00.000Z'),
        old_values: JSON.stringify({ state: 'queued' }),
        new_values: JSON.stringify({ state: 'verified' }),
      },
      {
        id: oldestId,
        action: `tc_fst_011.decoy.oldest.${token}`,
        entity_type: resourceType,
        entity_id: `oldest-${token}`,
        event_name: 'tc_fst_011.decoy',
        occurred_at: new Date('2026-07-31T10:00:00.000Z'),
        old_values: JSON.stringify({ state: 'before' }),
        new_values: JSON.stringify({ state: 'after' }),
      },
    ])
    insertedIds.add(newerId)
    insertedIds.add(targetId)
    insertedIds.add(oldestId)

    const query = makeQuery()
    const unfilteredPage = await query.execute<AdminAuditLogRecord>({
      criteria: criteria({ filter: resourceTypeFilter(resourceType) }),
      principal,
      requestId: randomUUID(),
    })

    assert.deepEqual(unfilteredPage.hits.map((hit) => hit.id), [newerId])
    assert.deepEqual(unfilteredPage.total, { value: 3, relation: 'eq' })

    const filteredPage = await query.execute<AdminAuditLogRecord>({
      criteria: criteria({
        filter: allOf(resourceTypeFilter(resourceType), actionFilter(targetAction)),
      }),
      principal,
      requestId: randomUUID(),
    })

    assert.deepEqual(filteredPage.hits.map((hit) => hit.id), [targetId])
    assert.deepEqual(filteredPage.total, { value: 1, relation: 'eq' })
    assert.equal(filteredPage.hits[0]?.request_id, targetRequestId)
    assert.equal(filteredPage.hits[0]?.trace_id, targetTraceId)
    assert.equal(filteredPage.hits[0]?.stage, 'completed')
    assert.equal(filteredPage.hits[0]?.event_name, 'tc_fst_011.target_found')
  })
})
