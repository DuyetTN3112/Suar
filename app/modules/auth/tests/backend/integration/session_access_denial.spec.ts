import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import type User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

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

async function issueAccessToken(
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
  const issueResponse = await client.post('/api/auth/token').loginAs(user).form({
    organization_id: organizationId,
  })
  issueResponse.assertStatus(200)

  return readTokenPairApiBody(issueResponse).data.accessToken
}

test.group('Integration | Auth Inactive Credential Denial', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('browser session for suspended user is rejected without rendering protected task UI', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    await owner.merge({ status: 'suspended' }).save()

    const response = await client.get('/tasks').loginAs(owner)

    response.assertStatus(401)
    assert.notInclude(response.text(), 'tasks/index')
    assert.notInclude(response.text(), owner.id)
    assert.notInclude(response.text(), owner.email ?? '')
  })

  test('browser session for deactivated user is rejected before SSE can reconnect', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    await owner.merge({ status: 'inactive' }).save()

    const response = await client.get('/tasks').loginAs(owner)

    response.assertStatus(401)
    assert.notInclude(response.text(), 'tasks/index')
    assert.notInclude(response.text(), owner.id)
  })

  test('browser session for deleted user is rejected without rendering protected task UI', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    await owner.merge({ deleted_at: DateTime.now() }).save()

    const response = await client.get('/tasks').loginAs(owner)

    response.assertStatus(401)
    assert.notInclude(response.text(), 'tasks/index')
    assert.notInclude(response.text(), owner.id)
    assert.notInclude(response.text(), owner.email ?? '')
  })

  test('bearer token issued before suspension is rejected and does not return me data', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const accessToken = await issueAccessToken(client, owner, org.id)

    await owner.merge({ status: 'suspended' }).save()

    const response = await client.get('/api/v1/me').header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(401)
    assert.notProperty(response.body() as Record<string, unknown>, 'data')
    assert.notInclude(JSON.stringify(response.body()), owner.id)
    assert.notInclude(JSON.stringify(response.body()), owner.email ?? '')
  })

  test('bearer token issued before deletion is rejected and does not return me data', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const accessToken = await issueAccessToken(client, owner, org.id)

    await owner.merge({ deleted_at: DateTime.now() }).save()

    const response = await client.get('/api/v1/me').header('authorization', `Bearer ${accessToken}`)

    response.assertStatus(401)
    assert.notProperty(response.body() as Record<string, unknown>, 'data')
    assert.notInclude(JSON.stringify(response.body()), owner.id)
    assert.notInclude(JSON.stringify(response.body()), owner.email ?? '')
  })
})
