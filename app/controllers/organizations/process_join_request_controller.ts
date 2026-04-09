import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import CreateNotification from '#actions/common/create_notification'
import { buildValidatedProcessJoinRequestInput } from './mapper/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mapper/response/organization_response_mapper.js'

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
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
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
