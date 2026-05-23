import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication } from '#composition/notifications/notification-feed/notification_composition'
import { makeNotificationFanoutStager } from '#composition/notifications/notification-runtime/notification_operations_composition'
import type { FilterAlertEvaluation, FilterAlertEvaluator } from '#modules/filtering/actions/ports/outbound/filter_alert_evaluator'
import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { PostgresFilterAlertNotificationDelivery } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_notification_delivery'
import { PostgresFilterAlertRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_alert_repository'
import { FilterAlertWorker } from '#modules/filtering/infra/adapters/filter-alert/filter_alert_worker'
import { NotificationFanoutWorker } from '#modules/notifications/infra/adapters/notification-outbox/notification_fanout_worker'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const now = '2026-08-09T02:00:00.000Z'

class HealthyEvaluator implements FilterAlertEvaluator {
  evaluate(): Promise<FilterAlertEvaluation> {
    return Promise.resolve({
      providerState: 'healthy',
      totalRelation: 'eq',
      watermark: 'watermark-1',
      observationWindow: now,
      resultIdentityHash: 'result-1',
      safeSummary: { resultCount: 1, provider: 'test', partial: false },
    })
  }
}

async function cleanup(alertId: string, viewId: string): Promise<void> {
  await db.from('filter_alerts').where('id', alertId).delete()
  await db.from('filter_saved_views').where('id', viewId).delete()
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

test.group('Integration | Filter alert worker delivery', (group) => {
  let alertId = ''
  let viewId = ''

  group.setup(async () => {
    await setupApp()
    await cleanupTestData()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanup(alertId, viewId))

  test('claims a real PostgreSQL alert, stages delivery, then advances its watermark', async ({ assert }) => {
    const owner = await UserFactory.create({ username: `alert_worker_${randomUUID()}` })
    viewId = randomUUID()
    alertId = randomUUID()
    await db.table('filter_saved_views').insert({
      id: viewId,
      name: `Worker fixture ${alertId}`,
      normalized_name: `worker fixture ${alertId}`,
      owner_user_id: owner.id,
      visibility: 'private',
      context_key: 'tasks.discovery.public',
      context_owner: 'tasks',
      context_schema_version: 1,
      criteria_payload: { filter: null, textQuery: null, sort: [], projection: [] },
      criteria_checksum: 'a'.repeat(64),
      presentation_payload: {},
      last_successful_migration_version: 1,
      canonical_payload_bytes: 64,
    })
    const repository = new PostgresFilterAlertRepository()
    await repository.create(createFilterAlert({
      id: alertId,
      savedViewId: viewId,
      ownerId: owner.id,
      savedViewLockVersion: 1,
      intervalMinutes: 30,
      timezone: 'UTC',
      now: '2026-08-09T01:00:00.000Z',
    }))
    await db.from('filter_alerts').where('id', alertId).update({ next_run_at: now })

    const result = await new FilterAlertWorker(
      repository,
      new HealthyEvaluator(),
      new PostgresFilterAlertNotificationDelivery(makeNotificationFanoutStager())
    ).runOnce({ workerId: 'real-alert-worker', now, leaseDurationMs: 30_000, fenceToken: 'fence-1' })

    assert.deepEqual(result, { claimed: true, delivered: true, watermarkAdvanced: true, leaseLost: false, paused: false })
    const persisted = await repository.findById(alertId)
    assert.equal(persisted?.alert.lastSuccessfulWatermark, 'watermark-1')
    const jobCountRow = (await db
      .from('notification_fanout_jobs')
      .where('source_event_name', 'filter.alert.match_detected')
      .count('* as count')
      .first()) as { count?: number | string } | undefined
    assert.equal(Number(jobCountRow?.count ?? 0), 1)

    const fanout = await new NotificationFanoutWorker({
      acceptance: notificationApplication,
      workerId: 'real-alert-fanout-worker',
      now: () => new Date(now),
      batchSize: 10,
      concurrency: 1,
    }).runOnce()
    assert.equal(fanout.processed, 1)
    const notificationCountRow = (await db
      .from('notifications')
      .where('user_id', owner.id)
      .count('* as count')
      .first()) as { count?: number | string } | undefined
    assert.equal(Number(notificationCountRow?.count ?? 0), 1)
  })
})
