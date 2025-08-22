import type { HttpContext } from '@adonisjs/core/http'

import { buildAddProjectMemberDTO } from './mappers/request/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import AddProjectMemberCommand from '#modules/projects/actions/commands/add_project_member_command'

/**
 * POST /projects/members → Add member to project
 */
export default class AddProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const dto = buildAddProjectMemberDTO(request)

    const command = new AddProjectMemberCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Đã thêm thành viên vào dự án thành công')
    response.redirect().back()
  }
}
