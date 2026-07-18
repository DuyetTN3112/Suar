import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildAdminReviewDisputeListRequest } from '#modules/reviews/controllers/mappers/request/disputes/admin_review_dispute_list_request_mapper'

function request(values: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(values, key) ? values[key] : fallback
    },
  }
}


test.group('', () => {
  test('rejects wrong-type filters at the request boundary', ({ assert }) => {
    assert.throws(
      () => buildAdminReviewDisputeListRequest(request({ search: ['dispute'] })),
      ValidationException
    )
    assert.throws(
      () => buildAdminReviewDisputeListRequest(request({ page: { value: 2 } })),
      ValidationException
    )
  })

  test('keeps cursor requests on the first page and preserves valid filters', ({ assert }) => {
    assert.deepEqual(
      buildAdminReviewDisputeListRequest(
        request({ before: 'cursor-2', page: '5', per_page: '30', status: 'pending' })
      ),
      {
        page: 1,
        perPage: 30,
        after: null,
        before: 'cursor-2',
        status: 'pending',
        search: null,
      }
    )
  })


})
