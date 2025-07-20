import type { HttpContext } from '@adonisjs/core/http'

import UpdateUserSystemRoleCommand from '#actions/admin/users/commands/update_user_system_role_command'
import { ErrorMessages } from '#constants/error_constants'
import { SystemRoleName } from '#constants/user_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

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
export default class UpdateUserRoleController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const rawUserId: unknown = params.id
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

    const execCtx = ExecutionContext.fromHttp(ctx)
    const command = new UpdateUserSystemRoleCommand(execCtx)

    await command.handle({
      userId: rawUserId,
      systemRole: rawSystemRole,
    })

    session.flash('success', 'User role updated successfully')
    response.redirect().back()
  }
}
