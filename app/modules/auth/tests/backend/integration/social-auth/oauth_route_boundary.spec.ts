import { test } from '@japa/runner'

import UserOAuthProvider from '#modules/auth/infra/models/social-auth/user_oauth_provider'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

async function countUsers() {
  const result = await User.query().count('* as count')
  return Number(result[0]?.$extras['count'] ?? 0)
}

async function countOAuthProviders() {
  const result = await UserOAuthProvider.query().count('* as count')
  return Number(result[0]?.$extras['count'] ?? 0)
}

test.group('Integration | OAuth Route Boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('supported redirect providers leave the app without user or provider writes', async ({
    assert,
    client,
  }) => {
    const providerRedirectTargets = [
      { provider: 'google', expectedLocation: 'accounts.google.com' },
      { provider: 'github', expectedLocation: 'github.com/login/oauth' },
    ]

    for (const { provider, expectedLocation } of providerRedirectTargets) {
      const usersBefore = await countUsers()
      const providersBefore = await countOAuthProviders()

      const response = await client.get(`/auth/${provider}/redirect`).redirects(0)

      response.assertStatus(302)
      assert.include(response.header('location') ?? '', expectedLocation)
      assert.equal(await countUsers(), usersBefore)
      assert.equal(await countOAuthProviders(), providersBefore)
    }
  })

  test('unsupported redirect provider returns controlled client error without user writes', async ({
    assert,
    client,
  }) => {
    const usersBefore = await countUsers()
    const providersBefore = await countOAuthProviders()

    const response = await client.get('/auth/password/redirect')

    response.assertStatus(400)
    assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    assert.notInclude(response.text(), '500')
    assert.notProperty(response.body() as Record<string, unknown>, 'data')
    assert.equal(await countUsers(), usersBefore)
    assert.equal(await countOAuthProviders(), providersBefore)
  })
})
