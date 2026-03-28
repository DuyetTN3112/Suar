import { createHash } from 'node:crypto'

import redis from '@adonisjs/redis/services/main'
import { test } from '@japa/runner'

import OrganizationUser from '#modules/organizations/members/infra/models/organization_user'
import type User from '#modules/users/infra/models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
} from '#tests/helpers/factories'

interface TokenPairApiBody {
  data: {
    accessToken: string
    refreshToken: string
    organizationId: string | null
  }
}

function readTokenPairApiBody(response: { body(): unknown }) {
  return response.body() as TokenPairApiBody
}

async function expireRefreshToken(refreshToken: string) {
  const refreshKey = `auth:refresh:${createHash('sha256').update(refreshToken).digest('hex')}`
  await redis.expire(refreshKey, 1)
  await new Promise((resolve) => setTimeout(resolve, 1100))
}

async function issueTokenPair(
  client: {
    post(path: string): {
      loginAs(user: User): {
        form(
          data: Record<string, string>
        ): Promise<{ body(): unknown; assertStatus(status: number): void }>
      }
    }
  },
  user: User,
  organizationId: string
) {
  const response = await client.post('/api/auth/token').loginAs(user).form({
    organization_id: organizationId,
  })
  response.assertStatus(200)

  return readTokenPairApiBody(response).data
}

test.group('Integration | Auth Session Organization Boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('expired refresh token is rejected without issuing a new token pair', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const initialTokenPair = await issueTokenPair(client, owner, org.id)

    await expireRefreshToken(initialTokenPair.refreshToken)

    const response = await client.post('/api/auth/refresh').form({
      refresh_token: initialTokenPair.refreshToken,
      organization_id: org.id,
    })

    response.assertStatus(401)
    const body = response.body() as Record<string, unknown>
    assert.notProperty(body, 'data')
    assert.notInclude(JSON.stringify(body), org.id)
    assert.notInclude(JSON.stringify(body), owner.id)
    assert.notInclude(JSON.stringify(body), owner.email ?? '')
  })

  test('concurrent refresh with the same token creates one new token family at most', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const initialTokenPair = await issueTokenPair(client, owner, org.id)

    const [firstResponse, secondResponse] = await Promise.all([
      client.post('/api/auth/refresh').form({
        refresh_token: initialTokenPair.refreshToken,
        organization_id: org.id,
      }),
      client.post('/api/auth/refresh').form({
        refresh_token: initialTokenPair.refreshToken,
        organization_id: org.id,
      }),
    ])
    const responses = [firstResponse, secondResponse]
    const successfulResponses = responses.filter((response) => response.status() === 200)
    const rejectedResponses = responses.filter((response) => response.status() === 401)

    assert.lengthOf(successfulResponses, 1)
    assert.lengthOf(rejectedResponses, 1)

    const successfulResponse = successfulResponses[0]
    const rejectedResponse = rejectedResponses[0]
    if (!successfulResponse || !rejectedResponse) {
      throw new Error('Expected exactly one successful refresh and one rejected refresh')
    }

    const successBody = readTokenPairApiBody(successfulResponse)
    const rejectedBody = rejectedResponse.body() as Record<string, unknown>
    assert.equal(successBody.data.organizationId, org.id)
    assert.notEqual(successBody.data.refreshToken, initialTokenPair.refreshToken)
    assert.notProperty(rejectedBody, 'data')

    const staleRefreshReplay = await client.post('/api/auth/refresh').form({
      refresh_token: initialTokenPair.refreshToken,
      organization_id: org.id,
    })
    staleRefreshReplay.assertStatus(401)

    const meResponse = await client
      .get('/api/v1/me')
      .header('authorization', `Bearer ${successBody.data.accessToken}`)

    meResponse.assertStatus(200)
    const meBody = meResponse.body() as {
      data: {
        id: string
        currentOrganizationId: string | null
      }
    }
    assert.equal(meBody.data.id, owner.id)
    assert.equal(meBody.data.currentOrganizationId, org.id)
  })

  test('refresh token rejects switching into a pending organization and keeps original refresh token usable', async ({
    assert,
    client,
  }) => {
    const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
    const pendingOrg = await OrganizationFactory.create({
      name: 'Pending Refresh Org',
      slug: `pending-refresh-${Date.now()}`,
    })
    await OrganizationUserFactory.create({
      organization_id: pendingOrg.id,
      user_id: owner.id,
      org_role: 'org_member',
      status: 'pending',
    })
    const initialTokenPair = await issueTokenPair(client, owner, primaryOrg.id)

    const forbiddenRefresh = await client.post('/api/auth/refresh').form({
      refresh_token: initialTokenPair.refreshToken,
      organization_id: pendingOrg.id,
    })

    forbiddenRefresh.assertStatus(401)
    assert.notProperty(forbiddenRefresh.body() as Record<string, unknown>, 'data')
    assert.notInclude(JSON.stringify(forbiddenRefresh.body()), pendingOrg.id)

    const validRefresh = await client.post('/api/auth/refresh').form({
      refresh_token: initialTokenPair.refreshToken,
      organization_id: primaryOrg.id,
    })

    validRefresh.assertStatus(200)
    const validRefreshBody = readTokenPairApiBody(validRefresh)
    assert.equal(validRefreshBody.data.organizationId, primaryOrg.id)
    assert.notEqual(validRefreshBody.data.refreshToken, initialTokenPair.refreshToken)
  })

  test('refresh token rejects switching into a foreign organization and keeps original refresh token usable', async ({
    assert,
    client,
  }) => {
    const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
    const foreignOrg = await OrganizationFactory.create({
      name: 'Foreign Refresh Org',
      slug: `foreign-refresh-${Date.now()}`,
    })
    const initialTokenPair = await issueTokenPair(client, owner, primaryOrg.id)

    const forbiddenRefresh = await client.post('/api/auth/refresh').form({
      refresh_token: initialTokenPair.refreshToken,
      organization_id: foreignOrg.id,
    })

    forbiddenRefresh.assertStatus(401)
    assert.notProperty(forbiddenRefresh.body() as Record<string, unknown>, 'data')
    assert.notInclude(JSON.stringify(forbiddenRefresh.body()), foreignOrg.id)

    const validRefresh = await client.post('/api/auth/refresh').form({
      refresh_token: initialTokenPair.refreshToken,
      organization_id: primaryOrg.id,
    })

    validRefresh.assertStatus(200)
    const validRefreshBody = readTokenPairApiBody(validRefresh)
    assert.equal(validRefreshBody.data.organizationId, primaryOrg.id)
    assert.notEqual(validRefreshBody.data.refreshToken, initialTokenPair.refreshToken)
  })

  test('bearer token issued before membership removal is rejected without leaking scoped me data', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const initialTokenPair = await issueTokenPair(client, owner, org.id)

    await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', owner.id)
      .delete()

    const response = await client
      .get('/api/v1/me')
      .header('authorization', `Bearer ${initialTokenPair.accessToken}`)

    response.assertStatus(401)
    assert.notProperty(response.body() as Record<string, unknown>, 'data')
    assert.notInclude(JSON.stringify(response.body()), org.id)
    assert.notInclude(JSON.stringify(response.body()), owner.id)
    assert.notInclude(JSON.stringify(response.body()), owner.email ?? '')
  })
})
