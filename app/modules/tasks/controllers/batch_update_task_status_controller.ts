import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'

/**
 * PATCH /api/tasks/batch-status
 * Batch update status for multiple tasks
 */
@inject()
export default class BatchUpdateTaskStatusController {
  constructor(private readonly statusCommands: TaskStatusWorkflowCommandFactory) {}

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
    const command = this.statusCommands.makeBatchUpdate(execCtx)
    const result = await command.execute(taskIdsRaw, taskStatusIdRaw, organizationId)

    return wrapApiV1Data(result)
  }
}
