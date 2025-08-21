import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'


import { buildOrganizationMembersPageFilters } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationMembersPageProps } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetOrganizationMembersPageQuery from '#modules/organizations/actions/queries/get_organization_members_page_query'

/**
 * GET /organizations/:id/members
 * Display organization members management page
 */
export default class ListMembersController {
  async handle(ctx: HttpContext) {
    const { params, inertia, auth, request } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const organizationId = params.id as string
    const filters = buildOrganizationMembersPageFilters(request)

    try {
      const pageData = await new GetOrganizationMembersPageQuery(
        actionContextFromHttp(ctx)
      ).execute(organizationId, user.id, {
        ...filters,
      })

      return await inertia.render(
        'organizations/members/index',
        mapOrganizationMembersPageProps({
          ...pageData,
          filters,
        })
      )
    } catch (error: unknown) {
      logger.error({ error }, '[ListMembersController.handle] Error')
      return inertia.render(
        'organizations/members/index',
        mapOrganizationMembersPageProps({
          organization: null,
          members: [],
          roles: [],
          userRole: '',
          pendingRequests: [],
          filters,
        })
      )
    }
  }
}
