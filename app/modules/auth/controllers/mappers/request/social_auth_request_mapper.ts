import type { HttpContext } from '@adonisjs/core/http'

import {
  SUPPORTED_SOCIAL_AUTH_PROVIDER_SET,
  type SupportedSocialAuthProvider,
} from '#modules/auth/constants/auth_constants'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

export function buildSupportedSocialAuthProvider(provider: string): SupportedSocialAuthProvider {
  const normalizedProvider = provider.trim().toLowerCase()
  if (SUPPORTED_SOCIAL_AUTH_PROVIDER_SET.has(normalizedProvider)) {
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
