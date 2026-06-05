import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { ADMIN_AUDIT_FILTER_CONTEXT } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import { cleanupTestData } from '#tests/helpers/factories'
import { UserFactory } from '#tests/helpers/factories/user_org'

/**
 * WP-14 integration: the real authenticated Filter HTTP path.
 *
 * The contract suite only proves an anonymous caller is refused. These cases
 * prove an authorized administrator actually reaches the registered SQL
 * executor, and that a non-admin cannot, through the same route.
 */
interface SeededAudit {
  readonly matchingIds: readonly string[]
  readonly otherId: string
  readonly entityType: string
  readonly secret: string
}

async function seedAuditEvents(): Promise<SeededAudit> {
  const token = randomUUID()
  const entityType = `wp14-${token}`
  const secret = `wp14-secret-${token}`
  const matchingIds = [randomUUID(), randomUUID()]
  const otherId = randomUUID()

  await db.table('audit_events').insert([
    ...matchingIds.map((id, index) => ({
      id,
      occurred_at: new Date('2026-07-30T09:00:00.000Z'),
      user_id: null,
      action: `wp14.match.${index}`,
      entity_type: entityType,
      entity_id: `resource-${index}`,
      old_values: JSON.stringify({ secret }),
      new_values: JSON.stringify({ secret }),
      outcome: 'failure',
      severity: 'warning',
      redaction_applied: true,
      ip_address: secret,
      user_agent: secret,
    })),
    {
      id: otherId,
      occurred_at: new Date('2026-07-30T09:00:00.000Z'),
      user_id: null,
      action: 'wp14.other',
      entity_type: `${entityType}-other`,
      entity_id: 'resource-other',
      old_values: null,
      new_values: null,
      outcome: 'success',
      severity: 'info',
      redaction_applied: false,
      ip_address: null,
      user_agent: null,
    },
  ])

  return { matchingIds, otherId, entityType, secret }
}

test.group('Integration | Filter API permissions', (group) => {
  const insertedIds = new Set<string>()

  group.each.teardown(async () => {
    if (insertedIds.size > 0) {
      await db.from('audit_events').whereIn('id', [...insertedIds]).delete()
      insertedIds.clear()
    }
    await cleanupTestData()
  })

  test('serves the effective definition to an authorized system administrator', async ({
    client,
    assert,
  }) => {
    const systemAdmin = await UserFactory.createSuperadmin()

    const response = await client
      .get(`/api/v1/filter/contexts/${encodeURIComponent(ADMIN_AUDIT_FILTER_CONTEXT)}`)
      .loginAs(systemAdmin)

    response.assertStatus(200)
    const body = response.body() as {
      definition: { key: string; fields: { key: string }[]; executionProfile: string }
    }

    assert.equal(body.definition.key, ADMIN_AUDIT_FILTER_CONTEXT)
    assert.isAbove(body.definition.fields.length, 0, 'an authorized admin must receive real fields')
    assert.notProperty(
      body.definition,
      'query',
      'the effective definition must never carry provider DSL'
    )
  })

  test('denies the same definition to an ordinary authenticated user', async ({ client }) => {
    const member = await UserFactory.create()

    const response = await client
      .get(`/api/v1/filter/contexts/${encodeURIComponent(ADMIN_AUDIT_FILTER_CONTEXT)}`)
      .loginAs(member)

    response.assertStatus(401)
  })

  test('executes a filter-only query for an administrator through the registered executor', async ({
    client,
    assert,
  }) => {
    const systemAdmin = await UserFactory.createSuperadmin()

    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(systemAdmin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 5 },
        },
      })

    response.assertStatus(200)
    const body = response.body() as {
      context: string
      total: { value: number; relation: string }
      hits: unknown[]
      execution: { provider: string }
    }

    assert.equal(body.context, ADMIN_AUDIT_FILTER_CONTEXT)
    assert.equal(
      body.execution.provider,
      'postgres.audit.admin.investigation.v1',
      'the request must reach the registered PostgreSQL executor, not a stub'
    )
    assert.equal(body.total.relation, 'eq', 'the SQL pilot must report exact totals')
    assert.isArray(body.hits)
  })

  test('rejects a field that is absent from the effective definition', async ({ client }) => {
    const systemAdmin = await UserFactory.createSuperadmin()

    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(systemAdmin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 5 },
          filter: {
            kind: 'condition',
            field: 'audit.secretInternalNote',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'anything' },
          },
        },
      })

    response.assertStatus(400)
  })

  test('rejects a request that sends both a cursor and an offset', async ({ client }) => {
    const systemAdmin = await UserFactory.createSuperadmin()

    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(systemAdmin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 5, cursor: 'abc', offset: 10 },
        },
      })

    response.assertStatus(422)
  })

  test('returns only the events matching the criteria and never leaks redacted payloads', async ({
    client,
    assert,
  }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const seeded = await seedAuditEvents()
    for (const id of [...seeded.matchingIds, seeded.otherId]) insertedIds.add(id)

    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(systemAdmin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 50 },
          filter: {
            kind: 'condition',
            field: 'audit.resourceType',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: seeded.entityType },
          },
        },
      })

    response.assertStatus(200)
    const body = response.body() as {
      total: { value: number; relation: string }
      hits: { id: string }[]
    }

    const returnedIds = body.hits.map((hit) => hit.id).sort()
    assert.deepEqual(
      returnedIds,
      [...seeded.matchingIds].sort(),
      'the executor must return exactly the matching population, not everything'
    )
    assert.equal(body.total.value, seeded.matchingIds.length)
    assert.notInclude(
      JSON.stringify(body),
      seeded.secret,
      'redacted audit payloads must never cross the HTTP boundary'
    )
  })
})
