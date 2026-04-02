import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

const AUTH_IDENTITY_CONSUMERS = [
  'app/modules/auth/actions/commands/refresh_session_token_command.ts',
  'app/modules/auth/actions/commands/issue_session_token_command.ts',
  'app/modules/auth/actions/queries/verify_session_access_token_query.ts',
  'app/modules/auth/middleware/auth_middleware.ts',
  'app/modules/auth/controllers/session_token_controller.ts',
] as const

const AUTHORIZATION_IDENTITY_CONSUMERS = [
  {
    path: 'app/modules/authorization/actions/queries/authorize_system_user_admin_access_query.ts',
    port: '#modules/authorization/actions/ports/outbound/authorization_user_identity_reader',
  },
  {
    path: 'app/modules/authorization/actions/permission/cross_module_permission_checker.ts',
    port: '#modules/authorization/actions/ports/outbound/authorization_organization_access_reader',
  },
] as const

test.group('User identity consumer boundaries', () => {
  test('Auth owns its session identity port and receives the Users implementation from composition', ({
    assert,
  }) => {
    for (const consumer of AUTH_IDENTITY_CONSUMERS) {
      const source = readFileSync(consumer, 'utf8')
      assert.notInclude(source, 'userPublicApi')
    }

    const sessionTokenQuery = readFileSync(
      'app/modules/auth/actions/queries/verify_session_access_token_query.ts',
      'utf8'
    )
    assert.notInclude(sessionTokenQuery, '#modules/users/')

    const port = readFileSync(
      'app/modules/auth/actions/ports/outbound/auth_session_identity_reader.ts',
      'utf8'
    )
    assert.notInclude(port, '#modules/users/')
    assert.notMatch(port, /\bUserModel\b|DateTime/)

    const adapter = readFileSync(
      'app/composition/adapters/auth_session_identity_reader_adapter.ts',
      'utf8'
    )
    assert.include(adapter, '#modules/auth/actions/ports/outbound/auth_session_identity_reader')
    assert.include(adapter, '#composition/adapters/composed_user_identity_reader')
  })

  test('Authorization owns its identity port and has no Users adapter inside the module', ({
    assert,
  }) => {
    for (const consumer of AUTHORIZATION_IDENTITY_CONSUMERS) {
      const source = readFileSync(consumer.path, 'utf8')
      assert.include(source, consumer.port)
      assert.notInclude(source, '#modules/users/')
      assert.notInclude(source, 'userPublicApi')
    }

    const port = readFileSync(
      'app/modules/authorization/actions/ports/outbound/authorization_user_identity_reader.ts',
      'utf8'
    )
    assert.notInclude(port, '#modules/users/')
    assert.notMatch(port, /\bUserModel\b|DateTime/)

    const adapter = readFileSync(
      'app/composition/adapters/authorization_user_identity_reader_adapter.ts',
      'utf8'
    )
    assert.include(
      adapter,
      '#modules/authorization/actions/ports/outbound/authorization_user_identity_reader'
    )
    assert.include(adapter, '#composition/adapters/composed_user_identity_reader')
    assert.isFalse(existsSync('app/modules/authorization/infra/adapters/user_identity_reader.ts'))
  })

  test('one outer provider binds both consumer ports and the session use cases', ({ assert }) => {
    const provider = readFileSync('app/composition/identity_consumer_ports_provider.ts', 'utf8')
    assert.include(provider, 'AuthSessionIdentityReader')
    assert.include(provider, 'AuthorizationUserIdentityReader')
    assert.include(provider, 'IssueSessionTokenCommand')
    assert.include(provider, 'VerifySessionAccessTokenQuery')
    assert.include(provider, 'configureAuthorizationUserIdentityReader')

    const adonisConfiguration = readFileSync('adonisrc.ts', 'utf8')
    assert.include(adonisConfiguration, '#composition/identity_consumer_ports_provider')
  })

  test('social login persists plain identity projections through an Auth-owned port', ({
    assert,
  }) => {
    const persistenceAdapter = readFileSync(
      'app/modules/auth/infra/adapters/lucid_social_login_persistence_adapter.ts',
      'utf8'
    )
    assert.include(
      persistenceAdapter,
      '#modules/auth/actions/ports/outbound/social_login_identity_persistence'
    )
    assert.notInclude(persistenceAdapter, '#modules/users/')
    assert.notInclude(persistenceAdapter, 'userPublicApi')

    const port = readFileSync(
      'app/modules/auth/actions/ports/outbound/social_login_identity_persistence.ts',
      'utf8'
    )
    assert.notInclude(port, '#modules/users/')
    assert.notMatch(port, /\bUserModel\b|DateTime/)

    const usersService = readFileSync(
      'app/composition/adapters/composed_user_social_login_identity_persistence.ts',
      'utf8'
    )
    assert.notInclude(usersService, '#modules/auth/')

    const adapter = readFileSync(
      'app/composition/adapters/social_login_identity_persistence_adapter.ts',
      'utf8'
    )
    assert.include(
      adapter,
      '#modules/auth/actions/ports/outbound/social_login_identity_persistence'
    )
    assert.include(adapter, '#composition/adapters/composed_user_social_login_identity_persistence')

    const userFacade = readFileSync('app/composition/adapters/composed_user_public_api.ts', 'utf8')
    assert.notMatch(userFacade, /createSocialLoginUser|updateAuthMethod/)
  })
})
