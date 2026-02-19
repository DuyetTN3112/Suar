import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import InviteUserCommand from '#modules/organizations/actions/commands/invite_user_command'
import { buildCurrentOrganizationInviteMemberInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'

/**
 * InviteMemberController
 *
 * Invite member to org
 *
 * POST /org/members/invite
 */
export default class InviteMemberController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const inviteMemberInput = buildCurrentOrganizationInviteMemberInput(request, organizationId)
    await new InviteUserCommand(execCtx).executeFromRequest(inviteMemberInput, {
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
