import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/users/admin_user_action_factory'
import { buildSuspendUserRequest } from '#modules/admin/users/controllers/mappers/request/users/admin_user_mutation_request_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * SuspendUserController
 *
 * Suspend/activate user
 *
 * PUT /admin/users/:id/suspend
 * PUT /admin/users/:id/activate
 */
@inject()
export default class SuspendUserController {
  constructor(private readonly actions: AdminUserActionFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const requestDto = buildSuspendUserRequest(params, request.url())
    const execCtx = actionContextFromHttp(ctx)
    const command = this.actions.makeSuspendUserCommand(execCtx)

    await command
      .executeAndWrap({
        userId: requestDto.userId,
        action: requestDto.action,
      })
      .then((outcome) => outcome.getValue())

    session.flash(
      'success',
      requestDto.action === 'suspend' ? 'User suspended successfully' : 'User activated successfully'
    )
    response.redirect().back()
  }
}
