import { BaseCommand } from '../../shared/base_command.js'
import type { ResetPasswordDTO } from '../dtos/reset_password_dto.js'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import hash from '@adonisjs/core/services/hash'
import encryption from '@adonisjs/core/services/encryption'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * ResetPasswordCommand
 *
 * Resets user password using valid token.
 * This is a Command (Write operation) that modifies user password.
 *
 * Business Rules:
 * - Token must be valid (not expired, not used)
 * - Token is decrypted from URL
 * - New password handling (plain text in dev, hashed in production)
 * - Token is expired after use (single-use)
 * - User is auto-logged in after reset
 * - Audit log created
 *
 * Security:
 * - ✅ Token validation (expiry, existence)
 * - ✅ Single-use tokens
 * - ✅ Constant-time token comparison (via database)
 * - ⚠️ Password hashing DISABLED for development (set USE_PASSWORD_HASH = true in production!)
 */
export default class ResetPasswordCommand extends BaseCommand<ResetPasswordDTO, User> {
  // 🔧 DEVELOPMENT MODE: Set to true to enable password hashing in production
  private readonly USE_PASSWORD_HASH = false

  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Main handler - resets password and auto-login
   */
  async handle(dto: ResetPasswordDTO): Promise<User> {
    // 1. Decrypt token from URL
    const decryptedToken = this.decryptToken(dto.token)

    // 2. Verify token validity
    const tokenRecord = await this.verifyToken(decryptedToken)

    // 3. Get user
    const user = await this.getUserFromToken(tokenRecord.user_id)

    // 4. Prepare new password (hash in production, plain text in dev)
    const newPassword = this.USE_PASSWORD_HASH
      ? await this.hashPassword(dto.newPassword) // 🔒 PRODUCTION: Hash password
      : dto.newPassword // 🔧 DEVELOPMENT: Plain text for faster dev

    // 5. Update password
    await this.updatePassword(user, newPassword)

    // 6. Expire token (single-use)
    await this.expireToken(tokenRecord)

    // 7. Auto-login user
    await this.autoLogin(user)

    // 8. Log the action
    await this.logAudit('reset_password', 'user', user.id, null, {
      email: user.email,
      ip: dto.ipAddress,
    })

    return user
  }

  /**
   * Decrypt token from URL
   */
  private decryptToken(encryptedToken: string): string {
    try {
      return encryption.decrypt(encryptedToken) as string
    } catch (error) {
      throw new Error('Token không hợp lệ')
    }
  }

  /**
   * Verify token exists and is not expired
   */
  private async verifyToken(token: string): Promise<PasswordResetToken> {
    const tokenRecord = await PasswordResetToken.query()
      .where('value', token)
      .where('expires_at', '>', DateTime.now().toSQL())
      .first()

    if (!tokenRecord) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn')
    }

    return tokenRecord
  }

  /**
   * Get user from token
   */
  private async getUserFromToken(userId: number): Promise<User> {
    const user = await User.find(userId)
    if (!user) {
      throw new Error('Người dùng không tồn tại')
    }
    return user
  }

  /**
   * Hash new password
   * Only used when USE_PASSWORD_HASH = true
   */
  private async hashPassword(password: string): Promise<string> {
    // 🔒 PRODUCTION: Hash password securely
    return await hash.make(password)
  }

  /**
   * Update user password
   */
  private async updatePassword(user: User, hashedPassword: string): Promise<void> {
    user.password = hashedPassword
    await user.save()
  }

  /**
   * Expire token after use (single-use tokens)
   */
  private async expireToken(tokenRecord: PasswordResetToken): Promise<void> {
    tokenRecord.expires_at = DateTime.now()
    await tokenRecord.save()
  }

  /**
   * Auto-login user after password reset
   */
  private async autoLogin(user: User): Promise<void> {
    await this.ctx.auth.use('web').login(user)
  }
}
