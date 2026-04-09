import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddProjectMemberCommand from '#actions/projects/commands/add_project_member_command'
import { buildAddProjectMemberDTO } from './mapper/request/project_request_mapper.js'

/**
 * POST /projects/members → Add member to project
 */
export default class AddProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const dto = buildAddProjectMemberDTO(request)

    const command = new AddProjectMemberCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Đã thêm thành viên vào dự án thành công')
    response.redirect().back()
  }
}
