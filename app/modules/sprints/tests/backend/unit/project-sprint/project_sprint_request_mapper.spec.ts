import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildProjectSprintRouteInput,
  buildStartProjectSprintInput,
  buildCreateProjectSprintInput,
  buildEndProjectSprintDeliveryInput,
  buildReorderProjectBacklogInput,
  buildUpdateProjectSprintInput,
} from '#modules/sprints/controllers/mappers/request/project-sprint/project_sprint_request_mapper'
import { buildMoveTaskToSprintInput } from '#modules/sprints/controllers/mappers/request/task-sprint-assignment/task_sprint_assignment_request_mapper'

const PROJECT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const SPRINT_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const TASK_ID = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const NEXT_SPRINT_ID = 'd4e5f6a7-b8c9-4d0e-8f2a-3b4c5d6e7f8a'

function captureValidation(executor: () => unknown): ValidationException {
  try {
    executor()
  } catch (error) {
    if (error instanceof ValidationException) return error
    throw error
  }

  throw new Error('Expected validation exception')
}

test.group('Project Sprint request mappers', () => {
  test('maps the create payload into a canonical action input', ({ assert }) => {
    assert.deepEqual(
      buildCreateProjectSprintInput(PROJECT_ID, {
        name: 'Sprint 1',
        startsAt: '2026-08-10T09:00:00.000Z',
        ends_at: '2026-08-17T09:00:00.000Z',
        goal: null,
      }),
      {
        project_id: PROJECT_ID,
        name: 'Sprint 1',
        starts_at: '2026-08-10T09:00:00.000Z',
        ends_at: '2026-08-17T09:00:00.000Z',
        goal: null,
      }
    )
  })

  test('maps sprint lifecycle route params into canonical IDs', ({ assert }) => {
    assert.deepEqual(buildProjectSprintRouteInput(PROJECT_ID, SPRINT_ID), {
      project_id: PROJECT_ID,
      sprint_id: SPRINT_ID,
    })
    assert.deepEqual(buildStartProjectSprintInput(PROJECT_ID, SPRINT_ID), {
      project_id: PROJECT_ID,
      sprint_id: SPRINT_ID,
    })
  })

  test('rejects malformed sprint lifecycle route params', ({ assert }) => {
    const error = captureValidation(() => buildProjectSprintRouteInput('not-a-project', 42))

    assert.deepEqual(error.issues, [
      {
        code: 'UUID_INVALID',
        path: 'projectId',
        message: 'Project ID must be a valid UUID',
      },
      {
        code: 'UUID_INVALID',
        path: 'sprintId',
        message: 'Sprint ID must be a valid UUID',
      },
    ])
  })

  test('rejects wrong types instead of converting them to defaults', ({ assert }) => {
    const error = captureValidation(() =>
      buildCreateProjectSprintInput(PROJECT_ID, {
        name: 123,
        startsAt: '2026-08-10T09:00:00.000Z',
        endsAt: '2026-08-17T09:00:00.000Z',
      })
    )

    assert.deepEqual(error.issues, [
      {
        code: 'SPRINT_NAME_INVALID',
        path: 'name',
        message: 'Sprint name must be a non-empty string',
      },
    ])
  })

  test('rejects conflicting aliases instead of silently choosing one', ({ assert }) => {
    const error = captureValidation(() =>
      buildUpdateProjectSprintInput(PROJECT_ID, SPRINT_ID, {
        startsAt: '2026-08-10T09:00:00.000Z',
        starts_at: '2026-08-11T09:00:00.000Z',
      })
    )

    assert.deepEqual(error.issues, [
      {
        code: 'REQUEST_ALIAS_CONFLICT',
        path: 'startsAt',
        message: 'Use either startsAt or starts_at, not both',
      },
    ])
  })

  test('rejects malformed nested delivery entries with indexed paths', ({ assert }) => {
    const error = captureValidation(() =>
      buildEndProjectSprintDeliveryInput(PROJECT_ID, SPRINT_ID, {
        incompleteTasks: [
          {
            taskId: TASK_ID,
            destination: null,
          },
        ],
      })
    )

    assert.deepEqual(error.issues, [
      {
        code: 'SPRINT_DESTINATION_INVALID',
        path: 'incompleteTasks.0.destination',
        message: 'Destination must be an object',
      },
    ])
  })

  test('maps move and backlog ordering aliases without leaking raw records', ({ assert }) => {
    assert.deepEqual(
      buildMoveTaskToSprintInput(PROJECT_ID, TASK_ID, {
        projectSprintId: NEXT_SPRINT_ID,
        reason: 'planned',
      }),
      {
        project_id: PROJECT_ID,
        task_id: TASK_ID,
        project_sprint_id: NEXT_SPRINT_ID,
        reason: 'planned',
      }
    )

    assert.deepEqual(
      buildReorderProjectBacklogInput(PROJECT_ID, TASK_ID, {
        beforeTaskId: null,
        after_task_id: TASK_ID,
      }),
      {
        project_id: PROJECT_ID,
        task_id: TASK_ID,
        before_task_id: null,
        after_task_id: TASK_ID,
      }
    )
  })
})
