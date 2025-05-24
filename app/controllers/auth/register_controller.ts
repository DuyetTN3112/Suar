import { RegisterUserCommand } from '#actions/auth/commands/index'
import { RegisterUserDTO } from '#actions/auth/dtos/index'
import { registerValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * RegisterController
 *
 * Handles user registration via web interface.
 * This is a thin controller that delegates to RegisterUserCommand.
 *
 * Routes:
 * - GET /register - Show registration form
 * - POST /register - Process registration
 */
export default class RegisterController {
  /**
   * Show registration form
   */
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }

  /**
   * Process registration request
   * Uses RegisterUserCommand for business logic
   */
  async store(ctx: HttpContext) {
    const { request, response, session } = ctx

    try {
      // 1. Validate input
      const form = await request.validateUsing(registerValidator)

      // 2. Build DTO from validated form
      const dto = this.buildRegisterDTO(form)

      // 3. Execute command
      const command = new RegisterUserCommand(ctx)
      await command.handle(dto)

      // 4. Redirect to dashboard on success
      return response.redirect('/tasks')
    } catch (error) {
      // 5. Handle errors
      session.flashAll()
      session.flash('errors', {
        form:
          error instanceof Error
            ? error.message
            : 'Có lỗi xảy ra khi đăng ký, vui lòng thử lại',
        ...(error.messages || {}),
      })
      return response.redirect().back()
    }
  }

  /**
   * Build RegisterUserDTO from validated form data
   */
  private buildRegisterDTO(form: any): RegisterUserDTO {
    return new RegisterUserDTO({
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      password: form.password,
    })
  }
}
