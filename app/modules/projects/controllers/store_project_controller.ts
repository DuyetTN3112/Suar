import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateProjectDTO } from './mappers/request/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateProjectCommand from '#modules/projects/actions/commands/create_project_command'

/**
 * POST /projects → Store new project
 */
export default class StoreProjectController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const dto = buildCreateProjectDTO(request, request.input('organization_id') as string)
    const command = new CreateProjectCommand(actionContextFromHttp(ctx))
    const project = await command.handle(dto)

    session.flash('success', 'Dự án đã được tạo thành công')
    response.redirect().toRoute('projects.show', { id: project.id })
  }
}
