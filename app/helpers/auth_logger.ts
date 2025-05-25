/**
 * Auth Logger Helper
 *
 * Provides detailed logging for authentication flows
 * - OAuth (GitHub, Google)
 *
 * NOTE: Removed password-related logging (OAuth-only system):
 * - Email/Password login
 * - Registration
 * - Password reset
 */

import logger from '@adonisjs/core/services/logger'

interface LogContext {
  [key: string]: unknown
}

export class AuthLogger {
  private static formatContext(context: LogContext): string {
    return Object.entries(context)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${key}=${JSON.stringify(value, null, 2)}`
        }
        return `${key}=${value}`
      })
      .join(', ')
  }

  /**
   * Log OAuth redirect
   */
  static oauthRedirect(provider: string, context?: LogContext) {
    const msg = `🔄 OAuth Redirect - Provider: ${provider}`
    logger.info(msg, context)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    if (context) {
      console.log(`Context: ${this.formatContext(context)}`)
    }
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log OAuth callback start
   */
  static oauthCallbackStart(provider: string, context?: LogContext) {
    const msg = `📥 OAuth Callback Started - Provider: ${provider}`
    logger.info(msg, context)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    if (context) {
      console.log(`Context: ${this.formatContext(context)}`)
    }
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log OAuth user data received
   */
  static oauthUserReceived(provider: string, socialUser: unknown) {
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
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('User Data:', JSON.stringify(sanitized, null, 2))
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log OAuth provider lookup
   */
  static oauthProviderLookup(provider: string, providerId: string, found: boolean) {
    const msg = `🔍 OAuth Provider Lookup - Provider: ${provider}, ID: ${providerId}, Found: ${found}`
    logger.info(msg)
    console.log(`\n${msg}`)
  }

  /**
   * Log user creation
   */
  static userCreated(userId: number, method: string, email: string) {
    const msg = `✨ User Created - ID: ${userId}, Method: ${method}, Email: ${email}`
    logger.info(msg)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log user login
   */
  static userLogin(userId: number, email: string, method: string) {
    const msg = `🔐 User Logged In - ID: ${userId}, Email: ${email}, Method: ${method}`
    logger.info(msg)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log OAuth errors
   */
  static oauthError(provider: string, error: unknown, stage: string) {
    const errorDetails = {
      provider,
      stage,
      error: error instanceof Error ? error.message : String(error),
      code: error?.code,
      stack: error?.stack,
    }
    const msg = `❌ OAuth Error - Provider: ${provider}, Stage: ${stage}`
    logger.error(msg, errorDetails)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('Error Details:', JSON.stringify(errorDetails, null, 2))
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log OAuth state errors
   */
  static oauthStateError(provider: string, type: 'access_denied' | 'state_mismatch' | 'unknown') {
    const msg = `⚠️ OAuth State Error - Provider: ${provider}, Type: ${type}`
    logger.warn(msg)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log email/password login attempt
   */
  static loginAttempt(email: string, remember: boolean, ipAddress: string) {
    const msg = `🔑 Login Attempt - Email: ${email}, Remember: ${remember}, IP: ${ipAddress}`
    logger.info(msg)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log login failure
   */
  static loginFailure(email: string, reason: string) {
    const msg = `❌ Login Failed - Email: ${email}, Reason: ${reason}`
    logger.warn(msg)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Log database transaction
   */
  static dbTransaction(operation: string, success: boolean, details?: unknown) {
    const msg = `💾 DB Transaction - Operation: ${operation}, Success: ${success}`
    if (success) {
      logger.info(msg, details)
    } else {
      logger.error(msg, details)
    }
    console.log(`\n${msg}`)
    if (details) {
      console.log('Details:', JSON.stringify(details, null, 2))
    }
  }

  /**
   * Log environment config check
   */
  static configCheck(
    provider: string,
    hasClientId: boolean,
    hasClientSecret: boolean,
    callbackUrl: string
  ) {
    const msg = `⚙️ Config Check - Provider: ${provider}`
    const config = {
      hasClientId,
      hasClientSecret,
      callbackUrl,
      isComplete: hasClientId && hasClientSecret,
    }
    logger.info(msg, config)
    console.log(`\n${'='.repeat(80)}`)
    console.log(msg)
    console.log('Config:', JSON.stringify(config, null, 2))
    console.log('='.repeat(80) + '\n')
  }
}
