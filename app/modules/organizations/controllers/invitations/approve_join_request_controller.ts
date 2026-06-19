import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_command_factory'
import { buildCurrentOrganizationProcessJoinRequestInput } from '#modules/organizations/controllers/mappers/request/invitations/current_organization_mutation_request_mapper'
import { buildOrganizationJoinRequestRouteRequest } from '#modules/organizations/controllers/mappers/request/members/organization_member_route_request_mapper'

/**
 * ApproveJoinRequestController
 *
 * Approve join request
 *
 * PUT /org/invitations/requests/:joinRequestId/approve
 */
@inject()
export default class ApproveJoinRequestController {
  constructor(private readonly invitationCommands: OrganizationInvitationCommandFactory) {}

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
      buildOrganizationJoinRequestRouteRequest(params).joinRequestId
    )
    await this.invitationCommands
      .makeProcessJoinRequest(execCtx)
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())
    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.join_requests.index',
      },
      successMessage,
    })
  }
}
