import type { HttpContext } from '@adonisjs/core/http'
import GetMyApplicationsQuery from '#actions/tasks/queries/get_my_applications_query'
import { ApplicationStatus } from '#constants/task_constants'

function validateStatus(value: string): ApplicationStatus | 'all' {
  const validStatuses: string[] = Object.values(ApplicationStatus)
  if (validStatuses.includes(value) || value === 'all') {
    return value as ApplicationStatus | 'all'
  }
  return 'all'
}

/**
 * GET /my-applications → List my applications (freelancer view)
 */
export default class MyApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetMyApplicationsQuery(ctx)
    const statusFilter = validateStatus(String(request.input('status', 'all')))
    const result = await query.handle({
      status: statusFilter,
      page: request.input('page', 1) as number,
      per_page: request.input('per_page', 20) as number,
    })

    return inertia.render('applications/my-applications', {
      applications: result.data.map((a: any) => typeof a.serialize === 'function' ? a.serialize() : a),
      meta: result.meta,
      statusFilter: statusFilter,
    })
  }
}
