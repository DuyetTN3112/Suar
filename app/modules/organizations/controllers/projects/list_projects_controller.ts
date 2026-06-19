import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationProjectQueryFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_query_factory'
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
 * ListProjectsController
 *
 * Show org projects
 *
 * GET /org/projects
 */
@inject()
export default class ListProjectsController {
  constructor(private readonly actions: OrganizationProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const dto = buildCurrentOrganizationProjectsListInput(request)

    // Execute query
    const query = this.actions.makeListProjects(execCtx)
    const result = await query
      .executeAndWrap(
        omitUndefined({
          page: dto.page,
          perPage: dto.perPage,
          search: dto.search,
          status: dto.status,
        })
      )
      .then((outcome) => outcome.getValue())

    return inertia.render('projects/index', {
      ...result,
      pagination: toCanonicalPagePagination(result.pagination),
    })
  }
}
