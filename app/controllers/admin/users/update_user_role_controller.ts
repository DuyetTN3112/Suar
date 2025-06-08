import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateUserSystemRoleCommand from '#actions/admin/users/commands/update_user_system_role_command'

const SYSTEM_ROLES = ['superadmin', 'system_admin', 'registered_user'] as const
type SystemRole = (typeof SYSTEM_ROLES)[number]

const isSystemRole = (value: string): value is SystemRole => {
  return SYSTEM_ROLES.includes(value as SystemRole)
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
      throw new Error('Invalid user id')
    }

    const rawSystemRole: unknown = request.input('system_role')
    if (typeof rawSystemRole !== 'string' || rawSystemRole.length === 0) {
      throw new Error('system_role is required')
    }
    if (!isSystemRole(rawSystemRole)) {
      throw new Error('Invalid system_role')
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
