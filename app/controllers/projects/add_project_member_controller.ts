import type { HttpContext } from '@adonisjs/core/http'
import type { ProjectRole } from '#constants/project_constants'
import AddProjectMemberCommand from '#actions/projects/commands/add_project_member_command'
import { AddProjectMemberDTO } from '#actions/projects/dtos/request/add_project_member_dto'

/**
 * POST /projects/members → Add member to project
 */
export default class AddProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const dto = new AddProjectMemberDTO({
      project_id: request.input('project_id') as string,
      user_id: request.input('user_id') as string,
      project_role: request.input('project_role') as ProjectRole,
    })

    const command = new AddProjectMemberCommand(ctx)
    await command.handle(dto)

    session.flash('success', 'Đã thêm thành viên vào dự án thành công')
    response.redirect().back()
  }
}
