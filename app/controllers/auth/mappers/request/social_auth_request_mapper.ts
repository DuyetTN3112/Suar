import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'

export type SupportedSocialAuthProvider = 'google' | 'github'

const SUPPORTED_SOCIAL_AUTH_PROVIDERS = new Set<SupportedSocialAuthProvider>(['google', 'github'])

export function buildSupportedSocialAuthProvider(provider: string): SupportedSocialAuthProvider {
  const normalizedProvider = provider.trim().toLowerCase()
  if (SUPPORTED_SOCIAL_AUTH_PROVIDERS.has(normalizedProvider as SupportedSocialAuthProvider)) {
    return normalizedProvider as SupportedSocialAuthProvider
  }

  throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
}

export function buildSocialAuthCallbackUrl(provider: SupportedSocialAuthProvider) {
  return `http://localhost:3333/auth/${provider}/callback`
}

export function buildSocialAuthRedirectLogContext(request: HttpContext['request']) {
  return {
    referer: request.header('referer'),
    userAgent: request.header('user-agent'),
    ip: request.ip(),
  }
}

export function buildSocialAuthCallbackLogContext(request: HttpContext['request']) {
  return {
    query: request.qs(),
    referer: request.header('referer'),
    ip: request.ip(),
  }
}
