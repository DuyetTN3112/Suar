import Conversation from '#models/conversation'
import Message from '#models/message'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

type MessagesOptions = {
  page?: number
  limit?: number
}

@inject()
export default class GetConversation {
  constructor(protected ctx: HttpContext) {}

  async handle({ id, options = {} }: { id: string; options?: MessagesOptions }) {
    const user = this.ctx.auth.user!
    console.log('GET_CONVERSATION: User ID =', user.id)
    const page = options.page || 1
    const limit = options.limit || 50
    // Kiểm tra người dùng có quyền truy cập cuộc trò chuyện này không
    const conversation = await Conversation.query()
      .where('id', id)
      .whereNull('deleted_at')
      .whereHas('participants', (builder) => {
        builder.where('user_id', user.id)
      })
      .preload('participants')
      .preload('conversation_participants', (query) => {
        query.preload('user')
      })
      .firstOrFail()
    // Lấy tin nhắn của cuộc trò chuyện, sắp xếp theo thời gian (mới nhất ở dưới)
    const messages = await Message.query()
      .where('conversation_id', id)
      .preload('sender')
      .orderBy('timestamp', 'desc')
      .paginate(page, limit)
    // Đảo ngược thứ tự tin nhắn để tin nhắn cũ nhất hiển thị trước
    const messageResults = messages.toJSON()
    const messagesList = messageResults.data
    messagesList.reverse()

    // Log thông tin tin nhắn để debug
    console.log('GET_CONVERSATION: Số lượng tin nhắn =', messagesList.length)
    if (messagesList.length > 0) {
      // Log mẫu 2 tin nhắn đầu tiên để xác nhận dữ liệu
      console.log(
        'GET_CONVERSATION: Tin nhắn mẫu =',
        messagesList.slice(0, 2).map((msg) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          sender_name: msg.sender?.full_name,
          message: msg.message.substring(0, 20) + '...',
        }))
      )
    }
    return {
      conversation,
      messages: messageResults,
    }
  }
}
