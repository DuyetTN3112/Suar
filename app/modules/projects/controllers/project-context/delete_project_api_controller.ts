import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteProjectDTO } from '../mappers/request/project-context/project_request_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'

/**
 * DELETE /api/projects/:projectId → Delete project (API)
 *
 * Permissions:
 * - User must be org admin/owner OR project owner
 */
@inject()
export default class DeleteProjectApiController {
  constructor(private readonly lifecycleCommands: ProjectLifecycleCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildDeleteProjectDTO(request, params['projectId'] as string, organizationId)
    const command = this.lifecycleCommands.makeDelete(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    response.noContent()
  }
}
