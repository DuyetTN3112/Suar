import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ToggleAdminModeCommand from '#actions/admin/commands/toggle_admin_mode_command'

/**
 * Toggle admin mode for system admins.
 *
 * POST /admin/toggle
 */
export default class ToggleAdminModeController {
  async handle(ctx: HttpContext) {
    const { auth, request, response, session } = ctx
    const user = auth.user
    if (!user) {
      response.redirect().toPath('/login')
      return
    }

    const enabledInput: unknown = request.input('enabled')
    const currentValue = Boolean(session.get('is_admin_mode', false))
    const nextValue =
      typeof enabledInput === 'boolean'
        ? enabledInput
        : typeof enabledInput === 'string'
          ? enabledInput === 'true'
          : !currentValue

    const result = await new ToggleAdminModeCommand(ExecutionContext.fromHttp(ctx)).handle({
      enabled: nextValue,
    })

    session.put('is_admin_mode', result.enabled)
    session.flash('success', result.successMessage)
    response.redirect(result.redirectPath)
  }
}
