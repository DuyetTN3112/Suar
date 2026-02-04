import type { HttpContext } from '@adonisjs/core/http'

import { notificationPublicApi } from '#actions/notifications/public_api'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /organizations/:id/members/update-role/:userId
 * Update a member's role in the organization
 */
export default class UpdateMemberRoleController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const roleId =
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined)

    await new UpdateMemberRoleCommand(
      ExecutionContext.fromHttp(ctx),
      notificationPublicApi
    ).executeFromRequest({
      organizationId: params.id as string,
      userId: params.userId as string,
      roleId,
    })

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Cập nhật vai trò thành công' })
      return
    }

    session.flash('success', 'Cập nhật vai trò thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
