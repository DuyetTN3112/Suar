import { test } from '@japa/runner'

import {
  evaluateFilterAlertPolicy,
  type FilterAlertPolicyInput,
} from '#modules/filtering/domain/filter-alert/filter_alert_policy'

const baseInput = (overrides: Partial<FilterAlertPolicyInput> = {}): FilterAlertPolicyInput => ({
  hasSubscriptionPermission: true,
  contextAlertsEnabled: true,
  savedViewMigrationState: 'current',
  providerState: 'healthy',
  totalRelation: 'eq',
  intervalMinutes: 30,
  queryCost: 10,
  maxQueryCost: 100,
  timezone: 'Asia/Ho_Chi_Minh',
  ...overrides,
})

test.group('Unit | Filter alert policy', () => {
  test('allows a healthy exact-total subscription with a valid timezone', ({ assert }) => {
    assert.deepEqual(evaluateFilterAlertPolicy(baseInput()), { allowed: true })
  })

  test('fails closed for permission, context, migration, provider and cost failures', ({ assert }) => {
    for (const overrides of [
      { hasSubscriptionPermission: false },
      { contextAlertsEnabled: false },
      { savedViewMigrationState: 'requires_repair' as const },
      { providerState: 'degraded' as const },
      { queryCost: 101 },
      { totalRelation: 'unknown' as const },
    ]) {
      const decision = evaluateFilterAlertPolicy(baseInput(overrides))
      assert.isFalse(decision.allowed)
      assert.isString(decision.reason)
    }
  })

  test('rejects invalid timezone and intervals below the safety floor', ({ assert }) => {
    assert.equal(evaluateFilterAlertPolicy(baseInput({ timezone: 'Mars/Olympus' })).reason, 'invalid_timezone')
    assert.equal(evaluateFilterAlertPolicy(baseInput({ intervalMinutes: 5 })).reason, 'interval_too_short')
  })
})
