import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import InviteUserCommand from '#modules/organizations/actions/commands/invite_user_command'
import { buildCurrentOrganizationInviteMemberInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'

/**
 * InviteMemberController
 *
 * Invite member to org
 *
 * POST /org/members/invite
 */
export default class InviteMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const inviteMemberInput = buildCurrentOrganizationInviteMemberInput(request, organizationId)
    await new InviteUserCommand(execCtx).executeFromRequest(inviteMemberInput, {
      resolveAssignableRoles: true,
    })

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapCurrentOrganizationSuccessApiBody('Gửi lời mời thành công'))
      return
    }

    session.flash('success', 'Gửi lời mời thành công')
    response.redirect().toRoute('org.invitations.index')
  }
}
