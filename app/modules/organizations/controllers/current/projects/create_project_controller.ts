import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondCreatedMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import CreateCurrentOrganizationProjectCommand from '#modules/organizations/actions/current/projects/commands/create_project_command'
import { buildCreateCurrentOrganizationProjectDTO } from '#modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper'
import { mapCurrentOrganizationProjectMutationApiBody } from '#modules/organizations/controllers/current/projects/mappers/response/current_project_response_mapper'

/**
 * CreateProjectController
 *
 * Create new project
 *
 * POST /org/projects
 */
export default class CreateProjectController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildCreateCurrentOrganizationProjectDTO(request, organizationId)

    const project = await new CreateCurrentOrganizationProjectCommand(execCtx).handle(dto)

    respondCreatedMutationSuccess(ctx, {
      apiBody: mapCurrentOrganizationProjectMutationApiBody(project),
      redirect: {
        kind: 'route',
        to: 'org.projects.index',
      },
      successMessage: 'Tạo dự án thành công',
    })
  }
}
