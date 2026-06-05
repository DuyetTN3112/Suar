import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication } from '#composition/notifications/notification-feed/notification_composition'
import { makeNotificationFanoutStager } from '#composition/notifications/notification-runtime/notification_operations_composition'
import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { PostgresFilterAlertNotificationDelivery } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_notification_delivery'
import { NotificationFanoutWorker } from '#modules/notifications/infra/adapters/notification-outbox/notification_fanout_worker'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const now = '2026-08-09T00:30:00.000Z'

async function cleanup(): Promise<void> {
  await db.from('notification_fanout_targets').delete()
  await db.from('notification_fanout_jobs').delete()
  await db.from('notification_projection_deliveries').delete()
  await db.from('notification_projection_targets').delete()
  await db.from('notification_outbox').delete()
  await db.from('notification_tombstones').delete()
  await db.from('notification_acceptance_ledger').delete()
  await db.from('notification_recipient_states').delete()
  await db.from('notifications').delete()
  await cleanupTestData()
}

test.group('Integration | Filter alert notification delivery', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanup())

  test('delivers through the durable fanout worker and deduplicates a repeated delivery key', async ({ assert }) => {
    const owner = await UserFactory.create({ username: `alert_delivery_${randomUUID()}` })
    const alert = createFilterAlert({
      id: randomUUID(),
      savedViewId: randomUUID(),
      ownerId: owner.id,
      savedViewLockVersion: 1,
      intervalMinutes: 30,
      timezone: 'UTC',
      now,
    })
    const delivery = new PostgresFilterAlertNotificationDelivery(makeNotificationFanoutStager())
    const input = {
      alert,
      evaluation: {
        providerState: 'healthy' as const,
        totalRelation: 'eq' as const,
        watermark: 'watermark-1',
        observationWindow: now,
        resultIdentityHash: 'result-1',
        safeSummary: { resultCount: 1, provider: 'postgres', partial: false },
      },
      idempotencyKey: 'delivery-key-1',
    }

    await delivery.deliver(input)
    await delivery.deliver(input)

    const jobs = (await db.from('notification_fanout_jobs').select('*')) as Array<{
      id: string
      source_event_name: string
      business_event_id: string
    }>
    const targets = (await db.from('notification_fanout_targets').select('*')) as Array<{
      recipient_id: string
      status: string
    }>
    assert.lengthOf(jobs, 1)
    assert.lengthOf(targets, 1)
    const job = jobs[0]
    const target = targets[0]
    if (!job || !target) throw new Error('fanout fixture rows were not created')
    assert.equal(job.source_event_name, 'filter.alert.match_detected')
    assert.equal(job.business_event_id, 'delivery-key-1')
    assert.equal(target.recipient_id, owner.id)
    assert.equal(target.status, 'pending')

    const result = await new NotificationFanoutWorker({
      acceptance: notificationApplication,
      workerId: 'filter-alert-delivery-test-worker',
      now: () => new Date(now),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()

    assert.equal(result.processed, 1)
    const notificationCountRow = (await db
      .from('notifications')
      .where('user_id', owner.id)
      .count('* as count')
      .first()) as { count?: number | string } | undefined
    const processedTarget = (await db
      .from('notification_fanout_targets')
      .where('job_id', job.id)
      .first()) as { status: string } | undefined
    assert.equal(Number(notificationCountRow?.count ?? 0), 1)
    assert.equal(processedTarget?.status, 'processed')
  })
})
