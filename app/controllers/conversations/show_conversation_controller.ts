import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetConversationDetailQuery from '#actions/conversations/queries/get_conversation_detail_query'
import GetConversationMessagesQuery from '#actions/conversations/queries/get_conversation_messages_query'
import { MarkAsReadCommand } from '#actions/conversations/commands/mark_as_read_command'
import { GetConversationDetailDTO } from '#actions/conversations/dtos/get_conversation_detail_dto'
import { GetConversationMessagesDTO } from '#actions/conversations/dtos/get_conversation_messages_dto'
import { MarkAsReadDTO } from '#actions/conversations/dtos/mark_as_read_dto'
import { getErrorMessage } from '#libs/error_utils'

/**
 * GET /conversations/:id → Show conversation detail (Inertia)
 */
export default class ShowConversationController {
  async handle(ctx: HttpContext) {
    const { params, request, inertia, auth } = ctx
    try {
      const conversationId = params.id as string
      const page = request.input('page', 1) as number
      const limit = request.input('limit', 20) as number

      const detailDto = new GetConversationDetailDTO(conversationId)
      const getConversationDetailQuery = new GetConversationDetailQuery(
        ExecutionContext.fromHttp(ctx)
      )
      const conversation = await getConversationDetailQuery.execute(detailDto)

      const messagesDto = new GetConversationMessagesDTO(conversationId, page, limit)
      const getConversationMessagesQuery = new GetConversationMessagesQuery(
        ExecutionContext.fromHttp(ctx)
      )
      const messagesResult = await getConversationMessagesQuery.execute(messagesDto)

      const markAsReadDto = new MarkAsReadDTO(conversationId)
      const markAsReadCommand = new MarkAsReadCommand(ExecutionContext.fromHttp(ctx))
      await markAsReadCommand.execute(markAsReadDto)

      const currentUser = auth.user
      const hasMore = messagesResult.meta.page < messagesResult.meta.lastPage

      return await inertia.render('conversations/show', {
        conversation,
        messages: messagesResult,
        currentUser,
        pagination: { page, limit, hasMore },
      })
    } catch (error: unknown) {
      return await inertia.render('conversations/error', {
        error: getErrorMessage(error, 'Có lỗi xảy ra khi tải cuộc trò chuyện'),
      })
    }
  }
}
