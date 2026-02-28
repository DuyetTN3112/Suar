import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RecallMessageCommand from '#actions/conversations/commands/recall_message_command'
import { RecallMessageDTO } from '#actions/conversations/dtos/recall_message_dto'
import { getErrorMessage } from '#libs/error_utils'

/**
 * DELETE /conversations/:id/messages/:messageId → Recall (delete) message
 */
export default class RecallMessageController {
  async handle(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    try {
      const messageId = params.messageId as string
      const scope = request.input('scope', 'all') as 'self' | 'all'

      if (!(await auth.check())) {
        response.status(401).json({
          success: false,
          error: 'Vui lòng đăng nhập để thực hiện thao tác này',
        })
        return
      }

      const dto = new RecallMessageDTO(messageId, scope)
      const recallMessageCommand = new RecallMessageCommand(ExecutionContext.fromHttp(ctx))
      await recallMessageCommand.execute(dto)

      response.json({ success: true, message: 'Tin nhắn đã được thu hồi thành công' })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        error: getErrorMessage(error, 'Có lỗi xảy ra khi thu hồi tin nhắn'),
      })
      return
    }
  }
}
