import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import { MarkAsReadCommand } from '#actions/conversations/commands/mark_as_read_command'
import { MarkAsReadDTO } from '#actions/conversations/dtos/mark_as_read_dto'
import { getErrorMessage } from '#libs/error_utils'

/**
 * POST /conversations/:id/mark-as-read → Mark messages as read
 * POST /api/conversations/:id/mark-as-read → Mark messages as read (API)
 */
export default class MarkConversationReadController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const conversationId = params.id as string
      const dto = new MarkAsReadDTO(conversationId)
      const markAsReadCommand = new MarkAsReadCommand(ExecutionContext.fromHttp(ctx))
      await markAsReadCommand.execute(dto)
      response.json({ success: true })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        error: getErrorMessage(error, 'Có lỗi xảy ra khi đánh dấu đã đọc'),
      })
      return
    }
  }
}
