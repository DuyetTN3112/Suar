import {
  sanitizeLogValue,
  sanitizeErrorStack,
  sanitizeErrorText,
} from '#modules/errors/public_contracts/error_sanitization'

export type AuthLogContext = Record<string, unknown>

export interface SocialAuthUser {
  id: string | number
  email: string | null
  name?: string
  nickName?: string
  avatarUrl?: string | null
  token?: {
    refreshToken?: string
  }
}

export interface OAuthErrorDetails {
  provider: string
  stage: string
  error: string
  code?: string | number
  stack?: string
}

interface ErrorWithCode {
  code?: string | number
  stack?: string
}

export function formatAuthLogContext(context: AuthLogContext): string {
  return Object.entries(context)
    .map(
      ([key, value]) =>
        `${sanitizeErrorText(key, 128)}=${formatContextValue(sanitizeLogValue(value))}`
    )
    .join(', ')
}

export function sanitizeSocialAuthUser(socialUser: SocialAuthUser): Record<string, unknown> {
  return {
    hasProviderId: true,
    hasEmail: Boolean(socialUser.email),
    hasName: Boolean(socialUser.name),
    hasNickName: Boolean(socialUser.nickName),
    hasAvatar: Boolean(socialUser.avatarUrl),
    hasToken: Boolean(socialUser.token),
    hasRefreshToken: Boolean(socialUser.token?.refreshToken),
  }
}

export function toOAuthErrorDetails(
  provider: string,
  stage: string,
  error: unknown
): OAuthErrorDetails {
  const details: OAuthErrorDetails = {
    provider,
    stage,
    error: sanitizeErrorText(error instanceof Error ? error.message : error),
  }

  if (!error || typeof error !== 'object') {
    return details
  }

  const errorWithCode = error as ErrorWithCode
  if (errorWithCode.code !== undefined) {
    details.code =
      typeof errorWithCode.code === 'string'
        ? sanitizeErrorText(errorWithCode.code, 256)
        : errorWithCode.code
  }
  if (errorWithCode.stack !== undefined) {
    const sanitizedStack = sanitizeErrorStack(errorWithCode.stack)
    if (sanitizedStack) {
      details.stack = sanitizedStack
    }
  }
  return details
}

function formatContextValue(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
