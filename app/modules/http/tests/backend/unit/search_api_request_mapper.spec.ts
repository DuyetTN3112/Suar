import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildSearchApiRequest } from '#modules/http/controllers/mappers/request/search-discovery/search_api_request_mapper'

test.group('', () => {
  test('preserves the existing blank-query compatibility behavior', ({ assert }) => {
    assert.deepEqual(buildSearchApiRequest(undefined), { query: '' })
    assert.deepEqual(buildSearchApiRequest(''), { query: '' })
    assert.deepEqual(buildSearchApiRequest('  Discovery  '), { query: '  Discovery  ' })
  })

  test('rejects malformed query values with a canonical q issue', ({ assert }) => {
    for (const value of [null, 42, true, [], {}]) {
      let thrown: unknown
      try {
        buildSearchApiRequest(value)
      } catch (error: unknown) {
        thrown = error
      }

      assert.instanceOf(thrown, ValidationException)
      assert.deepEqual((thrown as ValidationException).issues[0], {
        code: 'E_VALIDATION',
        path: 'q',
        message: 'q must be a string',
      })
    }
  })

})
