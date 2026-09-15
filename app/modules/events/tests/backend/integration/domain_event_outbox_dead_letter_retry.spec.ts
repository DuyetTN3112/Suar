import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type {
  DurableDomainEventDispatcher,
  ReviewConfirmedOutboxPayload,
  TaskAssignmentCompletedOutboxPayload,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_repository'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import {
  BASE_TIME,
  cleanOutbox,
  eventInput,
  type OutboxLeaseRow,
  type OutboxStateRow,
  requireJob,
  reviewConfirmedEventInput,
  setupOutboxTestGroup,
  teardownOutboxTestGroup,
} from '#modules/events/tests/backend/support/domain_event_outbox_test_support'

test.group('Domain event outbox - Dead Lettering, Lease Extension, and Retry', (group) => {
  group.setup(() => setupOutboxTestGroup())
  group.each.teardown(() => cleanOutbox())
  group.teardown(() => teardownOutboxTestGroup())

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
