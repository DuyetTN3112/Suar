import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { PostgresDomainEventOutboxRetentionRepository } from '#modules/events/infra/postgres_domain_event_outbox_retention_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const now = new Date('2026-07-26T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1_000
const trackedOutboxIds = new Set<string>()
const trackedHistoryIds = new Set<string>()

async function insertOutbox(input: {
  status: 'pending' | 'leased' | 'processed' | 'dead_letter'
  ageDays: number
}): Promise<string> {
  const id = randomUUID()
  trackedOutboxIds.add(id)
  const timestamp = new Date(now.getTime() - input.ageDays * DAY_MS)
  await db.table('domain_event_outbox').insert({
    id,
    event_name: 'task:assignment:completed',
    event_version: 1,
    dedupe_key: `retention:${id}`,
    dedupe_fingerprint: 'a'.repeat(64),
    aggregate_type: 'task_assignment',
    aggregate_id: randomUUID(),
    payload: { schemaVersion: 1, test: 'retention' },
    status: input.status,
    attempt_count: input.status === 'pending' ? 0 : 1,
    available_at: timestamp,
    locked_by: input.status === 'leased' ? 'retention-test-worker' : null,
    locked_until:
      input.status === 'leased' ? new Date(now.getTime() + DAY_MS) : null,
    lease_token: input.status === 'leased' ? randomUUID() : null,
    processed_at: input.status === 'processed' ? timestamp : null,
    dead_lettered_at: input.status === 'dead_letter' ? timestamp : null,
    last_error_code: input.status === 'dead_letter' ? 'PERMANENT_TEST_FAILURE' : null,
    created_at: timestamp,
    updated_at: timestamp,
  })
  return id
}

async function insertHistory(outboxId: string, ageDays: number): Promise<string> {
  const id = randomUUID()
  trackedHistoryIds.add(id)
  await db.table('domain_event_outbox_replay_history').insert({
    id,
    outbox_id: outboxId,
    replayed_by: randomUUID(),
    reason_digest: 'b'.repeat(64),
    reason_length: 30,
    previous_attempt_count: 1,
    previous_error_code: 'TRANSIENT_TEST_FAILURE',
    replayed_at: new Date(now.getTime() - ageDays * DAY_MS),
  })
  return id
}

test.group('Integration | Domain event outbox retention repository', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })
  group.each.teardown(async () => {
    if (trackedHistoryIds.size > 0) {
      await db
        .from('domain_event_outbox_replay_history')
        .whereIn('id', [...trackedHistoryIds])
        .delete()
    }
    if (trackedOutboxIds.size > 0) {
      await db.from('domain_event_outbox').whereIn('id', [...trackedOutboxIds]).delete()
    }
    trackedHistoryIds.clear()
    trackedOutboxIds.clear()
  })

  test('purges only old processed rows and independently aged replay history', async ({
    assert,
  }) => {
    const oldProcessed = await insertOutbox({ status: 'processed', ageDays: 40 })
    const oldProcessedWithRecentHistory = await insertOutbox({
      status: 'processed',
      ageDays: 35,
    })
    const recentHistory = await insertHistory(oldProcessedWithRecentHistory, 10)
    const recentProcessed = await insertOutbox({ status: 'processed', ageDays: 5 })
    const oldHistory = await insertHistory(recentProcessed, 400)
    const pending = await insertOutbox({ status: 'pending', ageDays: 400 })
    const leased = await insertOutbox({ status: 'leased', ageDays: 400 })
    const deadLetter = await insertOutbox({ status: 'dead_letter', ageDays: 400 })
    const repository = new PostgresDomainEventOutboxRetentionRepository()

    const result = await db.transaction(async (trx) => ({
      processed: await repository.purgeProcessed(
        new Date(now.getTime() - 30 * DAY_MS),
        100,
        trx
      ),
      history: await repository.purgeReplayHistory(
        new Date(now.getTime() - 365 * DAY_MS),
        100,
        trx
      ),
    }))

    assert.deepEqual(result, { processed: 2, history: 1 })
    assert.isNull(await db.from('domain_event_outbox').where('id', oldProcessed).first())
    assert.isNull(
      await db
        .from('domain_event_outbox')
        .where('id', oldProcessedWithRecentHistory)
        .first()
    )
    for (const id of [recentProcessed, pending, leased, deadLetter]) {
      assert.isNotNull(await db.from('domain_event_outbox').where('id', id).first())
    }
    assert.isNotNull(
      await db.from('domain_event_outbox_replay_history').where('id', recentHistory).first()
    )
    assert.isNull(
      await db.from('domain_event_outbox_replay_history').where('id', oldHistory).first()
    )
  })

  test('uses deterministic SKIP LOCKED selection without deleting the locked oldest row', async ({
    assert,
  }) => {
    const oldest = await insertOutbox({ status: 'processed', ageDays: 50 })
    const next = await insertOutbox({ status: 'processed', ageDays: 49 })
    const lock = await db.transaction()
    await lock.from('domain_event_outbox').where('id', oldest).forUpdate().first()
    const repository = new PostgresDomainEventOutboxRetentionRepository()

    try {
      const purged = await db.transaction((trx) =>
        repository.purgeProcessed(new Date(now.getTime() - 30 * DAY_MS), 1, trx)
      )
      assert.equal(purged, 1)
    } finally {
      await lock.rollback()
    }

    assert.isNotNull(await db.from('domain_event_outbox').where('id', oldest).first())
    assert.isNull(await db.from('domain_event_outbox').where('id', next).first())
  })

  test('accepts valid logical parents and rejects direct orphan replay-history writes', async ({
    assert,
  }) => {
    const parent = await insertOutbox({ status: 'processed', ageDays: 5 })
    const validHistory = await insertHistory(parent, 1)
    const orphanHistory = randomUUID()
    trackedHistoryIds.add(orphanHistory)
    let rejectedError: unknown

    try {
      await db.table('domain_event_outbox_replay_history').insert({
        id: orphanHistory,
        outbox_id: randomUUID(),
        replayed_by: randomUUID(),
        reason_digest: 'c'.repeat(64),
        reason_length: 30,
        previous_attempt_count: 1,
        previous_error_code: 'TRANSIENT_TEST_FAILURE',
        replayed_at: now,
      })
    } catch (error) {
      rejectedError = error
    }

    assert.isNotNull(
      await db.from('domain_event_outbox_replay_history').where('id', validHistory).first()
    )
    assert.equal(
      (rejectedError as { code?: string } | undefined)?.code,
      '23503'
    )
    assert.isNull(
      await db.from('domain_event_outbox_replay_history').where('id', orphanHistory).first()
    )
  })
})
