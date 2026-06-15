import { test } from '@japa/runner'

import { NotificationRealtimeSessionRevoker } from '#modules/notifications/infra/adapters/notification-feed/notification_realtime_session_revoker'
import { parseNotificationRealtimeRevocationMessage } from '#modules/notifications/public_contracts/notification_realtime'

test.group('NotificationRealtimeSessionRevoker', () => {
  test('closes local streams and publishes a content-free cross-instance revocation', async ({
    assert,
  }) => {
    const calls: string[] = []
    const revoker = new NotificationRealtimeSessionRevoker(
      {
        close(revocation) {
          calls.push(`close:${JSON.stringify(revocation)}`)
        },
      },
      {
        publish(channel, payload) {
          calls.push(
            `publish:${channel}:${JSON.stringify(
              parseNotificationRealtimeRevocationMessage(payload)
            )}`
          )
          return Promise.resolve(1)
        },
      }
    )

    await revoker.revoke('11111111-1111-4111-8111-111111111111', {
      sessionId: 'session-abc-123',
    })

    assert.deepEqual(calls, [
      'close:{"scope":"session","recipientId":"11111111-1111-4111-8111-111111111111","sessionId":"session-abc-123"}',
      'publish:suar:notifications:session-revoked:{"scope":"session","recipientId":"11111111-1111-4111-8111-111111111111","sessionId":"session-abc-123"}',
    ])
  })

  test('does not fail logout or suspension when lossy Redis revocation is unavailable', async ({
    assert,
  }) => {
    let reported = ''
    const revoker = new NotificationRealtimeSessionRevoker(
      { close() {} },
      {
        publish: () => Promise.reject(new Error('redis unavailable')),
      },
      {
        failed(error) {
          reported = error instanceof Error ? error.constructor.name : 'UnknownError'
        },
      }
    )

    await assert.doesNotReject(() =>
      revoker.revoke('11111111-1111-4111-8111-111111111111')
    )
    assert.equal(reported, 'Error')
  })
})
