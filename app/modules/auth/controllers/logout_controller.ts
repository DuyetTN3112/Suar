import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildLogoutUserDTO } from './mappers/request/auth_request_mapper.js'
import {
  getLogoutRedirectPath,
  mapLoggedOutAuthShare,
  shouldUseInertiaLocation,
} from './mappers/response/auth_response_mapper.js'

import LogoutUserCommand from '#modules/auth/actions/commands/logout_user_command'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

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
@inject()
export default class LogoutController {
  constructor(private readonly logoutUser: LogoutUserCommand) {}

  /**
   * Handle logout request
   * Uses LogoutUserCommand for business logic
   */
  async handle(ctx: HttpContext) {
    const { request, response, inertia, session, auth } = ctx

    // 1. Build DTO
    if (!auth.user) {
      response.redirect().toPath(getLogoutRedirectPath())
      return
    }

    const dto = buildLogoutUserDTO(request, auth.user.id, session.sessionId)
    await this.logoutUser.execute({
      context: actionContextFromHttp(ctx),
      dto,
      revokeWebSession: async () => {
        await auth.use('web').logout()
        session.forget('auth')
        session.forget('show_organization_required_modal')
        session.forget('intended_url')
      },
    })
    inertia.share(mapLoggedOutAuthShare())

    // Redirect to login — always use inertia.location for full page redirect
    //    (session.flash won't work after session is cleared)
    const isInertia = request.header('X-Inertia')
    if (shouldUseInertiaLocation(isInertia)) {
      inertia.location(getLogoutRedirectPath())
      return
    }
    response.redirect().toPath(getLogoutRedirectPath())
  }
}
