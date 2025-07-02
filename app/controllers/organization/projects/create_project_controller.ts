import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateProjectCommand from '#actions/projects/commands/create_project_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { buildCreateProjectDTO } from '#controllers/projects/mapper/request/project_request_mapper'
import { mapProjectMutationApiBody } from '#controllers/projects/mapper/response/project_response_mapper'

/**
 * CreateProjectController
 *
 * Create new project
 *
 * POST /org/projects
 */
export default class CreateProjectController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildCreateProjectDTO(request, organizationId)

    const project = await new CreateProjectCommand(execCtx).handle(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.status(201).json(mapProjectMutationApiBody(project))
      return
    }

    session.flash('success', 'Tạo dự án thành công')
    response.redirect().toRoute('org.projects.index')
  }
}
