import type { HttpContext } from '@adonisjs/core/http'

import { buildInvitationsIndexPageInput } from './mappers/request/list_invitations_request_mapper.js'
import { mapInvitationsIndexPageProps } from './mappers/response/list_invitations_response_mapper.js'

import GetInvitationsIndexPageQuery from '#actions/organizations/current/invitations/queries/get_invitations_index_page_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * ListInvitationsController
 *
 * Show sent invitations
 *
 * GET /org/invitations
 */
export default class ListInvitationsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const pageData = await new GetInvitationsIndexPageQuery(ExecutionContext.fromHttp(ctx)).execute(
      buildInvitationsIndexPageInput(request)
    )

    return inertia.render('org/invitations/index', mapInvitationsIndexPageProps(pageData))
  }
}
