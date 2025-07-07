import logger from '@adonisjs/core/services/logger'

/**
 * Auth Logger
 *
 * Centralized logging for authentication-related events.
 * Pattern học từ ancarat-bo: tách biệt logging logic.
 *
 * @module AuthLogger
 */

type LogContext = Record<string, unknown>;

interface SocialUser {
  id: string | number
  email: string | null
  name?: string
  nickName?: string
  avatarUrl?: string | null
  token?: {
    refreshToken?: string
  }
}

interface ErrorWithCode {
  code?: string | number
  stack?: string
}

function shouldWriteConsole(): boolean {
  return process.env.NODE_ENV !== 'test' && process.env.LOG_LEVEL !== 'silent'
}

function writeConsole(lines: string[]): void {
  if (!shouldWriteConsole()) {
    return
  }

  for (const line of lines) {
    console.warn(line)
  }
}

const formatContext = (context: LogContext): string => {
  return Object.entries(context)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${key}=${JSON.stringify(value, null, 2)}`
      }
      return `${key}=${String(value)}`
    })
    .join(', ')
}

/**
 * Log OAuth redirect
 */
export const oauthRedirect = (provider: string, context?: LogContext): void => {
  const msg = `🔄 OAuth Redirect - Provider: ${provider}`
  logger.info(msg, context)
  writeConsole([
    `\n${'='.repeat(80)}`,
    msg,
    ...(context ? [`Context: ${formatContext(context)}`] : []),
    `${'='.repeat(80)}\n`,
  ])
}

/**
 * Log OAuth callback start
 */
export const oauthCallbackStart = (provider: string, context?: LogContext): void => {
  const msg = `📥 OAuth Callback Started - Provider: ${provider}`
  logger.info(msg, context)
  writeConsole([
    `\n${'='.repeat(80)}`,
    msg,
    ...(context ? [`Context: ${formatContext(context)}`] : []),
    `${'='.repeat(80)}\n`,
  ])
}

/**
 * Log OAuth user data received
 */
export const oauthUserReceived = (provider: string, socialUser: SocialUser): void => {
  const sanitized = {
    id: socialUser.id,
    email: socialUser.email,
    name: socialUser.name,
    nickName: socialUser.nickName,
    avatarUrl: socialUser.avatarUrl,
    hasToken: !!socialUser.token,
    hasRefreshToken: !!socialUser.token?.refreshToken,
  }
  const msg = `✅ OAuth User Data Received - Provider: ${provider}`
  logger.info(msg, sanitized)
  writeConsole([
    `\n${'='.repeat(80)}`,
    msg,
    `User Data: ${JSON.stringify(sanitized, null, 2)}`,
    `${'='.repeat(80)}\n`,
  ])
}

/**
 * Log OAuth provider lookup
 */
export const oauthProviderLookup = (provider: string, providerId: string, found: boolean): void => {
  const msg = `🔍 OAuth Provider Lookup - Provider: ${provider}, ID: ${providerId}, Found: ${found}`
  logger.info(msg)
  writeConsole([`\n${msg}`])
}

/**
 * Log user creation
 */
export const userCreated = (userId: string, method: string, email: string): void => {
  const msg = `✨ User Created - ID: ${userId}, Method: ${method}, Email: ${email}`
  logger.info(msg)
  writeConsole([`\n${'='.repeat(80)}`, msg, `${'='.repeat(80)}\n`])
}

/**
 * Log user login
 */
export const userLogin = (userId: string, email: string, method: string): void => {
  const msg = `🔐 User Logged In - ID: ${userId}, Email: ${email}, Method: ${method}`
  logger.info(msg)
  writeConsole([`\n${'='.repeat(80)}`, msg, `${'='.repeat(80)}\n`])
}

/**
 * Log OAuth errors
 */
export const oauthError = (provider: string, error: unknown, stage: string): void => {
  const errorDetails: {
    provider: string
    stage: string
    error: string
    code?: string | number
    stack?: string
  } = {
    provider,
    stage,
    error: error instanceof Error ? error.message : String(error),
  }

  if (error && typeof error === 'object') {
    const errorObj = error as ErrorWithCode
    if ('code' in errorObj) {
      errorDetails.code = errorObj.code
    }
    if ('stack' in errorObj) {
      errorDetails.stack = errorObj.stack
    }
  }

  const msg = `❌ OAuth Error - Provider: ${provider}, Stage: ${stage}`
  logger.error(msg, errorDetails)
  writeConsole([
    `\n${'='.repeat(80)}`,
    msg,
    `Error Details: ${JSON.stringify(errorDetails, null, 2)}`,
    `${'='.repeat(80)}\n`,
  ])
}

/**
 * Log OAuth state errors
 */
export const oauthStateError = (
  provider: string,
  type: 'access_denied' | 'state_mismatch' | 'unknown'
): void => {
  const msg = `⚠️ OAuth State Error - Provider: ${provider}, Type: ${type}`
  logger.warn(msg)
  writeConsole([`\n${'='.repeat(80)}`, msg, `${'='.repeat(80)}\n`])
}

/**
 * Log email login attempt
 */
export const loginAttempt = (email: string, remember: boolean, ipAddress: string): void => {
  const msg = `🔑 Login Attempt - Email: ${email}, Remember: ${remember}, IP: ${ipAddress}`
  logger.info(msg)
  writeConsole([`\n${'='.repeat(80)}`, msg, `${'='.repeat(80)}\n`])
}

/**
 * Log login failure
 */
export const loginFailure = (email: string, reason: string): void => {
  const msg = `❌ Login Failed - Email: ${email}, Reason: ${reason}`
  logger.warn(msg)
  writeConsole([`\n${'='.repeat(80)}`, msg, `${'='.repeat(80)}\n`])
}

/**
 * Log database transaction
 */
export const dbTransaction = (operation: string, success: boolean, details?: unknown): void => {
  const msg = `💾 DB Transaction - Operation: ${operation}, Success: ${success}`
  if (success) {
    logger.info(msg, details)
  } else {
    logger.error(msg, details)
  }
  writeConsole([`\n${msg}`, ...(details ? [`Details: ${JSON.stringify(details, null, 2)}`] : [])])
}

/**
 * Log environment config check
 */
export const configCheck = (
  provider: string,
  hasClientId: boolean,
  hasClientSecret: boolean,
  callbackUrl: string
): void => {
  const msg = `Config Check - Provider: ${provider}`
  const config = {
    hasClientId,
    hasClientSecret,
    callbackUrl,
    isComplete: hasClientId && hasClientSecret,
  }
  logger.info(msg, config)
  writeConsole([
    `\n${'='.repeat(80)}`,
    msg,
    `Config: ${JSON.stringify(config, null, 2)}`,
    `${'='.repeat(80)}\n`,
  ])
}
