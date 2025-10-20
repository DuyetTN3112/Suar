import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makeBatchUpdateTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /api/tasks/batch-status
 * Batch update status for multiple tasks
 */
export default class BatchUpdateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const payload = request.only(['taskIds', 'taskStatusId', 'task_ids', 'task_status_id']) as {
      taskIds?: unknown
      taskStatusId?: unknown
      task_ids?: unknown
      task_status_id?: unknown
    }

    const taskIdsRaw = payload.taskIds ?? payload.task_ids
    const taskStatusIdRaw = payload.taskStatusId ?? payload.task_status_id

    if (!Array.isArray(taskIdsRaw) || !taskIdsRaw.every((id) => typeof id === 'string')) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    if (typeof taskStatusIdRaw !== 'string' || taskStatusIdRaw.trim().length === 0) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const execCtx = actionContextFromHttp(ctx)
    const command = makeBatchUpdateTaskStatusCommand(execCtx)
    const result = await command.execute(taskIdsRaw, taskStatusIdRaw, organizationId)

    return wrapApiV1Data(result)
  }
}
