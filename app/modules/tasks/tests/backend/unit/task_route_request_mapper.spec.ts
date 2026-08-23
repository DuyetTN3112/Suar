import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildPrefillTaskRequirementsRouteRequest,
  buildTaskRouteRequest,
} from '#modules/tasks/controllers/mappers/request/task-reading/task_route_request_mapper'

test.group('', () => {
  test('trims a task route identifier', ({ assert }) => {
    assert.deepEqual(buildTaskRouteRequest({ taskId: ' task-1 ' }), { taskId: 'task-1' })
  })

  test('rejects a missing route identifier with a canonical path', ({ assert }) => {
    try {
      buildTaskRouteRequest({ taskId: null })
      assert.fail('Expected task route id to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.equal((error as ValidationException).issues[0]?.path, 'taskId')
    }
  })

  test('uses the same route validation for role-prefill aliases', ({ assert }) => {
    assert.deepEqual(
      buildPrefillTaskRequirementsRouteRequest({ taskId: ' task-1 ' }),
      { taskId: 'task-1' }
    )
  })


})
