import ResetPasswordCommand from '#actions/auth/commands/reset_password_command'
import { ResetPasswordDTO } from '#actions/auth/dtos/reset_password_dto'
import type { HttpContext } from '@adonisjs/core/http'

export default class ResetPasswordController {
  async show(ctx: HttpContext) {
    const { inertia, params } = ctx
    return inertia.render('auth/reset-password', {
      token: params.token,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx

    try {
      // Manual instantiation
      const resetPasswordCommand = new ResetPasswordCommand(ctx)

      const token = request.input('token')
      const newPassword = request.input('password')
      const ipAddress = request.ip()

      const dto = new ResetPasswordDTO({ token, newPassword, ipAddress })
      await resetPasswordCommand.handle(dto)

      session.flash('success', 'Mật khẩu đã được đặt lại thành công')
      return response.redirect('/tasks')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi đặt lại mật khẩu')
      return response.redirect().back()
    }
  }
}
