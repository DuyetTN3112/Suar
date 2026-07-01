import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteProjectDTO } from '../mappers/request/project-context/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'

/**
 * DELETE /projects/:id → Delete project
 */
@inject()
export default class DeleteProjectController {
  constructor(private readonly lifecycleCommands: ProjectLifecycleCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const dto = buildDeleteProjectDTO(request, params['projectId'] as string)
    const command = this.lifecycleCommands.makeDelete(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    session.flash('success', 'Dự án đã được xóa thành công')
    response.redirect().toRoute('projects.index')
  }
}
