import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/admin_user_action_factory'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

const SYSTEM_ROLES = Object.values(SystemRoleName) as readonly string[]
type SystemRole = SystemRoleName

const isSystemRole = (value: string): value is SystemRole => {
  return SYSTEM_ROLES.includes(value)
}

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
    const rawUserId: unknown = params['userId']
    if (typeof rawUserId !== 'string' || rawUserId.length === 0) {
      throw new BusinessLogicException(ErrorMessages.INVALID_ID)
    }

    const rawSystemRole: unknown = request.input('system_role')
    if (typeof rawSystemRole !== 'string' || rawSystemRole.length === 0) {
      throw new BusinessLogicException(ErrorMessages.FIELD_REQUIRED)
    }
    if (!isSystemRole(rawSystemRole)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const execCtx = actionContextFromHttp(ctx)
    const command = this.actions.makeUpdateUserSystemRoleCommand(execCtx)

    await command
      .executeAndWrap({
        userId: rawUserId,
        systemRole: rawSystemRole,
      })
      .then((outcome) => outcome.getValue())

    session.flash('success', 'User role updated successfully')
    response.redirect().back()
  }
}
