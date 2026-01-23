import { test } from '@japa/runner'

import { SEED_ORGANIZATIONS_SPECS } from '../../../../../seed/demo_data/organization_seeds_specs.js'
import { SEED_USERS_SPECS } from '../../../../../seed/demo_data/user_seeds_specs.js'

import { organizationMembershipRepository } from '#composition/organization_persistence_composition'
import User from '#modules/users/infra/models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
} from '#tests/helpers/factories'

type EnvPatch = Record<string, string | undefined>

const withEnv = async (patch: EnvPatch, callback: () => Promise<void>): Promise<void> => {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key])

    if (value === undefined) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }

  try {
    await callback()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
        continue
      }

      process.env[key] = value
    }
  }
}

test.group('Integration | Testing Auth State', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns authenticated user and current organization context for test sessions', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    await owner.merge({ current_organization_id: org.id }).save()

    const response = await client.get('/api/testing/auth-state').loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        authenticated: boolean
        email: string | null
        currentOrganizationId: string | null
        sessionOrganizationId: string | null
        systemRole: string | null
      }
    }

    assert.equal(body.data.authenticated, true)
    assert.equal(body.data.email, owner.email)
    assert.equal(body.data.currentOrganizationId, org.id)
    assert.equal(body.data.sessionOrganizationId, org.id)
    assert.equal(body.data.systemRole, owner.system_role)
  })

  test('testing login can pin the session to a requested organization', async ({
    assert,
    client,
  }) => {
    const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'Secondary Org',
      slug: `secondary-${Date.now()}`,
    })

    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })

    const loginResponse = await client.post('/api/testing/login').form({
      email: owner.email,
      provider: 'google',
      organization_id: secondaryOrg.id,
    })

    loginResponse.assertStatus(204)
    loginResponse.assertCookie('adonis-session')

    const refreshedOwner = await User.findOrFail(owner.id)
    assert.equal(refreshedOwner.current_organization_id, secondaryOrg.id)
    assert.notEqual(refreshedOwner.current_organization_id, primaryOrg.id)
  })

  test('testing login can force a deterministic system admin role on clean test db', async ({
    assert,
    client,
  }) => {
    const email = `qa-admin-${Date.now()}@test.example.com`

    const tokenResponse = await client.post('/api/testing/token-login').form({
      email,
      provider: 'google',
      system_role: 'superadmin',
    })

    tokenResponse.assertStatus(200)

    const tokenBody = tokenResponse.body() as {
      data: {
        accessToken: string
        refreshToken: string
        organizationId: string | null
        systemRole: string
      }
    }

    assert.isString(tokenBody.data.accessToken)
    assert.isString(tokenBody.data.refreshToken)
    assert.equal(tokenBody.data.organizationId, null)
    assert.equal(tokenBody.data.systemRole, 'superadmin')

    const bootstrapResponse = await client
      .post('/api/testing/session/bootstrap')
      .header('authorization', `Bearer ${tokenBody.data.accessToken}`)

    bootstrapResponse.assertStatus(200)
    bootstrapResponse.assertCookie('adonis-session')

    const bootstrapBody = bootstrapResponse.body() as {
      data: {
        organizationId: string | null
        systemRole: string | null
        email: string | null
      }
    }

    assert.equal(bootstrapBody.data.organizationId, null)
    assert.equal(bootstrapBody.data.systemRole, 'superadmin')
    assert.equal(bootstrapBody.data.email, email)

    const createdUser = await User.findByOrFail('email', email)
    assert.equal(createdUser.system_role, 'superadmin')
  })

  test('testing login preserves canonical main account organization roles', async ({
    assert,
    client,
  }) => {
    const mainUser = SEED_USERS_SPECS.owner
    const secondaryOwner = SEED_USERS_SPECS.orgBOwner
    const primaryOrgSpec = SEED_ORGANIZATIONS_SPECS.orgA
    const secondaryOrgSpec = SEED_ORGANIZATIONS_SPECS.orgB

    await withEnv(
      {
        SUAR_MAIN_TEST_EMAIL: mainUser.email,
        SUAR_MAIN_TEST_PRIMARY_ORG_NAME: primaryOrgSpec.name,
        SUAR_MAIN_TEST_PRIMARY_ORG_SLUG: primaryOrgSpec.slug,
        SUAR_MAIN_TEST_SECONDARY_ORG_NAME: secondaryOrgSpec.name,
        SUAR_MAIN_TEST_SECONDARY_ORG_SLUG: secondaryOrgSpec.slug,
        SUAR_MAIN_TEST_SECONDARY_OWNER_EMAIL: secondaryOwner.email,
        SUAR_MAIN_TEST_SECONDARY_OWNER_USERNAME: secondaryOwner.username,
      },
      async () => {
        const loginResponse = await client.post('/api/testing/token-login').form({
          email: mainUser.email,
          provider: mainUser.auth_method,
        })

        loginResponse.assertStatus(200)

        const user = await User.findByOrFail('email', mainUser.email)
        const memberships = await organizationMembershipRepository.listSummariesByUser(user.id)

        assert.equal(user.system_role, 'registered_user')
        assert.isTrue(
          memberships.some(
            (org) =>
              org.slug === primaryOrgSpec.slug &&
              org.org_role === 'org_owner' &&
              org.status === 'approved'
          )
        )
        assert.isTrue(
          memberships.some(
            (org) =>
              org.slug === secondaryOrgSpec.slug &&
              org.org_role === 'org_member' &&
              org.status === 'approved'
          )
        )
        assert.equal(
          user.current_organization_id,
          memberships.find((org) => org.slug === primaryOrgSpec.slug)?.id
        )
      }
    )
  })
})
