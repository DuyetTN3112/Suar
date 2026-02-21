import type { HttpContext } from '@adonisjs/core/http'


import { buildJoinOrganizationRequestInput } from './mappers/request/join_organization_request_mapper.js'
import {
  getJoinOrganizationSuccessMessage,
  mapJoinOrganizationSuccessApiBody,
} from './mappers/response/join_organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import RequestOrganizationJoinCommand from '#modules/organizations/actions/commands/request_organization_join_command'

/**
 * GET/POST /organizations/:id/join
 * Handle join request for an organization
 */
export default class JoinOrganizationController {
  async handle(ctx: HttpContext) {
    const { params, auth, session, response, request } = ctx
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const input = buildJoinOrganizationRequestInput(request, params.id as string)
    const result = await new RequestOrganizationJoinCommand(actionContextFromHttp(ctx)).execute(
      input.organizationId
    )

    if (input.responseMode === 'json') {
      response.json(mapJoinOrganizationSuccessApiBody(result.organization))
      return
    }

    session.flash('success', getJoinOrganizationSuccessMessage())
    response.redirect().toRoute('organizations.index')
  }
}
