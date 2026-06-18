import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildCurrentOrganizationWorkflowCreateTaskStatusDTO } from '#modules/organizations/controllers/mappers/request/workflow/current_task_status_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(values, key) ? values[key] : fallback
    },
  }
}

test.group('Current organization task status request mapper', () => {
  test('normalizes workflow status input', ({ assert }) => {
    assert.deepEqual(
      buildCurrentOrganizationWorkflowCreateTaskStatusDTO(requestOf({ name: ' In Review ' }) as never),
      { name: 'In Review', slug: 'in_review', category: 'in_progress', color: '#6B7280' }
    )
  })

  test('rejects non-string or blank status names', ({ assert }) => {
    assert.throws(
      () => buildCurrentOrganizationWorkflowCreateTaskStatusDTO(requestOf({ name: 42 }) as never),
      ValidationException
    )
    assert.throws(
      () => buildCurrentOrganizationWorkflowCreateTaskStatusDTO(requestOf({ name: '   ' }) as never),
      ValidationException
    )
  })
})
