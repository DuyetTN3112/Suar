import type { HttpContext } from '@adonisjs/core/http'
import UpdateProjectCommand from '#actions/projects/commands/update_project_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { ExecutionContext } from '#types/execution_context'
import { buildUpdateProjectDTO } from './mapper/request/project_request_mapper.js'
import { mapProjectMutationApiBody } from './mapper/response/project_response_mapper.js'

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
