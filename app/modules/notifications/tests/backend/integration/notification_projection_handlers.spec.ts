import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeDeleteNotification,
  makeMarkNotificationAsRead,
  notificationApplication as notificationPublicApi,
} from '#composition/notification_composition'
import { makeSystemNotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification_command'
import { NotificationTransientDeliveryError } from '#modules/notifications/domain/notification_outbox_errors'
import {
  NotificationFeedProjectionHandler,
  type NotificationSearchProjector,
} from '#modules/notifications/infra/projections/notification_feed_projection_handler'
import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/postgres_notification_outbox_repository'
import { PostgresNotificationProjectionDeliveryRepository } from '#modules/notifications/infra/repositories/postgres_notification_projection_delivery_repository'
import type {
  NotificationProjectionBatchResult,
  NotificationSearchDocument,
} from '#modules/notifications/infra/search/notification_search_index_repository'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

function commandFor(recipientId: string): NotificationCommandV1Input {
  return {
    eventId: randomUUID(),
    type: BACKEND_NOTIFICATION_TYPES.INFO,
    schemaVersion: 1,
    recipientId,
    scope: { kind: 'user', id: recipientId },
    parameters: {},
    occurredAt: new Date().toISOString(),
  }
}

function successfulProjection(
  documents: NotificationSearchDocument[]
): NotificationProjectionBatchResult {
  return {
    appliedIds: documents.map((document) => document.notificationId),
    staleIds: [],
    failures: [],
  }
}

async function claimFeedJob(repository: PostgresNotificationOutboxRepository) {
  const [job] = await repository.claimBatch({
    workerId: 'projection-test',
    destination: 'feed_search',
    batchSize: 1,
    leaseDurationMs: 30_000,
    now: new Date(),
  })
  if (!job) {
    throw new Error('Expected a feed projection job')
  }
  return job
}

test.group('Integration | Notification Projection Handlers', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('an older outbox upsert projects the latest canonical revision', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_projection_latest' })
    const accepted = await notificationPublicApi.accept(commandFor(user.id))
    const outboxRepository = new PostgresNotificationOutboxRepository()
    const oldJob = await claimFeedJob(outboxRepository)

    await makeMarkNotificationAsRead(makeSystemNotificationActionContext(user.id)).handle({
      id: accepted.notificationId,
    })

    const projected: Array<{
      physicalIndex: string
      documents: NotificationSearchDocument[]
    }> = []
    const projector: NotificationSearchProjector = {
      ensureIndex: () => Promise.resolve(),
      projectMany: (physicalIndex, documents) => {
        projected.push({ physicalIndex, documents })
        return Promise.resolve(successfulProjection(documents))
      },
    }
    const handler = new NotificationFeedProjectionHandler({ projector })

    await handler.deliver(oldJob, { signal: new AbortController().signal })

    assert.lengthOf(projected, 1)
    const document = projected[0]?.documents[0]
    assert.equal(document?.notificationId, accepted.notificationId)
    assert.equal(document?.revision, 2)
    assert.equal(document?.deleted, false)
    if (document?.deleted === false) {
      assert.equal(document.state, 'read')
      assert.isNotNull(document.readAt)
    }

    const delivery = (await db
      .from('notification_projection_deliveries')
      .where('outbox_id', oldJob.id)
      .first()) as { status: string; applied_revision: number | string } | undefined
    assert.equal(delivery?.status, 'processed')
    assert.equal(Number(delivery?.applied_revision), 2)
  })

  test('successful target delivery survives a transient failure on another target', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_projection_multitarget' })
    const primaryTargetId = randomUUID()
    const buildingTargetId = randomUUID()
    await db.table('notification_projection_targets').insert([
      {
        id: primaryTargetId,
        target_key: 'primary-v1',
        physical_index: 'notifications-primary-v1',
        status: 'primary',
        active_from_sequence: 0,
      },
      {
        id: buildingTargetId,
        target_key: 'building-v2',
        physical_index: 'notifications-building-v2',
        status: 'building',
        active_from_sequence: 0,
      },
    ])
    await notificationPublicApi.accept(commandFor(user.id))
    const outboxRepository = new PostgresNotificationOutboxRepository()
    const job = await claimFeedJob(outboxRepository)
    const calls: string[] = []
    let buildingFailures = 0
    const projector: NotificationSearchProjector = {
      ensureIndex: () => Promise.resolve(),
      projectMany: (physicalIndex, documents) => {
        calls.push(physicalIndex)
        if (physicalIndex === 'notifications-building-v2' && buildingFailures === 0) {
          buildingFailures += 1
          return Promise.resolve({
            appliedIds: [],
            staleIds: [],
            failures: [
              {
                notificationId: documents[0]?.notificationId ?? 'missing',
                retryable: true,
                status: 429,
                errorClass: 'es_rejected_execution_exception',
                errorMessage: 'busy',
              },
            ],
          })
        }
        return Promise.resolve(successfulProjection(documents))
      },
    }
    const handler = new NotificationFeedProjectionHandler({ projector })

    await assert.rejects(
      () => handler.deliver(job, { signal: new AbortController().signal }),
      NotificationTransientDeliveryError
    )
    await handler.deliver(job, { signal: new AbortController().signal })

    assert.deepEqual(calls, [
      'notifications-primary-v1',
      'notifications-building-v2',
      'notifications-building-v2',
    ])
    const deliveries = (await db
      .from('notification_projection_deliveries')
      .where('outbox_id', job.id)
      .orderBy('target_id', 'asc')) as Array<{ status: string }>
    assert.lengthOf(deliveries, 2)
    assert.isTrue(deliveries.every((delivery) => delivery.status === 'processed'))
  })

  test('an overtaken upsert projects the durable content-free tombstone', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_projection_tombstone' })
    const accepted = await notificationPublicApi.accept(commandFor(user.id))
    const outboxRepository = new PostgresNotificationOutboxRepository()
    const oldJob = await claimFeedJob(outboxRepository)
    await makeDeleteNotification(makeSystemNotificationActionContext(user.id)).handle({
      id: accepted.notificationId,
    })

    const documents: NotificationSearchDocument[] = []
    const projector: NotificationSearchProjector = {
      ensureIndex: () => Promise.resolve(),
      projectMany: (_physicalIndex, batch) => {
        documents.push(...batch)
        return Promise.resolve(successfulProjection(batch))
      },
    }
    const handler = new NotificationFeedProjectionHandler({ projector })

    await handler.deliver(oldJob, { signal: new AbortController().signal })

    assert.lengthOf(documents, 1)
    const tombstone = documents[0]
    assert.equal(tombstone?.notificationId, accepted.notificationId)
    assert.equal(tombstone?.revision, 2)
    assert.equal(tombstone?.deleted, true)
    assert.notProperty(tombstone ?? {}, 'title')
    assert.notProperty(tombstone ?? {}, 'body')
    assert.notProperty(tombstone ?? {}, 'metadata')
  })

  test('target checkpoint cannot advance past an older missing delivery', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_projection_checkpoint' })
    const targetId = randomUUID()
    await notificationPublicApi.accept(commandFor(user.id))
    await notificationPublicApi.accept(commandFor(user.id))

    const outboxRepository = new PostgresNotificationOutboxRepository()
    const jobs = await outboxRepository.claimBatch({
      workerId: 'checkpoint-test',
      destination: 'feed_search',
      batchSize: 2,
      leaseDurationMs: 30_000,
      now: new Date(),
    })
    assert.lengthOf(jobs, 2)
    const [older, newer] = jobs
    if (!older || !newer) {
      throw new Error('Expected two ordered feed jobs')
    }
    await db.table('notification_projection_targets').insert({
      id: targetId,
      target_key: 'checkpoint-primary',
      physical_index: 'notifications-checkpoint-primary',
      status: 'primary',
      active_from_sequence: older.sequence - 1,
      checkpoint_sequence: older.sequence - 1,
    })
    const deliveries = new PostgresNotificationProjectionDeliveryRepository()

    for (const job of [older, newer]) {
      await deliveries.prepareRequiredDeliveries(job, new Date())
      assert.isTrue(
        await deliveries.leaseDelivery({
          outboxId: job.id,
          targetId,
          parentLeaseToken: job.leaseToken,
          parentLockedUntil: job.lockedUntil,
          now: new Date(),
        })
      )
    }

    assert.isTrue(
      await deliveries.acknowledgeDelivery({
        outboxId: newer.id,
        targetId,
        parentLeaseToken: newer.leaseToken,
        appliedRevision: newer.revision,
        now: new Date(),
      })
    )
    const checkpointBeforeGap = (await db
      .from('notification_projection_targets')
      .select('checkpoint_sequence')
      .where('id', targetId)
      .first()) as { checkpoint_sequence: number | string }
    assert.isBelow(Number(checkpointBeforeGap.checkpoint_sequence), newer.sequence)

    assert.isTrue(
      await deliveries.acknowledgeDelivery({
        outboxId: older.id,
        targetId,
        parentLeaseToken: older.leaseToken,
        appliedRevision: older.revision,
        now: new Date(),
      })
    )
    const checkpointAfterGap = (await db
      .from('notification_projection_targets')
      .select('checkpoint_sequence')
      .where('id', targetId)
      .first()) as { checkpoint_sequence: number | string }
    assert.equal(Number(checkpointAfterGap.checkpoint_sequence), newer.sequence)
  })
})
