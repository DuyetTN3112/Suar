import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import SendMessageCommand from '#actions/conversations/commands/send_message_command'
import { SendMessageDTO } from '#actions/conversations/dtos/send_message_dto'
import { getErrorMessage } from '#libs/error_utils'
import loggerService from '#services/logger_service'

/**
 * POST /conversations/:id/messages → Send message (Inertia redirect)
 */
export default class SendMessageController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    try {
      const conversationId = params.id as string
      const message = request.input('message') as string
      const dto = new SendMessageDTO(conversationId, message)

      const sendMessageCommand = new SendMessageCommand(ExecutionContext.fromHttp(ctx))
      await sendMessageCommand.execute(dto)
      response.redirect().back()
      return
    } catch (error: unknown) {
      loggerService.error('Lỗi khi gửi tin nhắn:', error)
      session.flash('error', getErrorMessage(error, 'Có lỗi xảy ra khi gửi tin nhắn'))
      response.redirect().back()
      return
    }
  }
}
