import User from '#models/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'

@inject()
export default class ForgotPassword {
  constructor(protected ctx: HttpContext) {}

  async handle({ email }: { email: string }) {
    const user = await User.findBy('email', email)
    if (!user) {
      return {
        status: 'error',
        message: 'Không tìm thấy tài khoản với email này',
      }
    }

    // Tạo token reset password (thường là 24h)
    const token = randomBytes(32).toString('hex')
    await db.table('password_reset_tokens').insert({
      email: user.email,
      token: token,
      created_at: DateTime.now().toSQL(),
    })

    // URL reset password
    const resetUrl = `/auth/reset-password/${token}`

    // Gửi email
    await mail.send((message) => {
      message
        .to(user.email)
        .subject('Đặt lại mật khẩu')
        .htmlView('emails/reset_password', { user, resetUrl })
    })

    return {
      status: 'success',
      message: 'Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn',
    }
  }
}
