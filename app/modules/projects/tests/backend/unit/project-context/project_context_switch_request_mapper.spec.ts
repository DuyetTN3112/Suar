import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildProjectContextSwitchRequest } from '#modules/projects/controllers/mappers/request/project-context/project_context_switch_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return { input: (key: string) => values[key] }
}


test.group('', () => {
  test('maps canonical and legacy project switch aliases', ({ assert }) => {
    assert.deepEqual(
      buildProjectContextSwitchRequest(
        requestOf({ project_id: ' project-1 ', current_path: '/reviews/tasks?x=1' })
      ),
      { projectId: 'project-1', currentPath: '/reviews/tasks?x=1' }
    )
    assert.deepEqual(
      buildProjectContextSwitchRequest(requestOf({ projectId: 'project-2' })),
      { projectId: 'project-2' }
    )
  })

  test('rejects missing or non-string project ids before query execution', ({ assert }) => {
    for (const values of [{}, { projectId: 42 }, { project_id: null }]) {
      assert.throws(() => buildProjectContextSwitchRequest(requestOf(values)), ValidationException)
    }
  })

  test('rejects malformed current paths instead of allowing unsafe redirect input', ({ assert }) => {
    assert.throws(
      () => buildProjectContextSwitchRequest(requestOf({ projectId: 'project-1', currentPath: false })),
      ValidationException
    )
  })

})
