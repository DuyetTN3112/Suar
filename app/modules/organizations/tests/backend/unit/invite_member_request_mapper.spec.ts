import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildCurrentOrganizationInviteMemberInput } from '#modules/organizations/controllers/mappers/request/invitations/current_organization_mutation_request_mapper'

function requestOf(values: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { input: (key: string) => values[key] } as never
}

test.group('Invite member request mapper', () => {
  test('normalizes the canonical role alias and email', ({ assert }) => {
    assert.deepEqual(buildCurrentOrganizationInviteMemberInput(requestOf({ email: ' user@example.com ' }), 'org-1'), {
      organizationId: 'org-1', email: 'user@example.com', roleId: 'org_member',
    })
  })

  test('rejects malformed invite input before the command boundary', ({ assert }) => {
    try {
      buildCurrentOrganizationInviteMemberInput(requestOf({ email: 42, roleId: '' }), 'org-1')
      assert.fail('Expected malformed invite input to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), ['email', 'roleId'])
    }
  })
})
