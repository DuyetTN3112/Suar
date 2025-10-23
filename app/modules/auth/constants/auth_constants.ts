import { AuthMethod, SystemRoleName } from '#modules/users/public_contracts/user_constants'

export type SupportedSocialAuthProvider = 'google' | 'github'

export const SUPPORTED_SOCIAL_AUTH_PROVIDERS = [
  AuthMethod.GOOGLE,
  AuthMethod.GITHUB,
] as const satisfies readonly SupportedSocialAuthProvider[]

export const SUPPORTED_SOCIAL_AUTH_PROVIDER_SET = new Set<string>(SUPPORTED_SOCIAL_AUTH_PROVIDERS)

export const DEFAULT_SOCIAL_USER_SYSTEM_ROLE = SystemRoleName.REGISTERED_USER
