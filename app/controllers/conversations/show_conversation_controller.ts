import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetConversationViewDataQuery from '#actions/conversations/queries/get_conversation_view_data_query'
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

      const { conversation, messages } = await new GetConversationViewDataQuery(
        ExecutionContext.fromHttp(ctx)
      ).execute(conversationId, page, limit)

      return await inertia.render('conversations/show', {
        conversation,
        messages,
        currentUser: auth.user,
        pagination: { page, limit, hasMore: messages.meta.page < messages.meta.lastPage },
      })
    } catch (error: unknown) {
      return await inertia.render('conversations/error', {
        error: getErrorMessage(error, 'Có lỗi xảy ra khi tải cuộc trò chuyện'),
      })
    }
  }
}
