import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/admin_user_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'


/**
 * ShowUserController
 *
 * Show user details
 *
 * GET /admin/users/:id
 */
@inject()
export default class ShowUserController {
  constructor(private readonly actions: AdminUserActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetUserDetailsQuery(execCtx)
    const userId = String(params['userId'])

    const user = await query.executeAndWrap({ userId }).then((outcome) => outcome.getValue())

    return inertia.render('users/show', { user })
  }
}
