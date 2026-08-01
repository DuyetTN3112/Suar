import { test } from '@japa/runner'

import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { buildPlatformTraceContext } from '#modules/observability/public_contracts/platform_trace_context'

test.group('Unit | Platform Event Contract', () => {
  test('requires correlation-friendly trace metadata for workflow events', ({ assert }) => {
    const trace = buildPlatformTraceContext({
      requestId: 'req-1',
      workflow: 'task_application_review',
    })

    const event: PlatformEvent = {
      event_name: 'task.application.submitted',
      event_family: 'workflow',
      module: 'tasks',
      subsystem: 'applications',
      workflow: 'task_application_review',
      stage: 'started',
      severity: 'info',
      outcome: 'success',
      occurred_at: new Date().toISOString(),
      actor: {
        initiator_type: 'user',
        user_id: 'user-1',
      },
      request: {
        id: 'req-1',
      },
      trace,
      target: {
        type: 'task',
        id: 'task-1',
        scope: 'task_application',
      },
      change: null,
      runtime: {
        duration_ms: 0,
        enabled: true,
      },
      error: null,
      compliance: {
        redaction_applied: true,
        retention_class: 'support_trace',
      },
    }

    assert.equal(event.trace.id, 'req-1')
    assert.equal(event.trace.workflow_id, 'task_application_review')
  })
})
