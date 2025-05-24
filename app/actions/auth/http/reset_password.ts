import User from '#models/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type ResetPasswordData = {
  token: string
  email: string
  password: string
  password_confirmation: string
}

@inject()
export default class ResetPassword {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: ResetPasswordData }) {
    // Tìm token hợp lệ
    const resetToken = await db
      .from('password_reset_tokens')
      .where('email', data.email)
      .where('token', data.token)
      .first()

    if (!resetToken) {
      return {
        status: 'error',
        message: 'Token không hợp lệ hoặc đã hết hạn',
      }
    }

    // Tìm user
    const user = await User.findBy('email', data.email)
    if (!user) {
      return {
        status: 'error',
        message: 'Không tìm thấy tài khoản với email này',
      }
    }

    // Cập nhật mật khẩu
    user.password = data.password
    await user.save()

    // Xóa token sau khi đã sử dụng
    await db.from('password_reset_tokens').where('email', data.email).delete()

    // Đăng nhập người dùng
    await this.ctx.auth.use('web').login(user)

    return {
      status: 'success',
      message: 'Mật khẩu đã được đặt lại thành công',
      user,
    }
  }
}
