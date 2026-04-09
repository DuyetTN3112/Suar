import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateCustomRolesCommand from '#actions/organization/access/commands/update_custom_roles_command'
import { buildUpdateCustomRolesDTO } from '#controllers/organization/access/support/update_roles_request_mapper'

export default class UpdateRolesController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)

    const command = new UpdateCustomRolesCommand(execCtx)
    await command.handle(buildUpdateCustomRolesDTO(request))

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Cập nhật vai trò tùy chỉnh thành công' })
      return
    }

    session.flash('success', 'Cập nhật vai trò tùy chỉnh thành công')
    response.redirect().toRoute('org.roles.index')
  }
}
