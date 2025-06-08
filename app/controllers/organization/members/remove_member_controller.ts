import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import { RemoveMemberDTO } from '#actions/organizations/dtos/request/remove_member_dto'
import CreateNotification from '#actions/common/create_notification'

/**
 * RemoveMemberController
 *
 * Remove member from org
 *
 * DELETE /org/members/:id
 */
export default class RemoveMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const targetUserId = params.id as string
    const reason = request.input('reason') as string | undefined
    const dto = new RemoveMemberDTO(organizationId, targetUserId, reason)

    await new RemoveMemberCommand(execCtx, new CreateNotification()).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Xóa thành viên thành công' })
      return
    }

    session.flash('success', 'Xóa thành viên thành công')
    response.redirect().toRoute('org.members.index')
  }
}
