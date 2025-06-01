import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import SendMessageCommand from '#actions/conversations/commands/send_message_command'
import { SendMessageDTO } from '#actions/conversations/dtos/send_message_dto'
import { getErrorMessage } from '#libs/error_utils'
import loggerService from '#services/logger_service'

/**
 * POST /api/conversations/:id/messages → Send message (JSON API)
 */
export default class SendMessageApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    try {
      const conversationId = params.id as string
      const message = request.input('message') as string
      const dto = new SendMessageDTO(conversationId, message)

      const sendMessageCommand = new SendMessageCommand(ExecutionContext.fromHttp(ctx))
      const createdMessage = await sendMessageCommand.execute(dto)
      response.json({ success: true, message: createdMessage })
      return
    } catch (error: unknown) {
      loggerService.error('Lỗi khi gửi tin nhắn (API):', error)
      response.status(500).json({
        success: false,
        error: getErrorMessage(error, 'Có lỗi xảy ra khi gửi tin nhắn'),
      })
      return
    }
  }
}
