import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskApplicationsDTO } from './mappers/request/task_application_request_mapper.js'
import { mapTaskApplicationsPageProps } from './mappers/response/task_application_response_mapper.js'

import GetTaskApplicationsQuery from '#actions/tasks/queries/get_task_applications_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /tasks/:taskId/applications → List applications for a task (project owner)
 */
export default class ListTaskApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const dto = buildGetTaskApplicationsDTO(request, String(params.taskId))

    const query = new GetTaskApplicationsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render(
      'tasks/applications',
      mapTaskApplicationsPageProps(result, String(params.taskId), dto.status)
    )
  }
}
