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

      // Sử dụng stored procedure get_conversation_messages
      // Cập nhật: Truyền thêm currentUserId để lọc tin nhắn đã thu hồi
      const result = await db.rawQuery('CALL get_conversation_messages(?, ?)', [
        conversationId,
        currentUserId,
      ])

      // Stored procedure trả về kết quả trong mảng 2 chiều [resultSet][rows]
      const messageData =
        Array.isArray(result) && result[0] && Array.isArray(result[0][0])
          ? result[0][0]
          : Array.isArray(result) && result[0]
            ? result[0]
            : []

      // Chuyển đổi dữ liệu thành định dạng cần thiết cho frontend
      const formattedMessages = {
        data: Array.isArray(messageData)
          ? messageData
              .map((msg: any) => {
                // Kiểm tra nếu msg là undefined hoặc null
                if (!msg || typeof msg !== 'object') {
                  console.warn('Dòng tin nhắn không hợp lệ')
                  return null
                }

                // Xác định người dùng hiện tại
                const isCurrentUser = msg.sender_id === currentUserId
                // Đảm bảo trường timestamp luôn có giá trị hợp lệ
                const timestamp = msg.created_at
                  ? new Date(msg.created_at).toISOString()
                  : new Date().toISOString()
                // Trả về đối tượng tin nhắn đã được định dạng
                return {
                  id: msg.id,
                  message: msg.message,
                  sender_id: msg.sender_id,
                  created_at: timestamp,
                  timestamp: timestamp, // Giữ lại timestamp để tương thích
                  read_at: msg.read_at ? new Date(msg.read_at).toISOString() : null,
                  is_current_user: isCurrentUser,
                  is_recalled: msg.is_recalled === 1 || msg.is_recalled === true,
                  recalled_at: msg.recalled_at ? new Date(msg.recalled_at).toISOString() : null,
                  recall_scope: msg.recall_scope || null,
                  sender: {
                    id: msg.user_id,
                    full_name: msg.full_name,
                    email: msg.email,
                    avatar:
                      msg.sender_avatar || `/avatars/${msg.email?.split('@')[0] || 'default'}.jpg`,
                  },
                }
              })
              .filter(Boolean)
          : [], // Lọc bỏ các phần tử null/undefined
        meta: {
          total: Array.isArray(messageData) ? messageData.length : 0,
          per_page: Array.isArray(messageData) ? messageData.length : 0,
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
