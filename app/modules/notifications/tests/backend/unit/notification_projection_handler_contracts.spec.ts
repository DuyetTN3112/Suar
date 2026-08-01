import { test } from '@japa/runner'

import type { NotificationOutboxJob } from '#modules/notifications/domain/notification_outbox'
import {
  NotificationPermanentDeliveryError,
  NotificationTransientDeliveryError,
} from '#modules/notifications/domain/notification_outbox_errors'
import {
  NotificationUnreadProjectionHandler,
  type NotificationUnreadProjector,
} from '#modules/notifications/infra/projections/notification_unread_projection_handler'

function unreadJob(overrides: Partial<NotificationOutboxJob> = {}): NotificationOutboxJob {
  return {
    id: 'outbox-1',
    sequence: 1,
    notificationId: null,
    operationId: 'operation-1',
    sourceEventId: 'event-1',
    eventKind: 'unread_absolute',
    revision: 4,
    projectionRevision: 4,
    destination: 'unread_cache',
    partitionKey: '11111111-1111-4111-8111-111111111111',
    recipientId: '11111111-1111-4111-8111-111111111111',
    recipientStateRevision: 4,
    payload: {
      recipientId: '11111111-1111-4111-8111-111111111111',
      count: 9,
      revision: 4,
    },
    attemptCount: 1,
    leaseToken: 'lease-1',
    lockedUntil: new Date('2026-07-23T00:00:30.000Z'),
    ...overrides,
  }
}

test.group('Unit | Notification Projection Handler Contracts', () => {
  test('unread handler applies an absolute count with the matching recipient revision', async ({
    assert,
  }) => {
    const values: unknown[] = []
    const projector: NotificationUnreadProjector = {
      apply: (value) => {
        values.push(value)
        return Promise.resolve(true)
      },
    }
    const handler = new NotificationUnreadProjectionHandler(projector)

    await handler.deliver(unreadJob(), { signal: new AbortController().signal })

    assert.deepEqual(values, [
      {
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 9,
        revision: 4,
      },
    ])
  })

  test('unread handler permanently rejects mismatched or delta-style payloads', async ({
    assert,
  }) => {
    const handler = new NotificationUnreadProjectionHandler({
      apply: () => Promise.resolve(true),
    })

    await assert.rejects(
      () =>
        handler.deliver(
          unreadJob({
            payload: {
              recipientId: '22222222-2222-4222-8222-222222222222',
              delta: -1,
              revision: 4,
            },
          }),
          { signal: new AbortController().signal }
        ),
      NotificationPermanentDeliveryError
    )
  })

  test('unread handler reloads canonical state before projecting a delayed job', async ({
    assert,
  }) => {
    const values: unknown[] = []
    const handler = new NotificationUnreadProjectionHandler(
      {
        apply: (value) => {
          values.push(value)
          return Promise.resolve(true)
        },
      },
      {
        read: () => Promise.resolve({ count: 2, revision: 8 }),
      }
    )

    await handler.deliver(unreadJob(), { signal: new AbortController().signal })

    assert.deepEqual(values, [
      {
        recipientId: '11111111-1111-4111-8111-111111111111',
        count: 2,
        revision: 8,
      },
    ])
  })

  test('unread handler rejects an already-aborted delivery instead of allowing an ACK', async ({
    assert,
  }) => {
    let applied = false
    const handler = new NotificationUnreadProjectionHandler({
      apply: () => {
        applied = true
        return Promise.resolve(true)
      },
    })
    const controller = new AbortController()
    controller.abort()

    await assert.rejects(
      () => handler.deliver(unreadJob(), { signal: controller.signal }),
      NotificationTransientDeliveryError
    )
    assert.isFalse(applied)
  })
})
