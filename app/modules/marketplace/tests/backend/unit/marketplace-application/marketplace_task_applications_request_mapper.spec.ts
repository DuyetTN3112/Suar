import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildListMarketplaceTaskApplicationsRequest } from '#modules/marketplace/controllers/mappers/request/marketplace-application/marketplace_task_applications_request_mapper'

type RequestInput = Parameters<typeof buildListMarketplaceTaskApplicationsRequest>[0]

function requestWithValues(values: Record<string, unknown>): RequestInput {
  return {
    input: (key: string, fallback?: unknown): unknown =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback,
  }
}

test.group('Unit | Marketplace task applications request mapper', () => {
  test('maps route, status, and pagination aliases', ({ assert }) => {
    assert.deepEqual(
      buildListMarketplaceTaskApplicationsRequest(
        requestWithValues({ per_page: '25', status: 'approved', page: '2' }),
        { taskId: ' task-1 ' }
      ),
      { taskId: 'task-1', status: 'approved', page: 2, perPage: 25 }
    )
  })

  test('preserves defaults for an omitted query', ({ assert }) => {
    assert.deepEqual(
      buildListMarketplaceTaskApplicationsRequest(
        requestWithValues({}),
        { taskId: 'task-1' }
      ),
      { taskId: 'task-1', status: 'all', page: 1, perPage: 20 }
    )
  })

  test('rejects malformed route, status, and pagination values', ({ assert }) => {
    const cases: Array<{ params: unknown; values: Record<string, unknown> }> = [
      { params: { taskId: 42 }, values: {} },
      { params: { taskId: 'task-1' }, values: { status: 'unknown' } },
      { params: { taskId: 'task-1' }, values: { status: [] } },
      { params: { taskId: 'task-1' }, values: { page: {} } },
      { params: { taskId: 'task-1' }, values: { perPage: [] } },
      { params: { taskId: 'task-1' }, values: { perPage: null } },
      { params: { taskId: 'task-1' }, values: { per_page: 'not-a-number' } },
    ]

    for (const { params, values } of cases) {
      assert.throws(
        () =>
          buildListMarketplaceTaskApplicationsRequest(
            requestWithValues(values),
            params
          ),
        ValidationException
      )
    }
  })
})
