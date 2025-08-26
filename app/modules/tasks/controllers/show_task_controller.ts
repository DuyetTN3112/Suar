import type { HttpContext } from '@adonisjs/core/http'


import { buildGetTaskDetailDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskDetailPageProps } from './mappers/response/task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /tasks/:id
 * Show task detail
 */
export default class ShowTaskController {
  async handle(ctx: HttpContext) {
    const getTaskDetailQuery = makeGetTaskDetailQuery(actionContextFromHttp(ctx))
    const result = await getTaskDetailQuery.execute(buildGetTaskDetailDTO(ctx.params.id as string))

    return await ctx.inertia.render('tasks/show', mapTaskDetailPageProps(result))
  }
}
