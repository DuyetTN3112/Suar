import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/users/admin_user_action_factory'
import { buildUpdateUserRoleRequest } from '#modules/admin/users/controllers/mappers/request/users/admin_user_mutation_request_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

/**
 * UpdateUserRoleController
 *
 * Update user system_role
 *
 * PUT /admin/users/:id/role
 */
@inject()
export default class UpdateUserRoleController {
  constructor(private readonly actions: AdminUserActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const requestDto = buildUpdateUserRoleRequest(params, request.all())

    const execCtx = actionContextFromHttp(ctx)
    const command = this.actions.makeUpdateUserSystemRoleCommand(execCtx)

    await command
      .executeAndWrap({
        userId: requestDto.userId,
        systemRole: requestDto.systemRole,
      })
      .then((outcome) => outcome.getValue())

    session.flash('success', 'User role updated successfully')
    response.redirect().back()
  }
}
