import { makeNotificationFanoutStager } from '#composition/notification_operations_composition'
import { makePreviewNotificationRetentionQuery } from '#composition/notification_projection_composition'
import notificationConfig from '#config/notification'
import { notificationRealtimeSessionRevoker } from '#modules/notifications/infra/adapters/notification_realtime_session_revoker'
import { PostgresNotificationFanoutRepository } from '#modules/notifications/infra/repositories/postgres_notification_fanout_repository'
import { PostgresNotificationOutboxRepository } from '#modules/notifications/infra/repositories/postgres_notification_outbox_repository'
import { NodeNotificationEventIdentityProvider } from '#modules/notifications/infra/security/node_notification_event_identity_provider'
import { registerNotificationEventIdentityProvider } from '#modules/notifications/public_contracts/notification_event_identity'
import { registerNotificationFanoutProvider } from '#modules/notifications/public_contracts/notification_fanout'
import { registerNotificationOperationsProvider } from '#modules/notifications/public_contracts/notification_operations'
import { registerNotificationRealtimeSessionProvider } from '#modules/notifications/public_contracts/notification_realtime_session'

import '#modules/notifications/listeners/notification_realtime_session_listener'

registerNotificationEventIdentityProvider(new NodeNotificationEventIdentityProvider())

const fanoutStager = makeNotificationFanoutStager({
  maxTargets: notificationConfig.fanoutMaxTargets,
})

registerNotificationFanoutProvider({
  stage(template, recipientIds, options) {
    return fanoutStager.stage(template, recipientIds, options)
  },
})

registerNotificationRealtimeSessionProvider(notificationRealtimeSessionRevoker)

registerNotificationOperationsProvider({
  async snapshot(now, countLimit) {
    const [outbox, fanout, retention] = await Promise.all([
      new PostgresNotificationOutboxRepository().operationalStatus(now, countLimit),
      new PostgresNotificationFanoutRepository().operationalStatus(now, countLimit),
      makePreviewNotificationRetentionQuery().execute(now),
    ])
    return { outbox, fanout, retention }
  },
})
