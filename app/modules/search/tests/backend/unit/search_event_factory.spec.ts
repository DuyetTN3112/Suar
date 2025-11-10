import { test } from '@japa/runner'

import { makeSystemHttpActionContext } from '#modules/http/actions/http_action_context'
import {
  buildSearchProjectionFailureEvent,
  buildSearchQueryEvent,
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

  test('builds projection failure event with error details', ({ assert }) => {
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
        error: new Error('boom'),
      }
    )

    assert.equal(event.event_name, 'search.projection.failed')
    assert.equal(event.target?.id, 'task-1')
    assert.equal(event.error?.['message'], 'boom')
  })
})
