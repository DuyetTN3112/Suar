import { test } from '@japa/runner'

import { AuthLogger, type AuthLoggerSink } from '#modules/auth/observability/auth_logger'

test.group('Auth logger', () => {
  test('sanitizes OAuth user tokens before structured logging', ({ assert }) => {
    const events: Array<{ message: string; details?: unknown }> = []
    const authLogger = new AuthLogger({
      sink: createAuthLoggerSink({
        debug: (message, details) => events.push({ message, details }),
      }),
    })

    authLogger.oauthUserReceived('google', {
      id: 'social-1',
      email: 'user@example.com',
      token: { refreshToken: 'must-not-be-logged' },
    })

    assert.lengthOf(events, 1)
    assert.deepEqual(events[0]?.details, {
      hasProviderId: true,
      hasEmail: true,
      hasName: false,
      hasNickName: false,
      hasAvatar: false,
      hasToken: true,
      hasRefreshToken: true,
    })
    assert.notInclude(JSON.stringify(events), 'must-not-be-logged')
    assert.notInclude(JSON.stringify(events), 'social-1')
    assert.notInclude(JSON.stringify(events), 'user@example.com')
  })

  test('normalizes OAuth errors before writing structured logs', ({ assert }) => {
    const errors: Array<{ message: string; details?: unknown }> = []
    const authLogger = new AuthLogger({
      sink: createAuthLoggerSink({
        error: (message, details) => errors.push({ message, details }),
      }),
    })
    const error = Object.assign(new Error('OAuth callback failed'), { code: 'E_OAUTH' })

    authLogger.oauthError('github', error, 'callback')

    assert.lengthOf(errors, 1)
    assert.deepInclude(errors[0]?.details, {
      provider: 'github',
      stage: 'callback',
      error: 'OAuth callback failed',
      code: 'E_OAUTH',
    })
  })

  test('redacts secret-shaped OAuth diagnostics before writing the sink', ({ assert }) => {
    const errors: Array<{ message: string; details?: unknown }> = []
    const authLogger = new AuthLogger({
      sink: createAuthLoggerSink({
        error: (message, details) => errors.push({ message, details }),
      }),
    })

    authLogger.oauthError(
      'github',
      new Error('provider failed with token=oauth-secret-value'),
      'callback'
    )

    assert.notInclude(JSON.stringify(errors), 'oauth-secret-value')
    assert.include(JSON.stringify(errors), 'token=[REDACTED]')
  })

  test('does not log direct auth identity attributes in routine events', ({ assert }) => {
    const events: Array<{ message: string; details?: unknown }> = []
    const authLogger = new AuthLogger({
      sink: createAuthLoggerSink({
        debug: (message, details) => events.push({ message, details }),
        info: (message, details) => events.push({ message, details }),
        warn: (message, details) => events.push({ message, details }),
      }),
    })

    authLogger.oauthProviderLookup('google', 'provider-user-123', true)
    authLogger.userCreated('user-1', 'google', 'person@example.com')
    authLogger.userLogin('user-1', 'person@example.com', 'google')
    authLogger.loginAttempt('person@example.com', true, '203.0.113.10')
    authLogger.loginFailure(
      'person@example.com',
      'password=plaintext-value invalid for person@example.com'
    )

    const serialized = JSON.stringify(events)
    assert.notInclude(serialized, 'provider-user-123')
    assert.notInclude(serialized, 'person@example.com')
    assert.notInclude(serialized, '203.0.113.10')
    assert.notInclude(serialized, 'plaintext-value')
    assert.include(serialized, 'password=[REDACTED]')
  })

  test('writes each auth event to one sink exactly once', ({ assert }) => {
    const events: string[] = []
    const authLogger = new AuthLogger({
      sink: createAuthLoggerSink({
        debug: (message) => events.push(message),
      }),
    })

    authLogger.oauthRedirect('github', { referer: '/login' })

    assert.deepEqual(events, ['🔄 OAuth Redirect - Provider: github'])
  })
})

function createAuthLoggerSink(overrides: Partial<AuthLoggerSink>): AuthLoggerSink {
  const ignore = () => {}
  return {
    debug: ignore,
    info: ignore,
    warn: ignore,
    error: ignore,
    ...overrides,
  }
}
