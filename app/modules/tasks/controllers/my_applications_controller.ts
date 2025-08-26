import type { HttpContext } from '@adonisjs/core/http'


import { buildGetMyApplicationsInput } from './mappers/request/task_application_request_mapper.js'
import { mapMyApplicationsPageProps } from './mappers/response/task_application_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/get_my_applications_query'

/**
 * GET /my-applications → List my applications (freelancer view)
 */
export default class MyApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const query = new GetMyApplicationsQuery(actionContextFromHttp(ctx))
    const filters = buildGetMyApplicationsInput(request)
    const result = await query.handle(filters)

    return inertia.render(
      'applications/my-applications',
      mapMyApplicationsPageProps(result, filters.status)
    )
  }
}
