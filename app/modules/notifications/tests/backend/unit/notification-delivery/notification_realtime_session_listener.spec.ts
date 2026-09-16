import { test } from '@japa/runner'

import {
  handleNotificationRealtimeUserDeactivated,
  handleNotificationRealtimeUserLogout,
  type NotificationRealtimeSessionListenerDependencies,
} from '#modules/notifications/listeners/notification_realtime_session_listener'

test.group('Notification realtime session listener', () => {
  test('scopes logout revocation to the emitted session when available', async ({ assert }) => {
    const calls: Array<{ recipientId: string; options?: { sessionId?: string } }> = []
    const dependencies: NotificationRealtimeSessionListenerDependencies = {
      revoke(recipientId, options) {
        calls.push({ recipientId, ...(options ? { options } : {}) })
        return Promise.resolve()
      },
    }

    await handleNotificationRealtimeUserLogout(
      {
        userId: 'user-1',
        ip: '127.0.0.1',
        sessionId: 'session-1',
      },
      dependencies
    )

    assert.deepEqual(calls, [
      {
        recipientId: 'user-1',
        options: { sessionId: 'session-1' },
      },
    ])
  })

  test('revokes every realtime session when the user is deactivated', async ({ assert }) => {
    const calls: Array<{ recipientId: string; options?: { sessionId?: string } }> = []
    const dependencies: NotificationRealtimeSessionListenerDependencies = {
      revoke(recipientId, options) {
        calls.push({ recipientId, ...(options ? { options } : {}) })
        return Promise.resolve()
      },
    }

    await handleNotificationRealtimeUserDeactivated(
      {
        userId: 'user-1',
        deactivatedBy: 'admin-1',
      },
      dependencies
    )

    assert.deepEqual(calls, [{ recipientId: 'user-1' }])
  })
})
