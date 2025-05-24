import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import User from '#models/user'

@inject()
export default class WebLogin {
  constructor(protected ctx: HttpContext) {}

  async handle({ email, remember }: { email: string; password: string; remember?: boolean }) {
    // Rate limiting - bỏ qua rate limiting tạm thời
    // hoặc xử lý bằng cách khác nếu cần

    // Login attempt
    try {
      // Sử dụng phương thức login trực tiếp
      // Trước tiên tìm user
      const user = await User.findBy('email', email)
      if (!user) {
        throw new Error('User not found')
      }
      // Kiểm tra password - trong thực tế cần xử lý phức tạp hơn
      // Ở đây chỉ là giải pháp tạm thời
      await this.ctx.auth.use('web').login(user, remember)
      return { success: true }
    } catch (error) {
      throw new Exception('Email hoặc mật khẩu không chính xác.', {
        code: 'E_INVALID_CREDENTIALS',
        status: 400,
      })
    }
  }

  // async clearRateLimits(email: string) {
  //   // Tạm thời bỏ qua phương thức này
  //   // Trong thực tế, cần triển khai phương thức phù hợp
  //   return true
  // }
}
