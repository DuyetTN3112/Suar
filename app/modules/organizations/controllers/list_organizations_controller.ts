import type { HttpContext } from '@adonisjs/core/http'

import { buildOrganizationsListDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationsIndexPageProps } from './mappers/response/organization_response_mapper.js'

import GetOrganizationsIndexPageQuery from '#actions/organizations/queries/get_organizations_index_page_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /organizations
 * Display organizations list for current user
 */
export default class ListOrganizationsController {
  async handle(ctx: HttpContext) {
    const { auth, inertia, request } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user

    const dto = buildOrganizationsListDTO(request)
    const pageData = await new GetOrganizationsIndexPageQuery(
      ExecutionContext.fromHttp(ctx)
    ).execute(dto)

    return inertia.render(
      'organizations/index',
      mapOrganizationsIndexPageProps({
        organizations: pageData.organizations,
        pagination: pageData.pagination,
        currentOrganizationId: user.current_organization_id,
        allOrganizations: pageData.allOrganizations,
      })
    )
  }
}
