import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_command_factory'
import { buildCurrentOrganizationInviteMemberInput } from '#modules/organizations/invitations/controllers/mappers/request/current_organization_mutation_request_mapper'

/**
 * InviteMemberController
 *
 * Invite member to org
 *
 * POST /org/members/invite
 */
@inject()
export default class InviteMemberController {
  constructor(private readonly invitationCommands: OrganizationInvitationCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const inviteMemberInput = buildCurrentOrganizationInviteMemberInput(request, organizationId)
    await this.invitationCommands.makeInvite(execCtx).executeFromRequest(inviteMemberInput, {
      resolveAssignableRoles: true,
    })
    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.invitations.index',
      },
      successMessage: 'Gửi lời mời thành công',
    })
  }
}
