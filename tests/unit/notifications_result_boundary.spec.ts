import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import DeleteNotificationController from '#modules/notifications/controllers/notification-feed/delete_notification_controller'
import ListNotificationsController from '#modules/notifications/controllers/notification-feed/list_notifications_controller'
import MarkNotificationReadController from '#modules/notifications/controllers/notification-feed/mark_notification_read_controller'

const failure = new ForbiddenException('Notification access denied')

function context() {
  return {
    request: {
      input: () => undefined,
      header: () => null,
      ip: () => '127.0.0.1',
    },
    params: { notificationId: 'notification-1' },
    response: { noContent: () => undefined },
    auth: { user: { id: 'user-1', current_organization_id: null } },
    session: { get: () => null },
    inertia: { render: () => undefined },
    currentOrganizationId: null,
    currentOrganizationRole: null,
  }
}

test.group('Unit | Notifications Result boundary', () => {
  test('feed controller unwraps query failures', async ({ assert }) => {
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const factory = { makeGetUserNotifications: () => query }

    await assert.rejects(
      () =>
        new ListNotificationsController(factory as never).handle(
          context() as never
        ),
      failure.message
    )
  })

  test('mark-read controllers unwrap command failures', async ({ assert }) => {
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const factory = { makeMarkNotificationAsRead: () => command }

    await assert.rejects(
      () =>
        new MarkNotificationReadController(factory as never).markOne(
          context() as never
        ),
      failure.message
    )
  })

  test('delete controllers unwrap command failures', async ({ assert }) => {
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const factory = { makeDeleteNotification: () => command }

    await assert.rejects(
      () =>
        new DeleteNotificationController(factory as never).destroy(
          context() as never
        ),
      failure.message
    )
  })
})
