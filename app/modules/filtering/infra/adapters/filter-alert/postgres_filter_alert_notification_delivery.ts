import db from '@adonisjs/lucid/services/db'

import type { FilterAlertDelivery } from '#modules/filtering/actions/ports/outbound/filter_alert_delivery'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import { notificationFanoutPublicApi } from '#modules/notifications/public_contracts/notification_fanout'

const ALERT_NOTIFICATION_EVENT = 'filter.alert.match_detected'

export class PostgresFilterAlertNotificationDelivery implements FilterAlertDelivery {
  constructor(
    private readonly fanout: NotificationFanoutStagerContract = notificationFanoutPublicApi
  ) {}

  async deliver(input: Parameters<FilterAlertDelivery['deliver']>[0]): Promise<void> {
    const occurredAt = input.evaluation.observationWindow
    await db.transaction((trx) =>
      this.fanout.stage(
        {
          eventName: ALERT_NOTIFICATION_EVENT,
          businessEventId: input.idempotencyKey,
          type: 'info',
          schemaVersion: 1,
          scope: { kind: 'user', id: input.alert.ownerId },
          subject: { type: 'saved_view', id: input.alert.savedViewId },
          parameters: {
            alertId: input.alert.id,
            savedViewId: input.alert.savedViewId,
            resultCount: input.evaluation.safeSummary['resultCount'] ?? null,
            resultIdentityHash: input.evaluation.resultIdentityHash,
            observationWindow: occurredAt,
          },
          occurredAt,
          correlationId: input.idempotencyKey,
          dedupeKey: input.idempotencyKey,
        },
        [input.alert.ownerId],
        { trx, now: new Date(occurredAt) }
      )
    )
  }
}
