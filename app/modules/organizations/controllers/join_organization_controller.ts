import type { HttpContext } from '@adonisjs/core/http'

import { buildJoinOrganizationRequestInput } from './mappers/request/join_organization_request_mapper.js'
import {
  getJoinOrganizationSuccessMessage,
  mapJoinOrganizationSuccessApiBody,
} from './mappers/response/join_organization_response_mapper.js'

import RequestOrganizationJoinCommand from '#actions/organizations/commands/request_organization_join_command'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

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
    const result = await new RequestOrganizationJoinCommand(ExecutionContext.fromHttp(ctx)).execute(
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
