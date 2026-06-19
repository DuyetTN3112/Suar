import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_query_factory'
import { buildInvitationsIndexPageInput } from '#modules/organizations/controllers/mappers/request/invitations/list_invitations_request_mapper'
import { mapInvitationsIndexPageProps } from '#modules/organizations/controllers/mappers/response/invitations/list_invitations_response_mapper'


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
      .executeAndWrap(buildInvitationsIndexPageInput(request))
      .then((outcome) => outcome.getValue())

    return inertia.render('org/invitations/index', mapInvitationsIndexPageProps(pageData))
  }
}
