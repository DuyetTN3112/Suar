import type { HttpContext } from '@adonisjs/core/http'

import {
  isSupportedSocialAuthProvider,
  type SupportedSocialAuthProvider,
} from '#modules/auth/domain/social_auth_provider'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { sanitizeRequestUrl } from '#modules/errors/public_contracts/error_sanitization'

export function buildSupportedSocialAuthProvider(provider: string): SupportedSocialAuthProvider {
  const normalizedProvider = provider.trim().toLowerCase()
  if (isSupportedSocialAuthProvider(normalizedProvider)) {
    return normalizedProvider
  }

  throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
}

export function buildSocialAuthCallbackUrl(provider: SupportedSocialAuthProvider) {
  return `http://localhost:3333/auth/${provider}/callback`
}

export function buildSocialAuthRedirectLogContext(request: HttpContext['request']) {
  return {
    referer: sanitizeRequestUrl(request.header('referer') ?? null),
    userAgent: request.header('user-agent'),
    ip: request.ip(),
  }
}

export function buildSocialAuthCallbackLogContext(request: HttpContext['request']) {
  const query = request.qs()
  return {
    hasAuthorizationCode: hasQueryValue(query['code']),
    hasState: hasQueryValue(query['state']),
    hasProviderError: hasQueryValue(query['error']),
    referer: sanitizeRequestUrl(request.header('referer') ?? null),
    ip: request.ip(),
  }
}

function hasQueryValue(value: unknown): boolean {
  return typeof value === 'string' ? value.length > 0 : value !== undefined && value !== null
}
