import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_command_factory'
import { buildMyInvitationRouteRequest } from '#modules/organizations/controllers/mappers/request/invitations/my_invitation_route_request_mapper'

@inject()
export default class AcceptMyInvitationController {
  constructor(private readonly invitationCommands: OrganizationInvitationCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { organizationId } = buildMyInvitationRouteRequest(ctx.params)

    await this.invitationCommands
      .makeAccept(actionContextFromHttp(ctx))
      .executeAndWrap(organizationId)
      .then((outcome) => outcome.getValue())

    respondMutationSuccess(ctx, {
      redirect: { kind: 'back' },
      successMessage: 'Chấp nhận lời mời thành công',
    })
  }
}
