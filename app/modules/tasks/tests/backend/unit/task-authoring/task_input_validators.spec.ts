import { test } from '@japa/runner'

import { validateTaskAssignment } from '#modules/tasks/validators/task_assignment_validator'
import { validateCreateTaskInput } from '#modules/tasks/validators/task_create_validator'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

test.group('Task input validators', () => {
  test('accepts a valid create-task payload', ({ assert }) => {
    const result = validateCreateTaskInput({
      title: 'Document the release',
      description: 'Capture the deployment and rollback steps.',
      project_id: VALID_UUID,
      task_status_id: VALID_UUID_2,
      priority: 'high',
    })

    assert.deepEqual(result, {
      valid: true,
      errors: [],
      fieldErrors: {},
      issues: [],
    })
    assert.deepEqual(result.issues, [])
  })

  test('preserves create-task validation order and field attribution', ({ assert }) => {
    const result = validateCreateTaskInput({
      title: 'Unsafe\u0000title',
      description: 'x'.repeat(5001),
      project_id: 'not-a-uuid',
      task_status_id: null,
      priority: 'impossible',
    })

    assert.deepEqual(result.errors, [
      'Title contains invalid characters',
      'Project ID must be a valid UUID',
      'Task status ID is required',
      'Description must be at most 5000 characters',
      'Priority must be one of: low, medium, high, urgent',
    ])
    assert.deepEqual(result.fieldErrors, {
      title: 'Title contains invalid characters',
      project_id: 'Project ID must be a valid UUID',
      task_status_id: 'Task status ID is required',
      description: 'Description must be at most 5000 characters',
      priority: 'Priority must be one of: low, medium, high, urgent',
    })
    assert.deepEqual(result.issues, [
      { code: 'TITLE_INVALID', path: 'title', message: 'Title contains invalid characters' },
      { code: 'UUID_INVALID', path: 'project_id', message: 'Project ID must be a valid UUID' },
      { code: 'UUID_REQUIRED', path: 'task_status_id', message: 'Task status ID is required' },
      { code: 'DESCRIPTION_TOO_LONG', path: 'description', message: 'Description must be at most 5000 characters' },
      { code: 'PRIORITY_INVALID', path: 'priority', message: 'Priority must be one of: low, medium, high, urgent' },
    ])
  })

  test('keeps the first assignment error for each field', ({ assert }) => {
    const result = validateTaskAssignment({
      task_id: '',
      assignee_id: 'same-invalid-id',
      creator_id: 'same-invalid-id',
    })

    assert.deepEqual(result.errors, [
      'Task ID is required',
      'Assignee ID must be a valid UUID',
      'Cannot assign task to yourself',
    ])
    assert.deepEqual(result.fieldErrors, {
      task_id: 'Task ID is required',
      assignee_id: 'Assignee ID must be a valid UUID',
    })
  })
})
