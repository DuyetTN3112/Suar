import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/admin_user_action_factory'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
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

    const action = request.url().includes('/activate') ? 'activate' : 'suspend'
    const execCtx = actionContextFromHttp(ctx)
    const command = this.actions.makeSuspendUserCommand(execCtx)
    const userIdRaw: unknown = params['userId']
    if (typeof userIdRaw !== 'string' || userIdRaw.length === 0) {
      throw ValidationException.field('userId', 'Invalid user id')
    }

    await command
      .executeAndWrap({
        userId: userIdRaw,
        action,
      })
      .then((outcome) => outcome.getValue())

    session.flash(
      'success',
      action === 'suspend' ? 'User suspended successfully' : 'User activated successfully'
    )
    response.redirect().back()
  }
}
