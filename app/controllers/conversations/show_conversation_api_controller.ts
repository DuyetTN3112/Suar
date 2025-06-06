import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetConversationDetailQuery from '#actions/conversations/queries/get_conversation_detail_query'
import GetConversationMessagesQuery from '#actions/conversations/queries/get_conversation_messages_query'
import { GetConversationDetailDTO } from '#actions/conversations/dtos/request/get_conversation_detail_dto'
import { GetConversationMessagesDTO } from '#actions/conversations/dtos/request/get_conversation_messages_dto'

/**
 * GET /api/conversations/:id → Get conversation detail (JSON API)
 */
export default class ShowConversationApiController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const conversationId = params.id as string

    const detailDto = new GetConversationDetailDTO(conversationId)
    const getConversationDetailQuery = new GetConversationDetailQuery(
      ExecutionContext.fromHttp(ctx)
    )
    const conversation = await getConversationDetailQuery.execute(detailDto)

    const messagesDto = new GetConversationMessagesDTO(conversationId, 1, 20)
    const getConversationMessagesQuery = new GetConversationMessagesQuery(
      ExecutionContext.fromHttp(ctx)
    )
    const messagesResult = await getConversationMessagesQuery.execute(messagesDto)

    response.json({ success: true, conversation, messages: messagesResult })
  }
}
