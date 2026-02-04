import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteProjectDTO } from './mappers/request/project_request_mapper.js'
import { mapDeleteProjectApiBody } from './mappers/response/project_response_mapper.js'

import DeleteProjectCommand from '#actions/projects/commands/delete_project_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import { ExecutionContext } from '#types/execution_context'

/**
 * DELETE /api/projects/:id → Delete project (API)
 *
 * Permissions:
 * - User must be org admin/owner OR project owner
 */
export default class DeleteProjectApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildDeleteProjectDTO(request, params.id as string, organizationId)
    const command = new DeleteProjectCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    response.json(mapDeleteProjectApiBody('Dự án đã được xóa'))
  }
}
