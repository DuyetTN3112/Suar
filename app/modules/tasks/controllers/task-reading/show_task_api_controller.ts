import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskDetailDTO } from '../mappers/request/task-reading/task_request_mapper.js'
import { mapTaskDetailApiBody } from '../mappers/response/task-reading/task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'

/**
 * GET /api/tasks/:taskId
 * Return full task detail as JSON for task detail modal hydration.
 */
@inject()
export default class ShowTaskApiController {
  constructor(private readonly detailQueries: TaskDetailQueryFactory) {}

  async handle(ctx: HttpContext) {
    const getTaskDetailQuery = this.detailQueries.makeDetail(actionContextFromHttp(ctx))
    const result = await getTaskDetailQuery.executeAndWrap(
      buildGetTaskDetailDTO(ctx.params['taskId'] as string)
    ).then((outcome) => outcome.getValue())

    return mapTaskDetailApiBody(result.task, result.resolved_brief, result.permissions)
  }
}
