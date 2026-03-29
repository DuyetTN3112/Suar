import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'
import { InviteUserDTO } from '#actions/organizations/dtos/request/invite_user_dto'
import { OrganizationRole } from '#constants/organization_constants'

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
      throw new Error('Organization context required')
    }

    const email = request.input('email') as string
    const roleId =
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined) ??
      OrganizationRole.MEMBER

    const dto = new InviteUserDTO(organizationId, email, roleId)
    await new InviteUserCommand(execCtx).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Gửi lời mời thành công' })
      return
    }

    session.flash('success', 'Gửi lời mời thành công')
    response.redirect().toRoute('org.invitations.index')
  }
}
