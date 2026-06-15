import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import ListNotificationsController from '#modules/notifications/controllers/notification-feed/list_notifications_controller'
import ListNotificationsV1Controller from '#modules/notifications/controllers/notification-feed/v1/list_notifications_controller'

function requestWithValues(values: Record<string, unknown>) {
  return {
    input: (key: string, defaultValue?: unknown) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultValue,
    header: () => null,
    ip: () => '127.0.0.1',
  }
}

function notificationContext(values: Record<string, unknown>) {
  return {
    request: requestWithValues(values),
    auth: { user: { id: 'user-1', current_organization_id: null } },
    session: { get: () => null },
    inertia: { render: () => undefined },
    currentOrganizationId: null,
    currentOrganizationRole: null,
  }
}

test.group('Unit | Notification controller validation', () => {
  test('inertia controller rejects invalid unread_only before invoking the use case', async ({
    assert,
  }) => {
    const controller = new ListNotificationsController({
      makeGetUserNotifications: () => {
        throw new Error('use_case_must_not_run')
      },
    } as never)

    await assert.rejects(
      () => controller.handle(notificationContext({ unread_only: 'yes' }) as never),
      ValidationException
    )
  })

  test('api v1 controller rejects invalid unreadOnly before invoking the use case', async ({
    assert,
  }) => {
    const controller = new ListNotificationsV1Controller({
      makeGetUserNotifications: () => {
        throw new Error('use_case_must_not_run')
      },
    } as never)

    await assert.rejects(
      () => controller.handle(notificationContext({ unreadOnly: 'truthy' }) as never),
      ValidationException
    )
  })
})
