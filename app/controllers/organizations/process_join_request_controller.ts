import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import FindPendingJoinRequestQuery from '#actions/organizations/queries/find_pending_join_request_query'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/process_join_request_dto'
import CreateNotification from '#actions/common/create_notification'
import loggerService from '#services/logger_service'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /organizations/:id/members/process-request/:userId
 * Process a join request (approve/reject)
 */
export default class ProcessJoinRequestController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    try {
      const { action } = request.body() as { action: string }

      if (!['approve', 'reject'].includes(action)) {
        const errorMessage = 'Hành động không hợp lệ'

        if (request.accepts(['html', 'json']) === 'json') {
          response.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            message: errorMessage,
          })
          return
        }

        session.flash('error', errorMessage)
        response.redirect().toRoute('organizations.members.pending_requests', {
          id: params.id as string,
        })
        return
      }

      // Find join request — delegate to Query
      const joinRequest = await FindPendingJoinRequestQuery.execute(
        params.id as string,
        params.userId as string
      )

      // Execute command
      const dto = new ProcessJoinRequestDTO(joinRequest.id, action === 'approve', undefined)
      const processJoinRequest = new ProcessJoinRequestCommand(
        ExecutionContext.fromHttp(ctx),
        new CreateNotification()
      )
      await processJoinRequest.execute(dto)

      const successMessage =
        action === 'approve' ? 'Duyệt yêu cầu thành công' : 'Từ chối yêu cầu thành công'

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: successMessage,
        })
        return
      }

      session.flash('success', successMessage)
      response.redirect().toRoute('organizations.members.pending_requests', {
        id: params.id as string,
      })
      return
    } catch (error: unknown) {
      loggerService.error('[ProcessJoinRequestController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xử lý yêu cầu'

      if (request.accepts(['html', 'json']) === 'json') {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      session.flash('error', errorMessage)
      response.redirect().toRoute('organizations.members.pending_requests', {
        id: params.id as string,
      })
      return
    }
  }
}
