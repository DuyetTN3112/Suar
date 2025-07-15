import type { HttpContext } from '@adonisjs/core/http'

import { buildGetMyApplicationsInput } from './mappers/request/task_application_request_mapper.js'
import { mapMyApplicationsPageProps } from './mappers/response/task_application_response_mapper.js'

import GetMyApplicationsQuery from '#actions/tasks/queries/get_my_applications_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /my-applications → List my applications (freelancer view)
 */
export default class MyApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetMyApplicationsQuery(ExecutionContext.fromHttp(ctx))
    const filters = buildGetMyApplicationsInput(request)
    const result = await query.handle(filters)

    const query = new GetMyApplicationsQuery(ExecutionContext.fromHttp(ctx))
    const statusRaw = request.input('status', 'all') as unknown
    const statusFilter = validateStatus(typeof statusRaw === 'string' ? statusRaw : 'all')
    const page = toPageNumber(request.input('page', 1) as unknown, 1)
    const perPage = toPageNumber(request.input('per_page', 20) as unknown, 20)

    const result = await query.handle({
      status: statusFilter,
      page,
      per_page: perPage,
    })

    return inertia.render('applications/my-applications', {
      applications: result.data.map((application) => {
        return isSerializable(application) ? application.serialize() : application
      }),
      meta: result.meta,
      statusFilter: statusFilter,
    })
  }
}
