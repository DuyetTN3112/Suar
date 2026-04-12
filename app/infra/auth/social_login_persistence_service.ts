import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SystemRoleName } from '#constants/user_constants'
import UserOAuthProviderRepository from '#infra/users/repositories/user_oauth_provider_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import * as AuthLogger from '#libs/auth_logger'
import type User from '#models/user'
import type UserOAuthProvider from '#models/user_oauth_provider'

export type SupportedProvider = 'google' | 'github'

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

export default class SocialLoginPersistenceService {
  async findLinkedUser(loginInput: SocialLoginInput): Promise<User | null> {
    const oauthProvider = await this.findOauthProvider(loginInput)
    if (!oauthProvider) {
      return null
    }

    const user = await UserRepository.findById(oauthProvider.user_id)
    if (!user) {
      return null
    }

    await this.updateLinkedProviderTokens(loginInput, oauthProvider, user.id)
    return user
  }

  async linkExistingUserByEmail(
    loginInput: SocialLoginInput,
    trx: TransactionClientContract
  ): Promise<User | null> {
    const existingUser = await UserRepository.findByEmail(loginInput.socialEmail, trx)
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
  ): Promise<User> {
    AuthLogger.dbTransaction('create-new-user-start', true, {
      provider: loginInput.provider,
      email: loginInput.socialEmail,
    })

    const defaultSystemRole = SystemRoleName.REGISTERED_USER
    AuthLogger.dbTransaction('found-defaults', true, { systemRole: defaultSystemRole })

    try {
      const newUser = await UserRepository.create(
        this.buildNewUserData(loginInput, defaultSystemRole),
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
    userId: User['id']
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
    user: User,
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
    user: User,
    provider: SupportedProvider,
    trx: TransactionClientContract
  ): Promise<void> {
    try {
      if (user.auth_method !== provider) {
        user.auth_method = provider
        await UserRepository.save(user, trx)
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
    systemRole: SystemRoleName
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
    userId: User['id'],
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
