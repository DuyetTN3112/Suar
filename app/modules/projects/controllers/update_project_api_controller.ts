import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateProjectDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectMutationApiBody } from './mappers/response/project_response_mapper.js'

import UpdateProjectCommand from '#actions/projects/commands/update_project_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import { ExecutionContext } from '#types/execution_context'

/**
 * PUT /api/projects/:id → Update project (API)
 * Controller is thin adapter only; business rules are in command + domain policy.
 */
export default class UpdateProjectApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildUpdateProjectDTO(request, params.id as string)

    const command = new UpdateProjectCommand(ExecutionContext.fromHttp(ctx))
    const project = await command.handle(dto)

    response.json(mapProjectMutationApiBody(project))
  }
}
