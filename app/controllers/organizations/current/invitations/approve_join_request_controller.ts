import type { HttpContext } from '@adonisjs/core/http'

import { notificationPublicApi } from '#actions/notifications/public_api'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import { ErrorMessages } from '#constants/error_constants'
import { buildCurrentOrganizationProcessJoinRequestInput } from '#controllers/organizations/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#controllers/organizations/current/mappers/response/current_organization_mutation_response_mapper'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * ApproveJoinRequestController
 *
 * Approve join request
 *
 * PUT /org/invitations/requests/:id/approve
 */
export default class ApproveJoinRequestController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const { dto, successMessage } = buildCurrentOrganizationProcessJoinRequestInput(
      request,
      organizationId,
      params.id as string
    )
    await new ProcessJoinRequestCommand(execCtx, notificationPublicApi).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapCurrentOrganizationSuccessApiBody(successMessage))
      return
    }

    session.flash('success', successMessage)
    response.redirect().toRoute('org.requests.index')
  }
}
