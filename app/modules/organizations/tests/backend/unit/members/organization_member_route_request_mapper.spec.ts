import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildOrganizationJoinRequestRouteRequest,
  buildOrganizationMemberRouteRequest,
} from '#modules/organizations/controllers/mappers/request/members/organization_member_route_request_mapper'

test.group('Organization member route request mapper', () => {
  test('normalizes the member route id', ({ assert }) => {
    assert.deepEqual(buildOrganizationMemberRouteRequest({ memberId: ' member-1 ' }), { memberId: 'member-1' })
  })

  test('rejects a missing member route id', ({ assert }) => {
    assert.throws(() => buildOrganizationMemberRouteRequest({}), ValidationException)
  })

  test('maps and validates join request route ids', ({ assert }) => {
    assert.deepEqual(
      buildOrganizationJoinRequestRouteRequest({ joinRequestId: ' join-1 ' }),
      { joinRequestId: 'join-1' }
    )
    assert.throws(() => buildOrganizationJoinRequestRouteRequest({ joinRequestId: 42 }), ValidationException)
  })
})
