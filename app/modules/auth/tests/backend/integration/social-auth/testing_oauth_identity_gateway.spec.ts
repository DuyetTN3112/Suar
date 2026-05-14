import { test } from '@japa/runner'

import { TestingOAuthIdentityGateway } from '#modules/auth/infra/adapters/social-auth/testing_oauth_identity_gateway'
import UserOAuthProvider from '#modules/auth/infra/models/social-auth/user_oauth_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { testEmail } from '#tests/helpers/test_utils'

test.group('Integration | Testing OAuth identity gateway', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('concurrent ensures keep one credential-free identity per user and provider', async ({
    assert,
  }) => {
    const email = testEmail('testing_oauth_identity')
    const user = await UserFactory.create({ email, auth_method: 'google' })
    const gateway = new TestingOAuthIdentityGateway()

    await Promise.all(
      Array.from({ length: 6 }, () =>
        gateway.ensureTestingOAuthIdentityV1({
          userId: user.id,
          provider: 'google',
          providerId: `test-${user.id}`,
          email,
        })
      )
    )

    const rows = await UserOAuthProvider.query()
      .where('user_id', user.id)
      .where('provider', 'google')

    assert.lengthOf(rows, 1)
    assert.equal(rows[0]?.provider_id, `test-${user.id}`)
    assert.isNull(rows[0]?.access_token)
    assert.isNull(rows[0]?.refresh_token)
  })

  test('an existing identity is reused and legacy credentials are cleared', async ({ assert }) => {
    const email = testEmail('testing_oauth_existing')
    const user = await UserFactory.create({ email, auth_method: 'github' })
    const existing = await UserOAuthProvider.create({
      user_id: user.id,
      provider: 'github',
      provider_id: `existing-${user.id}`,
      email: 'stale@example.com',
      access_token: 'legacy-access-token',
      refresh_token: 'legacy-refresh-token',
    })

    await new TestingOAuthIdentityGateway().ensureTestingOAuthIdentityV1({
      userId: user.id,
      provider: 'github',
      providerId: `test-${user.id}`,
      email,
    })

    await existing.refresh()
    assert.equal(existing.email, email)
    assert.isNull(existing.access_token)
    assert.isNull(existing.refresh_token)
  })
})
