import type { HttpContext } from '@adonisjs/core/http'
import type { ProjectRole } from '#constants/project_constants'
import AddProjectMemberCommand from '#actions/projects/commands/add_project_member_command.js'
import { AddProjectMemberDTO } from '#actions/projects/dtos/add_project_member_dto.js'

/**
 * POST /projects/members → Add member to project
 */
export default class AddProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    try {
      const dto = new AddProjectMemberDTO({
        project_id: request.input('project_id') as string,
        user_id: request.input('user_id') as string,
        project_role: request.input('project_role') as ProjectRole,
      })

      const command = new AddProjectMemberCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Đã thêm thành viên vào dự án thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi thêm thành viên'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
