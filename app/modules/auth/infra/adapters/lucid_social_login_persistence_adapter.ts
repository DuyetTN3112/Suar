import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  type AuthPersistenceTransaction,
  type SocialLoginIdentity,
  type SocialLoginIdentityPersistence,
} from '#modules/auth/actions/ports/outbound/social_login_identity_persistence'
import { SocialLoginPersistence } from '#modules/auth/actions/ports/outbound/social_login_persistence'
import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social_auth_provider'
import type { SocialLoginIdentity as NormalizedSocialLoginIdentity } from '#modules/auth/domain/social_login_identity'
import type UserOAuthProvider from '#modules/auth/infra/models/user_oauth_provider'
import UserOAuthProviderRepository from '#modules/auth/infra/repositories/user_oauth_provider_repository'
import * as AuthLogger from '#modules/auth/observability/auth_logger'

export default class LucidSocialLoginPersistenceAdapter extends SocialLoginPersistence {
  constructor(
    private readonly identities: SocialLoginIdentityPersistence,
    private readonly transaction: <T>(
      callback: (trx: TransactionClientContract) => Promise<T>
    ) => Promise<T> = (callback) => db.transaction(callback)
  ) {
    super()
  }

  async findLinkedUser(
    loginInput: NormalizedSocialLoginIdentity
  ): Promise<SocialLoginIdentity | null> {
    const oauthProvider = await this.findOauthProvider(loginInput)
    if (!oauthProvider) {
      return null
    }

    const user = await this.identities.findById(oauthProvider.user_id)
    if (!user) {
      return null
    }

    await this.clearLinkedProviderTokens(loginInput, oauthProvider, user.id)
    return user
  }

  async linkExistingUserByEmail(
    loginInput: NormalizedSocialLoginIdentity
  ): Promise<SocialLoginIdentity | null> {
    return this.transaction(async (trx) => {
      const persistenceTrx = this.toPersistenceTransaction(trx)
      const existingUser = await this.identities.findByEmail(loginInput.email, persistenceTrx)
      AuthLogger.dbTransaction('find-user-by-email', true, {
        email: loginInput.email,
        found: !!existingUser,
      })

      if (!existingUser) {
        return null
      }

      await this.linkOauthProviderToExistingUser(existingUser, loginInput, trx)
      await this.syncExistingUserAuthMethod(existingUser, loginInput.provider, persistenceTrx)
      const auditContext: AuditActionContext = {
        userId: existingUser.id,
        ip: '',
        userAgent: 'oauth',
        organizationId: null,
      }
      await auditPublicApi.write(
        auditContext,
        {
          user_id: existingUser.id,
          action: 'link_oauth_provider',
          event_name: 'auth.oauth_provider.linked',
          event_family: 'auth.security',
          module: 'auth',
          outcome: 'success',
          entity_type: 'user',
          entity_id: existingUser.id,
          target_type: 'user',
          target_id: existingUser.id,
          old_values: {},
          new_values: { method: loginInput.provider },
          retention_class: 'user_security_2y',
          critical: true,
        },
        trx
      )

      return existingUser
    })
  }

  async registerNewUser(loginInput: NormalizedSocialLoginIdentity): Promise<SocialLoginIdentity> {
    AuthLogger.dbTransaction('create-new-user-start', true, {
      provider: loginInput.provider,
      email: loginInput.email,
    })

    return this.transaction(async (trx) => {
      try {
        const newUser = await this.identities.create(
          {
            email: loginInput.email,
            username: loginInput.preferredUsername,
            auth_method: loginInput.provider,
          },
          this.toPersistenceTransaction(trx)
        )
        AuthLogger.userCreated(newUser.id, loginInput.provider, newUser.email ?? '')

        await this.createOauthProviderRecord(newUser.id, loginInput, trx)

        AuthLogger.dbTransaction('create-user-complete', true, { userId: newUser.id })
        return newUser
      } catch (error: unknown) {
        AuthLogger.oauthError(loginInput.provider, error, 'create-user-record')
        throw error
      }
    })
  }

  private async findOauthProvider(
    loginInput: NormalizedSocialLoginIdentity
  ): Promise<UserOAuthProvider | null> {
    try {
      const oauthProvider = await UserOAuthProviderRepository.findByProviderAndProviderId(
        loginInput.provider,
        loginInput.socialId
      )
      AuthLogger.oauthProviderLookup(loginInput.provider, loginInput.socialId, !!oauthProvider)
      return oauthProvider
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'provider-lookup')
      throw error
    }
  }

  private async clearLinkedProviderTokens(
    loginInput: NormalizedSocialLoginIdentity,
    oauthProvider: UserOAuthProvider,
    userId: SocialLoginIdentity['id']
  ): Promise<void> {
    if (oauthProvider.access_token === null && oauthProvider.refresh_token === null) {
      return
    }

    try {
      oauthProvider.access_token = null
      oauthProvider.refresh_token = null
      await UserOAuthProviderRepository.save(oauthProvider)
      AuthLogger.dbTransaction('clear-oauth-tokens', true, { userId })
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'clear-tokens')
      throw error
    }
  }

  private async linkOauthProviderToExistingUser(
    user: SocialLoginIdentity,
    loginInput: NormalizedSocialLoginIdentity,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      await UserOAuthProviderRepository.create(
        {
          user_id: user.id,
          provider: loginInput.provider,
          provider_id: loginInput.socialId,
          email: loginInput.email,
          access_token: null,
          refresh_token: null,
        },
        trx
      )
      AuthLogger.dbTransaction('link-oauth-provider', true, {
        userId: user.id,
        provider: loginInput.provider,
      })
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'link-oauth-provider')
      throw error
    }
  }

  private async syncExistingUserAuthMethod(
    user: SocialLoginIdentity,
    provider: SupportedSocialAuthProvider,
    trx: AuthPersistenceTransaction
  ): Promise<void> {
    try {
      await this.identities.synchronizeAuthMethod(user.id, provider, trx)
    } catch (error: unknown) {
      AuthLogger.oauthError(provider, error, 'sync-auth-method')
      throw error
    }
  }

  private async createOauthProviderRecord(
    userId: SocialLoginIdentity['id'],
    loginInput: NormalizedSocialLoginIdentity,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      await UserOAuthProviderRepository.create(
        {
          user_id: userId,
          provider: loginInput.provider,
          provider_id: loginInput.socialId,
          email: loginInput.email,
          access_token: null,
          refresh_token: null,
        },
        trx
      )
      AuthLogger.dbTransaction('create-oauth-provider', true, {
        userId,
        provider: loginInput.provider,
      })
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'create-oauth-provider')
      throw error
    }
  }

  private toPersistenceTransaction(trx: TransactionClientContract): AuthPersistenceTransaction {
    return trx as unknown as AuthPersistenceTransaction
  }
}
