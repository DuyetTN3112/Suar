import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  adminAuditFilterDefinition,
  ADMIN_AUDIT_FILTER_CONTEXT,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import { PostgresAuditLogFilterExecutor } from '#modules/audit/infra/adapters/filtering/postgres_audit_log_filter_executor'
import { FilterAuditLogsQuery } from '#modules/audit/infra/repositories/read/filter_audit_logs_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  ReferenceFilterEvaluator,
  referenceAuthorizationBinding,
  type ReferenceFilterRecord,
} from '#modules/filtering/tests/backend/contract/support/reference_filter_evaluator'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

/**
 * WP-08/WP-10 differential parity.
 *
 * The shared conformance suite requires preference and relation capabilities the
 * audit context deliberately does not declare, so it cannot host this adapter.
 * Parity is instead proven directly: the PostgreSQL executor and the pure
 * reference evaluator must agree on the eligible ID set and the exact total for
 * the same population and the same canonical AST.
 */

interface SeededPopulation {
  readonly entityType: string
  readonly rows: readonly {
    id: string
    action: string
    outcome: string
    severity: string
  }[]
}

async function seedPopulation(): Promise<SeededPopulation> {
  const entityType = `wp10-diff-${randomUUID()}`
  const rows = [
    { id: randomUUID(), action: 'diff.alpha', outcome: 'failure', severity: 'warning' },
    { id: randomUUID(), action: 'diff.beta', outcome: 'failure', severity: 'info' },
    { id: randomUUID(), action: 'diff.gamma', outcome: 'success', severity: 'warning' },
    { id: randomUUID(), action: 'diff.delta', outcome: 'success', severity: 'info' },
  ]

  await db.table('audit_events').insert(
    rows.map((row, index) => ({
      id: row.id,
      occurred_at: new Date(`2026-07-2${index + 1}T08:00:00.000Z`),
      user_id: null,
      action: row.action,
      entity_type: entityType,
      entity_id: `resource-${index}`,
      outcome: row.outcome,
      severity: row.severity,
      redaction_applied: false,
    }))
  )

  return { entityType, rows }
}

function referenceRecords(seeded: SeededPopulation): readonly ReferenceFilterRecord[] {
  return seeded.rows.map((row) => ({
    id: row.id,
    fields: {
      'audit.resourceType': seeded.entityType,
      'audit.action': row.action,
      'audit.outcome': row.outcome,
      'audit.severity': row.severity,
    },
  }))
}

function condition(field: string, value: string): FilterExpression {
  return {
    kind: 'condition',
    field,
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value },
  }
}

test.group('Contract | Admin audit SQL versus reference differential', (group) => {
  const insertedIds = new Set<string>()

  group.setup(async () => {
    await setupApp()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  group.each.teardown(async () => {
    if (insertedIds.size === 0) return
    await db.from('audit_events').whereIn('id', [...insertedIds]).delete()
    insertedIds.clear()
  })

  const cases: { name: string; build: (seeded: SeededPopulation) => FilterExpression }[] = [
    {
      name: 'single equality',
      build: (seeded) => condition('audit.resourceType', seeded.entityType),
    },
    {
      name: 'nested AND',
      build: (seeded) => ({
        kind: 'group',
        combinator: 'and',
        children: [
          condition('audit.resourceType', seeded.entityType),
          condition('audit.outcome', 'failure'),
        ],
      }),
    },
    {
      name: 'nested OR inside AND',
      build: (seeded) => ({
        kind: 'group',
        combinator: 'and',
        children: [
          condition('audit.resourceType', seeded.entityType),
          {
            kind: 'group',
            combinator: 'or',
            children: [
              condition('audit.severity', 'warning'),
              condition('audit.action', 'diff.beta'),
            ],
          },
        ],
      }),
    },
    {
      name: 'exclusion effect',
      build: (seeded) => ({
        kind: 'group',
        combinator: 'and',
        children: [
          condition('audit.resourceType', seeded.entityType),
          { ...condition('audit.outcome', 'success'), effect: 'exclude' } as FilterExpression,
        ],
      }),
    },
  ]

  for (const scenario of cases) {
    test(`SQL and reference agree on eligible IDs: ${scenario.name}`, async ({ assert }) => {
      const seeded = await seedPopulation()
      for (const row of seeded.rows) insertedIds.add(row.id)

      const filter = scenario.build(seeded)
      const definition = adminAuditFilterDefinition()
      const criteria = {
        context: ADMIN_AUDIT_FILTER_CONTEXT,
        schemaVersion: 1,
        sort: [],
        page: { size: 50 },
        filter,
      }
      const authorizationBinding = referenceAuthorizationBinding({
        context: ADMIN_AUDIT_FILTER_CONTEXT,
      })

      const sqlResult = await new PostgresAuditLogFilterExecutor({
        query: new FilterAuditLogsQuery(),
      }).execute({
        definition,
        criteria,
        eligibilityFilter: filter,
        authorizationBinding,
        requestId: `diff-${randomUUID()}`,
      })

      const referenceResult = await new ReferenceFilterEvaluator({
        records: referenceRecords(seeded),
        profile: definition.executionProfile,
      }).execute({
        definition: { ...definition, capabilities: { ...definition.capabilities, pagination: 'cursor' } },
        criteria,
        eligibilityFilter: filter,
        authorizationBinding,
        requestId: `diff-ref-${randomUUID()}`,
      })

      const sqlIds = sqlResult.hits.map((hit) => hit.id).sort()
      const referenceIds = referenceResult.hits.map((hit) => hit.id).sort()

      assert.isAbove(sqlIds.length, 0, 'the scenario must select a non-empty population')
      assert.deepEqual(
        sqlIds,
        referenceIds,
        'PostgreSQL and the reference evaluator must return identical eligible IDs'
      )
      assert.deepEqual(sqlResult.total, referenceResult.total)
    })
  }
})
