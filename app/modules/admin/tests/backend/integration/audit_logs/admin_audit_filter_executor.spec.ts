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
  type AdminAuditAuthorizationSnapshot,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import { PostgresAuditLogFilterExecutor } from '#modules/audit/infra/adapters/filtering/postgres_audit_log_filter_executor'
import { FilterAuditLogsQuery } from '#modules/audit/infra/repositories/read/filter_audit_logs_query'
import type { AdminAuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type Expression = NonNullable<QueryCriteriaRequest['filter']>

class MutableAuthorizationReader implements AdminAuditAuthorizationReader {
  calls = 0
  snapshot: AdminAuditAuthorizationSnapshot = {
    allowed: true,
    sessionActive: true,
    authorizationVersion: 'admin-policy-v1',
  }
  failAtCall?: number
  denyAtCall?: number

  resolve(): Promise<AdminAuditAuthorizationSnapshot> {
    this.calls += 1
    if (this.failAtCall === this.calls) return Promise.reject(new Error('private policy failure'))
    if (this.denyAtCall === this.calls) {
      return Promise.resolve({ ...this.snapshot, allowed: false })
    }
    return Promise.resolve(structuredClone(this.snapshot))
  }
}

const principal = {
  kind: 'user' as const,
  id: 'system-admin-wp10',
  authorizationVersion: 'session-v1',
}

function condition(
  field: string,
  operator: string,
  value?: Extract<Expression, { kind: 'condition' }>['value']
): Extract<Expression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
  }
}

function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: ADMIN_AUDIT_FILTER_CONTEXT,
    schemaVersion: 1,
    sort: [{ field: 'audit.createdAt', direction: 'desc' }],
    page: { size: 50 },
    ...overrides,
  }
}

function query(reader: MutableAuthorizationReader, clock: () => Date): ExecuteFilterQuery {
  const executor = new PostgresAuditLogFilterExecutor({ query: new FilterAuditLogsQuery(), clock })
  return new ExecuteFilterQuery({
    contextProvider: new AdminAuditFilterContextProvider(reader),
    permissionProvider: new AdminAuditPermissionProvider(reader),
    executorResolver: {
      getExecutor: (profile) => (profile === executor.profile ? executor : undefined),
    },
    timeoutMs: 5_000,
    hashGenerator: new NodeFilterHashGenerator(),
  })
}

interface SeededAuditScenario {
  ids: string[]
  resourceType: string
  secret: string
  occurredAt: Date
}

async function seedAuditScenario(): Promise<SeededAuditScenario> {
  const token = randomUUID()
  const ids = Array.from({ length: 4 }, () => randomUUID())
  const resourceType = `wp10-${token}`
  const secret = `hidden-json-${token}`
  const occurredAt = new Date('2026-07-31T10:00:00.000Z')
  await db.table('audit_events').insert(
    ids.map((id, index) => ({
      id,
      occurred_at: occurredAt,
      user_id: index === 0 ? null : randomUUID(),
      action: `wp10.audit.${index}`,
      entity_type: resourceType,
      entity_id: `resource-${index}`,
      old_values: JSON.stringify({ secret, before: index }),
      new_values: JSON.stringify({ secret, after: index }),
      event_name: `wp10.event.${index}`,
      outcome: index < 2 ? 'failure' : 'success',
      severity: index % 2 === 0 ? 'warning' : 'info',
      request_id: `request-${token}-${index}`,
      trace_id: `trace-${token}-${index}`,
      redaction_applied: true,
      event_hash: index === 3 ? `hash-${token}` : null,
      ip_address: secret,
      user_agent: secret,
    }))
  )
  return { ids, resourceType, secret, occurredAt }
}

test.group('Integration | Admin audit Filter executor', (group) => {
  const insertedIds = new Set<string>()
  group.each.teardown(async () => {
    if (insertedIds.size === 0) return
    await db
      .from('audit_events')
      .whereIn('id', [...insertedIds])
      .delete()
    insertedIds.clear()
  })

  test('returns full exact totals/facets from the constrained population rather than the page', async ({
    assert,
  }) => {
    const seeded = await seedAuditScenario()
    seeded.ids.forEach((id) => insertedIds.add(id))
    const response = await query(
      new MutableAuthorizationReader(),
      () => new Date('2026-08-01T00:00:00.000Z')
    ).execute<AdminAuditLogRecord>({
      criteria: criteria({
        filter: condition('audit.resourceType', 'eq', {
          kind: 'scalar',
          value: seeded.resourceType,
        }),
        requestedFacets: [
          { field: 'audit.outcome', countMode: 'constrained' },
          { field: 'audit.severity', countMode: 'constrained' },
        ],
        page: { size: 1, offset: 0 },
      }),
      principal,
      requestId: randomUUID(),
    })

    assert.lengthOf(response.hits, 1)
    assert.deepEqual(response.total, { value: 4, relation: 'eq' })
    assert.deepEqual(
      response.facets[0]?.values.map(({ value, count }) => [value, count]),
      [
        ['failure', 2],
        ['success', 2],
      ]
    )
    assert.deepEqual(
      response.facets[1]?.values.map(({ value, count }) => [value, count]),
      [
        ['info', 2],
        ['warning', 2],
      ]
    )
    assert.isNull(response.hits[0]?.old_values)
    assert.isNull(response.hits[0]?.new_values)
  })

  test('supports exact fields, missing actor, inclusive dates, self-excluding facets, and stable ties', async ({
    assert,
  }) => {
    const seeded = await seedAuditScenario()
    seeded.ids.forEach((id) => insertedIds.add(id))
    const service = query(
      new MutableAuthorizationReader(),
      () => new Date('2026-08-01T00:00:00.000Z')
    )
    const response = await service.execute<AdminAuditLogRecord>({
      criteria: criteria({
        filter: {
          kind: 'group',
          combinator: 'and',
          children: [
            condition('audit.resourceType', 'eq', {
              kind: 'scalar',
              value: seeded.resourceType,
            }),
            condition('audit.outcome', 'eq', { kind: 'scalar', value: 'failure' }),
            condition('audit.createdAt', 'between', {
              kind: 'range',
              gte: seeded.occurredAt.toISOString(),
              lte: seeded.occurredAt.toISOString(),
            }),
          ],
        },
        requestedFacets: [{ field: 'audit.outcome', countMode: 'self_excluding' }],
      }),
      principal,
      requestId: randomUUID(),
    })

    assert.deepEqual(response.total, { value: 2, relation: 'eq' })
    assert.deepEqual(
      response.hits.map(({ id }) => id),
      [...seeded.ids.slice(0, 2)].sort().reverse()
    )
    assert.deepEqual(
      response.facets[0]?.values.map(({ value, count, selected }) => [value, count, selected]),
      [
        ['failure', 2, true],
        ['success', 2, false],
      ]
    )

    const exactFields = await service.execute<AdminAuditLogRecord>({
      criteria: criteria({
        filter: {
          kind: 'group',
          combinator: 'and',
          children: [
            condition('audit.action', 'eq', {
              kind: 'scalar',
              value: 'wp10.audit.1',
            }),
            condition('audit.resourceType', 'eq', {
              kind: 'scalar',
              value: seeded.resourceType,
            }),
            condition('audit.resourceId', 'eq', {
              kind: 'scalar',
              value: 'resource-1',
            }),
            condition('audit.outcome', 'eq', { kind: 'scalar', value: 'failure' }),
          ],
        },
      }),
      principal,
      requestId: randomUUID(),
    })
    assert.deepEqual(
      exactFields.hits.map(({ id }) => id),
      [seeded.ids[1]]
    )

    const selectedZero = await service.execute<AdminAuditLogRecord>({
      criteria: criteria({
        filter: {
          kind: 'group',
          combinator: 'and',
          children: [
            condition('audit.resourceType', 'eq', {
              kind: 'scalar',
              value: seeded.resourceType,
            }),
            condition('audit.outcome', 'eq', { kind: 'scalar', value: 'recorded' }),
          ],
        },
        requestedFacets: [{ field: 'audit.outcome', countMode: 'constrained' }],
      }),
      principal,
      requestId: randomUUID(),
    })
    assert.deepEqual(selectedZero.total, { value: 0, relation: 'eq' })
    assert.deepEqual(selectedZero.facets[0]?.values, [
      {
        value: 'recorded',
        count: 0,
        countRelation: 'exact',
        selected: true,
      },
    ])

    const missingActor = await service.execute<AdminAuditLogRecord>({
      criteria: criteria({
        filter: {
          kind: 'group',
          combinator: 'and',
          children: [
            condition('audit.resourceType', 'eq', {
              kind: 'scalar',
              value: seeded.resourceType,
            }),
            condition('audit.actorId', 'missing'),
          ],
        },
      }),
      principal,
      requestId: randomUUID(),
    })
    assert.deepEqual(
      missingActor.hits.map(({ id }) => id),
      [seeded.ids[0]]
    )
  })

  test('cannot recover redacted JSON, network, or user-agent canaries through text/facets', async ({
    assert,
  }) => {
    const seeded = await seedAuditScenario()
    seeded.ids.forEach((id) => insertedIds.add(id))
    const response = await query(
      new MutableAuthorizationReader(),
      () => new Date('2026-08-01T00:00:00.000Z')
    ).execute<AdminAuditLogRecord>({
      criteria: criteria({
        text: { value: seeded.secret },
        requestedFacets: [{ field: 'audit.outcome', countMode: 'constrained' }],
      }),
      principal,
      requestId: randomUUID(),
    })

    assert.deepEqual(response.hits, [])
    assert.deepEqual(response.total, { value: 0, relation: 'eq' })
    assert.deepEqual(response.facets[0]?.values, [])
    assert.notInclude(
      JSON.stringify({
        hits: response.hits,
        total: response.total,
        facets: response.facets,
        suggestions: response.suggestions,
        diagnostics: response.diagnostics,
        page: response.page,
      }),
      seeded.secret
    )
    assert.deepEqual(response.diagnostics, [])
  })

  test('fails closed when authorization is denied, expires, fails, or is revoked in flight', async ({
    assert,
  }) => {
    for (const configure of [
      (reader: MutableAuthorizationReader) => {
        reader.snapshot = { ...reader.snapshot, allowed: false }
      },
      (reader: MutableAuthorizationReader) => {
        reader.snapshot = { ...reader.snapshot, sessionActive: false }
      },
      (reader: MutableAuthorizationReader) => {
        reader.failAtCall = 1
      },
      (reader: MutableAuthorizationReader) => {
        reader.denyAtCall = 3
      },
    ]) {
      const reader = new MutableAuthorizationReader()
      configure(reader)
      const error = await query(reader, () => new Date('2026-08-01T00:00:00.000Z'))
        .execute({
          criteria: criteria(),
          principal,
          requestId: randomUUID(),
        })
        .catch((caught: unknown) => caught)

      assert.instanceOf(error, FilterExecutionError)
      assert.oneOf((error as FilterExecutionError).code, [
        'FILTER_CONTEXT_UNAVAILABLE',
        'FILTER_PERMISSION_UNAVAILABLE',
        'FILTER_PERMISSION_CHANGED',
      ])
      assert.notInclude((error as Error).message, 'private policy failure')
    }
  })
})
