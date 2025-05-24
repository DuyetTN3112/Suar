import { RequestPasswordResetCommand, ResetPasswordCommand } from '#actions/auth/commands/index'
import { RequestPasswordResetDTO, ResetPasswordDTO } from '#actions/auth/dtos/index'
import PasswordResetToken from '#models/password_reset_token'
import encryption from '@adonisjs/core/services/encryption'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

// Validator schemas
const passwordResetSendValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
  })
)

const passwordResetValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
    password_confirmation: vine.string().confirmed({ confirmationField: 'password' }),
    value: vine.string(), // token được truyền dưới tên value
  })
)

/**
 * ForgotPasswordController
 *
 * Handles password reset flow via web interface.
 * Uses CQRS Commands for business logic.
 */
export default class ForgotPasswordController {
  #sentSessionKey = 'FORGOT_PASSWORD_SENT'

  /**
   * Show forgot password form
   */
  async index({ inertia, session }: HttpContext) {
    const isSent = session.flashMessages.has(this.#sentSessionKey)
    return inertia.render('auth/forgot_password', { isSent })
  }

  /**
   * Send password reset email
   * Uses RequestPasswordResetCommand
   */
  async send({ request, response, session }: HttpContext) {
    try {
      // 1. Validate
      const data = await request.validateUsing(passwordResetSendValidator)

      // 2. Build DTO
      const dto = new RequestPasswordResetDTO({
        email: data.email,
        ipAddress: request.ip(),
      })

      // 3. Execute command
      const command = new RequestPasswordResetCommand({ request, response, session } as any)
      await command.handle(dto)

      // 4. Success
      session.flash(this.#sentSessionKey, true)
      return response.redirect().back()
    } catch (error) {
      session.flash('errors', {
        email: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
      return response.redirect().back()
    }
  }

  /**
   * Show password reset form
   */
  async reset({ params, inertia, response }: HttpContext) {
    try {
      const { isValid, user } = await this.verifyToken(params.value)
      response.header('Referrer-Policy', 'no-referrer')

      return inertia.render('auth/reset_password', {
        value: params.value,
        email: user?.email,
        isValid,
      })
    } catch (error) {
      return inertia.render('auth/reset_password', {
        value: params.value,
        email: null,
        isValid: false,
      })
    }
  }

  /**
   * Process password reset
   * Uses ResetPasswordCommand
   */
  async update({ request, response, session, auth }: HttpContext) {
    try {
      // 1. Validate
      const data = await request.validateUsing(passwordResetValidator)

      // 2. Build DTO
      const dto = new ResetPasswordDTO({
        token: data.value,
        newPassword: data.password,
        ipAddress: request.ip(),
      })

      // 3. Execute command
      const command = new ResetPasswordCommand({ request, response, session, auth } as any)
      await command.handle(dto)

      // 4. Success
      session.flash('success', 'Mật khẩu của bạn đã được cập nhật')
      return response.redirect().toRoute('dashboard')
    } catch (error) {
      session.flash('errors', {
        password: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      })
      return response.redirect().back()
    }
  }

  /**
   * Verify token helper
   */
  private async verifyToken(encryptedToken: string): Promise<{
    isValid: boolean
    user: { email: string } | null
  }> {
    try {
      const decryptedToken = encryption.decrypt(encryptedToken) as string
      const tokenRecord = await PasswordResetToken.query()
        .where('value', decryptedToken)
        .where('expires_at', '>', DateTime.now().toSQL())
        .preload('user')
        .first()

      if (!tokenRecord) {
        return { isValid: false, user: null }
      }

      return {
        isValid: true,
        user: { email: tokenRecord.user.email },
      }
    } catch (error) {
      return { isValid: false, user: null }
    }
  }
}

