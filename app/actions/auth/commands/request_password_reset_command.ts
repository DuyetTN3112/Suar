import { BaseCommand } from '../../shared/base_command.js'
import type { RequestPasswordResetDTO } from '../dtos/request_password_reset_dto.js'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import string from '@adonisjs/core/helpers/string'
import encryption from '@adonisjs/core/services/encryption'
import mail from '@adonisjs/mail/services/main'
import router from '@adonisjs/core/services/router'
import env from '#start/env'
import limiter from '@adonisjs/limiter/services/main'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * RequestPasswordResetCommand
 *
 * Sends password reset email to user.
 * This is a Command (Write operation) as it creates a reset token.
 *
 * Business Rules:
 * - Generates secure random token (32 chars)
 * - Encrypts token for URL (prevents enumeration)
 * - Expires all old tokens for user
 * - Token expires after 1 hour
 * - Rate limiting: 3 requests per hour per email
 * - Silent failure if user not found (security)
 *
 * Security:
 * - ✅ Random token generation
 * - ✅ Token encryption in URL
 * - ✅ Rate limiting to prevent spam
 * - ✅ Token expiration
 * - ✅ Single active token per user
 */
export default class RequestPasswordResetCommand extends BaseCommand<
  RequestPasswordResetDTO,
  void
> {
  private limiter = limiter.use({
    requests: 3, // 3 attempts
    duration: '1 hour',
    blockDuration: '15 minutes',
  })

  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Main handler - sends password reset email
   */
  async handle(dto: RequestPasswordResetDTO): Promise<void> {
    // 1. Rate limiting check
    await this.checkRateLimit(dto.getRateLimitKey())

    // 2. Find user (silent failure if not found)
    const user = await User.query().where({ email: dto.email }).first()
    if (!user) {
      // Don't reveal if user exists - silent success
      return
    }

    // 3. Generate and encrypt token
    const token = this.generateToken()
    const encryptedToken = this.encryptToken(token)

    // 4. Expire old tokens
    await this.expireOldTokens(user)

    // 5. Create new token
    await this.createResetToken(user, token)

    // 6. Send reset email
    await this.sendResetEmail(user, encryptedToken)

    // 7. Log the action
    await this.logAudit('request_password_reset', 'user', user.id, null, {
      email: user.email,
      ip: dto.ipAddress,
    })
  }

  /**
   * Check rate limit for password reset requests
   */
  private async checkRateLimit(key: string): Promise<void> {
    const [error] = await this.limiter.penalize(key, async () => {
      return true
    })

    if (error) {
      throw new Error('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.')
    }
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return string.generateRandom(32)
  }

  /**
   * Encrypt token for URL
   */
  private encryptToken(token: string): string {
    return encryption.encrypt(token)
  }

  /**
   * Expire all old password reset tokens for user
   */
  private async expireOldTokens(user: User): Promise<void> {
    await PasswordResetToken.query()
      .where('user_id', user.id)
      .where('expires_at', '>', DateTime.now().toSQL())
      .update({ expires_at: DateTime.now().toSQL() })
  }

  /**
   * Create new password reset token
   */
  private async createResetToken(user: User, token: string): Promise<void> {
    await user.related('passwordResetTokens').create({
      value: token,
      expires_at: DateTime.now().plus({ hour: 1 }),
    })
  }

  /**
   * Send password reset email
   */
  private async sendResetEmail(user: User, encryptedToken: string): Promise<void> {
    const resetLink = router
      .builder()
      .prefixUrl(env.get('APP_URL'))
      .params({ value: encryptedToken })
      .make('forgot_password.reset')

    await mail.sendLater((message) => {
      message
        .subject('Đặt lại mật khẩu ShadcnAdmin')
        .to(user.email)
        .htmlView('emails/forgot_password', {
          user,
          resetLink,
        })
    })
  }
}
