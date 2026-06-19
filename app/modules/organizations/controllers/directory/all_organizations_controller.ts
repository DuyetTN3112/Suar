import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { resolveCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_directory_query_factory'
import { buildAllOrganizationsPageRequest } from '#modules/organizations/controllers/mappers/request/directory/organization_directory_read_request_mapper'
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
 * GET /all-organizations
 * Display all organizations in the system
 */
@inject()
export default class AllOrganizationsController {
  constructor(private readonly actions: OrganizationDirectoryQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, auth, request } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user
    const pageRequest = buildAllOrganizationsPageRequest(request)

    const getAllOrganizations = this.actions.makeAllOrganizationsQuery()
    const paginatedOrganizations = await getAllOrganizations
      .getWithMembershipStatusPageAndWrap(
        omitUndefined({
          userId: user.id,
          page: pageRequest.page,
          perPage: pageRequest.perPage,
          search: pageRequest.search,
        })
      )
      .then((outcome) => outcome.getValue())

    return inertia.render('organizations/all', {
      organizations: paginatedOrganizations.data,
      pagination: toCanonicalPagePagination(paginatedOrganizations.meta),
      filters: {
        search: pageRequest.search ?? '',
      },
      currentOrganizationId: resolveCurrentOrganizationId(ctx),
    })
  }
}
