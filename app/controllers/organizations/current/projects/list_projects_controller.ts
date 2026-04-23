import type { HttpContext } from '@adonisjs/core/http'

import ListProjectsQuery from '#actions/organizations/current/projects/queries/list_projects_query'
import { buildCurrentOrganizationProjectsListInput } from '#controllers/organizations/current/projects/mappers/request/current_project_request_mapper'
import { ExecutionContext } from '#types/execution_context'

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
    const execCtx = ExecutionContext.fromHttp(ctx)
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
