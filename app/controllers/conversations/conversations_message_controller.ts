import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendMessage from '#actions/conversations/send_message'
import MarkMessagesAsRead from '#actions/conversations/mark_messages_as_read'

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
}
