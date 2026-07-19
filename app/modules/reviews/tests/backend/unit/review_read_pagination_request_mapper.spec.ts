import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildReviewReadPaginationRequest } from '#modules/reviews/controllers/mappers/request/review-core/review_read_pagination_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(input, key) ? input[key] : fallback
    },
  } as never
}


test.group('', () => {
  test('canonicalizes valid pagination aliases to page/perPage', ({ assert }) => {
    assert.deepEqual(
      buildReviewReadPaginationRequest(fakeRequest({ page: '2', per_page: '25' })),
      { page: 2, perPage: 25 }
    )

    assert.deepEqual(
      buildReviewReadPaginationRequest(fakeRequest({ page: '3', limit: '15' })),
      { page: 3, perPage: 15 }
    )

    assert.deepEqual(
      buildReviewReadPaginationRequest(
        fakeRequest({ page: '4', perPage: '5', per_page: '20', limit: '30' })
      ),
      { page: 4, perPage: 5 }
    )
  })

  test('rejects invalid page types and values', ({ assert }) => {
    for (const value of [true, {}, 'abc', 0, -1]) {
      assert.throws(
        () => buildReviewReadPaginationRequest(fakeRequest({ page: value })),
        ValidationException
      )
    }
  })

  test('rejects invalid perPage aliases and values', ({ assert }) => {
    for (const [field, value] of [
      ['perPage', true],
      ['per_page', {}],
      ['limit', 'abc'],
      ['perPage', 0],
      ['per_page', -1],
      ['limit', 101],
    ] as const) {
      assert.throws(
        () => buildReviewReadPaginationRequest(fakeRequest({ [field]: value })),
        ValidationException
      )
    }
  })


})
