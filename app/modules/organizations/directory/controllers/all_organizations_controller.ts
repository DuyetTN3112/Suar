import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { resolveCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/directory/actions/dtos/common/organization_pagination'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_directory_query_factory'
import {
  normalizePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

const ALL_ORGANIZATIONS_PER_PAGE = 12

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
    const pagination = normalizePagination(
      {
        page: request.input('page', ORGANIZATION_PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: ALL_ORGANIZATIONS_PER_PAGE,
      },
      ORGANIZATION_PAGINATION,
      { perPage: ALL_ORGANIZATIONS_PER_PAGE }
    )
    const search: unknown = request.input('search')
    const normalizedSearch =
      typeof search === 'string' && search.trim().length > 0 ? search.trim() : undefined

    const getAllOrganizations = this.actions.makeAllOrganizationsQuery()
    const paginatedOrganizations = await getAllOrganizations.getWithMembershipStatusPage(
      omitUndefined({
        userId: user.id,
        page: pagination.page,
        perPage: pagination.perPage,
        search: normalizedSearch,
      })
    )

    return inertia.render('organizations/all', {
      organizations: paginatedOrganizations.data,
      pagination: toCanonicalPagePagination(paginatedOrganizations.meta),
      filters: {
        search: normalizedSearch ?? '',
      },
      currentOrganizationId: resolveCurrentOrganizationId(ctx),
    })
  }
}
