export const SUPPORTED_SOCIAL_AUTH_PROVIDERS = ['google', 'github'] as const

export type SupportedSocialAuthProvider = (typeof SUPPORTED_SOCIAL_AUTH_PROVIDERS)[number]

const supportedProviderSet = new Set<string>(SUPPORTED_SOCIAL_AUTH_PROVIDERS)

export function isSupportedSocialAuthProvider(
  provider: string
): provider is SupportedSocialAuthProvider {
  return supportedProviderSet.has(provider)
}
