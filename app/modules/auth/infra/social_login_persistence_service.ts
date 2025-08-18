import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UserOAuthProvider from '#modules/auth/infra/models/user_oauth_provider'
import UserOAuthProviderRepository from '#modules/auth/infra/repositories/user_oauth_provider_repository'
import * as AuthLogger from '#modules/logger/public_contracts/auth_logger'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export type SupportedProvider = 'google' | 'github'
export type SocialAuthenticatedUser = NonNullable<
  Awaited<ReturnType<typeof userPublicApi.findByEmail>>
>

export interface SocialLoginInput {
  provider: SupportedProvider
  socialId: string
  socialEmail: string
  nickName: string | null
  accessToken: string
  refreshToken: string | null
}

interface CreateSocialUserData {
  email: string
  username: string
  status: string
  system_role: string
  current_organization_id: null
  auth_method: SupportedProvider
}

const DEFAULT_SOCIAL_USER_SYSTEM_ROLE = 'registered_user'

export default class SocialLoginPersistenceService {
  async findLinkedUser(loginInput: SocialLoginInput): Promise<SocialAuthenticatedUser | null> {
    const oauthProvider = await this.findOauthProvider(loginInput)
    if (!oauthProvider) {
      return null
    }

    const user = await userPublicApi.findById(oauthProvider.user_id)
    if (!user) {
      return null
    }

    await this.updateLinkedProviderTokens(loginInput, oauthProvider, user.id)
    return user
  }

  async linkExistingUserByEmail(
    loginInput: SocialLoginInput,
    trx: TransactionClientContract
  ): Promise<SocialAuthenticatedUser | null> {
    const existingUser = await userPublicApi.findByEmail(loginInput.socialEmail, trx)
    AuthLogger.dbTransaction('find-user-by-email', true, {
      email: loginInput.socialEmail,
      found: !!existingUser,
    })

    if (!existingUser) {
      return null
    }

    await this.linkOauthProviderToExistingUser(existingUser, loginInput, trx)
    await this.syncExistingUserAuthMethod(existingUser, loginInput.provider, trx)

    return existingUser
  }

  async registerNewUser(
    loginInput: SocialLoginInput,
    trx: TransactionClientContract
  ): Promise<SocialAuthenticatedUser> {
    AuthLogger.dbTransaction('create-new-user-start', true, {
      provider: loginInput.provider,
      email: loginInput.socialEmail,
    })

    AuthLogger.dbTransaction('found-defaults', true, {
      systemRole: DEFAULT_SOCIAL_USER_SYSTEM_ROLE,
    })

    try {
      const newUser = await userPublicApi.createSocialLoginUser(
        { ...this.buildNewUserData(loginInput, DEFAULT_SOCIAL_USER_SYSTEM_ROLE) },
        trx
      )
      AuthLogger.userCreated(newUser.id, loginInput.provider, newUser.email ?? '')

      await this.createOauthProviderRecord(newUser.id, loginInput, trx)

      AuthLogger.dbTransaction('create-user-complete', true, { userId: newUser.id })
      return newUser
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'create-user-record')
      throw error
    }
  }

  private async findOauthProvider(loginInput: SocialLoginInput): Promise<UserOAuthProvider | null> {
    try {
      const oauthProvider = await UserOAuthProviderRepository.findByProviderAndProviderId(
        loginInput.provider,
        loginInput.socialId
      )
      AuthLogger.oauthProviderLookup(loginInput.provider, loginInput.socialId, !!oauthProvider)
      return oauthProvider
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'provider-lookup')
      return null
    }
  }

  private async updateLinkedProviderTokens(
    loginInput: SocialLoginInput,
    oauthProvider: UserOAuthProvider,
    userId: SocialAuthenticatedUser['id']
  ): Promise<void> {
    try {
      oauthProvider.access_token = loginInput.accessToken
      oauthProvider.refresh_token = loginInput.refreshToken
      await UserOAuthProviderRepository.save(oauthProvider)
      AuthLogger.dbTransaction('update-oauth-tokens', true, { userId })
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'update-tokens')
    }
  }

  private async linkOauthProviderToExistingUser(
    user: SocialAuthenticatedUser,
    loginInput: SocialLoginInput,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      await UserOAuthProviderRepository.create(
        {
          user_id: user.id,
          provider: loginInput.provider,
          provider_id: loginInput.socialId,
          email: loginInput.socialEmail,
          access_token: loginInput.accessToken,
          refresh_token: loginInput.refreshToken,
        },
        trx
      )
      AuthLogger.dbTransaction('link-oauth-provider', true, {
        userId: user.id,
        provider: loginInput.provider,
      })
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'link-oauth-provider')
      if (!this.isPgErrorCode(error, '42P01')) {
        throw error
      }
    }
  }

  private async syncExistingUserAuthMethod(
    user: SocialAuthenticatedUser,
    provider: SupportedProvider,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      if (user.auth_method !== provider) {
        await userPublicApi.updateAuthMethod(user, provider, trx)
      }
    } catch (error: unknown) {
      AuthLogger.oauthError(provider, error, 'sync-auth-method')
      if (!this.isPgErrorCode(error, '42703')) {
        throw error
      }
    }
  }

  private buildNewUserData(
    loginInput: SocialLoginInput,
    systemRole: string
  ): CreateSocialUserData {
    return {
      email: loginInput.socialEmail,
      username: this.generateUsername(loginInput),
      status: 'active',
      system_role: systemRole,
      current_organization_id: null,
      auth_method: loginInput.provider,
    }
  }

  private generateUsername(loginInput: SocialLoginInput): string {
    return (loginInput.nickName ?? loginInput.socialEmail.split('@')[0]) ?? `user_${Date.now()}`
  }

  private async createOauthProviderRecord(
    userId: SocialAuthenticatedUser['id'],
    loginInput: SocialLoginInput,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      await UserOAuthProviderRepository.create(
        {
          user_id: userId,
          provider: loginInput.provider,
          provider_id: loginInput.socialId,
          email: loginInput.socialEmail,
          access_token: loginInput.accessToken,
          refresh_token: loginInput.refreshToken,
        },
        trx
      )
      AuthLogger.dbTransaction('create-oauth-provider', true, {
        userId,
        provider: loginInput.provider,
      })
    } catch (error: unknown) {
      AuthLogger.oauthError(loginInput.provider, error, 'create-oauth-provider')
      if (!this.isPgErrorCode(error, '42P01')) {
        throw error
      }
    }
  }

  private isPgErrorCode(error: unknown, expectedCode: string): boolean {
    const dbError = error as { code?: string }
    return dbError.code === expectedCode
  }
}
