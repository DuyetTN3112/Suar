import WebLogin from '#actions/auth/http/web_login'
import ResetPassword from '#actions/auth/password_reset/reset_password'
import TrySendPasswordResetEmail from '#actions/auth/password_reset/try_send_password_reset_email'
import VerifyPasswordResetToken from '#actions/auth/password_reset/verify_password_reset_token'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

// Tạo validator schema tại chỗ
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

export default class ForgotPasswordController {
  #sentSessionKey = 'FORGOT_PASSWORD_SENT'

  async index({ inertia, session }: HttpContext) {
    const isSent = session.flashMessages.has(this.#sentSessionKey)

    return inertia.render('auth/forgot_password', { isSent })
  }

  async send({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(passwordResetSendValidator)

    await TrySendPasswordResetEmail.handle(data)

    session.flash(this.#sentSessionKey, true)

    return response.redirect().back()
  }

  async reset({ params, inertia, response }: HttpContext) {
    const { isValid, user } = await VerifyPasswordResetToken.handle({
      encryptedValue: params.value,
    })

    response.header('Referrer-Policy', 'no-referrer')

    return inertia.render('auth/reset_password', {
      value: params.value,
      email: user?.email,
      isValid,
    })
  }

  @inject()
  async update({ request, response, session, auth }: HttpContext, webLogin: WebLogin) {
    const data = await request.validateUsing(passwordResetValidator)
    const user = await ResetPassword.handle({ data })

    await auth.use('web').login(user)
    await webLogin.clearRateLimits(user.email)

    session.flash('success', 'Mật khẩu của bạn đã được cập nhật')

    return response.redirect().toRoute('dashboard')
  }
}
