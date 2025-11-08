import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/process_join_request_command'
import { buildCurrentOrganizationProcessJoinRequestInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'

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
    const execCtx = actionContextFromHttp(ctx)
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
