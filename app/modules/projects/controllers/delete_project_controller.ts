import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteProjectDTO } from './mappers/request/project_request_mapper.js'

import DeleteProjectCommand from '#actions/projects/commands/delete_project_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * DELETE /projects/:id → Delete project
 */
export default class DeleteProjectController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = buildDeleteProjectDTO(request, params.id as string)
    const command = new DeleteProjectCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Dự án đã được xóa thành công')
    response.redirect().toRoute('projects.index')
  }
}
