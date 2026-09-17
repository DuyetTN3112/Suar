import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildReportSprintReverseReviewWorkflowRequest,
  buildRespondSprintReverseReviewWorkflowRequest,
  buildSubmitSprintReverseReviewWorkflowRequest,
} from '#modules/reviews/controllers/mappers/request/sprint-review/sprint_reverse_review_workflow_request_mapper'
import {
  buildReportTaskReviewWorkflowRequest,
  buildRespondTaskReviewWorkflowRequest,
  buildSubmitTaskReviewWorkflowRequest,
} from '#modules/reviews/controllers/mappers/request/task-review/task_review_workflow_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(values, key) ? values[key] : fallback
    },
  }
}


function validationFailure(callback: () => unknown): ValidationException {
  try {
    callback()
  } catch (error) {
    if (error instanceof ValidationException) return error
    throw error
  }

  throw new Error('Expected a ValidationException')
}


test.group('', () => {
  test('maps task workflow submissions without coercing route or body values', ({ assert }) => {
    assert.deepEqual(
      buildSubmitTaskReviewWorkflowRequest(
        { taskId: ' task-1 ' },
        requestOf({ body: '  Review details  ' })
      ),
      { taskId: 'task-1', body: 'Review details' }
    )
    assert.deepEqual(
      buildRespondTaskReviewWorkflowRequest(
        { workflowId: ' workflow-1 ' },
        requestOf({ body: '  Response details  ' })
      ),
      { workflowId: 'workflow-1', body: 'Response details' }
    )
    assert.deepEqual(
      buildReportTaskReviewWorkflowRequest(
        { workflowId: 'workflow-2' },
        requestOf({ reason: '  Needs escalation  ' })
      ),
      { workflowId: 'workflow-2', reason: 'Needs escalation' }
    )
  })

  test('rejects malformed task workflow input with canonical paths and codes', ({ assert }) => {
    const failure = validationFailure(() =>
      buildReportTaskReviewWorkflowRequest(
        { workflowId: { id: 'workflow-1' } },
        requestOf({ reason: [] })
      )
    )

    assert.deepEqual(
      failure.issues.map((issue) => ({ path: issue.path, code: issue.code })).sort((a, b) =>
        a.path.localeCompare(b.path)
      ),
      [
        { path: 'reason', code: 'REQUEST_STRING_REQUIRED' },
        { path: 'workflowId', code: 'ROUTE_PARAMETER_REQUIRED' },
      ]
    )
  })

  test('rejects missing and empty task review text instead of converting it to a string', ({ assert }) => {
    const missingBody = validationFailure(() =>
      buildSubmitTaskReviewWorkflowRequest({ taskId: 'task-1' }, requestOf({}))
    )
    const objectBody = validationFailure(() =>
      buildRespondTaskReviewWorkflowRequest(
        { workflowId: 'workflow-1' },
        requestOf({ body: { text: 'not-a-string' } })
      )
    )

    assert.deepEqual(missingBody.issues.map((issue) => issue.path), ['body'])
    assert.deepEqual(objectBody.issues.map((issue) => issue.path), ['body'])
    assert.equal(objectBody.issues[0]?.code, 'REQUEST_STRING_REQUIRED')
  })

  test('maps sprint reverse review legacy field names into canonical command inputs', ({ assert }) => {
    assert.deepEqual(
      buildSubmitSprintReverseReviewWorkflowRequest(
        { workflowId: ' workflow-1 ' },
        requestOf({ rating: '5', comment: '  Great collaboration  ' })
      ),
      { workflow_id: 'workflow-1', rating: 5, comment: 'Great collaboration' }
    )
    assert.deepEqual(
      buildRespondSprintReverseReviewWorkflowRequest(
        { workflowId: 'workflow-2' },
        requestOf({ body: '  I need to respond  ' })
      ),
      { workflow_id: 'workflow-2', body: 'I need to respond' }
    )
    assert.deepEqual(
      buildReportSprintReverseReviewWorkflowRequest(
        { workflowId: 'workflow-3' },
        requestOf({ body: '  Please escalate  ' })
      ),
      { workflow_id: 'workflow-3', body: 'Please escalate' }
    )
  })

  test('rejects invalid sprint reverse ratings with a canonical rating issue', ({ assert }) => {
    const failure = validationFailure(() =>
      buildSubmitSprintReverseReviewWorkflowRequest(
        { workflowId: 'workflow-1' },
        requestOf({ rating: Number.NaN, comment: 'valid comment' })
      )
    )

    assert.deepEqual(failure.issues.map((issue) => issue.path), ['rating'])
    assert.equal(failure.issues[0]?.code, 'RATING_INVALID')
  })

  test('rejects malformed sprint reverse body and route values without string coercion', ({ assert }) => {
    const failure = validationFailure(() =>
      buildReportSprintReverseReviewWorkflowRequest(
        { workflowId: 42 },
        requestOf({ body: { reason: 'object injection' } })
      )
    )

    assert.deepEqual(
      failure.issues.map((issue) => ({ path: issue.path, code: issue.code })).sort((a, b) =>
        a.path.localeCompare(b.path)
      ),
      [
        { path: 'body', code: 'REQUEST_STRING_REQUIRED' },
        { path: 'workflowId', code: 'ROUTE_PARAMETER_REQUIRED' },
      ]
    )
  })


})
