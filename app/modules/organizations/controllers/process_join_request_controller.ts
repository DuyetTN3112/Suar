import type { HttpContext } from '@adonisjs/core/http'


import { buildValidatedProcessJoinRequestInput } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/process_join_request_command'

/**
 * POST /organizations/:id/members/process-request/:userId
 * Process a join request (approve/reject)
 *
 * v3.0: Uses organization_users composite key (org_id + user_id) directly
 */
export default class ProcessJoinRequestController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const { dto, successMessage } = await buildValidatedProcessJoinRequestInput(
      request,
      params.id as string,
      params.userId as string
    )
    await new ProcessJoinRequestCommand(
      actionContextFromHttp(ctx),
      notificationPublicApi
    ).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody(successMessage))
      return
    }

    session.flash('success', successMessage)
    response.redirect().toRoute('organizations.members.pending_requests', {
      id: params.id as string,
    })
  }
}
