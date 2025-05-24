import { AuthenticateUserCommand } from '#actions/auth/commands/index'
import { AuthenticateUserDTO } from '#actions/auth/dtos/index'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * LoginController
 *
 * Handles user authentication (login) via web interface.
 * This is a thin controller that delegates to AuthenticateUserCommand.
 *
 * Routes:
 * - GET /login - Show login form
 * - POST /login - Process login
 */
export default class LoginController {
  /**
   * Show login form
   */
  async show({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  /**
   * Process login request
   * Uses AuthenticateUserCommand for business logic
   */
  async store(ctx: HttpContext) {
    const { request, response, session } = ctx

    try {
      // 1. Build DTO from request
      const dto = this.buildAuthenticateDTO(request, ctx)

      // 2. Execute command
      const command = new AuthenticateUserCommand(ctx)
      await command.handle(dto)

      // 3. Redirect to dashboard on success
      return response.redirect().toPath('/tasks')
    } catch (error) {
      // 4. Handle errors
      session.flashAll()
      session.flash('errors', {
        email: error instanceof Error ? error.message : 'Có lỗi xảy ra khi đăng nhập',
      })
      return response.redirect().back()
    }
  }

  /**
   * Build AuthenticateUserDTO from request
   */
  private buildAuthenticateDTO(request: any, _ctx: HttpContext): AuthenticateUserDTO {
    const { email, password, remember } = request.only(['email', 'password', 'remember'])

    return new AuthenticateUserDTO({
      email,
      password,
      remember: remember === 'true' || remember === true,
      ipAddress: request.ip(),
    })
  }
}
