import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildTestingAuthFixtureRequest,
  buildTestingBootstrapRequest,
  buildTestingRefreshRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_auth_request_mapper'

test.group('', () => {
  test('maps canonical fixture aliases and rejects malformed fields', ({ assert }) => {
    assert.deepEqual(
      buildTestingAuthFixtureRequest({
        email: ' user@example.test ',
        provider: 'google',
        organization_id: 'org-1',
        system_role: 'registered_user',
      }),
      {
        email: 'user@example.test',
        provider: 'google',
        requestedOrganizationId: 'org-1',
        requestedSystemRole: 'registered_user',
      }
    )
    assert.throws(() => buildTestingAuthFixtureRequest({ email: 42 }), ValidationException)
    assert.throws(() => buildTestingAuthFixtureRequest({ email: 'a@' }), ValidationException)
    assert.throws(() => buildTestingAuthFixtureRequest({ email: 'a@b.test', provider: [] }), ValidationException)
  })

  test('maps refresh and bootstrap tokens without silently ignoring wrong types', ({ assert }) => {
    assert.deepEqual(buildTestingRefreshRequest({ refresh_token: 'refresh-1' }), {
      refreshToken: 'refresh-1',
    })
    assert.equal(buildTestingBootstrapRequest({}, 'Bearer access-1'), 'access-1')
    assert.equal(buildTestingBootstrapRequest({ access_token: 'access-2' }, undefined), 'access-2')
    assert.throws(() => buildTestingRefreshRequest({ refreshToken: 42 }), ValidationException)
    assert.throws(() => buildTestingBootstrapRequest({ accessToken: [] }, undefined), ValidationException)
  })

})
