import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import SocialLoginPersistenceService, {
  type SocialLoginInput,
  type SupportedProvider,
} from '#infra/auth/social_login_persistence_service'
import SingleFlightService from '#infra/cache/single_flight_service'
import * as AuthLogger from '#infra/logger/auth_logger'
import type User from '#models/user'

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

/**
 * Command: Social Login
 *
 * Handles the full social login flow:
 * 1. Check if OAuth provider record exists → login existing user
 * 2. Check if user with email exists → link provider + login
 * 3. Create new user + OAuth record → login
 */
export default class SocialLoginCommand {
  constructor(private readonly persistenceService = new SocialLoginPersistenceService()) {}

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
    const linkedUser = await this.persistenceService.findLinkedUser(loginInput)
    if (linkedUser) {
      return this.finalizeExistingUserLogin(linkedUser, loginInput.provider)
    }

    const existingUser = await db.transaction((trx) =>
      this.persistenceService.linkExistingUserByEmail(loginInput, trx)
    )
    if (existingUser) {
      return this.finalizeExistingUserLogin(existingUser, loginInput.provider)
    }

    const createdUser = await db.transaction((trx) =>
      this.persistenceService.registerNewUser(loginInput, trx)
    )
    return this.finalizeNewUserLogin(createdUser, loginInput.provider)
  }

  private recordSuccessfulLogin(user: User, provider: SupportedProvider): void {
    AuthLogger.userLogin(user.id, user.email ?? '', provider)
    void emitter.emit('user:login', {
      userId: user.id,
      ip: '',
      userAgent: '',
      method: 'oauth',
    })
  }

  private finalizeExistingUserLogin(user: User, provider: SupportedProvider): SocialLoginResult {
    this.recordSuccessfulLogin(user, provider)
    return this.buildExistingUserResult(user)
  }

  private finalizeNewUserLogin(user: User, provider: SupportedProvider): SocialLoginResult {
    this.recordSuccessfulLogin(user, provider)
    return {
      user,
      isNewUser: true,
      redirectTo: '/organizations',
    }
  }

  private buildExistingUserResult(user: User): SocialLoginResult {
    return {
      user,
      isNewUser: false,
      redirectTo: this.determineRedirectPath(user),
    }
  }
}
