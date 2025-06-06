import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import { AddMemberDTO } from '#actions/organizations/dtos/request/add_member_dto'
import CreateNotification from '#actions/common/create_notification'

/**
 * POST /organizations/:id/members/add-direct
 * Add user directly to organization (for admin)
 */
export default class AddDirectMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const body = request.body() as { userId: string; roleId: string }
    const dto = new AddMemberDTO(params.id as string, body.userId, body.roleId)
    await new AddMemberCommand(ExecutionContext.fromHttp(ctx), new CreateNotification()).execute(
      dto
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Thêm thành viên thành công' })
      return
    }

    session.flash('success', 'Thêm thành viên thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
