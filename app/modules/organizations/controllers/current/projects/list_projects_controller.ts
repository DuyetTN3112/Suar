import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListProjectsQuery from '#modules/organizations/actions/current/projects/queries/list_projects_query'
import { buildCurrentOrganizationProjectsListInput } from '#modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper'

/**
 * ListProjectsController
 *
 * Show org projects
 *
 * GET /org/projects
 */
export default class ListProjectsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const dto = buildCurrentOrganizationProjectsListInput(request)

    // Execute query
    const query = new ListProjectsQuery(execCtx)
    const result = await query.handle({
      page: dto.page,
      perPage: dto.perPage,
      search: dto.search,
      status: dto.status,
    })

    return inertia.render('org/projects/index', result)
  }
}
