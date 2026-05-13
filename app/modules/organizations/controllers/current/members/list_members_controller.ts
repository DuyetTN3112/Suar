import type { HttpContext } from '@adonisjs/core/http'

import { buildOrganizationMembersIndexPageInput } from './mappers/request/list_members_request_mapper.js'
import { mapOrganizationMembersIndexPageProps } from './mappers/response/list_members_response_mapper.js'

import GetOrganizationMembersIndexPageQuery from '#actions/organizations/current/members/queries/get_organization_members_index_page_query'
import { ExecutionContext } from '#types/execution_context'

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
      ExecutionContext.fromHttp(ctx)
    ).execute(buildOrganizationMembersIndexPageInput(request, user.current_organization_id))

    return inertia.render('org/members/index', mapOrganizationMembersIndexPageProps(pageData))
  }
}
