import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondCreatedMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationProjectCreationCommandFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_creation_command_factory'
import { buildCreateCurrentOrganizationProjectDTO } from '#modules/organizations/controllers/mappers/request/projects/current_project_request_mapper'
import { mapCurrentOrganizationProjectMutationApiBody } from '#modules/organizations/controllers/mappers/response/projects/current_project_response_mapper'

/**
 * CreateProjectController
 *
 * Create new project
 *
 * POST /org/projects
 */
@inject()
export default class CreateProjectController {
  constructor(private readonly actions: OrganizationProjectCreationCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const input = buildCreateCurrentOrganizationProjectDTO(request, organizationId)

    const project = await this.actions
      .make(execCtx)
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

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
