import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'

@inject()
export default class GetConversationMessages {
  constructor(protected ctx: HttpContext) {}

  async handle(conversationId: number | string) {
    try {
      const user = this.ctx.auth.user!
      const currentUserId = user.id

      // Kiểm tra người dùng có thuộc cuộc trò chuyện không
      const conversation = await Conversation.query()
        .where('id', conversationId)
        .whereHas('participants', (builder) => {
          builder.where('user_id', currentUserId)
        })
        .first()

      if (!conversation) {
        return {
          success: false,
          message: 'Bạn không có quyền xem tin nhắn của cuộc trò chuyện này',
        }
      }

      // Sử dụng truy vấn thông thường thay vì stored procedure
      const messages = await Message.query()
        .where('conversation_id', conversationId)
        .select(
          'messages.id',
          'messages.message',
          'messages.sender_id',
          'messages.timestamp',
          'messages.read_at'
        )
        .join('users', 'messages.sender_id', 'users.id')
        .select('users.id as user_id', 'users.full_name', 'users.username', 'users.email')
        .orderBy('messages.timestamp', 'asc')

      // Chuyển đổi dữ liệu thành định dạng cần thiết cho frontend
      const formattedMessages = {
        data: messages.map((msg: any) => {
          // Xác định người dùng hiện tại
          const isCurrentUser = msg.sender_id === currentUserId
          // Trả về đối tượng tin nhắn đã được định dạng
          return {
            id: msg.id,
            message: msg.message,
            sender_id: msg.sender_id,
            timestamp: msg.timestamp,
            read_at: msg.read_at,
            is_current_user: isCurrentUser,
            sender: {
              id: msg.user_id,
              full_name: msg.full_name,
              email: msg.email,
              avatar: `/avatars/${msg.username || 'default'}.jpg`,
            },
          }
        }),
        meta: {
          total: messages.length,
          per_page: messages.length,
          current_page: 1,
          last_page: 1,
        },
      }

      return {
        success: true,
        messages: formattedMessages,
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy tin nhắn của cuộc trò chuyện:', error)
      return {
        success: false,
        message: error.message || 'Đã xảy ra lỗi khi lấy tin nhắn',
        messages: {
          data: [],
          meta: {
            total: 0,
            per_page: 0,
            current_page: 1,
            last_page: 1,
          },
        },
      }
    }
  }
}
