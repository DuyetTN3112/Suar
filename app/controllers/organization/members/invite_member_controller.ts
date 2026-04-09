import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'
import { OrganizationRole } from '#constants/organization_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { mapOrganizationSuccessApiBody } from '#controllers/organizations/mapper/response/organization_response_mapper'

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
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const email = request.input('email') as string
    const roleId =
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined) ??
      OrganizationRole.MEMBER
    await new InviteUserCommand(execCtx).executeFromRequest(
      {
        organizationId,
        email,
        roleId,
      },
      { resolveAssignableRoles: true }
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody('Gửi lời mời thành công'))
      return
    }

    session.flash('success', 'Gửi lời mời thành công')
    response.redirect().toRoute('org.invitations.index')
  }
}
