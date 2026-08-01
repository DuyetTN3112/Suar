import type { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'
import type { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import type { SocialLoginIdentity as SocialAuthenticatedUser } from '#modules/auth/actions/ports/outbound/social_login_identity_persistence'
import type { SocialLoginPersistence } from '#modules/auth/actions/ports/outbound/social_login_persistence'
import {
  AUTH_LANDING_SURFACES,
  resolveAuthLandingSurface,
  type AuthLandingSurface,
} from '#modules/auth/domain/landing_surface'
import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social_auth_provider'
import {
  normalizeSocialLoginIdentity,
  type SocialLoginIdentity,
  type SocialLoginIdentityInput,
} from '#modules/auth/domain/social_login_identity'
import { singleFlight } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'

interface SocialLoginResult {
  user: SocialAuthenticatedUser
  isNewUser: boolean
  redirectTo: string
}

const LANDING_PATH_BY_SURFACE: Record<AuthLandingSurface, string> = {
  [AUTH_LANDING_SURFACES.SYSTEM_ADMINISTRATION]: '/admin',
  [AUTH_LANDING_SURFACES.ORGANIZATION_ADMINISTRATION]: '/org',
  [AUTH_LANDING_SURFACES.ORGANIZATION_WORKSPACE]: '/dashboard',
  [AUTH_LANDING_SURFACES.ORGANIZATION_SELECTION]: '/organizations',
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
  constructor(
    private readonly persistence: SocialLoginPersistence,
    private readonly systemAccess: AuthSystemAccessReader,
    private readonly organizationMembership: AuthOrganizationMembershipReader
  ) {}

  async execute(
    provider: SupportedSocialAuthProvider,
    socialData: SocialLoginIdentityInput
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
    const hasSystemAdministrationAccess =
      await this.systemAccess.canAccessSystemAdministration(user.system_role)
    const currentOrganizationRole =
      !hasSystemAdministrationAccess && user.current_organization_id
        ? await this.organizationMembership.findApprovedRole(
            user.current_organization_id,
            user.id
          )
        : null
    const surface = resolveAuthLandingSurface({
      hasSystemAdministrationAccess,
      currentOrganizationId: user.current_organization_id,
      currentOrganizationRole,
    })

    return LANDING_PATH_BY_SURFACE[surface]
  }

  private buildLoginInput(
    provider: SupportedSocialAuthProvider,
    socialData: SocialLoginIdentityInput
  ): SocialLoginIdentity {
    const result = normalizeSocialLoginIdentity(provider, socialData)
    if (!result.ok) {
      throw new BusinessLogicException(ErrorMessages.INVALID_EMAIL)
    }

    return result.identity
  }

  private buildSingleFlightKey(loginInput: SocialLoginIdentity): string {
    return `social_login:${loginInput.provider}:${loginInput.socialId}`
  }

  private async executeLoginFlow(loginInput: SocialLoginIdentity): Promise<SocialLoginResult> {
    const linkedUser = await this.persistence.findLinkedUser(loginInput)
    if (linkedUser) {
      return this.finalizeExistingUserLogin(linkedUser)
    }

    const existingUser = await this.persistence.linkExistingUserByEmail(loginInput)
    if (existingUser) {
      return this.finalizeExistingUserLogin(existingUser)
    }

    const createdUser = await this.persistence.registerNewUser(loginInput)
    return this.finalizeNewUserLogin(createdUser)
  }

  private async finalizeExistingUserLogin(
    user: SocialAuthenticatedUser
  ): Promise<SocialLoginResult> {
    return this.buildExistingUserResult(user)
  }

  private async finalizeNewUserLogin(
    user: SocialAuthenticatedUser
  ): Promise<SocialLoginResult> {
    return {
      user,
      isNewUser: true,
      redirectTo: await this.determineRedirectPath(user),
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
