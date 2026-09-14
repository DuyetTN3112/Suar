import { test } from '@japa/runner'

import { readTokenPairApiBody } from './support/testing_auth_tokens_fixtures.js'

import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
} from '#tests/helpers/factories'


test.group('Integration | Auth Token Lifecycle', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('token login issues access and refresh tokens pinned to requested organization', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'Token Secondary Org',
      slug: `token-secondary-${Date.now()}`,
    })

    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })

    const response = await client.post('/api/testing/token-login').form({
      email: owner.email,
      provider: 'google',
      organization_id: secondaryOrg.id,
    })

    response.assertStatus(200)
    const body = readTokenPairApiBody(response)

    assert.isString(body.data.accessToken)
    assert.isString(body.data.refreshToken)
    assert.equal(body.data.organizationId, secondaryOrg.id)
    assert.equal(body.data.systemRole, owner.system_role)
  })

  test('refresh token can rotate active organization for same user', async ({ assert, client }) => {
    const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'Refresh Secondary Org',
      slug: `refresh-secondary-${Date.now()}`,
    })

    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })

    const initialResponse = await client.post('/api/testing/token-login').form({
      email: owner.email,
      provider: 'google',
      organization_id: primaryOrg.id,
    })

    const initialBody = readTokenPairApiBody(initialResponse)

    assert.equal(initialBody.data.organizationId, primaryOrg.id)

    const refreshResponse = await client.post('/api/testing/token-refresh').form({
      refresh_token: initialBody.data.refreshToken,
      organization_id: secondaryOrg.id,
    })

    refreshResponse.assertStatus(200)
    const refreshBody = readTokenPairApiBody(refreshResponse)

    assert.isString(refreshBody.data.accessToken)
    assert.isString(refreshBody.data.refreshToken)
    assert.equal(refreshBody.data.organizationId, secondaryOrg.id)
  })

  test('session bootstrap from access token creates authenticated org-aware session', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const tokenResponse = await client.post('/api/testing/token-login').form({
      email: owner.email,
      provider: 'google',
      organization_id: org.id,
    })

    const tokenBody = readTokenPairApiBody(tokenResponse)

    const bootstrapResponse = await client
      .post('/api/testing/session/bootstrap')
      .header('authorization', `Bearer ${tokenBody.data.accessToken}`)

    bootstrapResponse.assertStatus(200)
    bootstrapResponse.assertCookie('adonis-session')

    const refreshedOwner = await User.findOrFail(owner.id)
    assert.equal(refreshedOwner.current_organization_id, org.id)

    const bootstrapBody = bootstrapResponse.body() as {
      data: {
        organizationId: string | null
        email: string | null
      }
    }

    assert.equal(bootstrapBody.data.organizationId, org.id)
    assert.equal(bootstrapBody.data.email, owner.email)
  })

  test('session auth can mint token pair, refresh into another org, and access API via bearer', async ({
    assert,
    client,
  }) => {
    const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'Hybrid Secondary Org',
      slug: `hybrid-secondary-${Date.now()}`,
    })

    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })

    await owner.merge({ current_organization_id: primaryOrg.id }).save()

    const issueResponse = await client.post('/api/auth/token').loginAs(owner)

    issueResponse.assertStatus(200)

    const issueBody = readTokenPairApiBody(issueResponse)

    assert.isString(issueBody.data.accessToken)
    assert.isString(issueBody.data.refreshToken)
    assert.equal(issueBody.data.organizationId, primaryOrg.id)

    const refreshResponse = await client.post('/api/auth/refresh').form({
      refresh_token: issueBody.data.refreshToken,
      organization_id: secondaryOrg.id,
    })

    refreshResponse.assertStatus(200)

    const refreshBody = readTokenPairApiBody(refreshResponse)

    assert.isString(refreshBody.data.accessToken)
    assert.isString(refreshBody.data.refreshToken)
    assert.equal(refreshBody.data.organizationId, secondaryOrg.id)

    const meResponse = await client
      .get('/api/v1/me')
      .header('authorization', `Bearer ${refreshBody.data.accessToken}`)

    meResponse.assertStatus(200)

    const meBody = meResponse.body() as {
      data: {
        id: string
        currentOrganizationId: string | null
        currentOrganizationRole: string | null
      }
    }

    assert.equal(meBody.data.id, owner.id)
    assert.equal(meBody.data.currentOrganizationId, secondaryOrg.id)
    assert.equal(meBody.data.currentOrganizationRole, 'org_owner')
  })

  test('canonical v1 auth token endpoints preserve legacy token-pair contract', async ({
    assert,
    client,
  }) => {
    const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'V1 Auth Secondary Org',
      slug: `v1-auth-secondary-${Date.now()}`,
    })

    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })

    await owner.merge({ current_organization_id: primaryOrg.id }).save()

    const legacyIssueResponse = await client.post('/api/auth/token').loginAs(owner)
    legacyIssueResponse.assertStatus(200)
    const legacyIssueBody = readTokenPairApiBody(legacyIssueResponse)

    const canonicalIssueResponse = await client.post('/api/v1/auth/token').loginAs(owner)
    canonicalIssueResponse.assertStatus(200)
    const canonicalIssueBody = readTokenPairApiBody(canonicalIssueResponse)

    assert.notProperty(legacyIssueBody, 'success')
    assert.notProperty(canonicalIssueBody, 'success')
    assert.equal(canonicalIssueBody.data.organizationId, primaryOrg.id)
    assert.equal(canonicalIssueBody.data.systemRole, owner.system_role)
    assert.isString(canonicalIssueBody.data.accessToken)
    assert.isString(canonicalIssueBody.data.refreshToken)
    assert.isNumber(canonicalIssueBody.data.expiresIn)
    assert.isNumber(canonicalIssueBody.data.refreshExpiresIn)

    const legacyRefreshResponse = await client.post('/api/auth/refresh').form({
      refresh_token: legacyIssueBody.data.refreshToken,
      organization_id: secondaryOrg.id,
    })
    legacyRefreshResponse.assertStatus(200)
    const legacyRefreshBody = readTokenPairApiBody(legacyRefreshResponse)

    const canonicalRefreshResponse = await client.post('/api/v1/auth/refresh').form({
      refresh_token: canonicalIssueBody.data.refreshToken,
      organization_id: secondaryOrg.id,
    })
    canonicalRefreshResponse.assertStatus(200)
    const canonicalRefreshBody = readTokenPairApiBody(canonicalRefreshResponse)

    assert.notProperty(canonicalRefreshBody, 'success')
    assert.equal(legacyRefreshBody.data.organizationId, secondaryOrg.id)
    assert.equal(canonicalRefreshBody.data.organizationId, secondaryOrg.id)
    assert.equal(canonicalRefreshBody.data.systemRole, owner.system_role)
    assert.isString(canonicalRefreshBody.data.accessToken)
    assert.isString(canonicalRefreshBody.data.refreshToken)
    assert.isNumber(canonicalRefreshBody.data.expiresIn)
    assert.isNumber(canonicalRefreshBody.data.refreshExpiresIn)
  })

  test('canonical v1 auth refresh validation errors use Problem Details contract', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/api/v1/auth/refresh').form({})

    response.assertStatus(422)
    assert.equal(response.header('content-type'), 'application/problem+json')

    const body = response.body() as {
      type: string
      title: string
      status: number
      detail: string
      code: string
      requestId: string
      correlationId: string
    }

    assert.equal(body.status, 422)
    assert.equal(body.detail, 'Refresh token is required')
    assert.equal(body.code, 'E_VALIDATION')
    assert.isString(body.requestId)
    assert.isString(body.correlationId)
  })

  test('canonical v1 auth refresh rejects invalid refresh token with Problem Details contract', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/api/v1/auth/refresh').form({
      refresh_token: `invalid-refresh-${Date.now()}`,
    })

    response.assertStatus(401)
    assert.equal(response.header('content-type'), 'application/problem+json')

    const body = response.body() as {
      status: number
      code: string
      detail: string
      requestId: string
      correlationId: string
    }

    assert.equal(body.status, 401)
    assert.equal(body.code, 'E_UNAUTHORIZED')
    assert.include(body.detail, 'Refresh token')
    assert.isString(body.requestId)
    assert.isString(body.correlationId)
  })

  test('refresh token rotation rejects reuse of the old refresh token', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const issueResponse = await client.post('/api/auth/token').loginAs(owner)
    issueResponse.assertStatus(200)
    const issueBody = readTokenPairApiBody(issueResponse)

    const firstRefreshResponse = await client.post('/api/auth/refresh').form({
      refresh_token: issueBody.data.refreshToken,
      organization_id: org.id,
    })
    firstRefreshResponse.assertStatus(200)

    const replayResponse = await client.post('/api/auth/refresh').form({
      refresh_token: issueBody.data.refreshToken,
      organization_id: org.id,
    })

    replayResponse.assertStatus(401)
    const replayBody = replayResponse.body() as {
      success?: boolean
      error?: {
        code?: string
        message?: string
      }
    }

    assert.equal(replayBody.success, false)
    assert.equal(replayBody.error?.code, 'E_UNAUTHORIZED')
    assert.include(replayBody.error?.message ?? '', 'Refresh token')
  })

  test('testing session bootstrap rejects missing and invalid access tokens', async ({
    assert,
    client,
  }) => {
    const missingResponse = await client.post('/api/testing/session/bootstrap')
    missingResponse.assertStatus(422)

    const missingBody = missingResponse.body() as {
      success?: boolean
      error?: {
        code?: string
        message?: string
      }
    }
    assert.equal(missingBody.success, false)
    assert.equal(missingBody.error?.code, 'E_VALIDATION')
    assert.equal(missingBody.error?.message, 'Access token is required')

    const invalidResponse = await client
      .post('/api/testing/session/bootstrap')
      .header('authorization', 'Bearer invalid-access-token')

    invalidResponse.assertStatus(401)

    const invalidBody = invalidResponse.body() as typeof missingBody
    assert.equal(invalidBody.success, false)
    assert.equal(invalidBody.error?.code, 'E_UNAUTHORIZED')
    assert.equal(invalidBody.error?.message, 'Access token is invalid or expired')
  })

  test('testing token login accepts camelCase compatibility inputs at boundary', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/api/testing/token-login').form({
      email: `camel-auth-${Date.now()}@test.example.com`,
      provider: 'google',
      systemRole: 'superadmin',
    })

    response.assertStatus(200)

    const body = readTokenPairApiBody(response)
    assert.equal(body.data.organizationId, null)
    assert.equal(body.data.systemRole, 'superadmin')
    assert.isString(body.data.accessToken)
    assert.isString(body.data.refreshToken)
  })
})
