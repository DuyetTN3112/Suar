import { test } from '@japa/runner'

import { buildAdminAuditLogViewEvent } from '#modules/admin/audit_logs/observability/audit_logs/admin_event_factory'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'

test.group('Unit | Admin Event Factory', () => {
  test('builds admin audit log read events with security retention', ({ assert }) => {
    const event = buildAdminAuditLogViewEvent(
      {
        userId: 'admin-1',
        ip: '127.0.0.1',
        userAgent: 'vitest',
        organizationId: null,
        requestId: 'req-1',
        traceId: 'trace-1',
        workflowId: null,
      },
      {
        eventName: PLATFORM_EVENT_NAMES.ADMIN_AUDIT_LOG_VIEWED,
        stage: 'completed',
        outcome: 'success',
        actorUserId: 'actor-1',
      }
    )

    assert.equal(event.event_name, PLATFORM_EVENT_NAMES.ADMIN_AUDIT_LOG_VIEWED)
    assert.equal(event.module, 'admin')
    assert.equal(event.trace.id, 'trace-1')
    assert.equal(event.compliance.retention_class, 'security_audit')
    assert.deepInclude(event.change ?? {}, { actor_user_id: 'actor-1' })
  })
})
