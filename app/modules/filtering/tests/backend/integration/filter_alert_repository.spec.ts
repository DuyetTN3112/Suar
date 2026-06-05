import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { PostgresFilterAlertRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_alert_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

const VIEW_ID = '11111111-1111-4111-8111-111111111111'
const ALERT_ID = '22222222-2222-4222-8222-222222222222'
const OWNER_ID = '33333333-3333-4333-8333-333333333333'
const NOW = '2026-08-09T00:00:00.000Z'

test.group('Integration | Filter alert repository', (group) => {
  group.setup(async () => {
    await setupApp()
    await cleanupTestData()
    await db.from('filter_alerts').whereIn('id', [ALERT_ID]).delete()
    await db.from('filter_saved_views').whereIn('id', [VIEW_ID]).delete()
  })
  group.teardown(async () => {
    await db.from('filter_alerts').whereIn('id', [ALERT_ID]).delete()
    await db.from('filter_saved_views').whereIn('id', [VIEW_ID]).delete()
    await teardownApp()
  })

  test('persists schema, fences a claim, and only completes with the current lease', async ({ assert }) => {
    await db.table('filter_saved_views').insert({
      id: VIEW_ID,
      name: 'Alert fixture',
      normalized_name: 'alert fixture',
      owner_user_id: OWNER_ID,
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
    const alert = createFilterAlert({ id: ALERT_ID, savedViewId: VIEW_ID, ownerId: OWNER_ID, savedViewLockVersion: 1, intervalMinutes: 30, timezone: 'UTC', now: '2026-08-08T23:30:00.000Z' })
    await repository.create(alert)
    await db.from('filter_alerts').where('id', ALERT_ID).update({ next_run_at: NOW })

    const claimed = await repository.claimDue({ now: NOW, workerId: 'worker-a', leaseExpiresAt: '2026-08-09T00:05:00.000Z', fenceToken: 'fence-a' })
    assert.isNotNull(claimed)
    assert.equal(claimed?.alert.leaseOwnerId, 'worker-a')
    assert.isNull(await repository.complete({ alertId: ALERT_ID, expectedLockVersion: 1, workerId: 'worker-a', fenceToken: 'wrong-fence', lastSuccessfulWatermark: 'wm-1', completedAt: NOW, nextRunAt: '2026-08-09T00:30:00.000Z' }))
    const completed = await repository.complete({ alertId: ALERT_ID, expectedLockVersion: 2, workerId: 'worker-a', fenceToken: 'fence-a', lastSuccessfulWatermark: 'wm-1', completedAt: NOW, nextRunAt: '2026-08-09T00:30:00.000Z' })
    assert.equal(completed?.alert.lastSuccessfulWatermark, 'wm-1')
    assert.isNull(await repository.claimDue({ now: NOW, workerId: 'worker-b', leaseExpiresAt: '2026-08-09T00:35:00.000Z', fenceToken: 'fence-b' }))
    assert.isNull(await repository.claimDue({ now: '2026-08-08T23:59:00.000Z', workerId: 'worker-c', leaseExpiresAt: '2026-08-09T00:10:00.000Z', fenceToken: 'fence-c' }))
    const scheduled = await repository.updateSchedule({ alertId: ALERT_ID, expectedLockVersion: 3, intervalMinutes: 45, timezone: 'Europe/Berlin', updatedAt: NOW })
    assert.equal(scheduled?.alert.intervalMinutes, 45)
    const paused = await repository.setStatus({ alertId: ALERT_ID, expectedLockVersion: 4, status: 'paused', pauseReason: 'user_paused', updatedAt: NOW })
    assert.equal(paused?.alert.pauseReason, 'user_paused')
    assert.isTrue(await repository.softDelete({ alertId: ALERT_ID, expectedLockVersion: 5, deletedAt: NOW }))
    assert.isNull(await repository.findBySavedViewId(VIEW_ID))
  })
})
