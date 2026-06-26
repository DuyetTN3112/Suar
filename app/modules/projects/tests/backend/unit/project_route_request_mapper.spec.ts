import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildProjectMemberRouteRequest } from '#modules/projects/controllers/mappers/request/project-members/project_route_request_mapper'

test.group('', () => {
  test('trims a project member route identifier', ({ assert }) => {
    assert.deepEqual(buildProjectMemberRouteRequest({ userId: ' user-1 ' }), { userId: 'user-1' })
  })

  test('rejects a missing project member route identifier', ({ assert }) => {
    try {
      buildProjectMemberRouteRequest({})
      assert.fail('Expected project member route id to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.equal((error as ValidationException).issues[0]?.path, 'userId')
    }
  })

})
