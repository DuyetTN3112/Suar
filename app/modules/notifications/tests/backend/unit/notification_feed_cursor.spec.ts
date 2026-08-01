import { test } from '@japa/runner'

import { NotificationFeedCursorError } from '#modules/notifications/domain/notification_contract_errors'
import { NotificationFeedCursorCodec } from '#modules/notifications/infra/security/notification_feed_cursor_codec'

test.group('Unit | Notification Feed Cursor', () => {
  test('round-trips a signed backend-neutral sort cursor', ({ assert }) => {
    const now = new Date('2026-07-23T00:00:00.000Z')
    const codec = new NotificationFeedCursorCodec({
      secret: 'test-notification-cursor-secret-at-least-32-bytes',
      ttlMs: 86_400_000,
      now: () => now,
    })

    const cursor = codec.encode({
      direction: 'after',
      createdAt: '2026-07-22T23:59:00.000Z',
      notificationId: '11111111-1111-4111-8111-111111111111',
      recipientId: '22222222-2222-4222-8222-222222222222',
      unreadOnly: false,
    })

    assert.deepEqual(
      codec.decode(cursor, {
        direction: 'after',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: false,
      }),
      {
        direction: 'after',
        createdAt: '2026-07-22T23:59:00.000Z',
        notificationId: '11111111-1111-4111-8111-111111111111',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: false,
      }
    )
    const payload = JSON.parse(
      Buffer.from(cursor.split('.')[0] ?? '', 'base64url').toString('utf8')
    ) as Record<string, unknown>
    assert.equal(payload['version'], 2)
    assert.equal(payload['direction'], 'after')
    assert.equal(payload['keyId'], 'primary')
    assert.equal(payload['issuedAt'], now.toISOString())
    assert.equal(payload['expiresAt'], '2026-07-24T00:00:00.000Z')
    assert.isString(payload['contextBinding'])
    assert.notProperty(payload, 'recipientId')
    assert.notProperty(payload, 'pit')
    assert.notProperty(payload, 'index')
  })

  test('rejects tampering, expiry, and malformed sort values', ({ assert }) => {
    let now = new Date('2026-07-23T00:00:00.000Z')
    const codec = new NotificationFeedCursorCodec({
      secret: 'test-notification-cursor-secret-at-least-32-bytes',
      ttlMs: 1_000,
      now: () => now,
    })
    const cursor = codec.encode({
      direction: 'after',
      createdAt: '2026-07-22T23:59:00.000Z',
      notificationId: '11111111-1111-4111-8111-111111111111',
      recipientId: '22222222-2222-4222-8222-222222222222',
      unreadOnly: false,
    })
    const [payload, signature] = cursor.split('.')
    if (!payload || !signature) {
      throw new Error('Expected signed notification cursor parts')
    }

    const expected = {
      direction: 'after' as const,
      recipientId: '22222222-2222-4222-8222-222222222222',
      unreadOnly: false,
    }
    assert.isNull(codec.decode(`${payload}x.${signature}`, expected))
    assert.isNull(codec.decode('not-a-cursor', expected))
    now = new Date('2026-07-23T00:00:01.001Z')
    assert.isNull(codec.decode(cursor, expected))
  })

  test('supports bounded key rotation and rejects a cursor in the wrong direction', ({
    assert,
  }) => {
    const now = new Date('2026-07-23T00:00:00.000Z')
    const oldSecret = 'old-notification-cursor-secret-at-least-32-bytes'
    const newSecret = 'new-notification-cursor-secret-at-least-32-bytes'
    const oldCodec = new NotificationFeedCursorCodec({
      secret: oldSecret,
      keyId: '2026-06',
      now: () => now,
    })
    const cursor = oldCodec.encode({
      direction: 'before',
      createdAt: '2026-07-22T23:59:00.000Z',
      notificationId: '11111111-1111-4111-8111-111111111111',
      recipientId: '22222222-2222-4222-8222-222222222222',
      unreadOnly: true,
    })
    const rotatedCodec = new NotificationFeedCursorCodec({
      secret: newSecret,
      keyId: '2026-07',
      verificationSecrets: { '2026-06': oldSecret },
      now: () => now,
    })

    assert.deepEqual(
      rotatedCodec.decode(cursor, {
        direction: 'before',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: true,
      }),
      {
        direction: 'before',
        createdAt: '2026-07-22T23:59:00.000Z',
        notificationId: '11111111-1111-4111-8111-111111111111',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: true,
      }
    )
    assert.isNull(
      rotatedCodec.decode(cursor, {
        direction: 'after',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: true,
      })
    )
    assert.isNull(
      rotatedCodec.decode(cursor, {
        direction: 'before',
        recipientId: '33333333-3333-4333-8333-333333333333',
        unreadOnly: true,
      })
    )
    assert.isNull(
      rotatedCodec.decode(cursor, {
        direction: 'before',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: false,
      })
    )
  })

  test('accepts an unexpired cursor when the configured TTL changes during rotation', ({
    assert,
  }) => {
    const now = new Date('2026-07-23T00:00:00.000Z')
    const secret = 'test-notification-cursor-secret-at-least-32-bytes'
    const cursor = new NotificationFeedCursorCodec({
      secret,
      ttlMs: 86_400_000,
      now: () => now,
    }).encode({
      direction: 'after',
      createdAt: '2026-07-22T23:59:00.000Z',
      notificationId: '11111111-1111-4111-8111-111111111111',
      recipientId: '22222222-2222-4222-8222-222222222222',
      unreadOnly: false,
    })
    const rotatedTtlCodec = new NotificationFeedCursorCodec({
      secret,
      ttlMs: 3_600_000,
      now: () => now,
    })

    assert.isNotNull(
      rotatedTtlCodec.decode(cursor, {
        direction: 'after',
        recipientId: '22222222-2222-4222-8222-222222222222',
        unreadOnly: false,
      })
    )
  })

  test('exposes a stable restart-required 422 application error', ({ assert }) => {
    const error = new NotificationFeedCursorError()

    assert.equal(error.status, 422)
    assert.equal(error.code, 'E_NOTIFICATION_CURSOR_RESTART_REQUIRED')
    assert.isFalse(error.shouldReport)
  })
})
