import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteProjectDTO } from './mappers/request/project_request_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import DeleteProjectCommand from '#modules/projects/actions/commands/delete_project_command'

/**
 * DELETE /api/projects/:projectId → Delete project (API)
 *
 * Permissions:
 * - User must be org admin/owner OR project owner
 */
export default class DeleteProjectApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildDeleteProjectDTO(request, params['projectId'] as string, organizationId)
    const command = new DeleteProjectCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    response.noContent()
  }
}
