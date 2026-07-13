import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildSprintReverseReviewBoardRequest } from '#modules/reviews/controllers/mappers/request/sprint-review/sprint_reverse_review_board_request_mapper'

function captureValidation(executor: () => unknown): ValidationException {
  try {
    executor()
  } catch (error) {
    if (error instanceof ValidationException) return error
    throw error
  }

  throw new Error('Expected validation exception')
}


test.group('', () => {
  test('uses route project context before query and session context', ({ assert }) => {
    assert.deepEqual(
      buildSprintReverseReviewBoardRequest(
        { projectId: 'route-project' },
        { project_id: 'query-project', sprint_id: 'sprint-1', workflow_id: 'workflow-1' },
        'session-project'
      ),
      {
        projectId: 'route-project',
        sprintId: 'sprint-1',
        selectedWorkflowId: 'workflow-1',
        workspaceMode: 'project',
      }
    )
  })

  test('uses query project before the session when route project is absent', ({ assert }) => {
    assert.deepEqual(
      buildSprintReverseReviewBoardRequest(
        {},
        { project_id: 'query-project' },
        'session-project'
      ),
      {
        projectId: 'query-project',
        sprintId: null,
        selectedWorkflowId: null,
        workspaceMode: 'personal',
      }
    )
  })

  test('uses the session project only when no external project is provided', ({ assert }) => {
    assert.deepEqual(buildSprintReverseReviewBoardRequest({}, {}, 'session-project'), {
      projectId: 'session-project',
      sprintId: null,
      selectedWorkflowId: null,
      workspaceMode: 'personal',
    })
  })

  test('rejects malformed query values instead of falling back to another context', ({ assert }) => {
    const error = captureValidation(() =>
      buildSprintReverseReviewBoardRequest(
        { projectId: 'route-project' },
        { project_id: 123, sprint_id: [], workflow_id: {} },
        'session-project'
      )
    )

    assert.deepEqual(error.issues, [
      {
        code: 'REQUEST_STRING_INVALID',
        path: 'project_id',
        message: 'project_id must be a non-empty string',
      },
      {
        code: 'REQUEST_STRING_INVALID',
        path: 'sprint_id',
        message: 'sprint_id must be a non-empty string',
      },
      {
        code: 'REQUEST_STRING_INVALID',
        path: 'workflow_id',
        message: 'workflow_id must be a non-empty string',
      },
    ])
  })

  test('rejects a missing project context', ({ assert }) => {
    const error = captureValidation(() => buildSprintReverseReviewBoardRequest({}, {}, undefined))

    assert.deepEqual(error.issues, [
      {
        code: 'PROJECT_CONTEXT_REQUIRED',
        path: 'projectId',
        message: 'A project context is required',
      },
    ])
  })


})
