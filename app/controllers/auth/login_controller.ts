import Login from '#actions/auth/http/login'
import type { HttpContext } from '@adonisjs/core/http'

export default class LoginController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    const data = request.only(['email', 'password', 'remember'])
    console.log('[LOGIN CONTROLLER] Processing login request', { email: data.email })
    try {
      const login = new Login(ctx)
      const user = await login.handle({ data })
      if (!user) {
        console.log('[LOGIN CONTROLLER] Login failed')
        return response.redirect().back()
      }
      console.log('[LOGIN CONTROLLER] Login successful, redirecting to tasks', {
        userId: user.id,
        sessionId: session.sessionId,
      })
      // Sử dụng toPath thay vì toRoute để tránh vấn đề với route name
      return response.redirect().toPath('/tasks')
    } catch (error) {
      console.error('[LOGIN CONTROLLER] Error during login:', error)
      session.flash('errors', {
        email: 'Có lỗi xảy ra khi đăng nhập, vui lòng thử lại',
      })
      return response.redirect().back()
    }
  }
}
