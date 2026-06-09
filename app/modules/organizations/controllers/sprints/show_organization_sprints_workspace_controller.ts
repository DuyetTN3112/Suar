import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationProjectQueryFactory } from '#modules/organizations/actions/ports/inbound/organization_project_query_factory'
import { buildCurrentOrganizationProjectsListInput } from '#modules/organizations/controllers/mappers/request/projects/current_project_request_mapper'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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
