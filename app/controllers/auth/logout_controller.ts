import LogoutUserCommand from '#actions/auth/commands/logout_user_command'
import { LogoutUserDTO } from '#actions/auth/dtos/request/logout_user_dto'
import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import { AuthRoutes } from '#constants/route_constants'

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
    if (!auth.user) {
      response.redirect().toPath(AuthRoutes.LOGIN)
      return
    }

    const dto = new LogoutUserDTO({
      userId: auth.user.id,
      sessionId: session.sessionId,
      ipAddress: request.ip(),
    })

    // 2. Execute command (audit log + event emission)
    const command = new LogoutUserCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    // 3. Handle HTTP-specific logout operations (auth, session, inertia)
    await auth.use('web').logout()
    session.forget('auth')
    session.forget('show_organization_required_modal')
    session.forget('intended_url')
    inertia.share({ auth: { user: null } })

    // 4. Redirect to login — always use inertia.location for full page redirect
    //    (session.flash won't work after session is cleared)
    const isInertia = request.header('X-Inertia')
    if (isInertia) {
      inertia.location(AuthRoutes.LOGIN)
      return
    }
    response.redirect().toPath(AuthRoutes.LOGIN)
  }
}
