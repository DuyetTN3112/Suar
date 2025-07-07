import { test } from '@japa/runner'
import BusinessLogicException from '#exceptions/business_logic_exception'
import SocialAuthProviderService, {
  type SocialAuthDriver,
} from '#infra/oauth/social_auth_provider_service'

function fakeDriver(overrides: Partial<SocialAuthDriver> = {}): SocialAuthDriver {
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

test.group('SocialAuthProviderService', () => {
  test('returns transport failures before fetching user payload', async ({ assert }) => {
    const service = new SocialAuthProviderService()
    let userWasCalled = false

    const result = await service.readCallback(
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
      errorMessage: 'Truy cập bị từ chối',
    })
    assert.isFalse(userWasCalled)
  })

  test('normalizes successful callback payload into social login input', async ({ assert }) => {
    const service = new SocialAuthProviderService()

    const result = await service.readCallback(
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

  test('returns a validation error when provider payload has no email', async ({ assert }) => {
    const service = new SocialAuthProviderService()

    const result = await service.readCallback(
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
      errorMessage: 'Email không được cung cấp từ nhà cung cấp',
    })
  })

  test('throws invalid input when provider returns a non-object payload', async ({ assert }) => {
    const service = new SocialAuthProviderService()

    await assert.rejects(
      () =>
        service.readCallback(
          'google',
          fakeDriver({
            user: () => Promise.resolve(null),
          })
        ),
      BusinessLogicException
    )
  })
})
