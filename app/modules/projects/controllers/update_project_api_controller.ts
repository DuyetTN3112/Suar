import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateProjectDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectMutationApiBody } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import UpdateProjectCommand from '#modules/projects/actions/commands/update_project_command'

/**
 * PUT|PATCH /api/projects/:projectId → Update project (compat API)
 * Controller is thin adapter only; business rules are in command + domain policy.
 */
export default class UpdateProjectApiController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    requireCurrentOrganizationId(ctx)

    const dto = buildUpdateProjectDTO(request, params['projectId'] as string)

    const command = new UpdateProjectCommand(actionContextFromHttp(ctx))
    const project = await command.handle(dto)

    return mapProjectMutationApiBody(project)
  }
}
