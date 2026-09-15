import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildFilterContextRequest } from '#modules/filtering/controllers/mappers/request/filtering/filter_context_request_mapper'

test.group('', () => {
  test('maps a valid route context', ({ assert }) => {
    assert.deepEqual(buildFilterContextRequest({ context: 'tasks.discovery.public' }), {
      context: 'tasks.discovery.public',
    })
  })

  test('rejects malformed route params', ({ assert }) => {
    assert.throws(() => buildFilterContextRequest({ context: 42 }), ValidationException)
    assert.throws(() => buildFilterContextRequest({ context: 'x'.repeat(257) }), ValidationException)
  })

})
