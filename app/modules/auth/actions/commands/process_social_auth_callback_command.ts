import SocialLoginCommand from './social_login_command.js'

import SocialAuthProviderService, {
  type SocialAuthDriver,
  type SocialAuthFailureResult,
  type SupportedSocialAuthProvider,
} from '#modules/auth/infra/oauth/social_auth_provider_service'
import type { SocialAuthenticatedUser } from '#modules/auth/infra/social_login_persistence_service'

interface SocialAuthSuccessResult {
  type: 'success'
  user: SocialAuthenticatedUser
  redirectTo: string
  currentOrganizationId: SocialAuthenticatedUser['current_organization_id'] | null
}

export type ProcessSocialAuthCallbackResult = SocialAuthFailureResult | SocialAuthSuccessResult

export default class ProcessSocialAuthCallbackCommand {
  constructor(private readonly socialAuthProviderService = new SocialAuthProviderService()) {}

  async execute(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthDriver
  ): Promise<ProcessSocialAuthCallbackResult> {
    const callbackData = await this.socialAuthProviderService.readCallback(provider, socialAuth)
    if (callbackData.type === 'error') {
      return callbackData
    }

    const result = await new SocialLoginCommand().execute(provider, callbackData.socialUser)

    return {
      type: 'success',
      user: result.user,
      redirectTo: result.redirectTo,
      currentOrganizationId: result.user.current_organization_id ?? null,
    }
  }
}
