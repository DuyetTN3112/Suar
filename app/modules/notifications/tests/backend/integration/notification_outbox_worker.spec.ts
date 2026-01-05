import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeReplayNotificationOutboxCommand } from '#composition/notification_operations_composition'
import { makeSystemAuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type {
  NotificationOutboxJob,
  NotificationOutboxRepository,
} from '#modules/notifications/domain/notification_outbox'
import {
  NotificationPermanentDeliveryError,
  NotificationTransientDeliveryError,
} from '#modules/notifications/domain/notification_outbox_errors'
import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/postgres_notification_outbox_repository'
import { NotificationOutboxWorker } from '#modules/notifications/infra/workers/notification_outbox_worker'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

interface SeedOutboxOptions {
  destination?: 'feed_search' | 'unread_cache'
  status?: 'pending' | 'leased' | 'processed' | 'dead_letter'
  attemptCount?: number
  availableAt?: Date
  lastErrorClass?: string
}

const baseTime = new Date('2026-07-23T00:00:00.000Z')

async function seedOutbox(recipientId: string, options: SeedOutboxOptions = {}): Promise<string> {
  const id = randomUUID()
  const destination = options.destination ?? 'feed_search'
  const partitionKey = randomUUID()

  await db.table('notification_outbox').insert({
    id,
    notification_id: destination === 'feed_search' ? randomUUID() : null,
    operation_id: randomUUID(),
    source_event_id: randomUUID(),
    event_kind: destination === 'feed_search' ? 'notification_upsert' : 'unread_absolute',
    revision: 1,
    projection_revision: 1,
    destination,
    partition_key: partitionKey,
    recipient_id: recipientId,
    recipient_state_revision: 1,
    payload:
      destination === 'feed_search'
        ? {
            notificationId: partitionKey,
            recipientId,
            revision: 1,
          }
        : {
            recipientId,
            count: 1,
            revision: 1,
          },
    status: options.status ?? 'pending',
    attempt_count: options.attemptCount ?? 0,
    available_at: options.availableAt ?? baseTime,
    dead_lettered_at: options.status === 'dead_letter' ? baseTime : null,
    last_error_class: options.lastErrorClass ?? null,
  })

  return id
}

async function outboxRow(id: string): Promise<Record<string, unknown>> {
  const row = (await db.from('notification_outbox').where('id', id).first()) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    throw new Error(`Missing outbox row ${id}`)
  }
  return row
}

test.group('Integration | Notification Outbox Worker', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('concurrent workers claim disjoint bounded batches', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_outbox_concurrent' })
    const ids = await Promise.all(Array.from({ length: 6 }, () => seedOutbox(user.id)))
    const repository = new PostgresNotificationOutboxRepository()

    const [first, second] = await Promise.all([
      repository.claimBatch({
        workerId: 'worker-a',
        batchSize: 3,
        leaseDurationMs: 30_000,
        now: baseTime,
      }),
      repository.claimBatch({
        workerId: 'worker-b',
        batchSize: 3,
        leaseDurationMs: 30_000,
        now: baseTime,
      }),
    ])

    const claimedIds = [...first, ...second].map((job) => job.id)
    assert.lengthOf(first, 3)
    assert.lengthOf(second, 3)
    assert.lengthOf(new Set(claimedIds), 6)
    assert.sameMembers(claimedIds, ids)
    assert.isTrue([...first, ...second].every((job) => job.attemptCount === 1))
    assert.isTrue([...first, ...second].every((job) => job.leaseToken.length > 0))
  })

  test('expired work is reclaimed and stale lease holders cannot mutate it', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_outbox_fencing' })
    const id = await seedOutbox(user.id)
    const repository = new PostgresNotificationOutboxRepository()

    const [firstLease] = await repository.claimBatch({
      workerId: 'worker-before-crash',
      batchSize: 1,
      leaseDurationMs: 30_000,
      now: baseTime,
    })
    if (!firstLease) {
      throw new Error('Expected first lease')
    }

    const reclaimedAt = new Date(baseTime.getTime() + 31_000)
    const [secondLease] = await repository.claimBatch({
      workerId: 'worker-after-crash',
      batchSize: 1,
      leaseDurationMs: 30_000,
      now: reclaimedAt,
    })
    if (!secondLease) {
      throw new Error('Expected reclaimed lease')
    }

    assert.equal(secondLease.id, id)
    assert.notEqual(secondLease.leaseToken, firstLease.leaseToken)
    assert.equal(secondLease.attemptCount, 2)
    assert.isFalse(
      await repository.acknowledge({
        jobId: id,
        leaseToken: firstLease.leaseToken,
        now: reclaimedAt,
      })
    )
    assert.isFalse(
      await repository.retry({
        jobId: id,
        leaseToken: firstLease.leaseToken,
        availableAt: reclaimedAt,
        errorClass: 'stale_worker',
        errorMessage: 'must not overwrite current owner',
        now: reclaimedAt,
      })
    )
    assert.isTrue(
      await repository.acknowledge({
        jobId: id,
        leaseToken: secondLease.leaseToken,
        now: reclaimedAt,
      })
    )
    const processedRow = await outboxRow(id)
    assert.equal(processedRow['status'], 'processed')
  })

  test('heartbeat extends an active lease and is fenced after lease loss', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_outbox_heartbeat' })
    const id = await seedOutbox(user.id)
    const repository = new PostgresNotificationOutboxRepository()

    const [lease] = await repository.claimBatch({
      workerId: 'worker-heartbeat',
      batchSize: 1,
      leaseDurationMs: 30_000,
      now: baseTime,
    })
    if (!lease) {
      throw new Error('Expected heartbeat lease')
    }

    const heartbeatAt = new Date(baseTime.getTime() + 10_000)
    assert.isTrue(
      await repository.heartbeat({
        jobId: id,
        leaseToken: lease.leaseToken,
        leaseDurationMs: 30_000,
        now: heartbeatAt,
      })
    )
    assert.lengthOf(
      await repository.claimBatch({
        workerId: 'too-early',
        batchSize: 1,
        leaseDurationMs: 30_000,
        now: new Date(baseTime.getTime() + 31_000),
      }),
      0
    )

    const [reclaimed] = await repository.claimBatch({
      workerId: 'after-heartbeat-expiry',
      batchSize: 1,
      leaseDurationMs: 30_000,
      now: new Date(baseTime.getTime() + 41_000),
    })
    if (!reclaimed) {
      throw new Error('Expected lease after heartbeat expiry')
    }
    assert.isFalse(
      await repository.heartbeat({
        jobId: id,
        leaseToken: lease.leaseToken,
        leaseDurationMs: 30_000,
        now: new Date(baseTime.getTime() + 41_000),
      })
    )
  })

  test('a long-running handler is aborted and cannot ACK after heartbeat loses its lease', async ({
    assert,
  }) => {
    const secret = 'database-token-do-not-log'
    const events: PlatformEvent[] = []
    const job: NotificationOutboxJob = {
      id: randomUUID(),
      sequence: 1,
      notificationId: randomUUID(),
      operationId: randomUUID(),
      sourceEventId: randomUUID(),
      eventKind: 'notification_upsert',
      revision: 1,
      projectionRevision: 1,
      destination: 'feed_search',
      partitionKey: randomUUID(),
      recipientId: randomUUID(),
      recipientStateRevision: 1,
      payload: {},
      attemptCount: 1,
      leaseToken: randomUUID(),
      lockedUntil: new Date(baseTime.getTime() + 1_000),
    }
    const calls = { heartbeat: 0, acknowledge: 0, retry: 0, deadLetter: 0 }
    let claimed = false
    const repository: NotificationOutboxRepository = {
      claimBatch: () => {
        if (claimed) {
          return Promise.resolve([])
        }
        claimed = true
        return Promise.resolve([job])
      },
      heartbeat: () => {
        calls.heartbeat += 1
        return Promise.reject(new Error(`heartbeat database failure: ${secret}`))
      },
      acknowledge: () => {
        calls.acknowledge += 1
        return Promise.resolve(true)
      },
      retry: () => {
        calls.retry += 1
        return Promise.resolve(true)
      },
      deadLetter: () => {
        calls.deadLetter += 1
        return Promise.resolve(true)
      },
    }
    let handlerObservedAbort = false
    const worker = new NotificationOutboxWorker({
      repository,
      workerId: 'heartbeat-loss-test',
      handlers: {
        feed_search: (_job, context) =>
          new Promise<void>((resolve) => {
            context.signal.addEventListener(
              'abort',
              () => {
                handlerObservedAbort = true
                resolve()
              },
              { once: true }
            )
          }),
        unread_cache: () => Promise.resolve(),
      },
      now: () => baseTime,
      leaseDurationMs: 1_000,
      heartbeatIntervalMs: 100,
      handlerDeadlineMs: 900,
      operationalLogger: {
        log: (_level, event) => {
          events.push(event)
          throw new Error('telemetry sink unavailable')
        },
      },
    })

    const result = await worker.runOnce()

    assert.equal(result.leaseLost, 1)
    assert.isTrue(handlerObservedAbort)
    assert.equal(calls.heartbeat, 1)
    assert.equal(calls.acknowledge, 0)
    assert.equal(calls.retry, 0)
    assert.equal(calls.deadLetter, 0)
    assert.equal(events[0]?.event_name, 'notification.outbox.lease_lost')
    assert.equal(events[0]?.stage, 'heartbeat_failed')
    assert.equal(events[0]?.error?.['class'], 'Error')
    assert.notInclude(JSON.stringify(events), secret)
    assert.notInclude(JSON.stringify(events), job.recipientId)
  })

  test('transient failures retry with backoff and successful retry ACKs once', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_outbox_retry' })
    const id = await seedOutbox(user.id)
    const repository = new PostgresNotificationOutboxRepository()
    let deliveryAttempts = 0
    let now = baseTime
    const worker = new NotificationOutboxWorker({
      repository,
      workerId: 'worker-retry',
      handlers: {
        feed_search: () => {
          deliveryAttempts += 1
          if (deliveryAttempts === 1) {
            throw new NotificationTransientDeliveryError('search_temporarily_unavailable')
          }
          return Promise.resolve()
        },
        unread_cache: () => Promise.resolve(),
      },
      now: () => now,
      random: () => 0.5,
      retryBaseMs: 1_000,
      retryCapMs: 300_000,
    })

    const firstResult = await worker.runOnce()
    const retryRow = await outboxRow(id)
    assert.equal(firstResult.retried, 1)
    assert.equal(retryRow['status'], 'pending')
    assert.equal(retryRow['last_error_class'], 'NotificationTransientDeliveryError')
    assert.equal(new Date(String(retryRow['available_at'])).getTime(), baseTime.getTime() + 1_000)

    now = new Date(baseTime.getTime() + 1_000)
    const secondResult = await worker.runOnce()
    assert.equal(secondResult.processed, 1)
    assert.equal(deliveryAttempts, 2)
    const processedRow = await outboxRow(id)
    assert.equal(processedRow['status'], 'processed')

    const thirdResult = await worker.runOnce()
    assert.equal(thirdResult.claimed, 0)
    assert.equal(deliveryAttempts, 2)
  })

  test('permanent and exhausted transient failures are dead-lettered', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_outbox_dead_letter' })
    const permanentId = await seedOutbox(user.id)
    const exhaustedId = await seedOutbox(user.id, { attemptCount: 9 })
    const repository = new PostgresNotificationOutboxRepository()
    const worker = new NotificationOutboxWorker({
      repository,
      workerId: 'worker-dead-letter',
      handlers: {
        feed_search: (job) => {
          if (job.id === permanentId) {
            throw new NotificationPermanentDeliveryError('mapping_rejected')
          }
          throw new NotificationTransientDeliveryError('still_unavailable')
        },
        unread_cache: () => Promise.resolve(),
      },
      now: () => baseTime,
      maxAttempts: 10,
    })

    const result = await worker.runOnce()

    assert.equal(result.deadLettered, 2)
    const permanentRow = await outboxRow(permanentId)
    const exhaustedRow = await outboxRow(exhaustedId)
    assert.equal(permanentRow['status'], 'dead_letter')
    assert.equal(exhaustedRow['status'], 'dead_letter')
  })

  test('one poison record does not block later records in the batch', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_outbox_poison' })
    const poisonId = await seedOutbox(user.id)
    const validId = await seedOutbox(user.id)
    const repository = new PostgresNotificationOutboxRepository()
    const delivered: string[] = []
    const worker = new NotificationOutboxWorker({
      repository,
      workerId: 'worker-poison-isolation',
      handlers: {
        feed_search: (job) => {
          if (job.id === poisonId) {
            throw new NotificationPermanentDeliveryError('invalid_projection')
          }
          delivered.push(job.id)
          return Promise.resolve()
        },
        unread_cache: () => Promise.resolve(),
      },
      now: () => baseTime,
      batchSize: 10,
      concurrency: 2,
    })

    const result = await worker.runOnce()

    assert.equal(result.deadLettered, 1)
    assert.equal(result.processed, 1)
    assert.deepEqual(delivered, [validId])
    const poisonRow = await outboxRow(poisonId)
    const validRow = await outboxRow(validId)
    assert.equal(poisonRow['status'], 'dead_letter')
    assert.equal(validRow['status'], 'processed')
  })

  test('DLQ replay is atomic, reasoned, and append-only audited', async ({ assert }) => {
    const operator = await UserFactory.create({ username: 'notification_outbox_operator' })
    const id = await seedOutbox(operator.id, {
      status: 'dead_letter',
      attemptCount: 10,
      lastErrorClass: 'mapping_rejected',
    })
    const replayCommand = makeReplayNotificationOutboxCommand()

    const result = await replayCommand.execute(
      {
        selector: { ids: [id] },
        reason: 'Mapping was fixed and deployment verified',
        now: baseTime,
      },
      makeSystemAuditActionContext(operator.id)
    )

    assert.equal(result.affectedCount, 1)
    const replayed = await outboxRow(id)
    assert.equal(replayed['status'], 'pending')
    assert.equal(replayed['attempt_count'], 0)
    assert.isNull(replayed['dead_lettered_at'])

    const audit = (await db
      .from('audit_events')
      .where('action', 'notification_outbox.replayed')
      .where('entity_id', id)
      .first()) as { new_values: Record<string, unknown> } | undefined
    assert.exists(audit)
    assert.equal(audit?.new_values['reason'], 'Mapping was fixed and deployment verified')
    assert.equal(audit?.new_values['previousStatus'], 'dead_letter')
    assert.equal(audit?.new_values['resultingStatus'], 'pending')
  })

  test('audits a bounded replay apply attempt even when the selector matches nothing', async ({
    assert,
  }) => {
    const operator = await UserFactory.create({
      username: 'notification_outbox_zero_match_operator',
    })
    const result = await makeReplayNotificationOutboxCommand().execute(
      {
        selector: { ids: ['11111111-1111-4111-8111-111111111111'] },
        reason: 'Verify the repaired selector safely matches no remaining rows',
        now: baseTime,
      },
      makeSystemAuditActionContext(operator.id)
    )

    assert.equal(result.affectedCount, 0)
    const audit = (await db
      .from('audit_events')
      .select('new_values')
      .where('action', 'notification_outbox.replayed')
      .where('entity_type', 'notification_outbox_replay')
      .whereRaw("new_values ->> 'actorId' = ?", [operator.id])
      .first()) as { new_values: Record<string, unknown> } | undefined
    assert.exists(audit)
    assert.equal(audit?.new_values['affectedCount'], 0)
  })
})
