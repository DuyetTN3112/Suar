import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/process_join_request_command'
import { buildCurrentOrganizationProcessJoinRequestInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'

/**
 * ApproveJoinRequestController
 *
 * Approve join request
 *
 * PUT /org/invitations/requests/:joinRequestId/approve
 */
export default class ApproveJoinRequestController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const { dto, successMessage } = buildCurrentOrganizationProcessJoinRequestInput(
      request,
      organizationId,
      params['joinRequestId'] as string
    )
    await new ProcessJoinRequestCommand(execCtx, notificationPublicApi).execute(dto)
    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.join_requests.index',
      },
      successMessage,
    })
  }
}
