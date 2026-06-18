import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildMyInvitationRouteRequest } from '#modules/organizations/controllers/mappers/request/invitations/my_invitation_route_request_mapper'

test.group('My invitation route request mapper', () => {
  test('trims the organization id used by invitation decisions', ({ assert }) => {
    assert.deepEqual(buildMyInvitationRouteRequest({ organizationId: ' org-1 ' }), {
      organizationId: 'org-1',
    })
  })

  test('rejects missing, blank, and non-string invitation route ids', ({ assert }) => {
    for (const params of [{}, { organizationId: '' }, { organizationId: 42 }, null, undefined]) {
      assert.throws(() => buildMyInvitationRouteRequest(params), ValidationException)
    }
  })
})
