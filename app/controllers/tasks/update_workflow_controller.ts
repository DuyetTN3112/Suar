import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateWorkflowCommand from '#actions/tasks/commands/update_workflow_command'
import { UpdateWorkflowDTO } from '#actions/tasks/dtos/request/task_status_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'

/**
 * PUT /api/workflow
 * Replace the entire workflow (transitions) for current organization.
 */
export default class UpdateWorkflowController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = new UpdateWorkflowDTO({
      organization_id: organizationId,
      transitions: request.input('transitions') as Array<{
        from_status_id: string
        to_status_id: string
        conditions?: Record<string, unknown>
      }>,
    })

    const command = new UpdateWorkflowCommand(ExecutionContext.fromHttp(ctx))
    const transitions = await command.execute(dto)

    response.json({ success: true, data: transitions })
  }
}
