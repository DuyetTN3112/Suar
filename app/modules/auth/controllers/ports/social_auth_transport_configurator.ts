import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social_auth_provider'

export interface SocialAuthCallbackConfigurableDriver {
  config?: { callbackUrl?: string }
  options?: { callbackUrl?: string }
}

export interface SocialAuthCallbackConfiguration {
  callbackUrl: string
  hasClientId: boolean
  hasClientSecret: boolean
}

export abstract class SocialAuthTransportConfigurator {
  abstract canonicalLocalRedirect(
    provider: SupportedSocialAuthProvider,
    requestHost: string
  ): string | null

  abstract configureCallback(
    provider: SupportedSocialAuthProvider,
    requestHost: string,
    driver: SocialAuthCallbackConfigurableDriver
  ): SocialAuthCallbackConfiguration
}
