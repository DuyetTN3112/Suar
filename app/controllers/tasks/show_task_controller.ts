import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetTaskDetailQuery from '#actions/tasks/queries/get_task_detail_query'
import { buildGetTaskDetailDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskDetailPageProps } from './mappers/response/task_response_mapper.js'

/**
 * GET /tasks/:id
 * Show task detail
 */
export default class ShowTaskController {
  async handle(ctx: HttpContext) {
    const getTaskDetailQuery = new GetTaskDetailQuery(ExecutionContext.fromHttp(ctx))
    const result = await getTaskDetailQuery.execute(buildGetTaskDetailDTO(ctx.params.id as string))

    return await ctx.inertia.render('tasks/show', mapTaskDetailPageProps(result))
  }
}
