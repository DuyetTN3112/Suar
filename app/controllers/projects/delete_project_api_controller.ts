import type { HttpContext } from '@adonisjs/core/http'
import DeleteProjectCommand from '#actions/projects/commands/delete_project_command'
import { DeleteProjectDTO } from '#actions/projects/dtos/request/delete_project_dto'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

/**
 * DELETE /api/projects/:id → Delete project (API)
 *
 * Permissions:
 * - User must be org admin/owner OR project owner
 */
export default class DeleteProjectApiController {
  async handle(ctx: HttpContext) {
    const { params, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new DeleteProjectDTO({
      project_id: params.id as string,
      current_organization_id: organizationId,
    })
    const command = new DeleteProjectCommand(ctx)
    await command.handle(dto)

    response.json({ success: true, message: 'Dự án đã được xóa' })
  }
}
