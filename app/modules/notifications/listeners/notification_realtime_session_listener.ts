import emitter from '@adonisjs/core/services/emitter'

import { notificationRealtimeSessionRevoker } from '#modules/notifications/infra/adapters/notification_realtime_session_revoker'

emitter.on('user:logout', async ({ userId, sessionId }) => {
  await notificationRealtimeSessionRevoker.revoke(
    userId,
    sessionId ? { sessionId } : {}
  )
})

emitter.on('user:deactivated', async ({ userId }) => {
  await notificationRealtimeSessionRevoker.revoke(userId)
})
