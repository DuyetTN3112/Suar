import ResetPassword from '#actions/auth/http/reset_password'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

export default class ResetPasswordController {
  async show({ inertia, params }: HttpContext) {
    return inertia.render('auth/reset-password', {
      token: params.token,
    })
  }

  @inject()
  async store({ request, response, session }: HttpContext, resetPassword: ResetPassword) {
    const data = request.only(['token', 'email', 'password', 'password_confirmation'])
    const result = await resetPassword.handle({ data })
    session.flash(result.status, result.message)
    if (result.status === 'error') {
      return response.redirect().back()
    }
    return response.redirect('/tasks')
  }
}
