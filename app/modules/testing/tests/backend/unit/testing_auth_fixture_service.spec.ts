import { test } from '@japa/runner'

import { EnsureTestingAuthFixtureCommand } from '#modules/testing/actions/commands/testing-auth/ensure_testing_auth_fixture_command'
import type {
  TestingAccountV1,
  TestingAuthFixtureGateways,
} from '#modules/testing/actions/ports/outbound/testing_auth_fixture_gateways'

function makeGateways(options: {
  account?: TestingAccountV1
  organizationExists?: boolean
  approvedMember?: boolean
}) {
  const account: TestingAccountV1 = options.account ?? {
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.test',
    systemRole: 'registered_user',
    currentOrganizationId: 'org-1',
  }
  const oauthCalls: unknown[] = []
  const selectedOrganizations: Array<string | null> = []

  const gateways: TestingAuthFixtureGateways = {
    user: {
      ensureTestingAccountV1: () => Promise.resolve(account),
      setCurrentOrganization: (_userId, organizationId) => {
        selectedOrganizations.push(organizationId)
        return Promise.resolve()
      },
      findTestingAccountV1: () => Promise.resolve(account),
    },
    oauth: {
      ensureTestingOAuthIdentityV1: (input) => {
        oauthCalls.push(input)
        return Promise.resolve()
      },
    },
    organization: {
      ensureTestingOrganizationV1: (input) =>
        Promise.resolve({
          id: 'created-org',
          slug: input.slug,
          ownerId: input.ownerId,
          plan: input.plan,
        }),
      ensureApprovedMembershipV1: () => Promise.resolve(),
      findTestingOrganizationByIdV1: (organizationId) =>
        Promise.resolve(
          options.organizationExists === false
            ? null
            : {
                id: organizationId,
                slug: 'existing-org',
                ownerId: account.id,
                plan: 'starter',
              }
        ),
      findFirstApprovedMembershipV1: () => Promise.resolve(null),
      isApprovedMemberV1: () => Promise.resolve(options.approvedMember !== false),
    },
  }

  return { gateways, oauthCalls, selectedOrganizations }
}

test.group('Unit | Testing auth fixture service', () => {
  test('always ensures OAuth identity and preserves a valid current organization', async ({
    assert,
  }) => {
    const { gateways, oauthCalls, selectedOrganizations } = makeGateways({})
    const result = await new EnsureTestingAuthFixtureCommand(gateways, {
      newId: () => '11111111-1111-4111-8111-111111111111',
    }).execute({
      email: 'tester@example.test',
      provider: 'github',
    })

    assert.equal(result.organizationId, 'org-1')
    assert.deepEqual(oauthCalls, [
      {
        userId: 'user-1',
        provider: 'github',
        providerId: 'test-user-1',
        email: 'tester@example.test',
      },
    ])
    assert.deepEqual(selectedOrganizations, [])
  })

  test('rejects a requested organization when membership is not approved', async ({ assert }) => {
    const { gateways } = makeGateways({ approvedMember: false })
    await assert.rejects(
      () =>
        new EnsureTestingAuthFixtureCommand(gateways, {
          newId: () => '11111111-1111-4111-8111-111111111111',
        }).execute({
          email: 'tester@example.test',
          requestedOrganizationId: 'org-2',
        }),
      /not an approved member/
    )
  })

  test('rejects a requested organization that does not exist', async ({ assert }) => {
    const { gateways } = makeGateways({ organizationExists: false })
    await assert.rejects(
      () =>
        new EnsureTestingAuthFixtureCommand(gateways, {
          newId: () => '11111111-1111-4111-8111-111111111111',
        }).execute({
          email: 'tester@example.test',
          requestedOrganizationId: 'missing-org',
        }),
      /Organization not found/
    )
  })
})
