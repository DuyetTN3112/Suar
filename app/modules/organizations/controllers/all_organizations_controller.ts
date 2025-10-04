import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { resolveCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'

const ALL_ORGANIZATIONS_PER_PAGE = 12

/**
 * GET /all-organizations
 * Display all organizations in the system
 */
export default class AllOrganizationsController {
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
    const normalizedSearch = typeof search === 'string' && search.trim().length > 0 ? search.trim() : undefined

    const getAllOrganizations = new GetAllOrganizationsQuery()
    const paginatedOrganizations = await getAllOrganizations.getWithMembershipStatusPage(omitUndefined({
      userId: user.id,
      page: pagination.page,
      perPage: pagination.perPage,
      search: normalizedSearch,
    }))

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
