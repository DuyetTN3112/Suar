import type { SupportedSocialAuthProvider } from '#modules/auth/domain/social-auth/social_auth_provider'

export interface SocialLoginIdentityInput {
  id: string
  email: string
  name: string
  nickName: string | null
  token: string
  refreshToken: string | null
}

export interface SocialLoginIdentity {
  provider: SupportedSocialAuthProvider
  socialId: string
  email: string
  preferredUsername: string
}

export type SocialLoginIdentityResult =
  | { ok: true; identity: SocialLoginIdentity }
  | { ok: false; reason: 'email_required' }

/**
 * Normalize provider identity data before persistence orchestration begins.
 *
 * This is an Auth business rule: persistence adapters receive only a valid,
 * deterministic identity and never decide how an account should be named.
 */
export function normalizeSocialLoginIdentity(
  provider: SupportedSocialAuthProvider,
  input: SocialLoginIdentityInput
): SocialLoginIdentityResult {
  const email = input.email.trim()
  if (!email) {
    return { ok: false, reason: 'email_required' }
  }

  const nickName = input.nickName?.trim()
  const emailLocalPart = email.split('@')[0]?.trim()
  const preferredUsername =
    nickName || emailLocalPart || `user_${input.id.trim() || provider}`

  return {
    ok: true,
    identity: {
      provider,
      socialId: input.id,
      email,
      preferredUsername,
    },
  }
}
