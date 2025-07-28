import { test } from '@japa/runner'

import SocialLoginCommand from '#actions/auth/commands/social_login_command'
import User from '#infra/users/models/user'
import UserOAuthProvider from '#infra/users/models/user_oauth_provider'
import UserRepository from '#infra/users/repositories/user_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { testEmail } from '#tests/helpers/test_utils'

test.group('Integration | Social Login', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('concurrent requests with the same provider identity are deduplicated', async ({
    assert,
  }) => {
    const command = new SocialLoginCommand()
    const socialId = `google-${Date.now()}`
    const email = testEmail('oauth_race')

    const socialData = {
      id: socialId,
      email,
      name: 'OAuth Race User',
      nickName: 'oauth-race-user',
      token: 'access-token-1',
      refreshToken: 'refresh-token-1',
    }

    const attempts = 6
    const results = await Promise.all(
      Array.from({ length: attempts }, () => command.execute('google', socialData))
    )

    const distinctUserIds = new Set(results.map((result) => result.user.id))
    assert.equal(distinctUserIds.size, 1)

    const users = await User.query().where('email', email)
    assert.equal(users.length, 1)

    const oauthRows = await UserOAuthProvider.query()
      .where('provider', 'google')
      .where('provider_id', socialId)
    assert.equal(oauthRows.length, 1)
  })

  test('existing user by email links the provider atomically and keeps a single user record', async ({
    assert,
  }) => {
    const email = testEmail('oauth_existing_email')
    const existingUser = await UserFactory.create({
      email,
      auth_method: 'google',
    })
    const command = new SocialLoginCommand()

    const result = await command.execute('github', {
      id: `github-${Date.now()}`,
      email,
      name: 'Existing OAuth User',
      nickName: 'existing-oauth-user',
      token: 'github-access-token',
      refreshToken: 'github-refresh-token',
    })

    const refreshedUser = await User.findOrFail(existingUser.id)
    const oauthRows = await UserOAuthProvider.query()
      .where('user_id', existingUser.id)
      .where('provider', 'github')

    assert.equal(result.user.id, existingUser.id)
    assert.isFalse(result.isNewUser)
    assert.equal(refreshedUser.auth_method, 'github')
    assert.equal(oauthRows.length, 1)
    assert.equal(oauthRows[0]?.email, email)

    const users = await User.query().where('email', email)
    assert.equal(users.length, 1)
  })

  test('existing user by email rolls back provider linking when auth_method sync fails', async ({
    assert,
  }) => {
    const email = testEmail('oauth_existing_email_rollback')
    const existingUser = await UserFactory.create({
      email,
      auth_method: 'google',
    })
    const originalSave = UserRepository.save
    const syncFailure = Object.assign(new Error('sync auth method failed'), { code: 'XX999' })

    UserRepository.save = () => {
      throw syncFailure
    }

    try {
      const command = new SocialLoginCommand()

      await assert.rejects(
        () =>
          command.execute('github', {
            id: `github-${Date.now()}`,
            email,
            name: 'Existing OAuth User',
            nickName: 'existing-oauth-user',
            token: 'github-access-token',
            refreshToken: 'github-refresh-token',
          }),
        'sync auth method failed'
      )
    } finally {
      UserRepository.save = originalSave
    }

    const refreshedUser = await User.findOrFail(existingUser.id)
    const oauthRows = await UserOAuthProvider.query()
      .where('user_id', existingUser.id)
      .where('provider', 'github')

    assert.equal(refreshedUser.auth_method, 'google')
    assert.equal(oauthRows.length, 0)
  })
})
