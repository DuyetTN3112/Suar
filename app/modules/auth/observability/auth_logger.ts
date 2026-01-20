import {
  sanitizeSocialAuthUser,
  toOAuthErrorDetails,
  type AuthLogContext,
  type SocialAuthUser,
} from '#modules/auth/observability/auth_log_context'
import {
  sanitizeErrorLogText,
  sanitizeRequestUrl,
} from '#modules/errors/public_contracts/error_sanitization'
import loggerService from '#modules/logger/public_contracts/application_logger'

export interface AuthLoggerSink {
  debug(message: string, details?: unknown): void
  info(message: string, details?: unknown): void
  warn(message: string, details?: unknown): void
  error(message: string, details?: unknown): void
}

export interface AuthLoggerOptions {
  sink?: AuthLoggerSink
}

const defaultAuthLoggerSink: AuthLoggerSink = {
  debug: (message, details) => {
    if (details === undefined) loggerService.debug(message)
    else loggerService.debug(message, details)
  },
  info: (message, details) => {
    if (details === undefined) loggerService.info(message)
    else loggerService.info(message, details)
  },
  warn: (message, details) => {
    if (details === undefined) loggerService.warn(message)
    else loggerService.warn(message, details)
  },
  error: (message, details) => {
    if (details === undefined) loggerService.error(message)
    else loggerService.error(message, details)
  },
}

export class AuthLogger {
  private readonly sink: AuthLoggerSink

  constructor(options: AuthLoggerOptions = {}) {
    this.sink = options.sink ?? defaultAuthLoggerSink
  }

  oauthRedirect(provider: string, context?: AuthLogContext): void {
    const message = `🔄 OAuth Redirect - Provider: ${provider}`
    this.sink.debug(message, context)
  }

  oauthCallbackStart(provider: string, context?: AuthLogContext): void {
    const message = `📥 OAuth Callback Started - Provider: ${provider}`
    this.sink.debug(message, context)
  }

  oauthUserReceived(provider: string, socialUser: SocialAuthUser): void {
    const sanitizedUser = sanitizeSocialAuthUser(socialUser)
    const message = `✅ OAuth User Data Received - Provider: ${provider}`
    this.sink.debug(message, sanitizedUser)
  }

  oauthProviderLookup(provider: string, _providerId: string, found: boolean): void {
    const message = `🔍 OAuth Provider Lookup - Provider: ${provider}`
    this.sink.debug(message, { found })
  }

  userCreated(userId: string, method: string, _email: string): void {
    const message = `✨ User Created - ID: ${userId}, Method: ${method}`
    this.sink.info(message)
  }

  userLogin(userId: string, _email: string, method: string): void {
    const message = `🔐 User Logged In - ID: ${userId}, Method: ${method}`
    this.sink.debug(message)
  }

  oauthError(provider: string, error: unknown, stage: string): void {
    const errorDetails = toOAuthErrorDetails(provider, stage, error)
    const message = `❌ OAuth Error - Provider: ${provider}, Stage: ${stage}`
    this.sink.error(message, errorDetails)
  }

  oauthStateError(provider: string, type: 'access_denied' | 'state_mismatch' | 'unknown'): void {
    const message = `⚠️ OAuth State Error - Provider: ${provider}, Type: ${type}`
    this.sink.warn(message)
  }

  loginAttempt(_email: string, remember: boolean, ipAddress: string): void {
    const message = '🔑 Login Attempt'
    this.sink.debug(message, { remember, hasIpAddress: ipAddress.length > 0 })
  }

  loginFailure(_email: string, reason: string): void {
    const message = '❌ Login Failed'
    this.sink.warn(message, { reason: sanitizeErrorLogText(reason, 512) })
  }

  dbTransaction(operation: string, success: boolean, details?: unknown): void {
    const message = `💾 DB Transaction - Operation: ${operation}, Success: ${success}`
    if (success) {
      this.sink.debug(message, details)
    } else {
      this.sink.error(message, details)
    }
  }

  configCheck(
    provider: string,
    hasClientId: boolean,
    hasClientSecret: boolean,
    callbackUrl: string
  ): void {
    const config = {
      hasClientId,
      hasClientSecret,
      callbackUrl: sanitizeRequestUrl(callbackUrl),
      isComplete: hasClientId && hasClientSecret,
    }
    const message = `Config Check - Provider: ${provider}`
    if (config.isComplete) {
      this.sink.debug(message, config)
    } else {
      this.sink.warn(message, config)
    }
  }
}

const authLogger = new AuthLogger()

export const configCheck = authLogger.configCheck.bind(authLogger)
export const dbTransaction = authLogger.dbTransaction.bind(authLogger)
export const loginAttempt = authLogger.loginAttempt.bind(authLogger)
export const loginFailure = authLogger.loginFailure.bind(authLogger)
export const oauthCallbackStart = authLogger.oauthCallbackStart.bind(authLogger)
export const oauthError = authLogger.oauthError.bind(authLogger)
export const oauthProviderLookup = authLogger.oauthProviderLookup.bind(authLogger)
export const oauthRedirect = authLogger.oauthRedirect.bind(authLogger)
export const oauthStateError = authLogger.oauthStateError.bind(authLogger)
export const oauthUserReceived = authLogger.oauthUserReceived.bind(authLogger)
export const userCreated = authLogger.userCreated.bind(authLogger)
export const userLogin = authLogger.userLogin.bind(authLogger)
export default authLogger
