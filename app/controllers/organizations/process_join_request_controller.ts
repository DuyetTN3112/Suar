import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/request/process_join_request_dto'
import CreateNotification from '#actions/common/create_notification'
import { processJoinRequestValidator } from '#validators/organization'

/**
 * POST /organizations/:id/members/process-request/:userId
 * Process a join request (approve/reject)
 *
 * v3.0: Uses organization_users composite key (org_id + user_id) directly
 */
export default class ProcessJoinRequestController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const { action } = await processJoinRequestValidator.validate(request.body())
    const dto = new ProcessJoinRequestDTO(
      params.id as string,
      params.userId as string,
      action === 'approve',
      undefined
    )
    await new ProcessJoinRequestCommand(
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
    ).execute(dto)

    const successMessage =
      action === 'approve' ? 'Duyệt yêu cầu thành công' : 'Từ chối yêu cầu thành công'

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: successMessage })
      return
    }

    session.flash('success', successMessage)
    response.redirect().toRoute('organizations.members.pending_requests', {
      id: params.id as string,
    })
  }
}
