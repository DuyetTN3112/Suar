import type { HttpContext } from '@adonisjs/core/http'


import { buildOrganizationsListDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationsIndexPageProps } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetOrganizationsIndexPageQuery from '#modules/organizations/actions/queries/get_organizations_index_page_query'

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
      actionContextFromHttp(ctx)
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
