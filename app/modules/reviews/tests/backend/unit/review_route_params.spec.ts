import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/review-core/route_params'

test.group('', () => {
  test('trims a valid dispute identifier', ({ assert }) => {
    assert.equal(requireRouteParam({ disputeId: ' dispute-1 ' }, 'disputeId'), 'dispute-1')
  })

  test('rejects malformed dispute identifiers before the action boundary', ({ assert }) => {
    assert.throws(() => requireRouteParam({ disputeId: 42 }, 'disputeId'), ValidationException)
  })


})
