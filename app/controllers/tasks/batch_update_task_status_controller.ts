import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import BatchUpdateTaskStatusCommand from '#actions/tasks/commands/batch_update_task_status_command'

/**
 * PATCH /api/tasks/batch-status
 * Batch update status for multiple tasks
 */
export default class BatchUpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const { task_ids, task_status_id } = request.only(['task_ids', 'task_status_id'])

    const execCtx = ExecutionContext.fromHttp(ctx)
    const command = new BatchUpdateTaskStatusCommand(execCtx)
    const result = await command.execute(task_ids as string[], task_status_id as string, organizationId)

    response.json({ success: true, ...result })
  }
}
