import type { SocialAuthCallbackSource } from '#modules/auth/actions/dtos/request/social-auth/social_auth_callback_source'
import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social-auth/social_auth_provider'
import type { SocialLoginIdentityInput } from '#modules/auth/domain/social-auth/social_login_identity'

export const SOCIAL_AUTH_FAILURE_CODES = {
  ACCESS_DENIED: 'E_SOCIAL_AUTH_ACCESS_DENIED',
  STATE_MISMATCH: 'E_SOCIAL_AUTH_STATE_MISMATCH',
  PROVIDER_FAILURE: 'E_SOCIAL_AUTH_PROVIDER_FAILURE',
  EMAIL_UNAVAILABLE: 'E_SOCIAL_AUTH_EMAIL_UNAVAILABLE',
  INVALID_SESSION: 'E_SOCIAL_AUTH_INVALID_SESSION',
} as const

export type SocialAuthFailureCode =
  (typeof SOCIAL_AUTH_FAILURE_CODES)[keyof typeof SOCIAL_AUTH_FAILURE_CODES]

export interface SocialAuthFailureResult {
  type: 'error'
  publicCode: SocialAuthFailureCode
  safeMessage: string
}

export interface SocialAuthSuccessResult {
  type: 'success'
  socialUser: SocialLoginIdentityInput
}

export type ReadSocialAuthCallbackResult = SocialAuthFailureResult | SocialAuthSuccessResult

export abstract class SocialAuthCallbackReader {
  abstract readCallback(
    provider: SupportedSocialAuthProvider,
    source: SocialAuthCallbackSource
  ): Promise<ReadSocialAuthCallbackResult>
}
