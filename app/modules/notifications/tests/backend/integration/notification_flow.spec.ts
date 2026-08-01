import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeDeleteNotification,
  makeMarkNotificationAsRead,
  notificationApplication as notificationPublicApi,
} from '#composition/notification_composition'
import { makeGetUserNotifications } from '#composition/notification_feed_composition'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { makeSystemNotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

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

async function countAuditEvents(
  action: string,
  entityType?: string,
  entityId?: string
): Promise<number> {
  let query = db.from('audit_events').where('action', action)

  if (entityType) {
    query = query.where('entity_type', entityType)
  }

  if (entityId) {
    query = query.where('entity_id', entityId)
  }

  const result = (await query.count('* as count')) as { count: number | string }[]
  return Number(result[0]?.count ?? 0)
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

    const result = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
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

    await makeMarkNotificationAsRead(makeSystemNotificationActionContext(user.id)).handle({
      id: createdId,
    })

    const result = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(result.unread_count, 0)
    assert.isTrue(result.notifications[0]?.is_read ?? false)
    assert.isNotNull(result.notifications[0]?.read_at ?? null)
    assert.equal(
      await countAuditEvents('notifications.mark_read.completed', 'notification', createdId),
      1
    )
  })

  test('does not turn a committed read mutation into failure when observability is unavailable', async ({
    assert,
    cleanup,
  }) => {
    const user = await UserFactory.create({ username: 'notification_safe_checkpoint_owner' })
    const created = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Safe checkpoint test',
      message: 'The mutation must survive an audit sink outage',
      type: BACKEND_NOTIFICATION_TYPES.ORGANIZATION,
    })
    const createdId = requireNotificationId(created, assert)
    const originalWriteAllowAnonymous = auditPublicApi.writeAllowAnonymous.bind(auditPublicApi)
    auditPublicApi.writeAllowAnonymous = () =>
      Promise.reject(new Error('simulated_observability_sink_failure'))
    cleanup(() => {
      auditPublicApi.writeAllowAnonymous = originalWriteAllowAnonymous
    })

    const result = await makeMarkNotificationAsRead(
      makeSystemNotificationActionContext(user.id)
    ).handle({ id: createdId })

    assert.isTrue(result.success)
    const persisted = (await db
      .from('notifications')
      .select('is_read')
      .where('id', createdId)
      .first()) as { is_read: boolean } | undefined
    assert.isTrue(persisted?.is_read ?? false)
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

    const markAction = makeMarkNotificationAsRead(makeSystemNotificationActionContext(outsider.id))
    await assert.rejects(() => markAction.handle({ id: createdId }), NotFoundException)

    const deleteAction = makeDeleteNotification(makeSystemNotificationActionContext(outsider.id))
    await assert.rejects(() => deleteAction.handle({ id: createdId }), NotFoundException)

    const ownerView = await makeGetUserNotifications(
      makeSystemNotificationActionContext(owner.id)
    ).handle({
      page: 1,
      limit: 20,
    })
    const outsiderView = await makeGetUserNotifications(
      makeSystemNotificationActionContext(outsider.id)
    ).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(ownerView.notifications.length, 1)
    assert.equal(ownerView.unread_count, 1)
    assert.equal(outsiderView.notifications.length, 0)
    assert.equal(outsiderView.unread_count, 0)
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

    await makeDeleteNotification(makeSystemNotificationActionContext(user.id)).handle({
      id: createdId,
    })

    const result = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(result.notifications.length, 0)
    assert.equal(result.unread_count, 0)
    assert.equal(result.meta.total, 0)
    assert.equal(
      await countAuditEvents('notifications.delete.completed', 'notification', createdId),
      1
    )
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

    const page1 = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      page: 1,
      limit: 2,
    })
    const page2 = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
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

  test('cursor pagination returns older notifications without duplicating the first window', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_cursor_owner' })
    const baseTime = new Date('2026-07-05T12:00:00.000Z')

    const first = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Cursor First',
      message: 'Cursor first notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const second = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Cursor Second',
      message: 'Cursor second notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const third = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Cursor Third',
      message: 'Cursor third notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })

    await db
      .from('notifications')
      .where('id', requireNotificationId(first, assert))
      .update({
        created_at: new Date(baseTime.getTime() - 0 * 60_000),
      })
    await db
      .from('notifications')
      .where('id', requireNotificationId(second, assert))
      .update({
        created_at: new Date(baseTime.getTime() - 1 * 60_000),
      })
    await db
      .from('notifications')
      .where('id', requireNotificationId(third, assert))
      .update({
        created_at: new Date(baseTime.getTime() - 2 * 60_000),
      })

    const firstWindow = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      limit: 2,
    })
    const secondWindow = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      limit: 2,
      after: firstWindow.cursor.next_cursor,
    })

    assert.lengthOf(firstWindow.notifications, 2)
    assert.isTrue(firstWindow.cursor.has_next_page)
    assert.isNotNull(firstWindow.cursor.next_cursor)
    assert.lengthOf(secondWindow.notifications, 1)
    assert.isFalse(secondWindow.cursor.has_next_page)

    const seenIds = new Set([
      ...firstWindow.notifications.map((notification) => notification.id),
      ...secondWindow.notifications.map((notification) => notification.id),
    ])

    assert.equal(seenIds.size, 3)
  })

  test('cursor pagination supports moving back to newer windows without reordering items', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_bidirectional_cursor_owner' })
    const baseTime = new Date('2026-07-05T13:00:00.000Z')

    const first = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Bidirectional First',
      message: 'Bidirectional first notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const second = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Bidirectional Second',
      message: 'Bidirectional second notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const third = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Bidirectional Third',
      message: 'Bidirectional third notification',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })

    await db
      .from('notifications')
      .where('id', requireNotificationId(first, assert))
      .update({
        created_at: new Date(baseTime.getTime() - 0 * 60_000),
      })
    await db
      .from('notifications')
      .where('id', requireNotificationId(second, assert))
      .update({
        created_at: new Date(baseTime.getTime() - 1 * 60_000),
      })
    await db
      .from('notifications')
      .where('id', requireNotificationId(third, assert))
      .update({
        created_at: new Date(baseTime.getTime() - 2 * 60_000),
      })

    const firstWindow = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      limit: 2,
    })
    const secondWindow = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      limit: 2,
      after: firstWindow.cursor.next_cursor,
    })
    const backToNewerWindow = await makeGetUserNotifications(
      makeSystemNotificationActionContext(user.id)
    ).handle({
      limit: 2,
      before: secondWindow.cursor.previous_cursor,
    })

    assert.lengthOf(firstWindow.notifications, 2)
    assert.lengthOf(secondWindow.notifications, 1)
    assert.isTrue(secondWindow.cursor.has_previous_page)
    assert.isNotNull(secondWindow.cursor.previous_cursor)
    assert.deepEqual(
      backToNewerWindow.notifications.map((notification) => notification.id),
      firstWindow.notifications.map((notification) => notification.id)
    )
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

    const ownerMarkAll = makeMarkNotificationAsRead(makeSystemNotificationActionContext(owner.id))
    await ownerMarkAll.markAllAsRead()

    const ownerAfterMark = await makeGetUserNotifications(
      makeSystemNotificationActionContext(owner.id)
    ).handle({
      page: 1,
      limit: 20,
    })
    assert.equal(ownerAfterMark.unread_count, 0)

    const ownerDeleteAllRead = makeDeleteNotification(makeSystemNotificationActionContext(owner.id))
    await ownerDeleteAllRead.deleteAllRead()

    const ownerAfterDelete = await makeGetUserNotifications(
      makeSystemNotificationActionContext(owner.id)
    ).handle({
      page: 1,
      limit: 20,
    })
    const outsiderAfterDelete = await makeGetUserNotifications(
      makeSystemNotificationActionContext(outsider.id)
    ).handle({
      page: 1,
      limit: 20,
    })

    assert.equal(ownerAfterDelete.notifications.length, 0)
    assert.equal(ownerAfterDelete.unread_count, 0)
    assert.equal(outsiderAfterDelete.notifications.length, 1)
    assert.equal(outsiderAfterDelete.unread_count, 1)
    assert.equal(await countAuditEvents('notifications.mark_all_read.completed'), 1)
    assert.equal(await countAuditEvents('notifications.delete_all_read.completed'), 1)
  })
})
