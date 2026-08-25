import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildProfileDiscoverabilityRequest } from '#modules/users/controllers/mappers/request/profile/profile_discoverability_request_mapper'

test.group('', () => {
  test('maps canonical and legacy field names', ({ assert }) => {
    assert.deepEqual(buildProfileDiscoverabilityRequest({ is_searchable: true }), { isSearchable: true })
    assert.deepEqual(buildProfileDiscoverabilityRequest({ isSearchable: false }), { isSearchable: false })
  })

  test('rejects string booleans', ({ assert }) => {
    assert.throws(() => buildProfileDiscoverabilityRequest({ is_searchable: 'true' }), ValidationException)
  })

})
