import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import CreateNotification from '#actions/common/create_notification'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import MarkNotificationAsRead from '#actions/notifications/mark_notification_as_read'
import DeleteNotification from '#actions/notifications/delete_notification'
import { ExecutionContext } from '#types/execution_context'
import NotFoundException from '#exceptions/not_found_exception'

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

    const created = await new CreateNotification().handle({
      user_id: user.id,
      title: 'Task assigned',
      message: 'You have a new task to review',
      type: 'task_assigned',
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
    assert.equal(result.notifications[0]?.type, 'task_assigned')
  })

  test('marks a notification as read for its owner and updates unread count', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_owner' })

    const created = await new CreateNotification().handle({
      user_id: user.id,
      title: 'Join request approved',
      message: 'Your request was approved',
      type: 'organization',
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

    const created = await new CreateNotification().handle({
      user_id: owner.id,
      title: 'Review updated',
      message: 'A review session has changed',
      type: 'review',
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

    const created = await new CreateNotification().handle({
      user_id: user.id,
      title: 'System notice',
      message: 'This will be deleted',
      type: 'info',
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
})
