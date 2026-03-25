import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import type { NotificationCommandV1Input } from '#modules/notifications/domain/notification_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

function commandFor(
  recipientId: string,
  overrides: Partial<NotificationCommandV1Input> = {}
): NotificationCommandV1Input {
  return {
    eventId: randomUUID(),
    type: 'task_assigned',
    schemaVersion: 1,
    recipientId,
    scope: { kind: 'user', id: recipientId },
    actor: { type: 'user', id: randomUUID() },
    subject: { type: 'task', id: randomUUID() },
    parameters: { taskTitle: 'Notification reliability' },
    occurredAt: new Date().toISOString(),
    correlationId: 'accept-notification-test',
    dedupeKey: `task-assigned:${randomUUID()}`,
    ...overrides,
  }
}

async function cleanupReliabilityData(): Promise<void> {
  await db.from('notification_projection_deliveries').delete()
  await db.from('notification_projection_targets').delete()
  await db.from('notification_outbox').delete()
  await db.from('notification_tombstones').delete()
  await db.from('notification_acceptance_ledger').delete()
  await db.from('notification_recipient_states').delete()
}

async function countRows(table: string): Promise<number> {
  const result = (await db.from(table).count('* as count').first()) as
    | { count?: string | number }
    | undefined
  return Number(result?.count ?? 0)
}

test.group('Integration | Accept Notification', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await cleanupReliabilityData()
    await cleanupTestData()
  })

  test('commits canonical state, identity ledger, recipient state, and two jobs atomically', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_accept_atomic' })
    const command = commandFor(user.id)

    const result = await notificationPublicApi.accept(command)

    assert.equal(result.status, 'accepted')
    assert.equal(result.terminalState, 'active')
    assert.equal(result.notification?.event_id, command.eventId)
    assert.equal(result.notification?.revision, 1)
    assert.equal(result.notification?.title, 'Task assigned')
    assert.include(result.notification?.message ?? '', 'Notification reliability')

    assert.equal(await countRows('notifications'), 1)
    assert.equal(await countRows('notification_acceptance_ledger'), 1)
    assert.equal(await countRows('notification_recipient_states'), 1)
    assert.equal(await countRows('notification_outbox'), 2)

    const recipientState = (await db
      .from('notification_recipient_states')
      .where('recipient_id', user.id)
      .first()) as { unread_count: string | number; revision: string | number }
    assert.equal(Number(recipientState.unread_count), 1)
    assert.equal(Number(recipientState.revision), 1)

    const jobs = (await db
      .from('notification_outbox')
      .select('destination', 'projection_revision', 'status')
      .orderBy('destination', 'asc')) as {
      destination: string
      projection_revision: string | number
      status: string
    }[]

    assert.deepEqual(
      jobs.map((job) => ({
        destination: job.destination,
        projectionRevision: Number(job.projection_revision),
        status: job.status,
      })),
      [
        { destination: 'feed_search', projectionRevision: 1, status: 'pending' },
        { destination: 'unread_cache', projectionRevision: 1, status: 'pending' },
      ]
    )
  })

  test('returns staged and leaves no state when the caller rolls back', async ({ assert }) => {
    const user = await UserFactory.create({ username: 'notification_stage_rollback' })
    const trx = await db.transaction()

    try {
      const result = await notificationPublicApi.stage(commandFor(user.id), { trx })
      assert.equal(result.status, 'staged')
    } finally {
      await trx.rollback()
    }

    assert.equal(await countRows('notifications'), 0)
    assert.equal(await countRows('notification_acceptance_ledger'), 0)
    assert.equal(await countRows('notification_recipient_states'), 0)
    assert.equal(await countRows('notification_outbox'), 0)
  })

  test('returns the existing result for an identical retry without new jobs', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_accept_retry' })
    const command = commandFor(user.id)

    const first = await notificationPublicApi.accept(command)
    const retry = await notificationPublicApi.accept({
      ...command,
      correlationId: 'accept-notification-retry',
    })

    assert.equal(retry.notificationId, first.notificationId)
    assert.equal(retry.duplicate, true)
    assert.equal(await countRows('notifications'), 1)
    assert.equal(await countRows('notification_acceptance_ledger'), 1)
    assert.equal(await countRows('notification_outbox'), 2)
  })

  test('rejects reuse of one event identity with materially different content', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_accept_conflict' })
    const command = commandFor(user.id)
    await notificationPublicApi.accept(command)

    await assert.rejects(
      () =>
        notificationPublicApi.accept({
          ...command,
          parameters: { taskTitle: 'A materially different task' },
        }),
      /event conflict|fingerprint/i
    )

    assert.equal(await countRows('notifications'), 1)
    assert.equal(await countRows('notification_outbox'), 2)
  })

  test('serializes concurrent duplicate acceptance into one canonical result', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_accept_concurrent' })
    const command = commandFor(user.id)

    const results = await Promise.all([
      notificationPublicApi.accept(command),
      notificationPublicApi.accept(command),
    ])

    assert.equal(results[0].notificationId, results[1].notificationId)
    assert.equal(await countRows('notifications'), 1)
    assert.equal(await countRows('notification_acceptance_ledger'), 1)
    assert.equal(await countRows('notification_outbox'), 2)
  })

  test('routes the legacy public handle through the canonical durability boundary', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ username: 'notification_legacy_adapter' })

    const notification = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Legacy title is preserved',
      message: 'Legacy message is preserved while producers migrate',
      type: 'info',
      related_entity_type: 'task',
      related_entity_id: randomUUID(),
    })

    assert.equal(notification?.title, 'Legacy title is preserved')
    assert.equal(notification?.message, 'Legacy message is preserved while producers migrate')
    assert.equal(await countRows('notifications'), 1)
    assert.equal(await countRows('notification_acceptance_ledger'), 1)
    assert.equal(await countRows('notification_recipient_states'), 1)
    assert.equal(await countRows('notification_outbox'), 2)
  })
})
