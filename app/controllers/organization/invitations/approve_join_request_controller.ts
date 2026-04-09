import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import CreateNotification from '#actions/common/create_notification'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { buildProcessJoinRequestDTO } from '#controllers/organizations/mapper/request/organization_request_mapper'
import { mapOrganizationSuccessApiBody } from '#controllers/organizations/mapper/response/organization_response_mapper'

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

    const { dto, successMessage } = buildProcessJoinRequestDTO(
      request,
      organizationId,
      params.id as string
    )
    await new ProcessJoinRequestCommand(execCtx, new CreateNotification()).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody(successMessage))
      return
    }

    session.flash('success', successMessage)
    response.redirect().toRoute('org.requests.index')
  }
}
