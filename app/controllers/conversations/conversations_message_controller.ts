import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendMessage from '#actions/conversations/send_message'
import MarkMessagesAsRead from '#actions/conversations/mark_messages_as_read'
import RecallMessage from '#actions/conversations/recall_message'

/**
 * Controller xử lý các thao tác với tin nhắn
 */
export default class ConversationsMessageController {
  /**
   * Gửi tin nhắn trong cuộc trò chuyện
   */
  @inject()
  async sendMessage({ params, request, response, session }: HttpContext, sendMessage: SendMessage) {
    try {
      const data = {
        conversation_id: params.id,
        message: request.input('message'),
      }

      await sendMessage.handle({ data })
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi gửi tin nhắn')
      return response.redirect().back()
    }
  }

  /**
   * API để gửi tin nhắn
   */
  @inject()
  async apiSendMessage({ params, request, response }: HttpContext, sendMessage: SendMessage) {
    try {
      const data = {
        conversation_id: params.id,
        message: request.input('message'),
      }

      const message = await sendMessage.handle({ data })
      return response.json({
        success: true,
        message,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi gửi tin nhắn',
      })
    }
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  @inject()
  async markAsRead({ params, response }: HttpContext, markMessagesAsRead: MarkMessagesAsRead) {
    try {
      const isSuccess = await markMessagesAsRead.handle(params.id)
      return response.json({
        success: isSuccess,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi đánh dấu đã đọc',
      })
    }
  }

  /**
   * Thu hồi tin nhắn (xóa mềm hoặc xóa cứng)
   */
  @inject()
  async recallMessage(
    { params, request, response, auth }: HttpContext,
    recallMessage: RecallMessage
  ) {
    console.log(`[ConversationsMessageController] Bắt đầu xử lý API recall message`, {
      messageId: params.messageId,
      conversationId: params.id,
      requestBody: request.all(),
      headers: request.headers(),
    })

    try {
      const messageId = params.messageId
      const scope = request.input('scope', 'all') // 'all' hoặc 'self'

      console.log(`[ConversationsMessageController] Thông tin thu hồi:`, {
        messageId,
        scope,
        authenticated: await auth.check(),
        user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
      })

      // Kiểm tra xác thực người dùng
      if (!(await auth.check())) {
        console.error('[ConversationsMessageController] Người dùng chưa xác thực')
        return response.status(401).json({
          success: false,
          error: 'Bạn cần đăng nhập để thực hiện thao tác này',
        })
      }

      // Kiểm tra dữ liệu đầu vào
      if (!messageId) {
        console.error('[ConversationsMessageController] Thiếu message ID')
        return response.status(400).json({
          success: false,
          error: 'Thiếu ID tin nhắn cần thu hồi',
        })
      }

      // Kiểm tra scope hợp lệ
      if (scope !== 'all' && scope !== 'self') {
        console.error(`[ConversationsMessageController] Scope không hợp lệ: ${scope}`)
        return response.status(400).json({
          success: false,
          error: 'Scope không hợp lệ. Chỉ chấp nhận "all" hoặc "self"',
        })
      }

      const startTime = Date.now()
      const result = await recallMessage.handle({
        messageId: Number(messageId),
        scope,
        userId: auth.user!.id,
      })
      const endTime = Date.now()

      console.log(
        `[ConversationsMessageController] Xử lý thu hồi hoàn tất sau ${endTime - startTime}ms:`,
        result
      )

      return response.json({
        success: true,
        result,
        processingTime: `${endTime - startTime}ms`,
      })
    } catch (error) {
      console.error('[ConversationsMessageController] Lỗi thu hồi tin nhắn:', error)

      // Trả về một response có cấu trúc rõ ràng
      const statusCode = error.status || 500
      return response.status(statusCode).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi thu hồi tin nhắn',
        code: error.code || 'E_UNKNOWN',
        detail: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
    }
  }
}
