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
      .orderBy('created_at', 'desc')
      .paginate(page, limit)
    // Đảo ngược thứ tự tin nhắn để tin nhắn cũ nhất hiển thị trước
    const messageResults = messages.toJSON()
    const messagesList = messageResults.data
    messagesList.reverse()

    return {
      conversation,
      messages: messageResults,
    }
  }
}
