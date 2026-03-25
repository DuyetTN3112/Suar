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

    const payload = request.only(['task_ids', 'task_status_id']) as {
      task_ids?: unknown
      task_status_id?: unknown
    }

    const taskIdsRaw = payload.task_ids
    const taskStatusIdRaw = payload.task_status_id

    if (!Array.isArray(taskIdsRaw) || !taskIdsRaw.every((id) => typeof id === 'string')) {
      throw new BusinessLogicException('Danh sach task khong hop le')
    }

    if (typeof taskStatusIdRaw !== 'string' || taskStatusIdRaw.trim().length === 0) {
      throw new BusinessLogicException('Task status khong hop le')
    }

    const execCtx = ExecutionContext.fromHttp(ctx)
    const command = new BatchUpdateTaskStatusCommand(execCtx)
    const result = await command.execute(taskIdsRaw, taskStatusIdRaw, organizationId)

    response.json({ success: true, ...result })
  }
}
