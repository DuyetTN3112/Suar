import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateProjectDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectMutationApiBody } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'

/**
 * PUT|PATCH /api/projects/:projectId → Update project (compat API)
 * Controller is thin adapter only; business rules are in command + domain policy.
 */
@inject()
export default class UpdateProjectApiController {
  constructor(private readonly lifecycleCommands: ProjectLifecycleCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    requireCurrentOrganizationId(ctx)

    const dto = buildUpdateProjectDTO(request, params['projectId'] as string)

    const command = this.lifecycleCommands.makeUpdate(actionContextFromHttp(ctx))
    const project = await command.handle(dto)

    return mapProjectMutationApiBody(project)
  }
}
