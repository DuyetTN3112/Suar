import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildGetProjectBacklogRequest,
  buildListProjectSprintsRequest,
} from '#modules/sprints/controllers/mappers/request/project-sprint/sprint_query_request_mapper'

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
  test('maps backlog route and query input into canonical values', ({ assert }) => {
    assert.deepEqual(
      buildGetProjectBacklogRequest(
        { projectId: 'project-1' },
        { page: '2', per_page: '25', status: ['todo', 'in_progress'] }
      ),
      {
        project_id: 'project-1',
        page: 2,
        per_page: 25,
        status: ['todo', 'in_progress'],
      }
    )
  })

  test('maps sprint list aliases into the canonical query DTO', ({ assert }) => {
    assert.deepEqual(
      buildListProjectSprintsRequest(
        { projectId: 'project-1' },
        { page: '3', perPage: '10' }
      ),
      { projectId: 'project-1', page: 3, perPage: 10 }
    )
  })

  test('rejects malformed route and pagination values instead of defaulting them', ({ assert }) => {
    const error = captureValidation(() =>
      buildGetProjectBacklogRequest(
        { projectId: 42 },
        { page: 'not-a-number', perPage: '0', status: ['todo', 123] }
      )
    )

    assert.deepEqual(error.issues, [
      {
        code: 'ROUTE_PARAMETER_INVALID',
        path: 'projectId',
        message: 'projectId must be a non-empty string',
      },
      {
        code: 'PAGINATION_PAGE_INVALID',
        path: 'page',
        message: 'page must be a positive integer',
      },
      {
        code: 'PAGINATION_PER_PAGE_INVALID',
        path: 'perPage',
        message: 'perPage must be a positive integer',
      },
      {
        code: 'BACKLOG_STATUS_INVALID',
        path: 'status.1',
        message: 'status values must be non-empty strings',
      },
    ])
  })

  test('rejects conflicting pagination aliases', ({ assert }) => {
    const error = captureValidation(() =>
      buildListProjectSprintsRequest({ projectId: 'project-1' }, { perPage: '10', per_page: '20' })
    )

    assert.deepEqual(error.issues, [
      {
        code: 'REQUEST_ALIAS_CONFLICT',
        path: 'perPage',
        message: 'Use either perPage or per_page, not both',
      },
    ])
  })

})
