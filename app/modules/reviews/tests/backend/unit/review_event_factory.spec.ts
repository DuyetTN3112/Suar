import { test } from '@japa/runner'

import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import { buildReviewDisputeEvent } from '#modules/reviews/observability/review_event_factory'

test.group('Unit | Review Event Factory', () => {
  const execCtx = {
    userId: 'user-1',
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: 'org-1',
    requestId: 'req-1',
    traceId: 'trace-1',
    workflowId: null,
  }

  test('builds dispute completed event with review session parent context', ({ assert }) => {
    const event = buildReviewDisputeEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_CREATED,
      eventFamily: 'dispute',
      subsystem: 'review_disputes',
      workflow: 'review_dispute_create',
      stage: 'completed',
      outcome: 'success',
      disputeId: 'dispute-1',
      reviewSessionId: 'session-1',
      taskAssignmentId: 'assignment-1',
      taskId: 'task-1',
      revieweeId: 'reviewee-1',
      change: {
        requested_outcome: 'adjust_score',
      },
    })

    assert.equal(event.module, 'reviews')
    assert.equal(event.target?.type, 'review_dispute')
    assert.equal(event.target?.id, 'dispute-1')
    assert.equal(event.target?.parent_id, 'session-1')
    assert.equal(event.change?.['task_id'], 'task-1')
  })

  test('serializes non-error object failures safely', ({ assert }) => {
    const event = buildReviewDisputeEvent(execCtx, {
      eventName: PLATFORM_EVENT_NAMES.REVIEW_DISPUTE_RESOLUTION_FAILED,
      eventFamily: 'dispute',
      subsystem: 'review_disputes',
      workflow: 'review_dispute_resolve',
      stage: 'failed',
      outcome: 'failure',
      disputeId: 'dispute-2',
      error: { reason: 'unexpected' },
    })

    assert.equal(event.error?.['class'], 'UnknownError')
    assert.deepEqual(event.error?.['details'], { reason: 'unexpected' })
  })
})
