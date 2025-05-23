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
      console.log('[REGISTER CONTROLLER] Starting registration process')
      // Validate dữ liệu
      const form = await request.validateUsing(registerValidator)
      console.log('[REGISTER CONTROLLER] Data validated:', {
        username: form.username,
        email: form.email,
      })

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
      console.log('[REGISTER CONTROLLER] Registration successful, redirecting to tasks', {
        userId: user?.id,
      })

      return response.redirect('/tasks')
    } catch (error) {
      console.error('[REGISTER CONTROLLER] Error during registration:', error)
      session.flash('errors', {
        form: 'Có lỗi xảy ra khi đăng ký, vui lòng thử lại',
        ...(error.messages || {}),
      })
      return response.redirect().back()
    }
  }
}
