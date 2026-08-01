import { createHash, randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { PostgresDomainEventOutboxAdministrationRepository } from '#modules/events/infra/postgres_domain_event_outbox_administration_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

const NOW = new Date('2030-07-27T00:00:00.000Z')

interface InsertedOutboxRow {
  id: string
  sequence: number | string
}

interface PersistedOutboxState {
  status: string
  attempt_count: number | string
  last_error_code: string | null
  dead_lettered_at: Date | null
}

interface ReplayHistoryRow {
  replayed_by: string
  reason_digest: string
  previous_attempt_count: number | string
  previous_error_code: string | null
}

interface CountRow {
  total: number | string
}

async function cleanAdministrationState(): Promise<void> {
  await db.from('domain_event_outbox_replay_history').delete()
  await db.from('domain_event_outbox').delete()
}

async function insertDeadLetter(attemptCount = 3): Promise<{
  id: string
  sequence: number
  dedupeKey: string
}> {
  const assignmentId = randomUUID()
  const dedupeKey = `task-assignment-completed:${assignmentId}`
  const [row] = (await db
    .table('domain_event_outbox')
    .insert({
      event_name: 'task:assignment:completed',
      event_version: 1,
      dedupe_key: dedupeKey,
      dedupe_fingerprint: '0'.repeat(64),
      aggregate_type: 'task_assignment',
      aggregate_id: assignmentId,
      payload: {
        taskId: randomUUID(),
        assignmentId,
        assigneeId: randomUUID(),
      },
      status: 'dead_letter',
      attempt_count: attemptCount,
      last_error_code: 'SUBSCRIBER_REJECTED',
      dead_lettered_at: new Date(NOW.getTime() - 60_000),
      created_at: new Date(NOW.getTime() - 120_000),
      updated_at: new Date(NOW.getTime() - 60_000),
    })
    .returning(['id', 'sequence'])) as InsertedOutboxRow[]

  if (!row) {
    throw new Error('Expected a dead-letter outbox row')
  }
  return {
    id: row.id,
    sequence: Number(row.sequence),
    dedupeKey,
  }
}

async function insertOperationalRow(
  status: 'pending' | 'leased',
  input: {
    availableAt: Date
    lockedUntil?: Date
  }
): Promise<void> {
  const assignmentId = randomUUID()
  await db.table('domain_event_outbox').insert({
    event_name: 'task:assignment:completed',
    event_version: 1,
    dedupe_key: `task-assignment-completed:${assignmentId}`,
    dedupe_fingerprint: '0'.repeat(64),
    aggregate_type: 'task_assignment',
    aggregate_id: assignmentId,
    payload: {
      taskId: randomUUID(),
      assignmentId,
      assigneeId: randomUUID(),
    },
    status,
    attempt_count: status === 'leased' ? 1 : 0,
    available_at: input.availableAt,
    locked_by: status === 'leased' ? 'domain-event-health-test' : null,
    locked_until: status === 'leased' ? input.lockedUntil : null,
    lease_token: status === 'leased' ? randomUUID() : null,
    created_at: new Date(NOW.getTime() - 600_000),
    updated_at: NOW,
  })
}

test.group('Domain event outbox administration repository', (group) => {
  group.setup(async () => {
    await setupApp()
    await assertSafeTestDatastores()
    await cleanAdministrationState()
  })

  group.each.teardown(() => cleanAdministrationState())

  group.teardown(async () => {
    await cleanAdministrationState()
    await teardownApp()
  })

  test('reports bounded DLQ metadata without returning event payloads', async ({ assert }) => {
    const deadLetter = await insertDeadLetter()
    const repository = new PostgresDomainEventOutboxAdministrationRepository()

    const status = await repository.status(NOW)
    assert.equal(status.deadLetter, 1)
    assert.isFalse(status.deadLetterCountCapped)
    assert.equal(status.oldestDeadLetterAgeMs, 60_000)

    const page = await repository.previewDeadLetters({
      selector: { dedupeKey: deadLetter.dedupeKey },
      limit: 10,
    })
    assert.lengthOf(page.items, 1)
    assert.deepInclude(page.items[0], {
      id: deadLetter.id,
      sequence: deadLetter.sequence,
      attemptCount: 3,
      lifetimeAttemptCount: 3,
      replayCount: 0,
      errorCode: 'SUBSCRIBER_REJECTED',
    })
    assert.notProperty(page.items[0] ?? {}, 'payload')
  })

  test('separates actionable work, future backoff, and lease lifecycle metadata', async ({
    assert,
  }) => {
    await insertOperationalRow('pending', {
      availableAt: new Date(NOW.getTime() - 300_000),
    })
    await insertOperationalRow('pending', {
      availableAt: new Date(NOW.getTime() + 120_000),
    })
    await insertOperationalRow('leased', {
      availableAt: new Date(NOW.getTime() - 60_000),
      lockedUntil: new Date(NOW.getTime() + 45_000),
    })
    await insertOperationalRow('leased', {
      availableAt: new Date(NOW.getTime() - 60_000),
      lockedUntil: new Date(NOW.getTime() - 30_000),
    })

    const status = await new PostgresDomainEventOutboxAdministrationRepository().status(NOW)

    assert.deepInclude(status, {
      countCap: 10_000,
      duePending: 1,
      duePendingCountCapped: false,
      futureBackoffPending: 1,
      futureBackoffPendingCountCapped: false,
      activeLeases: 1,
      activeLeaseCountCapped: false,
      expiredLeases: 1,
      expiredLeaseCountCapped: false,
      deadLetter: 0,
      deadLetterCountCapped: false,
      oldestDuePendingAgeMs: 300_000,
      nextBackoffDueInMs: 120_000,
      nextActiveLeaseExpiryInMs: 45_000,
      oldestExpiredLeaseAgeMs: 30_000,
      oldestDeadLetterAgeMs: null,
    })
    assert.equal(status.observedAt.toISOString(), NOW.toISOString())
    assert.notProperty(status, 'payload')
  })

  test('replays atomically and preserves per-row attempt history', async ({ assert }) => {
    const deadLetter = await insertDeadLetter()
    const repository = new PostgresDomainEventOutboxAdministrationRepository()
    const actorId = randomUUID()
    const reasonDigest = createHash('sha256').update('subscriber schema repaired').digest('hex')

    const batch = await db.transaction((trx) =>
      repository.replayDeadLetters(
        {
          selector: { id: deadLetter.id },
          actorId,
          reasonDigest,
          reasonLength: 26,
          now: NOW,
        },
        trx
      )
    )

    assert.isFalse(batch.hasMoreOrLocked)
    assert.equal(batch.matchedCount, 1)
    assert.equal(batch.rows[0]?.previousAttemptCount, 3)
    assert.equal(batch.rows[0]?.lifetimeAttemptCount, 3)
    assert.equal(batch.rows[0]?.replayCount, 1)

    const state = (await db
      .from('domain_event_outbox')
      .where('id', deadLetter.id)
      .firstOrFail()) as unknown as PersistedOutboxState
    assert.equal(state.status, 'pending')
    assert.equal(Number(state.attempt_count), 0)
    assert.isNull(state.last_error_code)
    assert.isNull(state.dead_lettered_at)

    const history = (await db
      .from('domain_event_outbox_replay_history')
      .where('outbox_id', deadLetter.id)
      .firstOrFail()) as unknown as ReplayHistoryRow
    assert.equal(history.replayed_by, actorId)
    assert.equal(history.reason_digest, reasonDigest)
    assert.equal(Number(history.previous_attempt_count), 3)
    assert.equal(history.previous_error_code, 'SUBSCRIBER_REJECTED')
  })

  test('does not partially replay a selection containing a locked row', async ({ assert }) => {
    const deadLetter = await insertDeadLetter()
    const repository = new PostgresDomainEventOutboxAdministrationRepository()
    const lockingTransaction = await db.transaction()

    try {
      await lockingTransaction
        .from('domain_event_outbox')
        .where('id', deadLetter.id)
        .select('id')
        .forUpdate()

      const batch = await db.transaction((trx) =>
        repository.replayDeadLetters(
          {
            selector: { id: deadLetter.id },
            actorId: randomUUID(),
            reasonDigest: 'a'.repeat(64),
            reasonLength: 20,
            now: NOW,
          },
          trx
        )
      )

      assert.isTrue(batch.hasMoreOrLocked)
      assert.equal(batch.matchedCount, 1)
      assert.equal(batch.deferredCount, 1)
      assert.lengthOf(batch.rows, 0)
      const historyCount = (await db
        .from('domain_event_outbox_replay_history')
        .where('outbox_id', deadLetter.id)
        .count('* as total')
        .first()) as unknown as CountRow | undefined
      assert.equal(Number(historyCount?.total ?? 0), 0)
    } finally {
      await lockingTransaction.rollback()
    }
  })
})
