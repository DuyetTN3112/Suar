import type { ExecutionContext } from '#types/execution_context'
import type Conversation from '#models/conversation'
import GetConversationDetailQuery from './get_conversation_detail_query.js'
import GetConversationMessagesQuery from './get_conversation_messages_query.js'
import { MarkAsReadCommand } from '../commands/mark_as_read_command.js'
import { GetConversationDetailDTO } from '../dtos/request/get_conversation_detail_dto.js'
import { GetConversationMessagesDTO } from '../dtos/request/get_conversation_messages_dto.js'
import { MarkAsReadDTO } from '../dtos/request/mark_as_read_dto.js'
import loggerService from '#services/logger_service'

export interface ConversationViewData {
  conversation: Conversation
  messages: {
    data: unknown[]
    meta: {
      total: number
      page: number
      limit: number
      lastPage: number
    }
  }
}

/**
 * Query: Get Conversation View Data
 *
 * Aggregates conversation detail + messages into a single application-layer use case.
 * Marks the conversation as read as a side effect upon successful load.
 */
export default class GetConversationViewDataQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    conversationId: string,
    page: number,
    limit: number
  ): Promise<ConversationViewData> {
    const [conversation, messages] = await Promise.all([
      new GetConversationDetailQuery(this.execCtx).execute(
        new GetConversationDetailDTO(conversationId)
      ),
      new GetConversationMessagesQuery(this.execCtx).execute(
        new GetConversationMessagesDTO(conversationId, page, limit)
      ),
    ])

    // Side effect: mark conversation as read after fetching
    new MarkAsReadCommand(this.execCtx)
      .execute(new MarkAsReadDTO(conversationId))
      .catch((error: unknown) => {
        loggerService.error('[GetConversationViewDataQuery] Failed to mark as read:', error)
      })

    return { conversation, messages }
  }
}
