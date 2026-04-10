import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListProjectsQuery from '#actions/organization/projects/queries/list_projects_query'
import { buildOrganizationProjectsListInput } from '#controllers/projects/mappers/request/project_request_mapper'
import { mapOrganizationProjectsPageProps } from '#controllers/projects/mappers/response/project_response_mapper'

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
    const dto = buildOrganizationProjectsListInput(request)

    // Execute query
    const query = new ListProjectsQuery(execCtx)
    const result = await query.handle({
      page: dto.page,
      perPage: dto.perPage,
      search: dto.search,
      status: dto.status,
    })

    return inertia.render('org/projects/index', mapOrganizationProjectsPageProps(result))
  }
}
