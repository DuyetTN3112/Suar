import { test } from '@japa/runner'
import {
  toDisplaySubscriptionPlan,
  toStorageSubscriptionPlan,
} from '#domain/users/subscription_rules'

test.group('Subscription rules', () => {
  test('maps UI plans to storage plans and back for Pro Max', ({ assert }) => {
    assert.equal(toStorageSubscriptionPlan('promax'), 'enterprise')
    assert.equal(toStorageSubscriptionPlan('pro'), 'pro')
    assert.isUndefined(toStorageSubscriptionPlan(undefined))

    assert.equal(toDisplaySubscriptionPlan('enterprise'), 'promax')
    assert.equal(toDisplaySubscriptionPlan('pro'), 'pro')
  })
})
