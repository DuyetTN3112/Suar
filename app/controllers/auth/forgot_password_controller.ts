import ForgotPassword from '#actions/auth/http/forgot_password'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

export default class ForgotPasswordController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/forgot-password')
  }

  @inject()
  async store({ request, response, session }: HttpContext, forgotPassword: ForgotPassword) {
    const { email } = request.only(['email'])
    const result = await forgotPassword.handle({ email })
    session.flash(result.status, result.message)
    if (result.status === 'error') {
      return response.redirect().back()
    }
    return response.redirect().toRoute('auth.login')
  }
}
