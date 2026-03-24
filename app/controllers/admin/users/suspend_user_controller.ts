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
      const action = request.url()?.includes('/activate') ? 'activate' : 'suspend'

      // Create execution context
      const execCtx = ExecutionContext.fromHttp(ctx)

      // Execute command
      const command = new SuspendUserCommand(execCtx)
      await command.handle({
        userId: params.id,
        action,
      })

      session.flash(
        'success',
        action === 'suspend' ? 'User suspended successfully' : 'User activated successfully'
      )
      response.redirect().back()
    } catch (error: any) {
      session.flash('error', error.message || 'Failed to update user status')
      response.redirect().back()
    }
  }
}
