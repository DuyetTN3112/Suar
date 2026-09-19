import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildRequiredUserRouteRequest, buildUserSkillRouteRequest } from '#modules/users/controllers/mappers/request/profile/user_route_request_mapper'

test.group('', () => {
  test('maps and validates user ids', ({ assert }) => {
    assert.deepEqual(buildRequiredUserRouteRequest({ userId: ' user-1 ' }), { userId: 'user-1' })
    assert.throws(() => buildRequiredUserRouteRequest({ userId: 42 }), ValidationException)
  })
  test('trims a profile skill route identifier', ({ assert }) => {
    assert.deepEqual(buildUserSkillRouteRequest({ skillId: ' skill-1 ' }), { skillId: 'skill-1' })
  })

  test('rejects a non-string profile skill route identifier', ({ assert }) => {
    try {
      buildUserSkillRouteRequest({ skillId: 42 })
      assert.fail('Expected user skill route id to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.equal((error as ValidationException).issues[0]?.path, 'skillId')
    }
  })

})
