import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildOrganizationMembersIndexPageInput } from '../mappers/request/members/list_members_request_mapper.js'
import { mapOrganizationMembersIndexPageProps } from '../mappers/response/members/list_members_response_mapper.js'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationMemberQueryFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_query_factory'

/**
 * ListMembersController
 *
 * Show org members
 *
 * GET /org/members
 */
@inject()
export default class ListMembersController {
  constructor(private readonly actions: OrganizationMemberQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, auth, request } = ctx
    const user = auth.user

    if (!user) {
      return inertia.render('auth/login', {})
    }

    const organizationId = resolveCurrentOrganizationId(ctx)
    if (!organizationId) {
      return inertia.render('org/no_org', {})
    }

    const pageData = await this.actions
      .makeMembersIndexPage(actionContextFromHttp(ctx))
      .executeAndWrap(buildOrganizationMembersIndexPageInput(request, organizationId))
      .then((outcome) => outcome.getValue())

    return inertia.render('org/members/index', mapOrganizationMembersIndexPageProps(pageData))
  }
}
