import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetTaskApplicationsQuery from '#actions/tasks/queries/get_task_applications_query'
import { GetTaskApplicationsDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import { ApplicationStatus } from '#constants/task_constants'

function validateStatus(value: string): ApplicationStatus | 'all' {
  const validStatuses: string[] = Object.values(ApplicationStatus)
  if (validStatuses.includes(value) || value === 'all') {
    return value as ApplicationStatus | 'all'
  }
  return 'all'
}

/**
 * GET /tasks/:taskId/applications → List applications for a task (project owner)
 */
export default class ListTaskApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, params, inertia } = ctx

    const dto = new GetTaskApplicationsDTO({
      task_id: String(params.taskId),
      status: validateStatus(String(request.input('status', 'all'))),
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
    })

    const query = new GetTaskApplicationsQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)

    return inertia.render('tasks/applications', {
      taskId: params.taskId as string,
      applications: result.data.map((a) => a.serialize()),
      meta: result.meta,
      statusFilter: dto.status,
    })
  }
}
