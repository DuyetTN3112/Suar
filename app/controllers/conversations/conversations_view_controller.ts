import type { HttpContext } from '@adonisjs/core/http'
import GetConversationDetailQuery from '#actions/conversations/queries/get_conversation_detail_query'
import GetConversationMessagesQuery from '#actions/conversations/queries/get_conversation_messages_query'
import { MarkAsReadCommand } from '#actions/conversations/commands/mark_as_read_command'
import { GetConversationDetailDTO } from '#actions/conversations/dtos/get_conversation_detail_dto'
import { GetConversationMessagesDTO } from '#actions/conversations/dtos/get_conversation_messages_dto'
import { MarkAsReadDTO } from '#actions/conversations/dtos/mark_as_read_dto'

/**
 * Controller xử lý hiển thị cuộc trò chuyện
 */
export default class ConversationsViewController {
  /**
   * Hiển thị chi tiết cuộc trò chuyện
   */
  async show(ctx: HttpContext) {
    const { params, request, inertia, auth } = ctx
    try {
      const conversationId = Number.parseInt(params.id)
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)

      // Lấy thông tin cuộc trò chuyện
      const detailDto = new GetConversationDetailDTO(conversationId)
      const getConversationDetailQuery = new GetConversationDetailQuery(ctx)
      const conversation = await getConversationDetailQuery.execute(detailDto)

      // Lấy tin nhắn của cuộc trò chuyện
      const messagesDto = new GetConversationMessagesDTO(conversationId, page, limit)
      const getConversationMessagesQuery = new GetConversationMessagesQuery(ctx)
      const messagesResult = await getConversationMessagesQuery.execute(messagesDto)

      // Đánh dấu tin nhắn đã đọc
      const markAsReadDto = new MarkAsReadDTO(conversationId)
      const markAsReadCommand = new MarkAsReadCommand(ctx)
      await markAsReadCommand.execute(markAsReadDto)

      // Lấy thông tin người dùng hiện tại
      const currentUser = auth.user

      // Tính toán thông tin phân trang
      const hasMore = messagesResult.meta.page < messagesResult.meta.lastPage

      // Trả về dữ liệu với thông tin phân trang
      return inertia.render('conversations/show', {
        conversation,
        messages: messagesResult,
        currentUser,
        pagination: {
          page,
          limit,
          hasMore,
        },
      })
    } catch (error) {
      return inertia.render('conversations/error', {
        error: error.message || 'Có lỗi xảy ra khi tải cuộc trò chuyện',
      })
    }
  }

  /**
   * API để lấy chi tiết cuộc trò chuyện
   */
  async apiShow(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const conversationId = Number.parseInt(params.id)

      // Lấy thông tin cuộc trò chuyện
      const detailDto = new GetConversationDetailDTO(conversationId)
      const getConversationDetailQuery = new GetConversationDetailQuery(ctx)
      const conversation = await getConversationDetailQuery.execute(detailDto)

      // Lấy tin nhắn của cuộc trò chuyện (default page 1, limit 20)
      const messagesDto = new GetConversationMessagesDTO(conversationId, 1, 20)
      const getConversationMessagesQuery = new GetConversationMessagesQuery(ctx)
      const messagesResult = await getConversationMessagesQuery.execute(messagesDto)

      return response.json({
        success: true,
        conversation,
        messages: messagesResult,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi tải cuộc trò chuyện',
      })
    }
  }
}
