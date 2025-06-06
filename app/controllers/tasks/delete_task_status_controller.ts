import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import DeleteTaskStatusCommand from '#actions/tasks/commands/delete_task_status_command'
import { DeleteTaskStatusDTO } from '#actions/tasks/dtos/task_status_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

/**
 * DELETE /api/task-statuses/:id
 * Soft-delete a task status definition.
 */
export default class DeleteTaskStatusController {
  async handle(ctx: HttpContext) {
    const { response, params, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new DeleteTaskStatusDTO({
      status_id: params.id as string,
      organization_id: organizationId,
    })

    const command = new DeleteTaskStatusCommand(ExecutionContext.fromHttp(ctx))
    await command.execute(dto)

    response.json({ success: true })
  }
}
