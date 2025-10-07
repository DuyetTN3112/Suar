import { test } from '@japa/runner'

import { mapAdminAuditLogResponse } from '#modules/admin/controllers/mappers/response/admin_api_response_mapper'

test.group('Unit | Admin audit log response mapper', () => {
  test('extracts platform observability fields into investigation metadata', ({ assert }) => {
    const mapped = mapAdminAuditLogResponse({
      id: 'audit-1',
      user: {
        id: 'user-1',
        username: 'duyet',
      },
      action: 'review.dispute.resolved',
      resource_type: 'review_dispute',
      resource_id: 'dispute-1',
      details: {
        new_values: {
          event_name: 'review.dispute.resolved',
          event_family: 'workflow',
          module: 'reviews',
          subsystem: 'review_dispute',
          workflow: 'review_dispute_resolution',
          stage: 'completed',
          severity: 'info',
          outcome: 'success',
          actor: {
            initiator_type: 'user',
            user_id: 'user-1',
            organization_id: 'org-1',
          },
          request: {
            id: 'req-1',
          },
          trace: {
            id: 'trace-1',
            correlation_key: 'corr-1',
          },
          target: {
            type: 'review_dispute',
            id: 'dispute-1',
            scope: 'review_dispute_resolution',
          },
          runtime: {
            duration_ms: 182,
          },
          compliance: {
            retention_class: 'support_trace',
          },
        },
      },
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      created_at: '2026-07-05T12:00:00.000Z',
    })

    assert.equal(mapped.investigation.isStructured, true)
    assert.equal(mapped.investigation.eventName, 'review.dispute.resolved')
    assert.equal(mapped.investigation.module, 'reviews')
    assert.equal(mapped.investigation.workflow, 'review_dispute_resolution')
    assert.equal(mapped.investigation.traceId, 'trace-1')
    assert.equal(mapped.investigation.durationMs, 182)
    assert.equal(mapped.investigation.retentionClass, 'support_trace')
    assert.include(mapped.investigation.summary, 'Review Dispute Resolved')
  })

  test('falls back to readable audit summary for legacy audit rows', ({ assert }) => {
    const mapped = mapAdminAuditLogResponse({
      id: 'audit-legacy',
      user: null,
      action: 'task_status_change',
      resource_type: 'task',
      resource_id: 'task-1',
      details: {
        old_values: { status: 'todo' },
        new_values: { status: 'done' },
      },
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      created_at: '2026-07-05T12:00:00.000Z',
    })

    assert.equal(mapped.investigation.isStructured, false)
    assert.equal(mapped.investigation.module, null)
    assert.equal(mapped.investigation.summary, 'Task Status Change Task #task-1')
  })
})
