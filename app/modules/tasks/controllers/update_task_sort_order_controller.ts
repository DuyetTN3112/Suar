import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskSortOrderApiBody } from './mappers/response/task_response_mapper.js'

import UpdateTaskSortOrderCommand from '#actions/tasks/commands/update_task_sort_order_command'
import { ExecutionContext } from '#types/execution_context'

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

    const execCtx = ExecutionContext.fromHttp(ctx)
    const command = new UpdateTaskSortOrderCommand(execCtx)
    const task = await command.execute(taskIdRaw, sortOrder, taskStatusId)

    response.json(mapTaskSortOrderApiBody(task))
  }
}
