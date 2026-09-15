import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { TaskAssignmentCompletedOutboxPayload } from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_repository'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import {
  BASE_TIME,
  cleanOutbox,
  eventInput,
  requireJob,
  setupOutboxTestGroup,
  teardownOutboxTestGroup,
} from '#modules/events/tests/backend/support/domain_event_outbox_test_support'

test.group('Domain event outbox - Leases and Ordering', (group) => {
  group.setup(() => setupOutboxTestGroup())
  group.each.teardown(() => cleanOutbox())
  group.teardown(() => teardownOutboxTestGroup())

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
})
