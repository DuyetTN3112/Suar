import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListProjectsQuery from '#modules/organizations/actions/current/projects/queries/list_projects_query'
import { buildCurrentOrganizationProjectsListInput } from '#modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

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
    const result = await query.handle(omitUndefined({
      page: dto.page,
      perPage: dto.perPage,
      search: dto.search,
      status: dto.status,
    }))

    return inertia.render('projects/index', {
      ...result,
      pagination: toCanonicalPagePagination(result.pagination),
    })
  }
}
