import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import {
  type SocialLoginIdentity,
  type SocialLoginIdentityPersistence,
} from '#modules/auth/actions/ports/outbound/social-auth/social_login_identity_persistence'
import type { SocialLoginIdentity as NormalizedSocialLoginIdentity } from '#modules/auth/domain/social-auth/social_login_identity'
import LucidSocialLoginPersistenceAdapter from '#modules/auth/infra/adapters/social-auth/lucid_social_login_persistence_adapter'
import UserOAuthProvider from '#modules/auth/infra/models/social-auth/user_oauth_provider'
import UserOAuthProviderRepository from '#modules/auth/infra/repositories/social-auth/user_oauth_provider_repository'

const loginInput: NormalizedSocialLoginIdentity = {
  provider: 'google',
  socialId: 'provider-user-1',
  email: 'provider-user@example.com',
  preferredUsername: 'provider-user',
}

function makeTransactionPlaceholder(): TransactionClientContract {
  return {} as unknown as TransactionClientContract
}

function identity(overrides: Partial<SocialLoginIdentity> = {}): SocialLoginIdentity {
  return {
    id: 'user-1',
    email: loginInput.email,
    system_role: 'registered_user',
    current_organization_id: null,
    auth_method: 'google',
    ...overrides,
  }
}

function identityPersistence(
  overrides: Partial<SocialLoginIdentityPersistence> = {}
): SocialLoginIdentityPersistence {
  return {
    findById: () => Promise.resolve(null),
    findByEmail: () => Promise.resolve(null),
    create: () => Promise.reject(new Error('Unexpected identity creation')),
    synchronizeAuthMethod: () => Promise.resolve(),
    ...overrides,
  }
}

test.group('LucidSocialLoginPersistenceAdapter', () => {
  test('propagates provider lookup failures instead of treating them as an unlinked identity', async ({
    assert,
    cleanup,
  }) => {
    const originalLookup = UserOAuthProviderRepository.findByProviderAndProviderId.bind(
      UserOAuthProviderRepository
    )
    const dependencyFailure = new Error('oauth provider repository unavailable')

    UserOAuthProviderRepository.findByProviderAndProviderId = () =>
      Promise.reject(dependencyFailure)
    cleanup(() => {
      UserOAuthProviderRepository.findByProviderAndProviderId = originalLookup
    })

    await assert.rejects(
      () =>
        new LucidSocialLoginPersistenceAdapter(identityPersistence()).findLinkedUser(loginInput),
      /oauth provider repository unavailable/
    )
  })

  test('fails closed when persisted provider tokens cannot be cleared', async ({
    assert,
    cleanup,
  }) => {
    const originalLookup = UserOAuthProviderRepository.findByProviderAndProviderId.bind(
      UserOAuthProviderRepository
    )
    const originalSave = UserOAuthProviderRepository.save.bind(UserOAuthProviderRepository)
    const dependencyFailure = new Error('oauth token cleanup unavailable')
    const providerRecord = new UserOAuthProvider()
    providerRecord.user_id = 'user-1'
    providerRecord.access_token = 'legacy-access-token'
    providerRecord.refresh_token = 'legacy-refresh-token'
    UserOAuthProviderRepository.findByProviderAndProviderId = () => Promise.resolve(providerRecord)
    UserOAuthProviderRepository.save = () => Promise.reject(dependencyFailure)
    cleanup(() => {
      UserOAuthProviderRepository.findByProviderAndProviderId = originalLookup
      UserOAuthProviderRepository.save = originalSave
    })

    await assert.rejects(
      () =>
        new LucidSocialLoginPersistenceAdapter(
          identityPersistence({ findById: () => Promise.resolve(identity()) })
        ).findLinkedUser(loginInput),
      /oauth token cleanup unavailable/
    )
  })

  test('does not create a partially linked account when the OAuth table is unavailable', async ({
    assert,
    cleanup,
  }) => {
    const originalCreateProvider = UserOAuthProviderRepository.create.bind(
      UserOAuthProviderRepository
    )
    const missingTableError = Object.assign(new Error('oauth provider table unavailable'), {
      code: '42P01',
    })
    const trx = makeTransactionPlaceholder()

    UserOAuthProviderRepository.create = () => Promise.reject(missingTableError)
    cleanup(() => {
      UserOAuthProviderRepository.create = originalCreateProvider
    })

    await assert.rejects(
      () =>
        new LucidSocialLoginPersistenceAdapter(
          identityPersistence({
            create: () => Promise.resolve(identity({ id: 'user-2' })),
          }),
          (callback) => callback(trx)
        ).registerNewUser(loginInput),
      /oauth provider table unavailable/
    )
  })
})
