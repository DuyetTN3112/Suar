import type { HttpContext } from '@adonisjs/core/http'
import SendMessageCommand from '#actions/conversations/commands/send_message_command'
import {
  MarkAsReadCommand,
  MarkMessagesAsReadCommand,
} from '#actions/conversations/commands/mark_as_read_command'
import RecallMessageCommand from '#actions/conversations/commands/recall_message_command'
import { SendMessageDTO } from '#actions/conversations/dtos/send_message_dto'
import { RecallMessageDTO } from '#actions/conversations/dtos/recall_message_dto'
import { MarkAsReadDTO, MarkMessagesAsReadDTO } from '#actions/conversations/dtos/mark_as_read_dto'

/**
 * Controller xử lý các thao tác với tin nhắn
 */
export default class ConversationsMessageController {
  /**
   * Gửi tin nhắn trong cuộc trò chuyện
   */
  async sendMessage(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    try {
      const conversationId = Number.parseInt(params.id)
      const message = request.input('message')

      const dto = new SendMessageDTO(conversationId, message)

      const sendMessageCommand = new SendMessageCommand(ctx)
      await sendMessageCommand.execute(dto)
      return response.redirect().back()
    } catch (error) {
      // Log lỗi chi tiết để debug
      console.error('Lỗi khi gửi tin nhắn:', error)
      session.flash('error', error.message || 'Có lỗi xảy ra khi gửi tin nhắn')
      return response.redirect().back()
    }
  }

  /**
   * API để gửi tin nhắn
   */
  async apiSendMessage(ctx: HttpContext) {
    const { params, request, response } = ctx
    try {
      const conversationId = Number.parseInt(params.id)
      const message = request.input('message')

      const dto = new SendMessageDTO(conversationId, message)

      const sendMessageCommand = new SendMessageCommand(ctx)
      const createdMessage = await sendMessageCommand.execute(dto)
      return response.json({
        success: true,
        message: createdMessage,
      })
    } catch (error) {
      // Log lỗi chi tiết để debug
      console.error('Lỗi khi gửi tin nhắn (API):', error)
      return response.status(500).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi gửi tin nhắn',
      })
    }
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const conversationId = Number.parseInt(params.id)
      const dto = new MarkAsReadDTO(conversationId)

      const markAsReadCommand = new MarkAsReadCommand(ctx)
      await markAsReadCommand.execute(dto)
      return response.json({
        success: true,
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
  async recallMessage(ctx: HttpContext) {
    const { params, request, response, auth } = ctx
    try {
      const messageId = Number.parseInt(params.messageId)
      const scope = request.input('scope', 'all') as 'self' | 'all'

      // Kiểm tra xác thực người dùng
      if (!(await auth.check())) {
        return response.status(401).json({
          success: false,
          error: 'Vui lòng đăng nhập để thực hiện thao tác này',
        })
      }

      const dto = new RecallMessageDTO(messageId, scope)

      const recallMessageCommand = new RecallMessageCommand(ctx)
      await recallMessageCommand.execute(dto)

      return response.json({
        success: true,
        message: 'Tin nhắn đã được thu hồi thành công',
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error.message || 'Có lỗi xảy ra khi thu hồi tin nhắn',
      })
    }
  }
}
