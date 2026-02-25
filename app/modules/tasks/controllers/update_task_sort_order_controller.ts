import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskSortOrderApiBody } from './mappers/response/task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { makeUpdateTaskSortOrderCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * PATCH /api/tasks/:taskId/sort-order
 * Update task sort order (drag & drop reorder)
 */
export default class UpdateTaskSortOrderController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const taskIdRaw: unknown = params['taskId']
    if (typeof taskIdRaw !== 'string' || taskIdRaw.length === 0) {
      throw new Error('Invalid task id')
    }

    const payload = request.only([
      'sortOrder',
      'sort_order',
      'taskStatusId',
      'task_status_id',
    ]) as Record<string, unknown>

    const sortOrderRaw = payload['sortOrder'] ?? payload['sort_order']
    const sortOrder =
      typeof sortOrderRaw === 'number'
        ? sortOrderRaw
        : typeof sortOrderRaw === 'string'
          ? Number(sortOrderRaw)
          : Number.NaN

    const taskStatusIdRaw = payload['taskStatusId'] ?? payload['task_status_id']

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

    return mapTaskSortOrderApiBody(task)
  }
}
