import type { HttpContext } from '@adonisjs/core/http'

import SuspendUserCommand from '#actions/admin/users/commands/suspend_user_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * SuspendUserController
 *
 * Suspend/activate user
 *
 * PUT /admin/users/:id/suspend
 * PUT /admin/users/:id/activate
 */
export default class SuspendUserController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    try {
      // Determine action from endpoint
      const action = request.url().includes('/activate') ? 'activate' : 'suspend'

      // Create execution context
      const execCtx = ExecutionContext.fromHttp(ctx)

      // Execute command
      const command = new SuspendUserCommand(execCtx)
      const userIdRaw: unknown = params.id
      if (typeof userIdRaw !== 'string' || userIdRaw.length === 0) {
        throw new Error('Invalid user id')
      }

      await command.handle({
        userId: userIdRaw,
        action,
      })

      session.flash(
        'success',
        action === 'suspend' ? 'User suspended successfully' : 'User activated successfully'
      )
      response.redirect().back()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update user status'
      session.flash('error', message)
      response.redirect().back()
    }
  }
}
