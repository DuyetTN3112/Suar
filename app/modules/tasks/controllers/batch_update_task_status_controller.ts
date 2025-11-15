import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeBatchUpdateTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

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
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    if (typeof taskStatusIdRaw !== 'string' || taskStatusIdRaw.trim().length === 0) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const execCtx = actionContextFromHttp(ctx)
    const command = makeBatchUpdateTaskStatusCommand(execCtx)
    const result = await command.execute(taskIdsRaw, taskStatusIdRaw, organizationId)

    response.json({ success: true, ...result })
  }
}
