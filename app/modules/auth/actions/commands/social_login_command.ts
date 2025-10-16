import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import { type SupportedSocialAuthProvider } from '#modules/auth/constants/auth_constants'
import { resolveLandingPath } from '#modules/auth/domain/landing_surface'
import SocialLoginPersistenceService, {
  type SocialAuthenticatedUser,
  type SocialLoginInput,
} from '#modules/auth/infra/social_login_persistence_service'
import { singleFlight } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import * as AuthLogger from '#modules/logger/public_contracts/auth_logger'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

interface SocialUserData {
  id: string
  email: string
  name: string
  nickName: string | null
  token: string
  refreshToken: string | null
}

interface SocialLoginResult {
  user: SocialAuthenticatedUser
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
    provider: SupportedSocialAuthProvider,
    socialData: SocialUserData
  ): Promise<SocialLoginResult> {
    const loginInput = this.buildLoginInput(provider, socialData)

    return singleFlight.execute(this.buildSingleFlightKey(loginInput), () =>
      this.executeLoginFlow(loginInput)
    )
  }

  /**
   * Determine redirect path based on user's system role and organization context
   */
  private async determineRedirectPath(user: SocialAuthenticatedUser): Promise<string> {
    const currentMembership = user.current_organization_id
      ? await organizationPublicApi.findApprovedMembership(user.current_organization_id, user.id)
      : null

    return resolveLandingPath({
      systemRole: user.system_role,
      currentOrganizationId: user.current_organization_id,
      currentOrganizationRole: currentMembership?.role ?? null,
    })
  }

  private buildLoginInput(
    provider: SupportedSocialAuthProvider,
    socialData: SocialUserData
  ): SocialLoginInput {
    const socialEmail = socialData.email.trim()
    if (!socialEmail) {
      throw new BusinessLogicException(ErrorMessages.INVALID_EMAIL)
    }

    return {
      provider,
      socialId: socialData.id,
      socialEmail,
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

  private recordSuccessfulLogin(
    user: SocialAuthenticatedUser,
    provider: SupportedSocialAuthProvider
  ): void {
    AuthLogger.userLogin(user.id, user.email ?? '', provider)
    void emitter.emit('user:login', {
      userId: user.id,
      ip: '',
      userAgent: '',
      method: 'oauth',
    })
  }

  private async finalizeExistingUserLogin(
    user: SocialAuthenticatedUser,
    provider: SupportedSocialAuthProvider
  ): Promise<SocialLoginResult> {
    this.recordSuccessfulLogin(user, provider)
    return this.buildExistingUserResult(user)
  }

  private finalizeNewUserLogin(
    user: SocialAuthenticatedUser,
    provider: SupportedSocialAuthProvider
  ): SocialLoginResult {
    this.recordSuccessfulLogin(user, provider)
    return {
      user,
      isNewUser: true,
      redirectTo: '/organizations',
    }
  }

  private async buildExistingUserResult(user: SocialAuthenticatedUser): Promise<SocialLoginResult> {
    return {
      user,
      isNewUser: false,
      redirectTo: await this.determineRedirectPath(user),
    }
  }
}
