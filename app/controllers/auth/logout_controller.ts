import LogoutUserCommand from '#actions/auth/commands/logout_user_command.js'
import { LogoutUserDTO } from '#actions/auth/dtos/logout_user_dto.js'
import logger from '@adonisjs/core/services/logger'
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
    try {
      // Only logout if user is authenticated
      if (!auth.isAuthenticated) {
        await this.redirectToLogin(request, response, inertia)
        return
      }

      const user = auth.user
      if (!user) {
        await this.redirectToLogin(request, response, inertia)
        return
      }

      // 1. Build DTO
      const dto = new LogoutUserDTO({
        userId: user.id,
        sessionId: session.sessionId,
        ipAddress: request.ip(),
      })

      // 2. Execute command
      const command = new LogoutUserCommand(ctx)
      await command.handle(dto)

      // 3. Clear additional session data
      session.forget('show_organization_required_modal')
      session.forget('intended_url')

      // 4. Set success message
      session.flash('success', 'Đã đăng xuất thành công')

      // 5. Redirect to login
      await this.redirectToLogin(request, response, inertia)
      return
    } catch (error: unknown) {
      logger.error('Error during logout', { error, userId: auth.user?.id })
      session.flash('error', 'Có lỗi xảy ra khi đăng xuất')
      await this.redirectToLogin(request, response, inertia)
      return
    }
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
      return inertia.location('/login')
    }
    response.redirect().toPath('/login')
  }
}
