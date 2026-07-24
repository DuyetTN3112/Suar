import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { PostgresSearchProjectionDeliveryReceiptWriter } from '#modules/search/infra/adapters/projection-generation/postgres_search_projection_delivery_receipt_writer'
import { PostgresSearchProjectionInvalidationStager } from '#modules/search/infra/adapters/projection-generation/postgres_search_projection_invalidation_stager'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const ENTITY_ID = '99999999-9999-4999-8999-999999999999'

test.group('Integration | Search projection invalidation stager', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(async () => { await db.from('search_projection_entity_revisions').where('entity_id', ENTITY_ID).delete(); await teardownApp() })

  test('stages transactionally, deduplicates the same source revision, and preserves newer revisions', async ({ assert }) => {
    const stager = new PostgresSearchProjectionInvalidationStager()
    const first = await db.transaction(async (trx) => stager.stage(trx, { entityType: 'task', entityId: ENTITY_ID, operation: 'upsert', sourceRevision: 'rev-1', changedFields: ['title', 'title'], transactionKey: 'tx-1' }))
    const duplicate = await db.transaction(async (trx) => stager.stage(trx, { entityType: 'task', entityId: ENTITY_ID, operation: 'upsert', sourceRevision: 'rev-1', changedFields: ['title'], transactionKey: 'tx-retry' }))
    await db.transaction(async (trx) => stager.stage(trx, { entityType: 'task', entityId: ENTITY_ID, operation: 'delete', sourceRevision: 'rev-2', changedFields: [], transactionKey: 'tx-2' }))
    const rows = (await db.from('search_projection_entity_revisions').where('entity_id', ENTITY_ID).orderBy('source_revision', 'asc')) as Array<{ operation: string; source_revision: string }>
    assert.isTrue(first.staged)
    assert.isFalse(duplicate.staged)
    assert.equal(first.id, duplicate.id)
    assert.deepEqual(rows.map((row) => ({ operation: row.operation, source_revision: row.source_revision })), [{ operation: 'upsert', source_revision: 'rev-1' }, { operation: 'delete', source_revision: 'rev-2' }])
  })

  test('rolls back the staged invalidation with the source transaction', async ({ assert }) => {
    await assert.rejects(() => db.transaction(async (trx) => {
      await new PostgresSearchProjectionInvalidationStager().stage(trx, { entityType: 'task', entityId: ENTITY_ID, operation: 'upsert', sourceRevision: 'rev-rollback', changedFields: [], transactionKey: 'tx-rollback' })
      throw new Error('source_transaction_failed')
    }), /source_transaction_failed/u)
    const countRow = (await db.from('search_projection_entity_revisions').where('entity_id', ENTITY_ID).where('source_revision', 'rev-rollback').count('* as count').first()) as { count?: number | string } | undefined
    assert.equal(Number(countRow?.count ?? 0), 0)
  })

  test('records an idempotent publication delivery receipt and rejects unknown revisions', async ({
    assert,
  }) => {
    const sourceRevision = 'publication-receipt-integration'
    await db.table('search_projection_entity_revisions').insert({
      entity_type: 'accomplishment_publication',
      entity_id: ENTITY_ID,
      operation: 'upsert',
      source_revision: sourceRevision,
      changed_fields: JSON.stringify(['public_accomplishments']),
      transaction_key: sourceRevision,
    })

    const writer = new PostgresSearchProjectionDeliveryReceiptWriter()
    assert.isTrue(await writer.acknowledge(sourceRevision))
    assert.isTrue(await writer.acknowledge(sourceRevision))
    assert.isFalse(await writer.acknowledge('publication-receipt-missing'))

    const row = (await db
      .from('search_projection_entity_revisions')
      .where('entity_id', ENTITY_ID)
      .where('source_revision', sourceRevision)
      .first()) as { processed_at?: Date | null } | undefined
    assert.exists(row?.processed_at)
  })
})
