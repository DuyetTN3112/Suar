import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import { RemoveMemberDTO } from '#actions/organizations/dtos/request/remove_member_dto'
import CreateNotification from '#actions/common/create_notification'

/**
 * DELETE /organizations/:id/members/:userId
 * Remove a member from the organization
 */
export default class RemoveMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const dto = new RemoveMemberDTO(params.id as string, params.userId as string)
    await new RemoveMemberCommand(ExecutionContext.fromHttp(ctx), new CreateNotification()).execute(
      dto
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Xóa thành viên thành công' })
      return
    }

    session.flash('success', 'Xóa thành viên thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
