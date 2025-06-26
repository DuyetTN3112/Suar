import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetTaskDetailDTO from '#actions/tasks/dtos/request/get_task_detail_dto'
import GetTaskDetailQuery from '#actions/tasks/queries/get_task_detail_query'

/**
 * GET /tasks/:id
 * Show task detail
 */
export default class ShowTaskController {
  async handle(ctx: HttpContext) {
    const dto = GetTaskDetailDTO.createFull(ctx.params.id as string)

    const getTaskDetailQuery = new GetTaskDetailQuery(ExecutionContext.fromHttp(ctx))
    const result = await getTaskDetailQuery.execute(dto)

    return await ctx.inertia.render('tasks/show', {
      task: result.task,
      permissions: result.permissions,
      auditLogs: result.auditLogs,
    })
  }
}
