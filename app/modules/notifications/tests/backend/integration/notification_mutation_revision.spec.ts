import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeDeleteNotification,
  makeMarkNotificationAsRead,
  notificationApplication as notificationPublicApi,
} from '#composition/notifications/notification-feed/notification_composition'
import { makeSystemNotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification-feed/notification_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

function commandFor(recipientId: string, eventId = randomUUID()): NotificationCommandV1Input {
  return {
    eventId,
    type: 'task_assigned',
    schemaVersion: 1,
    recipientId,
    scope: { kind: 'user', id: recipientId },
    subject: { type: 'task', id: randomUUID() },
    parameters: { taskTitle: 'Mutation revision test' },
    occurredAt: new Date().toISOString(),
    dedupeKey: `mutation:${eventId}`,
  }
}

async function projectionRevisions(destination: 'feed_search' | 'unread_cache'): Promise<number[]> {
  const rows = (await db
    .from('notification_outbox')
    .select('projection_revision')
    .where('destination', destination)
    .orderBy('projection_revision', 'asc')) as { projection_revision: string | number }[]
  return rows.map((row) => Number(row.projection_revision))
}

test.group('Integration | Notification Mutation Revisions', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('mark-read is idempotent and preserves the first read timestamp', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_read_revision' })
    const accepted = await notificationPublicApi.accept(commandFor(user.id))
    const notificationId = accepted.notificationId
    const action = makeMarkNotificationAsRead(makeSystemNotificationActionContext(user.id))

    await action.handle({ id: notificationId })
    const first = (await db.from('notifications').where('id', notificationId).first()) as {
      is_read: boolean
      read_at: Date
      revision: string | number
    }
    const firstReadAt = new Date(first.read_at).toISOString()

    await action.handle({ id: notificationId })
    const second = (await db.from('notifications').where('id', notificationId).first()) as {
      is_read: boolean
      read_at: Date
      revision: string | number
    }
    const recipientState = (await db
      .from('notification_recipient_states')
      .where('recipient_id', user.id)
      .first()) as { unread_count: string | number; revision: string | number }

    assert.isTrue(second.is_read)
    assert.equal(new Date(second.read_at).toISOString(), firstReadAt)
    assert.equal(Number(second.revision), 2)
    assert.equal(Number(recipientState.unread_count), 0)
    assert.equal(Number(recipientState.revision), 2)
    assert.deepEqual(await projectionRevisions('feed_search'), [1, 2])
    assert.deepEqual(await projectionRevisions('unread_cache'), [1, 2])
  })

  test('delete writes a content-free durable tombstone and terminal ledger', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_delete_revision' })
    const command = commandFor(user.id)
    const accepted = await notificationPublicApi.accept(command)

    await makeDeleteNotification(makeSystemNotificationActionContext(user.id)).handle({
      id: accepted.notificationId,
    })

    const notification: unknown = await db
      .from('notifications')
      .where('id', accepted.notificationId)
      .first()
    const tombstone = (await db
      .from('notification_tombstones')
      .where('notification_id', accepted.notificationId)
      .first()) as Record<string, unknown>
    const ledger = (await db
      .from('notification_acceptance_ledger')
      .where('event_id', command.eventId)
      .where('recipient_id', user.id)
      .first()) as { terminal_state: string; terminal_at: Date | null }
    const deleteJob = (await db
      .from('notification_outbox')
      .where('destination', 'feed_search')
      .where('projection_revision', 2)
      .first()) as { event_kind: string; payload: Record<string, unknown> }

    assert.isNull(notification)
    assert.equal(Number(tombstone['final_revision']), 2)
    assert.notProperty(tombstone, 'title')
    assert.notProperty(tombstone, 'message')
    assert.equal(ledger.terminal_state, 'deleted')
    assert.isNotNull(ledger.terminal_at)
    assert.equal(deleteJob.event_kind, 'notification_tombstone')
    assert.notProperty(deleteJob.payload, 'title')
    assert.notProperty(deleteJob.payload, 'message')
    assert.deepEqual(await projectionRevisions('feed_search'), [1, 2])
    assert.deepEqual(await projectionRevisions('unread_cache'), [1, 2])
  })

  test('create-read-delete emits each feed and recipient revision exactly once', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_revision_sequence' })
    const accepted = await notificationPublicApi.accept(commandFor(user.id))

    await makeMarkNotificationAsRead(makeSystemNotificationActionContext(user.id)).handle({
      id: accepted.notificationId,
    })
    await makeDeleteNotification(makeSystemNotificationActionContext(user.id)).handle({
      id: accepted.notificationId,
    })

    assert.deepEqual(await projectionRevisions('feed_search'), [1, 2, 3])
    assert.deepEqual(await projectionRevisions('unread_cache'), [1, 2, 3])
  })

  test('mark-all increments recipient revision once and emits one aggregate unread job', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_mark_all_revision' })
    await notificationPublicApi.accept(commandFor(user.id))
    await notificationPublicApi.accept(commandFor(user.id))

    const action = makeMarkNotificationAsRead(makeSystemNotificationActionContext(user.id))
    await action.markAllAsRead()
    await action.markAllAsRead()

    const states = (await db
      .from('notifications')
      .select('revision', 'is_read')
      .where('user_id', user.id)) as { revision: string | number; is_read: boolean }[]
    const recipientState = (await db
      .from('notification_recipient_states')
      .where('recipient_id', user.id)
      .first()) as { unread_count: string | number; revision: string | number }

    assert.deepEqual(
      states.map((row) => ({ revision: Number(row.revision), isRead: row.is_read })),
      [
        { revision: 2, isRead: true },
        { revision: 2, isRead: true },
      ]
    )
    assert.equal(Number(recipientState.unread_count), 0)
    assert.equal(Number(recipientState.revision), 3)
    assert.deepEqual(await projectionRevisions('unread_cache'), [1, 2, 3])
  })

  test('retry after delete returns the terminal result without recreating state', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_deleted_retry' })
    const command = commandFor(user.id)
    const accepted = await notificationPublicApi.accept(command)

    await makeDeleteNotification(makeSystemNotificationActionContext(user.id)).handle({
      id: accepted.notificationId,
    })
    const retry = await notificationPublicApi.accept({
      ...command,
      correlationId: 'retry-after-delete',
    })

    assert.equal(retry.terminalState, 'deleted')
    assert.equal(retry.notificationId, accepted.notificationId)
    assert.isNull(retry.notification)
    assert.equal(
      Number(
        (
          (await db.from('notifications').count('* as count').first()) as {
            count: string | number
          }
        ).count
      ),
      0
    )
    assert.deepEqual(await projectionRevisions('feed_search'), [1, 2])
    assert.deepEqual(await projectionRevisions('unread_cache'), [1, 2])
  })
})
