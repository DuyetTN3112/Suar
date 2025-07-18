import type { HttpContext } from '@adonisjs/core/http'

import CreateCurrentOrganizationProjectCommand from '#actions/organizations/current/projects/commands/create_project_command'
import { ErrorMessages } from '#constants/error_constants'
import { buildCreateCurrentOrganizationProjectDTO } from '#controllers/organizations/current/projects/mappers/request/current_project_request_mapper'
import { mapCurrentOrganizationProjectMutationApiBody } from '#controllers/organizations/current/projects/mappers/response/current_project_response_mapper'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

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

    const dto = buildCreateCurrentOrganizationProjectDTO(request, organizationId)

    const project = await new CreateCurrentOrganizationProjectCommand(execCtx).handle(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.status(201).json(mapCurrentOrganizationProjectMutationApiBody(project))
      return
    }

    session.flash('success', 'Tạo dự án thành công')
    response.redirect().toRoute('org.projects.index')
  }
}
