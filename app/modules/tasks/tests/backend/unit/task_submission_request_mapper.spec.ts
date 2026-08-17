import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildRequiredTaskRouteRequest } from '#modules/tasks/controllers/mappers/request/task-requirements/task_requirement_route_request_mapper'

test.group('', () => {
  test('trims task ids at submission boundaries', ({ assert }) => {
    assert.deepEqual(buildRequiredTaskRouteRequest({ taskId: ' task-1 ' }), { taskId: 'task-1' })
  })

  test('rejects missing and non-string task ids before submission commands', ({ assert }) => {
    assert.throws(() => buildRequiredTaskRouteRequest({}), ValidationException)
    assert.throws(() => buildRequiredTaskRouteRequest({ taskId: 42 }), ValidationException)
  })


})
