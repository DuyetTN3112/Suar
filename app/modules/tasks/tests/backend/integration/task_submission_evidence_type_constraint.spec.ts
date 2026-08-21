import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Task submission evidence type constraint', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('database rejects evidence types outside the canonical contract', async ({ assert }) => {
    const evidenceId = testId()
    const constraints = await db.rawQuery<{
      rows: { constraint_name: string; definition: string }[]
    }>(`
      SELECT
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'task_submission_evidences'
        AND con.contype = 'c'
    `)
    const evidenceTypeConstraint = constraints.rows.find((constraint) =>
      constraint.definition.includes('evidence_type')
    )
    assert.exists(evidenceTypeConstraint)
    for (const evidenceType of [
      'pull_request',
      'commit_link',
      'demo_recording',
      'test_report',
      'document_link',
      'screenshot',
      'metrics_screenshot',
      'deployment_link',
      'other',
    ]) {
      assert.include(evidenceTypeConstraint?.definition, evidenceType)
    }

    try {
      let caught: unknown
      try {
        await db.table('task_submission_evidences').insert({
          id: evidenceId,
          submission_id: testId(),
          evidence_type: 'source_code',
          url: 'https://example.com/evidence',
          uploaded_by: testId(),
          created_at: new Date().toISOString(),
        })
      } catch (error) {
        caught = error
      }

      assert.exists(caught)
      assert.equal(Reflect.get(caught as object, 'code'), '23514')
      assert.equal(
        Reflect.get(caught as object, 'constraint'),
        evidenceTypeConstraint?.constraint_name
      )
    } finally {
      await db.from('task_submission_evidences').where('id', evidenceId).delete()
    }
  })
})
