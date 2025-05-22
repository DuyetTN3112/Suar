import Register from '#actions/auth/http/register'
import type { HttpContext } from '@adonisjs/core/http'

export default class RegisterController {
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const formData = request.only(['first_name', 'last_name', 'username', 'email', 'password'])
    const data = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      email: formData.email,
      password: formData.password,
    }

    const register = new Register(ctx)
    await register.handle({ data })

    return response.redirect('/tasks')
  }
}
