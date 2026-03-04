import { test } from '@japa/runner'

import type { SocialAuthCallbackSource } from '#modules/auth/actions/dtos/request/social_auth_callback_source'
import { SOCIAL_AUTH_FAILURE_CODES } from '#modules/auth/actions/ports/outbound/social_auth_callback_reader'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthFailureEventError,
} from '#modules/auth/controllers/mappers/response/social_auth_response_mapper'
import SocialAuthCallbackReaderAdapter from '#modules/auth/infra/oauth/social_auth_callback_reader_adapter'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'

function fakeDriver(overrides: Partial<SocialAuthCallbackSource> = {}): SocialAuthCallbackSource {
  return {
    accessDenied: () => false,
    stateMisMatch: () => false,
    hasError: () => false,
    getError: () => null,
    user: () =>
      Promise.resolve({
        id: 'oauth-1',
        email: 'oauth@example.com',
        name: 'OAuth User',
        nickName: 'oauth-user',
        token: {
          token: 'access-token',
          refreshToken: 'refresh-token',
        },
      }),
    ...overrides,
  }
}

test.group('SocialAuthCallbackReaderAdapter', () => {
  test('returns transport failures before fetching user payload', async ({ assert }) => {
    const reader = new SocialAuthCallbackReaderAdapter()
    let userWasCalled = false

    const result = await reader.readCallback(
      'google',
      fakeDriver({
        accessDenied: () => true,
        user: () => {
          userWasCalled = true
          return Promise.resolve({})
        },
      })
    )

    assert.deepEqual(result, {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.ACCESS_DENIED,
      safeMessage: 'Truy cập bị từ chối',
    })
    assert.isFalse(userWasCalled)
  })

  test('keeps provider transport diagnostics out of the public failure contract', async ({
    assert,
  }) => {
    const reader = new SocialAuthCallbackReaderAdapter()
    const providerSecret = 'oauth-client-secret-value'

    const result = await reader.readCallback(
      'github',
      fakeDriver({
        hasError: () => true,
        getError: () => new Error(`provider transport failed with client_secret=${providerSecret}`),
      })
    )

    assert.deepEqual(result, {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    })
    if (result.type !== 'error') {
      assert.fail('Expected a public OAuth failure')
      return
    }

    const publicBoundaryPayload = {
      redirect: mapSocialAuthErrorRedirect(result),
      eventError: mapSocialAuthFailureEventError(result),
    }
    assert.notInclude(JSON.stringify({ result, publicBoundaryPayload }), providerSecret)
    assert.deepEqual(publicBoundaryPayload, {
      redirect: {
        path: '/login',
        query: {
          error: ErrorMessages.SERVICE_UNAVAILABLE,
          error_code: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
        },
      },
      eventError: {
        class: 'SocialAuthCallbackError',
        code: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
        message: ErrorMessages.SERVICE_UNAVAILABLE,
      },
    })
  })

  test('normalizes successful callback payload into social login input', async ({ assert }) => {
    const reader = new SocialAuthCallbackReaderAdapter()

    const result = await reader.readCallback(
      'github',
      fakeDriver({
        user: () =>
          Promise.resolve({
            id: 42,
            email: 'oauth@example.com',
            name: ' OAuth User ',
            nickName: 'oauth-user',
            token: {
              token: 'access-token',
              refreshToken: 'refresh-token',
            },
          }),
      })
    )

    assert.deepEqual(result, {
      type: 'success',
      socialUser: {
        id: '42',
        email: 'oauth@example.com',
        name: ' OAuth User ',
        nickName: 'oauth-user',
        token: 'access-token',
        refreshToken: 'refresh-token',
      },
    })
  })

  test('normalizes GitHub callback payloads with flat token fields', async ({ assert }) => {
    const reader = new SocialAuthCallbackReaderAdapter()

    const result = await reader.readCallback(
      'github',
      fakeDriver({
        user: () =>
          Promise.resolve({
            id: 'github-42',
            email: 'github@example.com',
            name: 'GitHub User',
            nickName: 'github-user',
            accessToken: 'flat-access-token',
            refreshToken: 'flat-refresh-token',
          }),
      })
    )

    assert.deepEqual(result, {
      type: 'success',
      socialUser: {
        id: 'github-42',
        email: 'github@example.com',
        name: 'GitHub User',
        nickName: 'github-user',
        token: 'flat-access-token',
        refreshToken: 'flat-refresh-token',
      },
    })
  })

  test('returns a validation error when provider payload has no email', async ({ assert }) => {
    const reader = new SocialAuthCallbackReaderAdapter()

    const result = await reader.readCallback(
      'google',
      fakeDriver({
        user: () =>
          Promise.resolve({
            id: 'oauth-1',
            email: null,
            name: 'OAuth User',
            nickName: 'oauth-user',
            token: {
              token: 'access-token',
            },
          }),
      })
    )

    assert.deepEqual(result, {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.EMAIL_UNAVAILABLE,
      safeMessage: 'Email không được cung cấp từ nhà cung cấp',
    })
  })

  test('classifies a non-object provider payload as a dependency failure', async ({ assert }) => {
    const reader = new SocialAuthCallbackReaderAdapter()

    const result = await reader.readCallback(
      'google',
      fakeDriver({
        user: () => Promise.resolve(null),
      })
    )

    assert.deepEqual(result, {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    })
  })

  test('bounds a stalled provider request and returns a safe dependency failure', async ({
    assert,
  }) => {
    const reader = new SocialAuthCallbackReaderAdapter({ userTimeoutMs: 5 })
    const result = await reader.readCallback(
      'github',
      fakeDriver({
        user: () => new Promise<never>(() => {}),
      })
    )

    assert.deepEqual(result, {
      type: 'error',
      publicCode: SOCIAL_AUTH_FAILURE_CODES.PROVIDER_FAILURE,
      safeMessage: ErrorMessages.SERVICE_UNAVAILABLE,
    })
  })
})
