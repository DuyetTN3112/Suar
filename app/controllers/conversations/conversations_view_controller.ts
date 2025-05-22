import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetConversation from '#actions/conversations/get_conversation'
import GetConversationMessages from '#actions/conversations/get_conversation_messages'
import MarkMessagesAsRead from '#actions/conversations/mark_messages_as_read'

/**
 * Controller xử lý hiển thị cuộc trò chuyện
 */
export default class ConversationsViewController {
  /**
   * Hiển thị chi tiết cuộc trò chuyện
   */
  @inject()
  async show(
    { params, request, inertia, auth }: HttpContext,
    getConversation: GetConversation,
    getConversationMessages: GetConversationMessages,
    markMessagesAsRead: MarkMessagesAsRead
  ) {
    try {
      // Lấy thông tin cuộc trò chuyện
      const { conversation } = await getConversation.handle({
        id: params.id,
      })
      // Lấy tham số phân trang
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      // Lấy tin nhắn của cuộc trò chuyện
      const result = await getConversationMessages.handle(params.id)
      if (!result.success) {
        return inertia.render('conversations/error', {
          error: result.message || 'Không thể tải tin nhắn',
        })
      }
      // Đánh dấu tin nhắn đã đọc
      await markMessagesAsRead.handle(params.id)
      // Lấy thông tin người dùng hiện tại
      const currentUser = auth.user
      // Tính toán thông tin phân trang
      const hasMore =
        result.messages && result.messages.meta
          ? result.messages.meta.current_page < result.messages.meta.last_page
          : false
      // Trả về dữ liệu với thông tin phân trang
      return inertia.render('conversations/show', {
        conversation,
        messages: result.messages || [],
        currentUser,
        pagination: {
          page: Number.parseInt(page as string),
          limit: Number.parseInt(limit as string),
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
  @inject()
  async apiShow(
    { params, response }: HttpContext,
    getConversation: GetConversation,
    getConversationMessages: GetConversationMessages
  ) {
    try {
      // Lấy thông tin cuộc trò chuyện
      const { conversation } = await getConversation.handle({
        id: params.id,
      })
      // Lấy tin nhắn của cuộc trò chuyện
      const result = await getConversationMessages.handle(params.id)
      if (!result.success) {
        return response.status(404).json({
          success: false,
          message: result.message || 'Không thể tải tin nhắn',
        })
      }
      return response.json({
        success: true,
        conversation,
        messages: result.messages,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi tải cuộc trò chuyện',
      })
    }
  }
}
