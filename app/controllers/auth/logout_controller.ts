import { LogoutUserCommand } from '#actions/auth/commands/index'
import { LogoutUserDTO } from '#actions/auth/dtos/index'
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
  async handle({ request, response, inertia, session, auth }: HttpContext) {
    try {
      // Only logout if user is authenticated
      if (!auth.isAuthenticated) {
        return this.redirectToLogin(request, response, inertia)
      }

      const user = auth.user!

      // 1. Build DTO
      const dto = new LogoutUserDTO({
        userId: user.id,
        sessionId: session.sessionId,
        ipAddress: request.ip(),
      })

      // 2. Execute command
      const command = new LogoutUserCommand({
        request,
        response,
        inertia,
        session,
        auth,
      } as unknown)
      await command.handle(dto)

      // 3. Clear additional session data
      session.forget('show_organization_required_modal')
      session.forget('intended_url')

      // 4. Set success message
      session.flash('success', 'Đã đăng xuất thành công')

      // 5. Redirect to login
      return this.redirectToLogin(request, response, inertia)
    } catch (error) {
      logger.error('Error during logout', { error, userId: auth.user?.id })
      session.flash('error', 'Có lỗi xảy ra khi đăng xuất')
      return this.redirectToLogin(request, response, inertia)
    }
  }

  /**
   * Redirect to login page
   * Supports both Inertia and regular redirects
   */
  private redirectToLogin(request: unknown, response: unknown, inertia: unknown) {
    const isInertia = request.header('X-Inertia')
    if (isInertia) {
      return inertia.location('/login')
    }
    return response.redirect().toPath('/login')
  }
}
