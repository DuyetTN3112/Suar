import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateProjectMemberCommand from '#modules/projects/actions/commands/update_project_member_command'
import { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import type { ProjectRole } from '#modules/projects/public_contracts/project_constants'

/**
 * PUT /projects/members/:userId → Update member role in project
 */
export default class UpdateProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const dto = new UpdateProjectMemberDTO({
      project_id: request.input('project_id') as string,
      user_id: params.userId as string,
      project_role: request.input('project_role') as ProjectRole,
    })

    const command = new UpdateProjectMemberCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Đã cập nhật vai trò thành viên')
    response.redirect().back()
  }
}
