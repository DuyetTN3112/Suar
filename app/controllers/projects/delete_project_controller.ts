import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteProjectCommand from '#actions/projects/commands/delete_project_command'
import { DeleteProjectDTO } from '#actions/projects/dtos/request/delete_project_dto'

/**
 * DELETE /projects/:id → Delete project
 */
export default class DeleteProjectController {
  async handle(ctx: HttpContext) {
    const { params, response, session } = ctx
    const dto = new DeleteProjectDTO({ project_id: params.id as string })
    const command = new DeleteProjectCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Dự án đã được xóa thành công')
    response.redirect().toRoute('projects.index')
  }
}
