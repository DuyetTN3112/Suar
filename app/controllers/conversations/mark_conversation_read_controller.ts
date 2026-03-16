import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import { MarkAsReadCommand } from '#actions/conversations/commands/mark_as_read_command'
import { MarkAsReadDTO } from '#actions/conversations/dtos/request/mark_as_read_dto'

/**
 * POST /conversations/:id/mark-as-read → Mark messages as read
 * POST /api/conversations/:id/mark-as-read → Mark messages as read (API)
 */
export default class MarkConversationReadController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const conversationId = params.id as string
    const dto = new MarkAsReadDTO(conversationId)
    const markAsReadCommand = new MarkAsReadCommand(ExecutionContext.fromHttp(ctx))
    await markAsReadCommand.execute(dto)
    response.json({ success: true })
  }
}
