import type { HttpContext } from '@adonisjs/core/http'

import { buildRemoveProjectMemberDTO } from './mappers/request/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RemoveProjectMemberCommand from '#modules/projects/actions/commands/remove_project_member_command'

/**
 * DELETE /projects/members/:userId → Remove member from project
 */
export default class RemoveProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const dto = buildRemoveProjectMemberDTO(request, params.userId as string)

    const command = new RemoveProjectMemberCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Đã xóa thành viên khỏi dự án')
    response.redirect().back()
  }
}
