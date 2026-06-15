import { test } from '@japa/runner'

import type {
  NotificationOutboxHandler,
  NotificationOutboxJob,
} from '#modules/notifications/domain/notification-outbox/notification_outbox'
import { NotificationRealtimeProjectionNotifier } from '#modules/notifications/infra/adapters/notification-feed/notification_realtime_projection_notifier'
import {
  canSubscribeToNotificationRecipientChannel,
  isValidNotificationRealtimeUid,
  parseNotificationRealtimeInvalidationMessage,
  parseNotificationRealtimeRevocationMessage,
  serializeNotificationRealtimeInvalidation,
  serializeNotificationRealtimeRevocation,
} from '#modules/notifications/public_contracts/notification_realtime'

function job(
  destination: NotificationOutboxJob['destination']
): NotificationOutboxJob {
  return {
    id: `outbox-${destination}`,
    sequence: 1,
    notificationId:
      destination === 'feed_search' ? '22222222-2222-4222-8222-222222222222' : null,
    operationId: 'operation-1',
    sourceEventId: 'event-1',
    eventKind:
      destination === 'feed_search' ? 'notification_upsert' : 'unread_absolute',
    revision: destination === 'feed_search' ? 7 : 11,
    projectionRevision: destination === 'feed_search' ? 7 : 11,
    destination,
    partitionKey: '11111111-1111-4111-8111-111111111111',
    recipientId: '11111111-1111-4111-8111-111111111111',
    recipientStateRevision: 11,
    payload: {},
    attemptCount: 1,
    leaseToken: 'lease-1',
    lockedUntil: new Date('2026-07-23T00:00:30.000Z'),
  }
}

test.group('NotificationRealtimeProjectionNotifier', () => {
  test('authorizes only the exact authenticated recipient channel', ({ assert }) => {
    assert.isTrue(
      canSubscribeToNotificationRecipientChannel('recipient-1', 'recipient-1')
    )
    assert.isFalse(
      canSubscribeToNotificationRecipientChannel('recipient-1', 'recipient-2')
    )
    assert.isFalse(
      canSubscribeToNotificationRecipientChannel(undefined, 'recipient-1')
    )
    assert.isTrue(
      isValidNotificationRealtimeUid('11111111-1111-4111-8111-111111111111')
    )
    assert.isFalse(isValidNotificationRealtimeUid('shared-client-uid'))
  })

  test('uses a bounded versioned Redis bridge envelope for worker-to-web delivery', ({
    assert,
  }) => {
    const message = serializeNotificationRealtimeInvalidation(
      '11111111-1111-4111-8111-111111111111',
      {
        type: 'notification.count.changed',
        recipientStateRevision: 11,
      }
    )

    assert.deepEqual(parseNotificationRealtimeInvalidationMessage(message), {
      recipientId: '11111111-1111-4111-8111-111111111111',
      payload: {
        type: 'notification.count.changed',
        recipientStateRevision: 11,
      },
    })
    assert.isNull(parseNotificationRealtimeInvalidationMessage('{"version":2}'))
    assert.isNull(parseNotificationRealtimeInvalidationMessage('x'.repeat(2_049)))
  })

  test('distinguishes one-session logout from whole-user revocation', ({ assert }) => {
    const sessionMessage = serializeNotificationRealtimeRevocation({
      scope: 'session',
      recipientId: '11111111-1111-4111-8111-111111111111',
      sessionId: 'session-abc-123',
    })
    assert.deepEqual(parseNotificationRealtimeRevocationMessage(sessionMessage), {
      scope: 'session',
      recipientId: '11111111-1111-4111-8111-111111111111',
      sessionId: 'session-abc-123',
    })

    const userMessage = serializeNotificationRealtimeRevocation({
      scope: 'user',
      recipientId: '11111111-1111-4111-8111-111111111111',
    })
    assert.deepEqual(parseNotificationRealtimeRevocationMessage(userMessage), {
      scope: 'user',
      recipientId: '11111111-1111-4111-8111-111111111111',
    })
    assert.isNull(
      parseNotificationRealtimeRevocationMessage(
        JSON.stringify({
          version: 1,
          scope: 'session',
          recipientId: '11111111-1111-4111-8111-111111111111',
        })
      )
    )
  })

  test('publishes only revisioned invalidation metadata after projection success', async ({
    assert,
  }) => {
    const calls: unknown[] = []
    const inner: NotificationOutboxHandler = (outbox) => {
      calls.push(`project:${outbox.destination}`)
      return Promise.resolve()
    }
    const notifier = new NotificationRealtimeProjectionNotifier({
      broadcast: (channel, payload) => {
        calls.push({ channel, payload })
      },
    })

    await notifier.decorate(inner)(job('feed_search'), {
      signal: new AbortController().signal,
    })
    await notifier.decorate(inner)(job('unread_cache'), {
      signal: new AbortController().signal,
    })

    assert.deepEqual(calls, [
      'project:feed_search',
      {
        channel: 'notifications/users/11111111-1111-4111-8111-111111111111',
        payload: {
          type: 'notification.feed.changed',
          notificationId: '22222222-2222-4222-8222-222222222222',
          notificationRevision: 7,
        },
      },
      'project:unread_cache',
      {
        channel: 'notifications/users/11111111-1111-4111-8111-111111111111',
        payload: {
          type: 'notification.count.changed',
          recipientStateRevision: 11,
        },
      },
    ])
    assert.notInclude(JSON.stringify(calls), 'title')
    assert.notInclude(JSON.stringify(calls), 'message')
    assert.notInclude(JSON.stringify(calls), 'parameters')
  })

  test('does not publish when the durable projection fails', async ({ assert }) => {
    let broadcasts = 0
    const notifier = new NotificationRealtimeProjectionNotifier({
      broadcast: () => {
        broadcasts += 1
      },
    })

    await assert.rejects(
      () =>
        notifier.decorate(() => Promise.reject(new Error('projection failed')))(
          job('feed_search'),
          { signal: new AbortController().signal }
        ),
      /projection failed/
    )
    assert.equal(broadcasts, 0)
  })

  test('treats realtime broadcast failure as lossy and never retries a successful projection', async ({
    assert,
  }) => {
    let projected = 0
    const errors: string[] = []
    const notifier = new NotificationRealtimeProjectionNotifier(
      {
        broadcast: () => {
          throw new Error('realtime unavailable')
        },
      },
      {
        failed: (_job, error) => {
          errors.push(error instanceof Error ? error.constructor.name : 'UnknownError')
        },
      }
    )

    await notifier.decorate(() => {
      projected += 1
      return Promise.resolve()
    })(job('feed_search'), { signal: new AbortController().signal })

    assert.equal(projected, 1)
    assert.deepEqual(errors, ['Error'])
  })

  test('observes asynchronous Redis publication failures without failing the outbox job', async ({
    assert,
  }) => {
    const errors: string[] = []
    const notifier = new NotificationRealtimeProjectionNotifier(
      {
        broadcast: () => Promise.reject(new Error('redis unavailable')),
      },
      {
        failed: (_job, error) => {
          errors.push(error instanceof Error ? error.constructor.name : 'UnknownError')
        },
      }
    )

    await assert.doesNotReject(() =>
      notifier.decorate(() => Promise.resolve())(job('unread_cache'), {
        signal: new AbortController().signal,
      })
    )
    await Promise.resolve()

    assert.deepEqual(errors, ['Error'])
  })
})
