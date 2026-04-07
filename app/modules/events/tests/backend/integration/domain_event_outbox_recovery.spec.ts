import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  DurableDomainEventDispatcher,
  DurableDomainEventJob,
  ReviewConfirmedOutboxPayload,
  TaskAssignmentCompletedOutboxPayload,
} from '#modules/events/domain/domain_event_outbox'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/postgres_domain_event_outbox_repository'
import { DomainEventOutboxWorker } from '#modules/events/infra/workers/domain_event_outbox_worker'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

const BASE_TIME = new Date('2030-07-26T12:00:00.000Z')

interface OutboxStateRow {
  status: string
  last_error_code: string | null
  processed_at: Date | null
  dead_lettered_at: Date | null
}

interface OutboxPayloadRow {
  payload: unknown
}

interface OutboxLeaseRow {
  locked_until: Date
}

function requireJob(job: DurableDomainEventJob | undefined): DurableDomainEventJob {
  if (!job) {
    throw new Error('Expected the outbox repository to return one claimed job')
  }
  return job
}

function eventInput(overrides: {
  dedupeKey?: string
  taskId?: string
  assignmentId?: string
  assigneeId?: string
} = {}) {
  const assignmentId = overrides.assignmentId ?? randomUUID()
  return {
    eventName: 'task:assignment:completed' as const,
    dedupeKey: overrides.dedupeKey ?? `task-assignment-completed:${assignmentId}`,
    aggregateType: 'task_assignment' as const,
    aggregateId: assignmentId,
    payload: {
      taskId: overrides.taskId ?? randomUUID(),
      assignmentId,
      assigneeId: overrides.assigneeId ?? randomUUID(),
    },
  }
}

function reviewConfirmedEventInput() {
  const reviewSessionId = randomUUID()
  const revieweeId = randomUUID()
  const confirmationId = `review-confirmed:${reviewSessionId}:${revieweeId}`
  return {
    eventName: 'review:confirmed' as const,
    dedupeKey: confirmationId,
    aggregateType: 'review_session' as const,
    aggregateId: reviewSessionId,
    payload: {
      confirmationId,
      reviewSessionId,
      revieweeId,
      action: 'confirmed' as const,
      reviewerIds: [randomUUID(), randomUUID()].sort(),
      confirmedBy: revieweeId,
    },
  }
}

async function cleanOutbox(): Promise<void> {
  await db.from('domain_event_outbox').delete()
}

test.group('Domain event outbox failure and recovery', (group) => {
  group.setup(async () => {
    await setupApp()
    await assertSafeTestDatastores()
    await cleanOutbox()
  })

  group.each.teardown(() => cleanOutbox())

  group.teardown(async () => {
    await cleanOutbox()
    await teardownApp()
  })

  test('rolls staged events back with the caller-owned business transaction', async ({
    assert,
  }) => {
    const input = eventInput()
    const trx = await db.transaction()

    const staged = await stageDomainEvent(trx, input)
    assert.isTrue(staged.staged)
    await trx.rollback()

    const row = (await db
      .from('domain_event_outbox')
      .where('event_name', input.eventName)
      .where('dedupe_key', input.dedupeKey)
      .first()) as unknown
    assert.isNull(row)
  })

  test('stages an identical dedupe key exactly once', async ({ assert }) => {
    const input = eventInput()
    let firstId = ''
    let secondId = ''

    await db.transaction(async (trx) => {
      const first = await stageDomainEvent(trx, input)
      const second = await stageDomainEvent(trx, input)
      firstId = first.id
      secondId = second.id
      assert.isTrue(first.staged)
      assert.isFalse(second.staged)
    })

    assert.equal(secondId, firstId)
    const rows = await db
      .from('domain_event_outbox')
      .where('event_name', input.eventName)
      .where('dedupe_key', input.dedupeKey)
    assert.lengthOf(rows, 1)
  })

  test('fails closed when a dedupe key is reused for different event data', async ({
    assert,
  }) => {
    const original = eventInput()
    const conflicting = eventInput({
      dedupeKey: original.dedupeKey,
      assignmentId: original.aggregateId,
      assigneeId: randomUUID(),
    })

    await db.transaction((trx) => stageDomainEvent(trx, original))
    await assert.rejects(
      () => db.transaction((trx) => stageDomainEvent(trx, conflicting)),
      InvariantViolationException
    )

    const rows = (await db
      .from('domain_event_outbox')
      .where('event_name', original.eventName)
      .where('dedupe_key', original.dedupeKey)) as unknown as OutboxPayloadRow[]
    assert.lengthOf(rows, 1)
    assert.deepEqual(rows[0]?.payload, original.payload)
  })

  test('allows one concurrent claimant and fences an owner after lease expiry', async ({
    assert,
  }) => {
    const input = eventInput()
    await db.transaction((trx) => stageDomainEvent(trx, input))
    const repository = new PostgresDomainEventOutboxRepository()

    const claims = await Promise.all([
      repository.claimBatch({
        workerId: 'worker-a',
        batchSize: 1,
        leaseDurationMs: 1_000,
        now: BASE_TIME,
      }),
      repository.claimBatch({
        workerId: 'worker-b',
        batchSize: 1,
        leaseDurationMs: 1_000,
        now: BASE_TIME,
      }),
    ])
    const firstClaim = claims.flat()[0]
    assert.exists(firstClaim)
    assert.equal(claims.flat().length, 1)
    const originalLease = requireJob(firstClaim)

    const reclaimedAt = new Date(BASE_TIME.getTime() + 1_001)
    const [reclaimed] = await repository.claimBatch({
      workerId: 'recovery-worker',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: reclaimedAt,
    })
    assert.exists(reclaimed)
    const recoveryLease = requireJob(reclaimed)
    assert.notEqual(recoveryLease.leaseToken, originalLease.leaseToken)
    assert.equal(recoveryLease.attemptCount, 2)

    const mutationTime = new Date(reclaimedAt.getTime() + 1)
    assert.isFalse(
      await repository.acknowledge({
        jobId: originalLease.id,
        leaseToken: originalLease.leaseToken,
        now: mutationTime,
      })
    )
    assert.isTrue(
      await repository.acknowledge({
        jobId: recoveryLease.id,
        leaseToken: recoveryLease.leaseToken,
        now: mutationTime,
      })
    )
  })

  test('claims only the earliest nonterminal event for an aggregate in one batch', async ({
    assert,
  }) => {
    const aggregateId = randomUUID()
    const first = eventInput({
      assignmentId: aggregateId,
      dedupeKey: `aggregate-order:first:${aggregateId}`,
    })
    const second = eventInput({
      assignmentId: aggregateId,
      dedupeKey: `aggregate-order:second:${aggregateId}`,
    })
    await db.transaction(async (trx) => {
      await stageDomainEvent(trx, first)
      await stageDomainEvent(trx, second)
    })
    const repository = new PostgresDomainEventOutboxRepository()

    const firstBatch = await repository.claimBatch({
      workerId: 'same-aggregate-batch-worker',
      batchSize: 10,
      leaseDurationMs: 1_000,
      now: BASE_TIME,
    })
    assert.lengthOf(firstBatch, 1)
    assert.equal(firstBatch[0]?.aggregateId, aggregateId)
    assert.isTrue(
      await repository.acknowledge({
        jobId: requireJob(firstBatch[0]).id,
        leaseToken: requireJob(firstBatch[0]).leaseToken,
        now: new Date(BASE_TIME.getTime() + 1),
      })
    )

    const secondBatch = await repository.claimBatch({
      workerId: 'same-aggregate-followup-worker',
      batchSize: 10,
      leaseDurationMs: 1_000,
      now: new Date(BASE_TIME.getTime() + 2),
    })
    assert.lengthOf(secondBatch, 1)
    assert.isAbove(requireJob(secondBatch[0]).sequence, requireJob(firstBatch[0]).sequence)
  })

  test('does not let two workers bypass a leased predecessor for the same aggregate', async ({
    assert,
  }) => {
    const aggregateId = randomUUID()
    await db.transaction(async (trx) => {
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-fence:first:${aggregateId}`,
        })
      )
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-fence:second:${aggregateId}`,
        })
      )
    })
    const repository = new PostgresDomainEventOutboxRepository()

    const claims = await Promise.all([
      repository.claimBatch({
        workerId: 'same-aggregate-worker-a',
        batchSize: 1,
        leaseDurationMs: 1_000,
        now: BASE_TIME,
      }),
      repository.claimBatch({
        workerId: 'same-aggregate-worker-b',
        batchSize: 1,
        leaseDurationMs: 1_000,
        now: BASE_TIME,
      }),
    ])

    assert.lengthOf(claims.flat(), 1)
  })

  test('reclaims an expired predecessor before a later event for the same aggregate', async ({
    assert,
  }) => {
    const aggregateId = randomUUID()
    await db.transaction(async (trx) => {
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-expiry:first:${aggregateId}`,
        })
      )
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-expiry:second:${aggregateId}`,
        })
      )
    })
    const repository = new PostgresDomainEventOutboxRepository()
    const [original] = await repository.claimBatch({
      workerId: 'aggregate-expiry-original-owner',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: BASE_TIME,
    })

    const reclaimed = await repository.claimBatch({
      workerId: 'aggregate-expiry-recovery-owner',
      batchSize: 10,
      leaseDurationMs: 1_000,
      now: new Date(BASE_TIME.getTime() + 1_001),
    })

    assert.lengthOf(reclaimed, 1)
    assert.equal(requireJob(reclaimed[0]).id, requireJob(original).id)
    assert.equal(requireJob(reclaimed[0]).attemptCount, 2)
  })

  test('preserves concurrent claims across different aggregates', async ({ assert }) => {
    const first = eventInput()
    const second = eventInput()
    await db.transaction(async (trx) => {
      await stageDomainEvent(trx, first)
      await stageDomainEvent(trx, second)
    })
    const repository = new PostgresDomainEventOutboxRepository()

    const claims = await Promise.all([
      repository.claimBatch({
        workerId: 'different-aggregate-worker-a',
        batchSize: 1,
        leaseDurationMs: 1_000,
        now: BASE_TIME,
      }),
      repository.claimBatch({
        workerId: 'different-aggregate-worker-b',
        batchSize: 1,
        leaseDurationMs: 1_000,
        now: BASE_TIME,
      }),
    ])

    assert.lengthOf(claims.flat(), 2)
    assert.deepEqual(
      new Set(claims.flat().map((job) => job.aggregateId)),
      new Set([first.aggregateId, second.aggregateId])
    )
  })

  test('keeps a later event blocked while its predecessor waits for retry', async ({
    assert,
  }) => {
    const aggregateId = randomUUID()
    await db.transaction(async (trx) => {
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-retry:first:${aggregateId}`,
        })
      )
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-retry:second:${aggregateId}`,
        })
      )
    })
    const repository = new PostgresDomainEventOutboxRepository()
    const [firstClaim] = await repository.claimBatch({
      workerId: 'aggregate-retry-owner',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: BASE_TIME,
    })
    const retryAt = new Date(BASE_TIME.getTime() + 5_000)
    assert.isTrue(
      await repository.retry({
        jobId: requireJob(firstClaim).id,
        leaseToken: requireJob(firstClaim).leaseToken,
        errorCode: 'DEPENDENCY_UNAVAILABLE',
        now: new Date(BASE_TIME.getTime() + 1),
        availableAt: retryAt,
      })
    )

    assert.deepEqual(
      await repository.claimBatch({
        workerId: 'aggregate-retry-bypass-attempt',
        batchSize: 10,
        leaseDurationMs: 1_000,
        now: new Date(BASE_TIME.getTime() + 2),
      }),
      []
    )
    const retriedPredecessor = await repository.claimBatch({
      workerId: 'aggregate-retry-recovery',
      batchSize: 10,
      leaseDurationMs: 1_000,
      now: retryAt,
    })
    assert.lengthOf(retriedPredecessor, 1)
    assert.equal(requireJob(retriedPredecessor[0]).id, requireJob(firstClaim).id)
  })

  test('worker delivers same-aggregate events in order across a predecessor retry', async ({
    assert,
  }) => {
    const aggregateId = randomUUID()
    const first = eventInput({
      assignmentId: aggregateId,
      taskId: randomUUID(),
      dedupeKey: `aggregate-worker-retry:first:${aggregateId}`,
    })
    const second = eventInput({
      assignmentId: aggregateId,
      taskId: randomUUID(),
      dedupeKey: `aggregate-worker-retry:second:${aggregateId}`,
    })
    await db.transaction(async (trx) => {
      await stageDomainEvent(trx, first)
      await stageDomainEvent(trx, second)
    })

    let currentTime = BASE_TIME
    let firstAttempts = 0
    const deliveredTaskIds: string[] = []
    const worker = new DomainEventOutboxWorker({
      workerId: 'same-aggregate-retry-worker',
      now: () => currentTime,
      random: () => 0.5,
      retryBaseMs: 1_000,
      retryCapMs: 1_000,
      dispatcher: {
        dispatch(_eventName, payload) {
          const event = payload as TaskAssignmentCompletedOutboxPayload
          if (event.taskId === first.payload.taskId) {
            firstAttempts += 1
            if (firstAttempts === 1) {
              return Promise.reject(new Error('temporary predecessor outage'))
            }
          }
          deliveredTaskIds.push(event.taskId)
          return Promise.resolve()
        },
      },
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 1,
      deadLettered: 0,
      leaseLost: 0,
    })
    currentTime = new Date(BASE_TIME.getTime() + 2)
    assert.deepEqual(await worker.runOnce(), {
      claimed: 0,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    currentTime = new Date(BASE_TIME.getTime() + 1_001)
    const predecessorRecovery = await worker.runOnce()
    assert.equal(predecessorRecovery.processed, 1)
    currentTime = new Date(BASE_TIME.getTime() + 1_002)
    const followerDelivery = await worker.runOnce()
    assert.equal(followerDelivery.processed, 1)
    assert.deepEqual(deliveredTaskIds, [first.payload.taskId, second.payload.taskId])
  })

  test('allows the next aggregate event after its predecessor is dead-lettered', async ({
    assert,
  }) => {
    const aggregateId = randomUUID()
    await db.transaction(async (trx) => {
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-dead-letter:first:${aggregateId}`,
        })
      )
      await stageDomainEvent(
        trx,
        eventInput({
          assignmentId: aggregateId,
          dedupeKey: `aggregate-dead-letter:second:${aggregateId}`,
        })
      )
    })
    const repository = new PostgresDomainEventOutboxRepository()
    const [firstClaim] = await repository.claimBatch({
      workerId: 'aggregate-dead-letter-owner',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: BASE_TIME,
    })
    assert.isTrue(
      await repository.deadLetter({
        jobId: requireJob(firstClaim).id,
        leaseToken: requireJob(firstClaim).leaseToken,
        errorCode: 'PERMANENT_SUBSCRIBER_REJECTION',
        now: new Date(BASE_TIME.getTime() + 1),
      })
    )

    const next = await repository.claimBatch({
      workerId: 'aggregate-after-dead-letter-worker',
      batchSize: 10,
      leaseDurationMs: 1_000,
      now: new Date(BASE_TIME.getTime() + 2),
    })
    assert.lengthOf(next, 1)
    assert.isAbove(requireJob(next[0]).sequence, requireJob(firstClaim).sequence)
  })

  test('extends only a live lease with the matching fencing token', async ({ assert }) => {
    const input = eventInput()
    await db.transaction((trx) => stageDomainEvent(trx, input))
    const repository = new PostgresDomainEventOutboxRepository()
    const [claimed] = await repository.claimBatch({
      workerId: 'heartbeat-owner',
      batchSize: 1,
      leaseDurationMs: 1_000,
      now: BASE_TIME,
    })
    const lease = requireJob(claimed)
    const heartbeatAt = new Date(BASE_TIME.getTime() + 500)

    assert.isTrue(
      await repository.heartbeat({
        jobId: lease.id,
        leaseToken: lease.leaseToken,
        leaseDurationMs: 2_000,
        now: heartbeatAt,
      })
    )
    const renewed = (await db
      .from('domain_event_outbox')
      .select('locked_until')
      .where('id', lease.id)
      .firstOrFail()) as unknown as OutboxLeaseRow
    assert.equal(renewed.locked_until.getTime(), heartbeatAt.getTime() + 2_000)

    assert.isFalse(
      await repository.heartbeat({
        jobId: lease.id,
        leaseToken: randomUUID(),
        leaseDurationMs: 2_000,
        now: new Date(heartbeatAt.getTime() + 1),
      })
    )
    assert.isFalse(
      await repository.heartbeat({
        jobId: lease.id,
        leaseToken: lease.leaseToken,
        leaseDurationMs: 2_000,
        now: new Date(heartbeatAt.getTime() + 2_001),
      })
    )
  })

  test('retries transient delivery without persisting the raw error and later dispatches', async ({
    assert,
  }) => {
    const input = eventInput()
    const secret = 'tenant-secret-must-not-persist'
    await db.transaction((trx) => stageDomainEvent(trx, input))

    let currentTime = BASE_TIME
    let dispatchAttempts = 0
    const delivered: TaskAssignmentCompletedOutboxPayload[] = []
    const dispatcher: DurableDomainEventDispatcher = {
      dispatch(eventName, payload) {
        dispatchAttempts += 1
        if (dispatchAttempts === 1) {
          return Promise.reject(new Error(`upstream transport exposed ${secret}`))
        }
        if (eventName !== 'task:assignment:completed') {
          return Promise.reject(new Error('Unexpected test event'))
        }
        delivered.push(payload as TaskAssignmentCompletedOutboxPayload)
        return Promise.resolve()
      },
    }
    const worker = new DomainEventOutboxWorker({
      workerId: 'retry-worker',
      dispatcher,
      now: () => currentTime,
      random: () => 0.5,
      retryBaseMs: 1_000,
      retryCapMs: 1_000,
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 1,
      deadLettered: 0,
      leaseLost: 0,
    })
    const pending = (await db
      .from('domain_event_outbox')
      .where('dedupe_key', input.dedupeKey)
      .firstOrFail()) as unknown as OutboxStateRow
    assert.equal(pending['status'], 'pending')
    assert.equal(pending['last_error_code'], 'UNEXPECTED_EVENT_DELIVERY_ERROR')
    assert.notInclude(JSON.stringify(pending), secret)

    currentTime = new Date(BASE_TIME.getTime() + 1_001)
    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    assert.deepEqual(delivered, [input.payload])
    const processed = (await db
      .from('domain_event_outbox')
      .where('dedupe_key', input.dedupeKey)
      .firstOrFail()) as unknown as OutboxStateRow
    assert.equal(processed['status'], 'processed')
    assert.isNotNull(processed['processed_at'])
    assert.isNull(processed['last_error_code'])
  })

  test('retries review confirmation delivery with its correlated payload contract', async ({
    assert,
  }) => {
    const input = reviewConfirmedEventInput()
    await db.transaction((trx) => stageDomainEvent(trx, input))

    let currentTime = BASE_TIME
    let dispatchAttempts = 0
    const delivered: ReviewConfirmedOutboxPayload[] = []
    const dispatcher: DurableDomainEventDispatcher = {
      dispatch(eventName, payload) {
        dispatchAttempts += 1
        if (dispatchAttempts === 1) {
          return Promise.reject(new Error('temporary review projection outage'))
        }
        if (eventName !== 'review:confirmed') {
          return Promise.reject(new Error('Unexpected test event'))
        }
        delivered.push(payload as ReviewConfirmedOutboxPayload)
        return Promise.resolve()
      },
    }
    const worker = new DomainEventOutboxWorker({
      workerId: 'review-confirmed-retry-worker',
      dispatcher,
      now: () => currentTime,
      random: () => 0.5,
      retryBaseMs: 1_000,
      retryCapMs: 1_000,
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 1,
      deadLettered: 0,
      leaseLost: 0,
    })

    currentTime = new Date(BASE_TIME.getTime() + 1_001)
    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    assert.deepEqual(delivered, [input.payload])

    const processed = (await db
      .from('domain_event_outbox')
      .where('dedupe_key', input.dedupeKey)
      .firstOrFail()) as unknown as OutboxStateRow
    assert.equal(processed['status'], 'processed')
    assert.isNotNull(processed['processed_at'])
    assert.isNull(processed['last_error_code'])
  })

  test('permanently dead-letters a claimed row with a malformed payload', async ({ assert }) => {
    const assignmentId = randomUUID()
    const dedupeKey = `malformed:${assignmentId}`
    await db.table('domain_event_outbox').insert({
      event_name: 'task:assignment:completed',
      event_version: 1,
      dedupe_key: dedupeKey,
      dedupe_fingerprint: '0'.repeat(64),
      aggregate_type: 'task_assignment',
      aggregate_id: assignmentId,
      payload: { assignmentId },
    })

    let dispatchCalled = false
    const dispatcher: DurableDomainEventDispatcher = {
      dispatch() {
        dispatchCalled = true
        return Promise.resolve()
      },
    }
    const worker = new DomainEventOutboxWorker({
      workerId: 'malformed-payload-worker',
      dispatcher,
      now: () => BASE_TIME,
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 1,
      leaseLost: 0,
    })
    assert.isFalse(dispatchCalled)
    const row = (await db
      .from('domain_event_outbox')
      .where('dedupe_key', dedupeKey)
      .firstOrFail()) as unknown as OutboxStateRow
    assert.equal(row['status'], 'dead_letter')
    assert.equal(row['last_error_code'], 'INVALID_DOMAIN_EVENT_PAYLOAD')
    assert.isNotNull(row['dead_lettered_at'])
  })

  test('dead-letters a malformed review confirmation without invoking listeners', async ({
    assert,
  }) => {
    const reviewSessionId = randomUUID()
    const dedupeKey = `malformed-review:${reviewSessionId}`
    await db.table('domain_event_outbox').insert({
      event_name: 'review:confirmed',
      event_version: 1,
      dedupe_key: dedupeKey,
      dedupe_fingerprint: '0'.repeat(64),
      aggregate_type: 'review_session',
      aggregate_id: reviewSessionId,
      payload: { reviewSessionId },
    })

    let dispatchCalled = false
    const dispatcher: DurableDomainEventDispatcher = {
      dispatch() {
        dispatchCalled = true
        return Promise.resolve()
      },
    }
    const worker = new DomainEventOutboxWorker({
      workerId: 'malformed-review-payload-worker',
      dispatcher,
      now: () => BASE_TIME,
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 1,
      leaseLost: 0,
    })
    assert.isFalse(dispatchCalled)

    const row = (await db
      .from('domain_event_outbox')
      .where('dedupe_key', dedupeKey)
      .firstOrFail()) as unknown as OutboxStateRow
    assert.equal(row['status'], 'dead_letter')
    assert.equal(row['last_error_code'], 'INVALID_DOMAIN_EVENT_PAYLOAD')
    assert.isNotNull(row['dead_lettered_at'])
  })
})
