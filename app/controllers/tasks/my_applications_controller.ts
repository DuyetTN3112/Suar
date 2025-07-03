import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetMyApplicationsQuery from '#actions/tasks/queries/get_my_applications_query'
import { buildGetMyApplicationsInput } from './mapper/request/task_application_request_mapper.js'
import { mapMyApplicationsPageProps } from './mapper/response/task_application_response_mapper.js'

/**
 * GET /my-applications → List my applications (freelancer view)
 */
export default class MyApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetMyApplicationsQuery(ExecutionContext.fromHttp(ctx))
    const filters = buildGetMyApplicationsInput(request)
    const result = await query.handle(filters)

    return inertia.render(
      'applications/my-applications',
      mapMyApplicationsPageProps(result, filters.status)
    )
  }
}
