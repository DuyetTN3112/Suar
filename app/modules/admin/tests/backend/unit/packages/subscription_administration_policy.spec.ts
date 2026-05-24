import { test } from '@japa/runner'

import { validateSubscriptionAdministrationInput } from '#modules/admin/packages/domain/packages/subscription_administration_policy'

test.group('Admin package domain policy', () => {
  test('owns supported subscription administration inputs', ({ assert }) => {
    assert.deepEqual(
      validateSubscriptionAdministrationInput({
        plan: 'promax',
        status: 'active',
      }),
      { valid: true }
    )
    assert.deepEqual(
      validateSubscriptionAdministrationInput({ plan: 'unknown' }),
      { valid: false, field: 'plan' }
    )
  })
})
