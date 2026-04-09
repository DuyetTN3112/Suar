import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import * as AuthLogger from '#libs/auth_logger'
import { SystemRoleName } from '#constants/user_constants'
import emitter from '@adonisjs/core/services/emitter'
import UserRepository from '#infra/users/repositories/user_repository'
import UserOAuthProviderRepository from '#infra/users/repositories/user_oauth_provider_repository'
import SingleFlightService from '#services/single_flight_service'
import type User from '#models/user'
import type UserOAuthProvider from '#models/user_oauth_provider'

type SupportedProvider = 'google' | 'github'

interface SocialUserData {
  id: string
  email: string
  name: string
  nickName: string | null
  token: string
  refreshToken: string | null
}

interface SocialLoginResult {
  user: User
  isNewUser: boolean
  redirectTo: string
}

interface SocialLoginInput {
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

/**
 * Command: Social Login
 *
 * Handles the full social login flow:
 * 1. Check if OAuth provider record exists → login existing user
 * 2. Check if user with email exists → link provider + login
 * 3. Create new user + OAuth record → login
 */
export default class SocialLoginCommand {
  async execute(
    provider: SupportedProvider,
    socialData: SocialUserData
  ): Promise<SocialLoginResult> {
    const loginInput = this.buildLoginInput(provider, socialData)

    return SingleFlightService.execute(this.buildSingleFlightKey(loginInput), () =>
      this.executeLoginFlow(loginInput)
    )
  }

  /**
   * Determine redirect path based on user's system role and organization context
   */
  private determineRedirectPath(user: User): string {
    // 1. Superadmin/System Admin → Admin interface
    if (user.system_role === 'superadmin' || user.system_role === 'system_admin') {
      return '/admin'
    }

    // 2. User with organization context → Tasks (default workspace)
    if (user.current_organization_id) {
      return '/tasks'
    }

    // 3. User without organization → Organizations selection
    return '/organizations'
  }

  private buildLoginInput(
    provider: SupportedProvider,
    socialData: SocialUserData
  ): SocialLoginInput {
    return {
      provider,
      socialId: socialData.id,
      socialEmail: socialData.email,
      nickName: socialData.nickName,
      accessToken: socialData.token,
      refreshToken: socialData.refreshToken,
    }
  }

  private buildSingleFlightKey(loginInput: SocialLoginInput): string {
    return `social_login:${loginInput.provider}:${loginInput.socialId}`
  }

  private async executeLoginFlow(loginInput: SocialLoginInput): Promise<SocialLoginResult> {
    const linkedUserResult = await this.loginLinkedUser(loginInput)
    if (linkedUserResult) {
      return linkedUserResult
    }

    const existingUserResult = await this.loginExistingUserByEmail(loginInput)
    if (existingUserResult) {
      return existingUserResult
    }

    return this.createAndLoginNewUser(loginInput)
  }

  private async loginLinkedUser(loginInput: SocialLoginInput): Promise<SocialLoginResult | null> {
    const oauthProvider = await this.findOauthProvider(loginInput)
    if (!oauthProvider) {
      return null
    }

    const user = await UserRepository.findById(oauthProvider.user_id)
    if (!user) {
      return null
    }

    await this.updateLinkedProviderTokens(loginInput, oauthProvider, user.id)
    this.recordSuccessfulLogin(user, loginInput.provider)
    return this.buildExistingUserResult(user)
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

  private async loginExistingUserByEmail(
    loginInput: SocialLoginInput
  ): Promise<SocialLoginResult | null> {
    const user = await db.transaction(async (trx) => {
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
    })

    if (!user) {
      return null
    }

    this.recordSuccessfulLogin(user, loginInput.provider)
    return this.buildExistingUserResult(user)
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

  private async createAndLoginNewUser(loginInput: SocialLoginInput): Promise<SocialLoginResult> {
    AuthLogger.dbTransaction('create-new-user-start', true, {
      provider: loginInput.provider,
      email: loginInput.socialEmail,
    })

    const createdUser = await db.transaction(async (trx) => {
      const defaultSystemRole = SystemRoleName.REGISTERED_USER
      AuthLogger.dbTransaction('found-defaults', true, { systemRole: defaultSystemRole })

      try {
        const newUser = await UserRepository.create(
          this.buildNewUserData(loginInput, defaultSystemRole),
          trx
        )
        AuthLogger.userCreated(newUser.id, loginInput.provider, newUser.email || '')

        await this.createOauthProviderRecord(newUser.id, loginInput, trx)

        AuthLogger.dbTransaction('create-user-complete', true, { userId: newUser.id })
        return newUser
      } catch (error: unknown) {
        AuthLogger.oauthError(loginInput.provider, error, 'create-user-record')
        throw error
      }
    })

    this.recordSuccessfulLogin(createdUser, loginInput.provider)
    return { user: createdUser, isNewUser: true, redirectTo: '/organizations' }
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
    return loginInput.nickName || loginInput.socialEmail.split('@')[0] || `user_${Date.now()}`
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

  private recordSuccessfulLogin(user: User, provider: SupportedProvider): void {
    AuthLogger.userLogin(user.id, user.email || '', provider)
    void emitter.emit('user:login', {
      userId: user.id,
      ip: '',
      userAgent: '',
      method: 'oauth',
    })
  }

  private buildExistingUserResult(user: User): SocialLoginResult {
    return {
      user,
      isNewUser: false,
      redirectTo: this.determineRedirectPath(user),
    }
  }

  private isPgErrorCode(error: unknown, expectedCode: string): boolean {
    const dbError = error as { code?: string }
    return dbError.code === expectedCode
  }
}
