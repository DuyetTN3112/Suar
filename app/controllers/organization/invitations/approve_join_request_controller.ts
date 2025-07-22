import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/request/process_join_request_dto'
import CreateNotification from '#actions/common/create_notification'

/**
 * ApproveJoinRequestController
 *
 * Approve join request
 *
 * PUT /org/invitations/requests/:id/approve
 */
export default class ApproveJoinRequestController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const targetUserId = params.id as string
    const rawAction = request.input('action', 'approve') as string
    const approve = rawAction !== 'reject'
    const reason = request.input('reason') as string | undefined

    const dto = new ProcessJoinRequestDTO(organizationId, targetUserId, approve, reason)
    await new ProcessJoinRequestCommand(execCtx, new CreateNotification()).execute(dto)

    const successMessage = approve
      ? 'Duyệt yêu cầu tham gia thành công'
      : 'Từ chối yêu cầu tham gia thành công'

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: successMessage })
      return
    }

    session.flash('success', successMessage)
    response.redirect().toRoute('org.requests.index')
  }
}
