import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'

/**
 * POST /organizations/:id/members/invite
 * Invite a user to the organization
 */
export default class InviteMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const organizationId = params.id as string
    const email = request.input('email') as string
    const roleId =
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined)

    await new InviteUserCommand(ExecutionContext.fromHttp(ctx)).executeFromRequest({
      organizationId,
      email,
      roleId,
    })

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({
        success: true,
        message: 'Gửi lời mời thành công',
      })
      return
    }

    session.flash('success', 'Gửi lời mời thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
