import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildRequiredTaskRequirementRouteRequest,
  buildRequiredTaskRouteRequest,
} from '#modules/tasks/controllers/mappers/request/task-requirements/task_requirement_route_request_mapper'

test.group('', () => {
  test('trims task and requirement route ids', ({ assert }) => {
    assert.deepEqual(buildRequiredTaskRouteRequest({ taskId: ' task-1 ' }), { taskId: 'task-1' })
    assert.deepEqual(buildRequiredTaskRequirementRouteRequest({ requirementId: ' req-1 ' }), {
      requirementId: 'req-1',
    })
  })

  test('rejects non-string route ids', ({ assert }) => {
    assert.throws(() => buildRequiredTaskRouteRequest({ taskId: 42 }), ValidationException)
  })


})
