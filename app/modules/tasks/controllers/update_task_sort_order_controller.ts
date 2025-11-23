import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskSortOrderApiBody } from './mappers/response/task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { makeUpdateTaskSortOrderCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /api/tasks/:id/sort-order
 * Update task sort order (drag & drop reorder)
 */
export default class UpdateTaskSortOrderController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx
    const taskIdRaw: unknown = params.id
    if (typeof taskIdRaw !== 'string' || taskIdRaw.length === 0) {
      throw new Error('Invalid task id')
    }

    const payload = request.only(['sort_order', 'task_status_id']) as Record<string, unknown>

    const sortOrderRaw = payload.sort_order
    const sortOrder =
      typeof sortOrderRaw === 'number'
        ? sortOrderRaw
        : typeof sortOrderRaw === 'string'
          ? Number(sortOrderRaw)
          : Number.NaN

    const taskStatusIdRaw = payload.task_status_id

    const taskStatusId =
      typeof taskStatusIdRaw === 'string' && taskStatusIdRaw.length > 0
        ? taskStatusIdRaw
        : undefined

    loggerService.info('[UpdateTaskSortOrderController] request received', {
      taskId: taskIdRaw,
      sortOrder,
      taskStatusId,
      userId: ctx.auth.user?.id,
    })

    const execCtx = actionContextFromHttp(ctx)
    const command = makeUpdateTaskSortOrderCommand(execCtx)
    const task = await command.execute(taskIdRaw, sortOrder, taskStatusId)

    loggerService.info('[UpdateTaskSortOrderController] request completed', {
      taskId: task.id,
      sortOrder: task.sort_order,
      taskStatusId: task.task_status_id,
      status: task.status,
    })

    response.json(mapTaskSortOrderApiBody(task))
  }
}
