import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Task assignment Contract foundation schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })

  test('adds canonical immutable snapshot columns without removing legacy snapshot payloads', async ({
    assert,
  }) => {
    const rows = (await db
      .from('information_schema.columns')
      .select('column_name')
      .where('table_schema', 'public')
      .where('table_name', 'task_assignment_snapshots')) as Array<{ column_name: string }>
    const columns = new Set(rows.map((row) => row.column_name))

    for (const required of [
      'task_snapshot',
      'required_skills_snapshot',
      'schema_version',
      'task_specification_version_id',
      'task_contract_version_id',
      'snapshot_sequence',
      'previous_snapshot_id',
      'canonical_snapshot',
      'snapshot_hash',
      'acknowledgement_required',
      'idempotency_key',
    ]) {
      assert.isTrue(columns.has(required), `Missing task_assignment_snapshots.${required}`)
    }
  })

  test('creates assignment head, acknowledgement, and clarification fact tables', async ({
    assert,
  }) => {
    const expected = [
      'task_assignment_contract_heads',
      'task_assignment_acknowledgements',
      'task_assignment_clarification_requests',
    ]
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', expected)) as Array<{ table_name: string }>

    assert.sameMembers(
      rows.map((row) => row.table_name),
      expected
    )
  })

  test('has uniqueness fences for snapshot sequence/idempotency and exact acknowledgement', async ({
    assert,
  }) => {
    const rows = (await db
      .from('pg_indexes')
      .select('indexname')
      .where('schemaname', 'public')
      .whereIn('tablename', [
        'task_assignment_snapshots',
        'task_assignment_acknowledgements',
        'task_assignment_clarification_requests',
      ])) as Array<{ indexname: string }>
    const indexes = new Set(rows.map((row) => row.indexname))

    for (const required of [
      'uq_tas_native_assignment_sequence',
      'uq_tas_native_assignment_idempotency',
      'uq_taa_exact_ack',
      'uq_taa_idempotency',
      'uq_tacr_one_open_per_snapshot',
    ]) {
      assert.isTrue(indexes.has(required), `Missing index ${required}`)
    }
  })

  test('keeps the legacy reason uniqueness fence without blocking canonical successors', async ({
    assert,
  }) => {
    const row = (await db
      .from('pg_indexes')
      .select('indexdef')
      .where('schemaname', 'public')
      .where('tablename', 'task_assignment_snapshots')
      .where('indexname', 'uq_task_assignment_snapshot_reason')
      .first()) as { indexdef: string } | null

    assert.isNotNull(row)
    assert.include(row?.indexdef ?? '', 'WHERE (schema_version IS NULL)')
  })

  test('leaves legacy/native boundary validation to the application layer', async ({
    assert,
  }) => {
    const result = await db.rawQuery<{ rows: Array<{ definition: string }> }>(`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'ck_tas_native_snapshot_shape'
    `)
    const definition = result.rows[0]?.definition ?? ''

    assert.equal(definition, '')
  })

  test('retains assignment identity indexes while storing boundary links as data', async ({
    assert,
  }) => {
    const constraintRows = (await db
      .from('pg_constraint')
      .select('conname')
      .whereIn('conname', [
        'fk_tas_native_assignment_task',
        'fk_tas_native_specification_task',
        'fk_tas_native_contract_task_specification',
        'fk_tas_previous_native_snapshot',
        'fk_tach_assignment_task',
        'fk_tach_snapshot_identity',
        'fk_taa_assignment_assignee',
        'fk_taa_snapshot_identity',
        'fk_tacr_assignment_requester',
        'fk_tacr_snapshot_identity',
      ])) as Array<{ conname: string }>
    const constraints = new Set(constraintRows.map((row) => row.conname))

    for (const removed of [
      'fk_tas_native_assignment_task',
      'fk_tas_native_specification_task',
      'fk_tas_native_contract_task_specification',
      'fk_tas_previous_native_snapshot',
      'fk_tach_assignment_task',
      'fk_tach_snapshot_identity',
      'fk_taa_assignment_assignee',
      'fk_taa_snapshot_identity',
      'fk_tacr_assignment_requester',
      'fk_tacr_snapshot_identity',
    ]) {
      assert.isFalse(constraints.has(removed), `DB must not own assignment boundary ${removed}`)
    }

    const indexRows = (await db
      .from('pg_indexes')
      .select('indexname')
      .where('schemaname', 'public')
      .whereIn('indexname', [
        'uq_ta_contract_assignment_task',
        'uq_ta_contract_assignment_assignee',
        'uq_task_assignments_one_active_task',
        'uq_tsv_contract_identity_task',
        'uq_tcv_contract_identity_task_specification',
        'uq_tas_identity_assignment',
        'uq_tas_identity_assignment_hash',
        'uq_tas_identity_assignment_task_hash',
      ])) as Array<{ indexname: string }>
    assert.sameMembers(
      indexRows.map((row) => row.indexname),
      [
        'uq_ta_contract_assignment_task',
        'uq_ta_contract_assignment_assignee',
        'uq_task_assignments_one_active_task',
        'uq_tsv_contract_identity_task',
        'uq_tcv_contract_identity_task_specification',
        'uq_tas_identity_assignment',
        'uq_tas_identity_assignment_hash',
        'uq_tas_identity_assignment_task_hash',
      ]
    )
  })
})
