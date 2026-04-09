import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateProjectCommand from '#actions/projects/commands/create_project_command'
import { buildCreateProjectDTO } from './mapper/request/project_request_mapper.js'

/**
 * POST /projects → Store new project
 */
export default class StoreProjectController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const dto = buildCreateProjectDTO(request, request.input('organization_id') as string)
    const command = new CreateProjectCommand(ExecutionContext.fromHttp(ctx))
    const project = await command.handle(dto)

    session.flash('success', 'Dự án đã được tạo thành công')
    response.redirect().toRoute('projects.show', { id: project.id })
  }
}
