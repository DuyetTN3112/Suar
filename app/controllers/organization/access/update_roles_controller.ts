import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateCustomRolesCommand from '#actions/organization/access/commands/update_custom_roles_command'

export default class UpdateRolesController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const readInput = (key: string): unknown => request.input(key) as unknown

    const rawRoles =
      readInput('custom_roles') ?? readInput('roles') ?? readInput('customRoles') ?? []

    const command = new UpdateCustomRolesCommand(execCtx)
    await command.handle({
      custom_roles: rawRoles,
    })

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Cập nhật vai trò tùy chỉnh thành công' })
      return
    }

    session.flash('success', 'Cập nhật vai trò tùy chỉnh thành công')
    response.redirect().toRoute('org.roles.index')
  }
}
