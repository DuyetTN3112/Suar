import LogoutUserCommand from '#actions/auth/commands/logout_user_command'
import { LogoutUserDTO } from '#actions/auth/dtos/request/logout_user_dto'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * LogoutController
 *
 * Handles user logout via web interface.
 * This is a thin controller that delegates to LogoutUserCommand.
 *
 * Routes:
 * - POST /logout - Process logout
 * - GET /logout - Process logout
 */
export default class LogoutController {
  /**
   * Handle logout request
   * Uses LogoutUserCommand for business logic
   */
  async handle(ctx: HttpContext) {
    const { request, response, inertia, session, auth } = ctx

    // 1. Build DTO
    const dto = new LogoutUserDTO({
      userId: auth.user!.id,
      sessionId: session.sessionId,
      ipAddress: request.ip(),
    })

    // 2. Execute command
    const command = new LogoutUserCommand(ctx)
    await command.handle(dto)

    // 3. Set success message
    session.flash('success', 'Đã đăng xuất thành công')

    // 4. Redirect to login
    await this.redirectToLogin(request, response, inertia)
  }

  /**
   * Redirect to login page
   * Supports both Inertia and regular redirects
   */
  private async redirectToLogin(
    request: HttpContext['request'],
    response: HttpContext['response'],
    inertia: HttpContext['inertia']
  ) {
    const isInertia = request.header('X-Inertia')
    if (isInertia) {
      inertia.location('/login')
      return
    }
    response.redirect().toPath('/login')
  }
}
