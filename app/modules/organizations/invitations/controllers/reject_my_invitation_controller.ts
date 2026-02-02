import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_command_factory'

@inject()
export default class RejectMyInvitationController {
  constructor(private readonly invitationCommands: OrganizationInvitationCommandFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = ctx.request.param('organizationId') as string

    await this.invitationCommands.makeReject(actionContextFromHttp(ctx)).execute(organizationId)

    respondMutationSuccess(ctx, {
      redirect: { kind: 'back' },
      successMessage: 'Đã từ chối lời mời',
    })
  }
}
