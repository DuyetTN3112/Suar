import { test } from '@japa/runner'

import DeleteNotification from '#actions/notifications/delete_notification'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import MarkNotificationAsRead from '#actions/notifications/mark_notification_as_read'
import { notificationPublicApi } from '#actions/notifications/public_api'
import { BACKEND_NOTIFICATION_TYPES } from '#constants/notification_constants'
import NotFoundException from '#exceptions/not_found_exception'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

function requireNotificationId(
  notification: { id: string } | null,
  assert: { isNotNull: (value: unknown) => void }
): string {
  assert.isNotNull(notification)
  if (!notification) {
    throw new Error('Expected notification to be created')
  }
  return notification.id
}

test.group('Integration | Notification Flow', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates and reads notifications from the active repository storage', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_reader' })

    const created = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Task assigned',
      message: 'You have a new task to review',
      type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
      related_entity_type: 'task',
      related_entity_id: 'task-notification-id',
    })

    const createdId = requireNotificationId(created, assert)

    const result = await new GetUserNotifications(ExecutionContext.system(user.id)).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(result.notifications.length, 1)
    assert.equal(result.unread_count, 1)
    assert.equal(result.meta.total, 1)
    assert.equal(result.notifications[0]?.id, createdId)
    assert.equal(result.notifications[0]?.title, 'Task assigned')
    assert.equal(result.notifications[0]?.type, BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED)
  })

  test('marks a notification as read for its owner and updates unread count', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_owner' })

    const created = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Join request approved',
      message: 'Your request was approved',
      type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION,
    })

    const createdId = requireNotificationId(created, assert)

    await new MarkNotificationAsRead(ExecutionContext.system(user.id)).handle({
      id: createdId,
    })

    const result = await new GetUserNotifications(ExecutionContext.system(user.id)).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(result.unread_count, 0)
    assert.isTrue(result.notifications[0]?.is_read ?? false)
    assert.isNotNull(result.notifications[0]?.read_at ?? null)
  })

  test('rejects mark-as-read and delete when notification belongs to another user', async ({
    assert,
  }) => {
    const owner = await UserFactory.create({ username: 'notification_real_owner' })
    const outsider = await UserFactory.create({ username: 'notification_outsider' })

    const created = await notificationPublicApi.handle({
      user_id: owner.id,
      title: 'Review updated',
      message: 'A review session has changed',
      type: BACKEND_NOTIFICATION_TYPES.REVIEW,
    })

    const createdId = requireNotificationId(created, assert)

    const markAction = new MarkNotificationAsRead(ExecutionContext.system(outsider.id))
    await assert.rejects(() => markAction.handle({ id: createdId }), NotFoundException)

    const deleteAction = new DeleteNotification(ExecutionContext.system(outsider.id))
    await assert.rejects(() => deleteAction.handle({ id: createdId }), NotFoundException)

    const ownerView = await new GetUserNotifications(ExecutionContext.system(owner.id)).handle({
      page: 1,
      limit: 20,
    })
    assert.equal(ownerView.notifications.length, 1)
    assert.equal(ownerView.unread_count, 1)
  })

  test('deletes notification for owner and removes it from subsequent reads', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_delete_owner' })

    const created = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'System notice',
      message: 'This will be deleted',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })

    const createdId = requireNotificationId(created, assert)

    await new DeleteNotification(ExecutionContext.system(user.id)).handle({
      id: createdId,
    })

    const result = await new GetUserNotifications(ExecutionContext.system(user.id)).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(result.notifications.length, 0)
    assert.equal(result.unread_count, 0)
    assert.equal(result.meta.total, 0)
  })

  test('paginates notifications consistently while preserving newest-first ordering', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_pagination_owner' })

    const first = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'First',
      message: 'First notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const second = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Second',
      message: 'Second notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const third = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Third',
      message: 'Third notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })

    const ids = [
      requireNotificationId(first, assert),
      requireNotificationId(second, assert),
      requireNotificationId(third, assert),
    ]

    const page1 = await new GetUserNotifications(ExecutionContext.system(user.id)).handle({
      page: 1,
      limit: 2,
    })
    const page2 = await new GetUserNotifications(ExecutionContext.system(user.id)).handle({
      page: 2,
      limit: 2,
    })

    assert.equal(page1.notifications.length, 2)
    assert.equal(page2.notifications.length, 1)
    assert.equal(page1.meta.total, 3)
    assert.equal(page1.meta.last_page, 2)

    const paginatedIds = [
      ...page1.notifications.map((notification) => notification.id),
      ...page2.notifications.map((notification) => notification.id),
    ]

    assert.deepEqual(new Set(paginatedIds).size, ids.length)
    assert.deepEqual(new Set(paginatedIds), new Set(ids))
  })

  test('markAllAsRead and deleteAllRead affect only current user notifications', async ({
    assert,
  }) => {
    const owner = await UserFactory.create({ username: 'notification_bulk_owner' })
    const outsider = await UserFactory.create({ username: 'notification_bulk_outsider' })

    await notificationPublicApi.handle({
      user_id: owner.id,
      title: 'Owner A',
      message: 'Unread owner notification A',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    await notificationPublicApi.handle({
      user_id: owner.id,
      title: 'Owner B',
      message: 'Unread owner notification B',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    await notificationPublicApi.handle({
      user_id: outsider.id,
      title: 'Outsider',
      message: 'Should remain untouched',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })

    const ownerMarkAll = new MarkNotificationAsRead(ExecutionContext.system(owner.id))
    await ownerMarkAll.markAllAsRead()

    const ownerAfterMark = await new GetUserNotifications(ExecutionContext.system(owner.id)).handle(
      {
        page: 1,
        limit: 20,
      }
    )
    assert.equal(ownerAfterMark.unread_count, 0)

    const ownerDeleteAllRead = new DeleteNotification(ExecutionContext.system(owner.id))
    await ownerDeleteAllRead.deleteAllRead()

    const ownerAfterDelete = await new GetUserNotifications(
      ExecutionContext.system(owner.id)
    ).handle({
      page: 1,
      limit: 20,
    })
    const outsiderAfterDelete = await new GetUserNotifications(
      ExecutionContext.system(outsider.id)
    ).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(ownerAfterDelete.notifications.length, 0)
    assert.equal(ownerAfterDelete.meta.total, 0)
    assert.equal(outsiderAfterDelete.notifications.length, 1)
    assert.equal(outsiderAfterDelete.unread_count, 1)
  })
})
