import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RecallMessageCommand from '#actions/conversations/commands/recall_message_command'
import { RecallMessageDTO } from '#actions/conversations/dtos/request/recall_message_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * DELETE /conversations/:id/messages/:messageId → Recall (delete) message
 */
export default class RecallMessageController {
  async handle(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    const messageId = params.messageId as string
    const scope = request.input('scope', 'all') as string

    if (!auth.user) throw new UnauthorizedException()

    if (!['self', 'all'].includes(scope))
      throw new BusinessLogicException('Giá trị scope không hợp lệ, phải là "self" hoặc "all"')

    const dto = new RecallMessageDTO(messageId, scope as 'self' | 'all')
    const recallMessageCommand = new RecallMessageCommand(ExecutionContext.fromHttp(ctx))
    await recallMessageCommand.execute(dto)

    response.json({ success: true, message: 'Tin nhắn đã được thu hồi thành công' })
  }
}
