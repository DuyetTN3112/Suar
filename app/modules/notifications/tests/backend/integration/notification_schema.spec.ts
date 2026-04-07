import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const requiredNotificationColumns = [
  'event_id',
  'event_fingerprint',
  'occurred_at',
  'correlation_id',
  'actor_type',
  'actor_id',
  'subject_type',
  'subject_id',
  'schema_version',
  'scope_type',
  'scope_id',
  'organization_id',
  'category',
  'priority',
  'template_key',
  'template_version',
  'locale',
  'parameters',
  'action',
  'revision',
  'dedupe_key',
]

const requiredTables = [
  'notification_acceptance_ledger',
  'notification_outbox',
  'notification_projection_deliveries',
  'notification_projection_runs',
  'notification_projection_targets',
  'notification_recipient_states',
  'notification_tombstones',
]

test.group('Integration | Notification Reliability Schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('has every canonical notification column', async ({ assert }) => {
    const rows = (await db
      .from('information_schema.columns')
      .select('column_name')
      .where('table_schema', 'public')
      .where('table_name', 'notifications')) as { column_name: string }[]

    const columns = new Set(rows.map((row) => row.column_name))
    for (const column of requiredNotificationColumns) {
      assert.isTrue(columns.has(column), `Missing notifications.${column}`)
    }
  })

  test('has canonical state, idempotency, outbox, tombstone, and target tables', async ({
    assert,
  }) => {
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', requiredTables)) as { table_name: string }[]

    assert.deepEqual(rows.map((row) => row.table_name).sort(), [...requiredTables].sort())
  })

  test('enforces revisioned outbox and event-recipient identity', async ({ assert }) => {
    const rows = (await db
      .from('pg_indexes')
      .select('indexname', 'indexdef')
      .where('schemaname', 'public')
      .whereIn('tablename', [
        'notifications',
        'notification_acceptance_ledger',
        'notification_outbox',
      ])) as { indexname: string; indexdef: string }[]

    const definitions = rows.map((row) => row.indexdef).join('\n')
    assert.include(definitions, '(event_id, user_id)')
    assert.include(definitions, '(event_id, recipient_id)')
    assert.include(definitions, '(destination, partition_key, projection_revision)')
  })

  test('enforces exactly zero or one projection primary at the database boundary', async ({
    assert,
  }) => {
    const row = (await db
      .from('pg_indexes')
      .select('indexdef')
      .where('schemaname', 'public')
      .where('tablename', 'notification_projection_targets')
      .where('indexname', 'notification_projection_targets_one_primary_idx')
      .first()) as { indexdef?: string } | undefined

    assert.exists(row)
    assert.include(row?.indexdef ?? '', 'UNIQUE INDEX')
    assert.include(row?.indexdef ?? '', "WHERE (status = 'primary'::text)")
  })
})
