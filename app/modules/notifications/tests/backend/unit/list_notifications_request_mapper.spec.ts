import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildListNotificationsRequest,
  buildListNotificationsV1Request,
} from '#modules/notifications/controllers/mappers/request/notification-feed/list_notifications_request_mapper'

interface RequestLike {
  input(key: string, defaultValue?: unknown): unknown
}


function requestWithValues(values: Record<string, unknown>): RequestLike {
  return {
    input: (key: string, defaultValue?: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue,
  }
}


test.group('', () => {
  test('maps inertia pagination aliases and unread filter strictly', ({ assert }) => {
    assert.deepEqual(
      buildListNotificationsRequest(
        requestWithValues({
          page: '2',
          limit: '25',
          unread_only: 'true',
          after: ' cursor-after ',
          before: ' ',
        })
      ),
      {
        page: 1,
        perPage: 25,
        after: 'cursor-after',
        before: null,
        unreadOnly: true,
      }
    )
  })

  test('maps api v1 aliases and defaults', ({ assert }) => {
    assert.deepEqual(
      buildListNotificationsV1Request(
        requestWithValues({
          page: '3',
          per_page: '10',
          unreadOnly: 'false',
        })
      ),
      {
        page: 3,
        perPage: 10,
        after: null,
        before: null,
        unreadOnly: false,
      }
    )
  })

  test('rejects invalid pagination and boolean values', ({ assert }) => {
    const cases: Array<() => unknown> = [
      () => buildListNotificationsRequest(requestWithValues({ page: '0' })),
      () => buildListNotificationsRequest(requestWithValues({ limit: 'nope' })),
      () => buildListNotificationsRequest(requestWithValues({ unread_only: 'yes' })),
      () => buildListNotificationsV1Request(requestWithValues({ perPage: null })),
      () => buildListNotificationsV1Request(requestWithValues({ unreadOnly: '1' })),
    ]

    for (const run of cases) {
      assert.throws(run, ValidationException)
    }
  })

})
