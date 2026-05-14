import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  authOrganizationMembershipReader,
  authSystemAccessReader,
  socialLoginCommand,
  socialLoginIdentityPersistence,
} from '#composition/auth/session/auth_application_composition'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import SocialLoginCommand from '#modules/auth/actions/commands/social-auth/social_login_command'
import type { SocialLoginIdentityPersistence } from '#modules/auth/actions/ports/outbound/social-auth/social_login_identity_persistence'
import LucidSocialLoginPersistenceAdapter from '#modules/auth/infra/adapters/social-auth/lucid_social_login_persistence_adapter'
import UserOAuthProvider from '#modules/auth/infra/models/social-auth/user_oauth_provider'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'
import User from '#modules/users/infra/models/profile/user'
import {
  AuthMethod,
  SystemRoleName,
  UserStatusName,
} from '#modules/users/public_contracts/user_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testEmail } from '#tests/helpers/test_utils'

test.group('Integration | Social Login', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('missing provider email is rejected without creating a user or provider link', async ({
    assert,
  }) => {
    const command = socialLoginCommand
    const usersBefore = await User.query().where('email', '').count('* as total')
    const providersBefore = await UserOAuthProvider.query().where('email', '').count('* as total')

    await assert.rejects(() =>
      command.execute('google', {
        id: `google-missing-email-${Date.now()}`,
        email: '',
        name: 'Missing Email User',
        nickName: 'missing-email-user',
        token: 'google-access-token',
        refreshToken: 'google-refresh-token',
      })
    )

    const usersAfter = await User.query().where('email', '').count('* as total')
    const providersAfter = await UserOAuthProvider.query().where('email', '').count('* as total')

    assert.equal(
      Number(usersAfter[0]?.$extras['total'] ?? 0),
      Number(usersBefore[0]?.$extras['total'] ?? 0)
    )
    assert.equal(
      Number(providersAfter[0]?.$extras['total'] ?? 0),
      Number(providersBefore[0]?.$extras['total'] ?? 0)
    )
  })

  test('new provider user creates one active user, one provider link, and organization landing', async ({
    assert,
  }) => {
    const command = socialLoginCommand
    const email = testEmail('oauth_new_google_user')
    const socialId = `google-new-${Date.now()}`

    const result = await command.execute(AuthMethod.GOOGLE, {
      id: socialId,
      email,
      name: 'New Google User',
      nickName: 'new-google-user',
      token: 'google-access-token',
      refreshToken: 'google-refresh-token',
    })

    const users = await User.query().where('email', email)
    const oauthRows = await UserOAuthProvider.query()
      .where('provider', AuthMethod.GOOGLE)
      .where('provider_id', socialId)

    assert.isTrue(result.isNewUser)
    assert.equal(result.redirectTo, '/organizations')
    assert.equal(users.length, 1)
    assert.equal(result.user.id, users[0]?.id)
    assert.equal(users[0]?.email, email)
    assert.equal(users[0]?.username, 'new-google-user')
    assert.equal(users[0]?.status, UserStatusName.ACTIVE)
    assert.equal(users[0]?.system_role, SystemRoleName.REGISTERED_USER)
    assert.equal(users[0]?.auth_method, AuthMethod.GOOGLE)
    assert.isNull(users[0]?.current_organization_id)

    assert.equal(oauthRows.length, 1)
    assert.equal(oauthRows[0]?.user_id, users[0]?.id)
    assert.equal(oauthRows[0]?.email, email)
    assert.isNull(oauthRows[0]?.access_token)
    assert.isNull(oauthRows[0]?.refresh_token)
  })

  test('existing provider login clears previously persisted OAuth credentials', async ({ assert }) => {
    const email = testEmail('oauth_clear_legacy_tokens')
    const socialId = `github-clear-${Date.now()}`
    const user = await UserFactory.create({ email, auth_method: 'github' })

    await UserOAuthProvider.create({
      user_id: user.id,
      provider: 'github',
      provider_id: socialId,
      email,
      access_token: 'legacy-access-token',
      refresh_token: 'legacy-refresh-token',
    })

    await socialLoginCommand.execute('github', {
      id: socialId,
      email,
      name: 'Clear Legacy OAuth Tokens',
      nickName: 'clear-legacy-oauth-tokens',
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })

    const oauthProvider = await UserOAuthProvider.query()
      .where('provider', 'github')
      .where('provider_id', socialId)
      .firstOrFail()

    assert.isNull(oauthProvider.access_token)
    assert.isNull(oauthProvider.refresh_token)
  })

  test('concurrent requests with the same provider identity are deduplicated', async ({
    assert,
  }) => {
    const command = socialLoginCommand
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
    const command = socialLoginCommand

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
    const auditEvents = (await db
      .from('audit_events')
      .where('event_name', 'auth.oauth_provider.linked')
      .where('target_id', existingUser.id)
      .select('user_id', 'old_values', 'new_values', 'ip_address', 'user_agent')) as {
      user_id: string
      old_values: Record<string, unknown>
      new_values: Record<string, unknown>
      ip_address: string | null
      user_agent: string | null
    }[]

    assert.equal(result.user.id, existingUser.id)
    assert.isFalse(result.isNewUser)
    assert.equal(refreshedUser.auth_method, 'github')
    assert.equal(oauthRows.length, 1)
    assert.equal(oauthRows[0]?.email, email)
    assert.lengthOf(auditEvents, 1)
    assert.equal(auditEvents[0]?.user_id, existingUser.id)
    assert.deepEqual(auditEvents[0]?.old_values, {})
    assert.deepEqual(auditEvents[0]?.new_values, { method: 'github' })
    assert.notInclude(JSON.stringify(auditEvents), email)
    assert.notInclude(JSON.stringify(auditEvents), 'github-access-token')
    assert.notInclude(JSON.stringify(auditEvents), 'github-refresh-token')

    const users = await User.query().where('email', email)
    assert.equal(users.length, 1)
  })

  test('existing organization member redirects to user dashboard', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const email = testEmail('oauth_existing_member_redirect')
    const member = await UserFactory.create({
      email,
      auth_method: 'google',
      current_organization_id: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const result = await socialLoginCommand.execute('github', {
      id: `github-member-${Date.now()}`,
      email,
      name: 'Existing Member',
      nickName: 'existing-member',
      token: 'github-access-token',
      refreshToken: 'github-refresh-token',
    })

    assert.isFalse(result.isNewUser)
    assert.equal(result.redirectTo, '/dashboard')
  })

  test('existing organization admin redirects to organization dashboard', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const email = testEmail('oauth_existing_admin_redirect')
    const admin = await UserFactory.create({
      email,
      auth_method: 'google',
      current_organization_id: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.APPROVED,
    })

    const result = await socialLoginCommand.execute('github', {
      id: `github-admin-${Date.now()}`,
      email,
      name: 'Existing Admin',
      nickName: 'existing-admin',
      token: 'github-access-token',
      refreshToken: 'github-refresh-token',
    })

    assert.isFalse(result.isNewUser)
    assert.equal(result.redirectTo, '/org')
  })

  test('existing user without approved organization redirects to organization discovery', async ({
    assert,
  }) => {
    const email = testEmail('oauth_existing_no_org_redirect')
    await UserFactory.create({
      email,
      auth_method: 'google',
      current_organization_id: null,
    })

    const result = await socialLoginCommand.execute('github', {
      id: `github-no-org-${Date.now()}`,
      email,
      name: 'Existing No Org',
      nickName: 'existing-no-org',
      token: 'github-access-token',
      refreshToken: 'github-refresh-token',
    })

    assert.isFalse(result.isNewUser)
    assert.equal(result.redirectTo, '/organizations')
  })

  test('existing system admin redirects to admin shell', async ({ assert }) => {
    const email = testEmail('oauth_existing_system_admin_redirect')
    await UserFactory.create({
      email,
      auth_method: 'google',
      system_role: 'system_admin',
      current_organization_id: null,
    })

    const result = await socialLoginCommand.execute('github', {
      id: `github-system-admin-${Date.now()}`,
      email,
      name: 'Existing System Admin',
      nickName: 'existing-system-admin',
      token: 'github-access-token',
      refreshToken: 'github-refresh-token',
    })

    assert.isFalse(result.isNewUser)
    assert.equal(result.redirectTo, '/admin')
  })

  test('existing user with stale current organization redirects to organization discovery', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const email = testEmail('oauth_existing_stale_org_redirect')
    await UserFactory.create({
      email,
      auth_method: 'google',
      current_organization_id: org.id,
    })

    const result = await socialLoginCommand.execute('github', {
      id: `github-stale-org-${Date.now()}`,
      email,
      name: 'Existing Stale Org',
      nickName: 'existing-stale-org',
      token: 'github-access-token',
      refreshToken: 'github-refresh-token',
    })

    assert.isFalse(result.isNewUser)
    assert.equal(result.redirectTo, '/organizations')
  })

  test('existing user by email rolls back provider linking when auth_method sync fails', async ({
    assert,
  }) => {
    const email = testEmail('oauth_existing_email_rollback')
    const existingUser = await UserFactory.create({
      email,
      auth_method: 'google',
    })
    const syncFailure = Object.assign(new Error('sync auth method failed'), { code: 'XX999' })
    const failingIdentities: SocialLoginIdentityPersistence = {
      findById: (userId, trx) => socialLoginIdentityPersistence.findById(userId, trx),
      findByEmail: (userEmail, trx) =>
        socialLoginIdentityPersistence.findByEmail(userEmail, trx),
      create: (identity, trx) => socialLoginIdentityPersistence.create(identity, trx),
      synchronizeAuthMethod: () => Promise.reject(syncFailure),
    }
    const command = new SocialLoginCommand(
      new LucidSocialLoginPersistenceAdapter(failingIdentities),
      authSystemAccessReader,
      authOrganizationMembershipReader
    )

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

    const refreshedUser = await User.findOrFail(existingUser.id)
    const oauthRows = await UserOAuthProvider.query()
      .where('user_id', existingUser.id)
      .where('provider', 'github')

    assert.equal(refreshedUser.auth_method, 'google')
    assert.equal(oauthRows.length, 0)
  })

  test('existing user provider link rolls back when its critical audit evidence cannot be written', async ({
    assert,
  }) => {
    const email = testEmail('oauth_existing_email_audit_rollback')
    const existingUser = await UserFactory.create({
      email,
      auth_method: 'google',
    })
    const originalAuditWrite = auditPublicApi.write.bind(auditPublicApi)
    const auditFailure = new Error('critical OAuth audit write failed')

    auditPublicApi.write = () => Promise.reject(auditFailure)

    try {
      await assert.rejects(
        () =>
          socialLoginCommand.execute('github', {
            id: `github-audit-rollback-${Date.now()}`,
            email,
            name: 'Existing OAuth Audit Rollback User',
            nickName: 'existing-oauth-audit-rollback-user',
            token: 'github-access-token',
            refreshToken: 'github-refresh-token',
          }),
        'critical OAuth audit write failed'
      )
    } finally {
      auditPublicApi.write = originalAuditWrite
    }

    const refreshedUser = await User.findOrFail(existingUser.id)
    const oauthRows = await UserOAuthProvider.query()
      .where('user_id', existingUser.id)
      .where('provider', 'github')

    assert.equal(refreshedUser.auth_method, 'google')
    assert.lengthOf(oauthRows, 0)
  })
})
