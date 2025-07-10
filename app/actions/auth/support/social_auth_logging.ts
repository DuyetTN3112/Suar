import * as AuthLogger from '#infra/logger/auth_logger'

export function logSocialAuthConfigCheck(
  provider: string,
  hasClientId: boolean,
  hasClientSecret: boolean,
  callbackUrl: string
): void {
  AuthLogger.configCheck(provider, hasClientId, hasClientSecret, callbackUrl)
}

export function logSocialAuthRedirect(
  provider: string,
  context?: Record<string, unknown>
): void {
  AuthLogger.oauthRedirect(provider, context)
}

export function logSocialAuthCallbackStart(
  provider: string,
  context?: Record<string, unknown>
): void {
  AuthLogger.oauthCallbackStart(provider, context)
}
