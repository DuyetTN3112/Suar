import { test } from '@japa/runner'

import {
  claimFilterAlert,
  completeFilterAlertRun,
  createFilterAlert,
  failFilterAlertRun,
  type FilterAlert,
} from '#modules/filtering/domain/filter-alert/filter_alert'

const input = {
  id: 'alert-1',
  savedViewId: 'view-1',
  ownerId: 'user-1',
  savedViewLockVersion: 4,
  intervalMinutes: 30,
  timezone: 'UTC',
  now: '2026-08-09T00:00:00.000Z',
}

test.group('Unit | Filter alert lifecycle', () => {
  test('creates a baseline alert with no result snapshot and a next run', ({ assert }) => {
    const alert = createFilterAlert(input)
    assert.equal(alert.status, 'active')
    assert.equal(alert.lastSuccessfulWatermark, null)
    assert.isString(alert.nextRunAt)
    assert.notProperty(alert, 'results')
  })

  test('fences overlapping claims and only accepts completion with the current fence', ({ assert }) => {
    const alert = createFilterAlert(input)
    const claimed = claimFilterAlert(alert, { workerId: 'worker-a', now: input.now, leaseDurationMs: 60_000, fenceToken: 'fence-a' })
    assert.equal(claimed.ok, true)
    if (!claimed.ok) return
    const rejected = claimFilterAlert(claimed.alert, { workerId: 'worker-b', now: input.now, leaseDurationMs: 60_000, fenceToken: 'fence-b' })
    assert.equal(rejected.ok, false)
    const stale = completeFilterAlertRun(claimed.alert, { workerId: 'worker-b', fenceToken: 'fence-b', now: input.now, watermark: 'wm-1', nextRunAt: '2026-08-09T00:30:00.000Z' })
    assert.equal(stale.ok, false)
    const completed = completeFilterAlertRun(claimed.alert, { workerId: 'worker-a', fenceToken: 'fence-a', now: input.now, watermark: 'wm-1', nextRunAt: '2026-08-09T00:30:00.000Z' })
    assert.equal(completed.ok, true)
  })

  test('failure increments retry and pauses degraded runs without advancing watermark', ({ assert }) => {
    const alert: FilterAlert = { ...createFilterAlert(input), lastSuccessfulWatermark: 'wm-previous' }
    const claimed = claimFilterAlert(alert, { workerId: 'worker-a', now: input.now, leaseDurationMs: 60_000, fenceToken: 'fence-a' })
    if (!claimed.ok) return
    const failed = failFilterAlertRun(claimed.alert, { workerId: 'worker-a', fenceToken: 'fence-a', now: input.now, reason: 'provider_degraded', retryAt: '2026-08-09T00:05:00.000Z' })
    assert.equal(failed.ok, true)
    if (failed.ok) {
      assert.equal(failed.alert.lastSuccessfulWatermark, 'wm-previous')
      assert.equal(failed.alert.retryCount, 1)
      assert.equal(failed.alert.status, 'paused')
    }
  })

  test('keeps interval cadence absolute across DST transitions', ({ assert }) => {
    const spring = createFilterAlert({ ...input, timezone: 'Europe/Berlin', now: '2026-03-29T00:30:00.000Z' })
    const autumn = createFilterAlert({ ...input, timezone: 'Europe/Berlin', now: '2026-10-25T00:30:00.000Z' })

    assert.equal(Date.parse(spring.nextRunAt) - Date.parse('2026-03-29T00:30:00.000Z'), 30 * 60_000)
    assert.equal(Date.parse(autumn.nextRunAt) - Date.parse('2026-10-25T00:30:00.000Z'), 30 * 60_000)
    assert.equal(spring.timezone, 'Europe/Berlin')
    assert.equal(autumn.timezone, 'Europe/Berlin')
  })
})
