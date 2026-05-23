import { test } from '@japa/runner'

import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { PostgresFilterAlertNotificationDelivery } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_notification_delivery'
import type { NotificationFanoutTemplateV1Input } from '#modules/notifications/public_contracts/notification_fanout'

test('maps one alert evaluation to one idempotent notification fanout request', async ({ assert }) => {
  const calls: Array<{ template: NotificationFanoutTemplateV1Input; recipients: readonly string[] }> = []
  const delivery = new PostgresFilterAlertNotificationDelivery({
    stage(template, recipients) {
      calls.push({ template, recipients })
      return Promise.resolve({ status: 'staged', jobId: 'job-1', targetCount: recipients.length })
    },
  })
  const alert = createFilterAlert({
    id: 'alert-1',
    savedViewId: 'view-1',
    ownerId: 'user-1',
    savedViewLockVersion: 3,
    intervalMinutes: 30,
    timezone: 'UTC',
    now: '2026-08-09T00:00:00.000Z',
  })

  await delivery.deliver({
    alert,
    evaluation: {
      providerState: 'healthy',
      totalRelation: 'eq',
      watermark: 'watermark-1',
      observationWindow: '2026-08-09T00:30:00.000Z',
      resultIdentityHash: 'result-1',
      safeSummary: { resultCount: 2, provider: 'postgres', partial: false },
    },
    idempotencyKey: 'delivery-key-1',
  })

  assert.lengthOf(calls, 1)
  assert.deepEqual(calls[0], {
    template: {
      eventName: 'filter.alert.match_detected',
      businessEventId: 'delivery-key-1',
      type: 'info',
      schemaVersion: 1,
      scope: { kind: 'user', id: 'user-1' },
      subject: { type: 'saved_view', id: 'view-1' },
      parameters: {
        alertId: 'alert-1',
        savedViewId: 'view-1',
        resultCount: 2,
        resultIdentityHash: 'result-1',
        observationWindow: '2026-08-09T00:30:00.000Z',
      },
      occurredAt: '2026-08-09T00:30:00.000Z',
      correlationId: 'delivery-key-1',
      dedupeKey: 'delivery-key-1',
    },
    recipients: ['user-1'],
  })
})
