import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationProjectQueryFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_query_factory'
import { buildCurrentOrganizationProjectsListInput } from '#modules/organizations/projects/controllers/mappers/request/current_project_request_mapper'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

/**
 * GET /org/sprints
 *
 * Dedicated organization sprint workspace. Project list is only a scope picker here;
 * sprint planning remains backed by project-level sprint APIs.
 */
@inject()
export default class ShowOrganizationSprintsWorkspaceController {
  constructor(private readonly actions: OrganizationProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const dto = buildCurrentOrganizationProjectsListInput(request)
    const query = this.actions.makeListProjects(execCtx)
    const result = await query.handle(
      omitUndefined({
        page: dto.page,
        perPage: dto.perPage,
        search: dto.search,
        status: dto.status,
      })
    )
    const requestedProjectId: unknown = request.input('projectId')
    const selectedProjectId =
      typeof requestedProjectId === 'string' ? requestedProjectId : (result.projects[0]?.id ?? null)

    return inertia.render('org/sprints/index', {
      ...result,
      selectedProjectId,
      pagination: toCanonicalPagePagination(result.pagination),
    })
  }
}
