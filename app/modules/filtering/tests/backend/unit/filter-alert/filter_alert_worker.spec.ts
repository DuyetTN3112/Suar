import { test } from '@japa/runner'

import type { FilterAlertDelivery } from '#modules/filtering/actions/ports/outbound/filter_alert_delivery'
import type { FilterAlertEvaluation, FilterAlertEvaluator } from '#modules/filtering/actions/ports/outbound/filter_alert_evaluator'
import type { FilterAlertRecord, FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { alertDeliveryIdempotencyKey, FilterAlertWorker } from '#modules/filtering/infra/adapters/filter-alert/filter_alert_worker'

function fixture(): FilterAlertRecord {
  return { alert: createFilterAlert({ id: 'alert-1', savedViewId: 'view-1', ownerId: 'user-1', savedViewLockVersion: 2, intervalMinutes: 30, timezone: 'UTC', now: '2026-08-09T00:00:00.000Z' }), lockVersion: 1 }
}

class FakeRepository implements FilterAlertRepository {
  record = fixture()
  completed = false
  failed = false
  create(alert: ReturnType<typeof createFilterAlert>) { return Promise.resolve({ alert, lockVersion: 1 }) }
  findById() { return Promise.resolve(this.record) }
  findBySavedViewId() { return Promise.resolve(this.record) }
  claimDue() { return Promise.resolve(this.record) }
  complete() { this.completed = true; return Promise.resolve(this.record) }
  fail() { this.failed = true; return Promise.resolve(this.record) }
  updateSchedule() { return Promise.resolve(this.record) }
  setStatus() { return Promise.resolve(this.record) }
  softDelete() { return Promise.resolve(true) }
}

class FakeEvaluator implements FilterAlertEvaluator {
  evaluation: FilterAlertEvaluation = { providerState: 'healthy', totalRelation: 'eq', watermark: 'wm-2', observationWindow: 'window-1', resultIdentityHash: 'ids-1', safeSummary: { newMatches: 1 } }
  evaluate() { return Promise.resolve(this.evaluation) }
}

class FakeDelivery implements FilterAlertDelivery {
  keys: string[] = []
  deliver(input: Parameters<FilterAlertDelivery['deliver']>[0]) { this.keys.push(input.idempotencyKey); return Promise.resolve() }
}

test.group('Unit | Filter alert worker', () => {
  test('delivers once and advances watermark only after durable acknowledgement', async ({ assert }) => {
    const repository = new FakeRepository()
    const delivery = new FakeDelivery()
    const worker = new FilterAlertWorker(repository, new FakeEvaluator(), delivery)
    const result = await worker.runOnce({ workerId: 'worker-a', now: '2026-08-09T00:00:00.000Z', leaseDurationMs: 60_000, fenceToken: 'fence-a' })
    assert.deepEqual(result, { claimed: true, delivered: true, watermarkAdvanced: true, leaseLost: false, paused: false })
    assert.equal(delivery.keys[0], alertDeliveryIdempotencyKey({ alertId: 'alert-1', viewRevision: 2, observationWindow: 'window-1', resultIdentityHash: 'ids-1' }))
    assert.isTrue(repository.completed)
  })

  test('pauses without advancing the watermark when provider evaluation is degraded', async ({ assert }) => {
    const repository = new FakeRepository()
    const evaluator = new FakeEvaluator()
    evaluator.evaluation = { ...evaluator.evaluation, providerState: 'degraded' }
    const delivery = new FakeDelivery()
    const result = await new FilterAlertWorker(repository, evaluator, delivery).runOnce({ workerId: 'worker-a', now: '2026-08-09T00:00:00.000Z', leaseDurationMs: 60_000, fenceToken: 'fence-a' })
    assert.equal(result.delivered, false)
    assert.equal(result.watermarkAdvanced, false)
    assert.isTrue(repository.failed)
    assert.isEmpty(delivery.keys)
  })
})
