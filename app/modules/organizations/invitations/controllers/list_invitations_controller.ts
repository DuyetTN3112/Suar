import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildInvitationsIndexPageInput } from './mappers/request/list_invitations_request_mapper.js'
import { mapInvitationsIndexPageProps } from './mappers/response/list_invitations_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_query_factory'

/**
 * ListInvitationsController
 *
 * Show sent invitations
 *
 * GET /org/invitations
 */
@inject()
export default class ListInvitationsController {
  constructor(private readonly actions: OrganizationInvitationQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const pageData = await this.actions
      .makeInvitationsIndexPage(actionContextFromHttp(ctx))
      .execute(buildInvitationsIndexPageInput(request))

    return inertia.render('org/invitations/index', mapInvitationsIndexPageProps(pageData))
  }
}
