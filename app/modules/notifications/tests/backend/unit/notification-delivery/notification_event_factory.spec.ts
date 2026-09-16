import { test } from '@japa/runner'

import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'

test.group('Unit | Notification Event Factory', () => {
  test('builds notification workflow events with correlation metadata', ({ assert }) => {
    const event = buildNotificationEvent(
      {
        userId: 'user-1',
        ip: '127.0.0.1',
        userAgent: 'vitest',
        organizationId: 'org-1',
        requestId: 'req-1',
        traceId: 'trace-1',
        workflowId: null,
      },
      {
        eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_MARK_READ_COMPLETED,
        eventFamily: 'workflow',
        subsystem: 'notification_center',
        workflow: 'notification_read_management',
        stage: 'completed',
        outcome: 'success',
        targetType: 'notification',
        targetId: 'notification-1',
      }
    )

    assert.equal(event.event_name, PLATFORM_EVENT_NAMES.NOTIFICATION_MARK_READ_COMPLETED)
    assert.equal(event.module, 'notifications')
    assert.equal(event.trace.id, 'trace-1')
    assert.equal(event.request?.id, 'req-1')
    assert.equal(event.target?.id, 'notification-1')
  })
})
