import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteProjectDTO } from './mappers/request/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteProjectCommand from '#modules/projects/actions/commands/delete_project_command'

/**
 * DELETE /projects/:id → Delete project
 */
export default class DeleteProjectController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = buildDeleteProjectDTO(request, params.id as string)
    const command = new DeleteProjectCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Dự án đã được xóa thành công')
    response.redirect().toRoute('projects.index')
  }
}
