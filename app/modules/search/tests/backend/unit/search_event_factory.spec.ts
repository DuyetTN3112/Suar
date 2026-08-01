import { test } from '@japa/runner'

import { makeSystemHttpActionContext } from '#modules/http/actions/http_action_context'
import {
  buildSearchProjectionFailureEvent,
  buildSearchQueryEvent,
  buildSearchQueryFailureEvent,
} from '#modules/search/observability/search_event_factory'

test.group('Unit | Search Event Factory', () => {
  test('builds query event with correlation-safe metadata', ({ assert }) => {
    const event = buildSearchQueryEvent(
      {
        ...makeSystemHttpActionContext('system-user'),
        requestId: 'req-1',
        traceId: 'trace-1',
      },
      'Elastic Search',
      'search.query.started',
      'started',
      'success',
      {
        surface: 'command_menu',
      }
    )

    assert.equal(event.module, 'search')
    assert.equal(event.trace.id, 'trace-1')
    assert.equal(event.trace.workflow_id, 'global_search')
    assert.equal(event.change?.['query_text_length'], 14)
    assert.isTrue(event.compliance.redaction_applied)
  })

  test('marks degraded query events as operational warnings', ({ assert }) => {
    const event = buildSearchQueryEvent(
      makeSystemHttpActionContext('system-user'),
      'Elastic Search',
      'search.query.completed',
      'completed',
      'warning',
      {
        degraded: true,
      }
    )

    assert.equal(event.outcome, 'warning')
    assert.equal(event.severity, 'warn')
  })

  test('builds projection failure event with redacted error details', ({ assert }) => {
    const event = buildSearchProjectionFailureEvent(
      {
        userId: null,
        ip: '0.0.0.0',
        userAgent: 'system',
        organizationId: null,
        traceId: 'trace-2',
      },
      {
        entityType: 'task',
        entityId: 'task-1',
        workflow: 'task_projection_reindex',
        eventName: 'search.projection.failed',
        error: new Error('boom token=search-secret\r\nforged=true'),
      }
    )

    assert.equal(event.event_name, 'search.projection.failed')
    assert.equal(event.target?.id, 'task-1')
    assert.equal(event.error?.['message'], 'boom token=[REDACTED]  forged=true')
    assert.isTrue(event.compliance.redaction_applied)
    assert.notInclude(JSON.stringify(event), 'search-secret')
  })

  test('keeps query failure diagnostics out of change metadata and redacts secrets', ({
    assert,
  }) => {
    const event = buildSearchQueryFailureEvent(
      makeSystemHttpActionContext('system-user'),
      'private search text',
      new Error('search failed api_key=search-secret'),
      42
    )

    assert.equal(event.event_name, 'search.query.failed')
    assert.equal(event.change?.['duration_ms'], 42)
    assert.notProperty(event.change ?? {}, 'error')
    assert.notProperty(event.change ?? {}, 'error_message')
    assert.equal(event.error?.['message'], 'search failed api_key=[REDACTED]')
    assert.notInclude(JSON.stringify(event), 'private search text')
    assert.notInclude(JSON.stringify(event), 'search-secret')
  })
})
