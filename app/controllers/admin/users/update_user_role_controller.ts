import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateUserSystemRoleCommand from '#actions/admin/users/commands/update_user_system_role_command'

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
    const userId = params.id
    const { system_role } = request.only(['system_role'])

    const execCtx = ExecutionContext.fromHttp(ctx)
    const command = new UpdateUserSystemRoleCommand(execCtx)

    await command.handle({
      userId,
      systemRole: system_role,
    })

    session.flash('success', 'User role updated successfully')
    response.redirect().back()
  }
}
