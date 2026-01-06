import { test } from '@japa/runner'

import AppException from '#modules/errors/public_contracts/application_exception'
import { ErrorCode, ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  CreateTaskStatusDTO,
  UpdateWorkflowDTO,
} from '#modules/tasks/public_contracts/task_status_dtos'
import {
  TaskValidationDatabaseException,
  taskDatabaseValueExists,
} from '#modules/tasks/validators/rules/database'
import { validateTaskAssignment } from '#modules/tasks/validators/task_assignment_validator'
import { validateCreateTaskInput } from '#modules/tasks/validators/task_create_validator'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function fakeDatabase(first: () => Promise<unknown>) {
  const query = {
    where() {
      return query
    },
    whereNull() {
      return query
    },
    select() {
      return query
    },
    first,
  }

  return {
    from() {
      return query
    },
  }
}

async function captureRejection(executor: () => Promise<unknown>): Promise<unknown> {
  try {
    await executor()
  } catch (error) {
    return error
  }

  throw new Error('Expected promise to reject')
}

function captureThrow(executor: () => unknown): unknown {
  try {
    executor()
  } catch (error) {
    return error
  }

  throw new Error('Expected function to throw')
}

test.group('Task validator exception boundary', () => {
  test('reports a missing database row as a validation miss', async ({ assert }) => {
    const exists = await taskDatabaseValueExists(
      fakeDatabase(() => Promise.resolve(undefined)),
      'users',
      'id',
      VALID_UUID,
      { softDelete: true }
    )

    assert.isFalse(exists)
  })

  test('propagates an existing typed application exception unchanged', async ({ assert }) => {
    const typedFailure = new AppException('Known dependency failure', {
      status: 503,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      category: 'dependency',
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    })

    const error = await captureRejection(() =>
      taskDatabaseValueExists(
        fakeDatabase(() => Promise.reject(typedFailure)),
        'users',
        'id',
        VALID_UUID
      )
    )

    assert.strictEqual(error, typedFailure)
  })

  test('maps a database outage to a retryable sanitized dependency exception', async ({
    assert,
  }) => {
    const diagnostic = 'connect ECONNREFUSED postgres://admin:secret@database/tasks'

    const error = await captureRejection(() =>
      taskDatabaseValueExists(
        fakeDatabase(() => Promise.reject(new Error(diagnostic))),
        'tasks',
        'id',
        VALID_UUID,
        { softDelete: true }
      )
    )

    assert.instanceOf(error, TaskValidationDatabaseException)
    if (!(error instanceof TaskValidationDatabaseException)) {
      throw new TypeError('Expected TaskValidationDatabaseException')
    }
    assert.equal(error.status, 503)
    assert.equal(error.code, ErrorCode.SERVICE_UNAVAILABLE)
    assert.equal(error.category, 'dependency')
    assert.isTrue(error.retryable)
    assert.isTrue(error.shouldReport)
    assert.equal(error.safeMessage, ErrorMessages.SERVICE_UNAVAILABLE)
    assert.notInclude(error.safeMessage, 'secret')
    assert.notInclude(error.message, 'secret')
    assert.equal((error.cause as Error).message, diagnostic)
  })

  test('preserves create-task validation messages and field keys', ({ assert }) => {
    const result = validateCreateTaskInput({
      title: '',
      project_id: 'not-a-uuid',
      task_status_id: '',
      priority: 'impossible',
    })

    assert.isFalse(result.valid)
    assert.deepEqual(result.errors, [
      'Title is required',
      'Project ID must be a valid UUID',
      'Task status ID is required',
      'Priority must be one of: low, medium, high, urgent',
    ])
    assert.deepEqual(result.fieldErrors, {
      title: 'Title is required',
      project_id: 'Project ID must be a valid UUID',
      task_status_id: 'Task status ID is required',
      priority: 'Priority must be one of: low, medium, high, urgent',
    })
  })

  test('attributes self-assignment to assignee_id without changing legacy messages', ({
    assert,
  }) => {
    const result = validateTaskAssignment({
      task_id: VALID_UUID,
      assignee_id: VALID_UUID_2,
      creator_id: VALID_UUID_2,
    })

    assert.isFalse(result.valid)
    assert.deepEqual(result.errors, ['Cannot assign task to yourself'])
    assert.deepEqual(result.fieldErrors, {
      assignee_id: 'Cannot assign task to yourself',
    })
  })

  test('keeps task-status DTO failures attached to their API field', ({ assert }) => {
    const error = captureThrow(
      () =>
        new CreateTaskStatusDTO({
          organization_id: VALID_UUID,
          name: 'Ready',
          slug: 'INVALID SLUG',
          category: 'todo',
        })
    )

    assert.instanceOf(error, ValidationException)
    if (!(error instanceof ValidationException)) {
      throw new TypeError('Expected ValidationException')
    }
    assert.deepEqual(error.errors, {
      slug: 'Slug chỉ được chứa chữ thường, số và dấu gạch dưới (2-50 ký tự)',
    })
  })

  test('keeps indexed workflow transition fields for cross-field validation', ({ assert }) => {
    const error = captureThrow(
      () =>
        new UpdateWorkflowDTO({
          organization_id: VALID_UUID,
          transitions: [
            {
              from_status_id: VALID_UUID_2,
              to_status_id: VALID_UUID_2,
            },
          ],
        })
    )

    assert.instanceOf(error, ValidationException)
    if (!(error instanceof ValidationException)) {
      throw new TypeError('Expected ValidationException')
    }
    assert.deepEqual(error.errors, {
      'transitions.0.from_status_id': 'from_status_id và to_status_id không được trùng nhau',
      'transitions.0.to_status_id': 'from_status_id và to_status_id không được trùng nhau',
    })
  })
})
