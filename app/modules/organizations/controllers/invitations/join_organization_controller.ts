import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'



import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationJoinRequestCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_join_request_command_factory'
import { buildJoinOrganizationRequestInput } from '#modules/organizations/controllers/mappers/request/invitations/join_organization_request_mapper'
import {
  getJoinOrganizationSuccessMessage,
  mapJoinOrganizationSuccessApiBody,
} from '#modules/organizations/controllers/mappers/response/invitations/join_organization_response_mapper'

/**
 * GET/POST /organizations/:id/join
 * Handle join request for an organization
 */
@inject()
export default class JoinOrganizationController {
  constructor(private readonly commandFactory: OrganizationJoinRequestCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, auth, session, response, request } = ctx
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const input = buildJoinOrganizationRequestInput(request, params['organizationId'] as string)
    const result = await this.commandFactory
      .makeRequestJoin(actionContextFromHttp(ctx))
      .executeAndWrap(input.organizationId)
      .then((outcome) => outcome.getValue())

    if (input.responseMode === 'json') {
      return mapJoinOrganizationSuccessApiBody(result.organization)
    }

    session.flash('success', getJoinOrganizationSuccessMessage())
    return response.redirect().toRoute('organizations.index')
  }
}
