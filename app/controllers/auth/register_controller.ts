import Register from '#actions/auth/http/register'
import { registerValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'

export default class RegisterController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    try {
      // Validate dữ liệu
      const form = await request.validateUsing(registerValidator)

      // Chuẩn bị dữ liệu cho Register action theo cấu trúc cần thiết
      const data = {
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        email: form.email,
        password: form.password,
      }
      const register = new Register(ctx)
      const user = await register.handle({ data })

      return response.redirect('/tasks')
    } catch (error) {
      session.flash('errors', {
        form: 'Có lỗi xảy ra khi đăng ký, vui lòng thử lại',
        ...(error.messages || {}),
      })
      return response.redirect().back()
    }
  }
}
