import type { HttpContext } from '@adonisjs/core/http'


import { buildOrganizationMembersIndexPageInput } from './mappers/request/list_members_request_mapper.js'
import { mapOrganizationMembersIndexPageProps } from './mappers/response/list_members_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationMembersIndexPageQuery from '#modules/organizations/actions/current/members/queries/get_organization_members_index_page_query'

/**
 * ListMembersController
 *
 * Show org members
 *
 * GET /org/members
 */
export default class ListMembersController {
  async handle(ctx: HttpContext) {
    const { inertia, auth, request } = ctx
    const user = auth.user

    if (!user) {
      return inertia.render('auth/login', {})
    }

    if (!user.current_organization_id) {
      return inertia.render('org/no_org', {})
    }

    const pageData = await new GetOrganizationMembersIndexPageQuery(
      actionContextFromHttp(ctx)
    ).execute(buildOrganizationMembersIndexPageInput(request, user.current_organization_id))

    return inertia.render('org/members/index', mapOrganizationMembersIndexPageProps(pageData))
  }
}
