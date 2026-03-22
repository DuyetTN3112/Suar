import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateTaskSortOrderCommand from '#actions/tasks/commands/update_task_sort_order_command'

/**
 * PATCH /api/tasks/:id/sort-order
 * Update task sort order (drag & drop reorder)
 */
export default class UpdateTaskSortOrderController {
  async handle(ctx: HttpContext) {
    const { request, response, params } = ctx
    const taskId = params.id as string
    const { sort_order, task_status_id, status } = request.only(['sort_order', 'task_status_id', 'status'])

    const execCtx = ExecutionContext.fromHttp(ctx)
    const command = new UpdateTaskSortOrderCommand(execCtx)
    const task = await command.execute(
      taskId,
      sort_order as number,
      task_status_id as string | undefined,
      status as string | undefined
    )

    response.json({ success: true, data: task })
  }
}
