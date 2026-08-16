import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildTaskReadPaginationRequest } from '#modules/tasks/controllers/mappers/request/task-reading/task_read_pagination_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(input, key) ? input[key] : fallback
    },
  }
}


test.group('', () => {
  test('canonicalizes page and pagination aliases', ({ assert }) => {
    assert.deepEqual(
      buildTaskReadPaginationRequest(fakeRequest({ page: '2', per_page: '25' })),
      { page: 2, perPage: 25 }
    )
    assert.deepEqual(
      buildTaskReadPaginationRequest(fakeRequest({ page: '3', limit: '15' })),
      { page: 3, perPage: 15 }
    )
  })

  test('rejects malformed and out-of-range values', ({ assert }) => {
    for (const input of [{ page: true }, { page: 0 }, { perPage: 'abc' }, { limit: 101 }]) {
      assert.throws(() => buildTaskReadPaginationRequest(fakeRequest(input)), ValidationException)
    }
  })


})
