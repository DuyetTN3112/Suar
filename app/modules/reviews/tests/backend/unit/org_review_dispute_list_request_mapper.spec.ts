import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildOrgReviewDisputeListRequest } from '#modules/reviews/controllers/mappers/request/disputes/org_review_dispute_list_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(input, key) ? input[key] : fallback
    },
  }
}


test.group('', () => {
  test('maps valid filters and pagination aliases', ({ assert }) => {
    assert.deepEqual(
      buildOrgReviewDisputeListRequest(
        fakeRequest({
          page: '2',
          per_page: '25',
          after: ' cursor-after ',
          before: '',
          status: ' open ',
          search: ' dispute ',
        })
      ),
      {
        page: 2,
        perPage: 25,
        after: 'cursor-after',
        before: null,
        status: 'open',
        search: 'dispute',
      }
    )
  })

  test('limits search to 200 characters', ({ assert }) => {
    assert.throws(
      () =>
        buildOrgReviewDisputeListRequest(
          fakeRequest({
            search: 'x'.repeat(201),
          })
        ),
      ValidationException
    )
  })

  test('rejects invalid filter and pagination types instead of defaulting them', ({ assert }) => {
    for (const [field, value] of [
      ['after', 123],
      ['before', true],
      ['status', {}],
      ['search', []],
      ['page', 'abc'],
      ['perPage', false],
    ] as const) {
      assert.throws(
        () => buildOrgReviewDisputeListRequest(fakeRequest({ [field]: value })),
        ValidationException
      )
    }
  })


})
