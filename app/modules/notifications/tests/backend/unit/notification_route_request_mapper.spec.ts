import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildNotificationRouteRequest,
} from '#modules/notifications/controllers/mappers/request/notification-feed/notification_route_request_mapper'

test.group('', () => {
  test('trims a valid notification route id', ({ assert }) => {
    assert.deepEqual(buildNotificationRouteRequest({ notificationId: ' notification-1 ' }), {
      notificationId: 'notification-1',
    })
  })

  test('rejects a missing notification route id', ({ assert }) => {
    assert.throws(() => buildNotificationRouteRequest({}), ValidationException)
  })

  test('rejects a non-string notification route id', ({ assert }) => {
    assert.throws(() => buildNotificationRouteRequest({ notificationId: 42 }), ValidationException)
  })

  test('rejects an empty or whitespace-only notification route id', ({ assert }) => {
    assert.throws(
      () => buildNotificationRouteRequest({ notificationId: '   ' }),
      ValidationException
    )
  })

  test('rejects non-object route params', ({ assert }) => {
    assert.throws(() => buildNotificationRouteRequest(null), ValidationException)
  })

})
