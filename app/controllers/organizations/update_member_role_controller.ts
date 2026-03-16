import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/request/update_member_role_dto'
import CreateNotification from '#actions/common/create_notification'

/**
 * POST /organizations/:id/members/update-role/:userId
 * Update a member's role in the organization
 */
export default class UpdateMemberRoleController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const body = request.body() as { roleId: string }
    const dto = new UpdateMemberRoleDTO(params.id as string, params.userId as string, body.roleId)
    await new UpdateMemberRoleCommand(
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
    ).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Cập nhật vai trò thành công' })
      return
    }

    session.flash('success', 'Cập nhật vai trò thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
