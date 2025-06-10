import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import UpdateProjectCommand from '#actions/projects/commands/update_project_command'
import { UpdateProjectDTO } from '#actions/projects/dtos/request/update_project_dto'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

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

    const startDateInput = request.input('start_date') as string | null | undefined
    const endDateInput = request.input('end_date') as string | null | undefined

    const dto = new UpdateProjectDTO({
      project_id: params.id as string,
      name: request.input('name') as string | undefined,
      description: request.input('description') as string | null | undefined,
      status: request.input('status') as string | undefined,
      start_date: startDateInput ? DateTime.fromISO(startDateInput) : null,
      end_date: endDateInput ? DateTime.fromISO(endDateInput) : null,
    })

    const command = new UpdateProjectCommand(ctx)
    const project = await command.handle(dto)

    response.json({ success: true, data: project })
  }
}
