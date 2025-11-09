import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import UpdateMemberRoleCommand from '#modules/organizations/actions/commands/update_member_role_command'

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
      actionContextFromHttp(ctx),
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
