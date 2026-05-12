import { test } from '@japa/runner'

import { buildUpdatePackageRequest } from '#modules/admin/packages/controllers/mappers/request/packages/update_package_request_mapper'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

test.group('Admin package update request mapper', () => {
  test('maps canonical and snake-case fields without coercing types', ({ assert }) => {
    assert.deepEqual(
      buildUpdatePackageRequest({
        params: { subscriptionId: 'sub-1' },
        body: { plan: 'pro', status: 'active', auto_renew: false, expires_at: null },
      }),
      {
        subscriptionId: 'sub-1',
        plan: 'pro',
        status: 'active',
        auto_renew: false,
        expires_at: null,
      }
    )
  })

  test('rejects a non-boolean auto renew value instead of forwarding it', ({ assert }) => {
    assert.throws(
      () => buildUpdatePackageRequest({ params: { subscriptionId: 'sub-1' }, body: { autoRenew: 'false' } }),
      ValidationException
    )
  })

  test('rejects a missing subscription route parameter', ({ assert }) => {
    assert.throws(() => buildUpdatePackageRequest({ params: {}, body: {} }), ValidationException)
  })
})
