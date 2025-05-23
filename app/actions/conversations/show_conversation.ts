import { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { messagesPaginationValidator } from '#validators/conversation'
import { DateTime } from 'luxon'

export default class ShowConversation {
  constructor(private ctx: HttpContext) {}

  async execute() {
    const { params, inertia, auth, request } = this.ctx

    if (!auth.user) {
      return inertia.location('/login')
    }

    try {
      // Lấy thông tin về cuộc trò chuyện
      const conversation = await Conversation.query()
        .where('id', params.id)
        .whereNull('deleted_at')
        .whereHas('conversation_participants', (participantQuery) => {
          participantQuery.where('user_id', auth.user!.id)
        })
        .preload('participants')
        .preload('conversation_participants', (query) => {
          query.preload('user')
        })
        .firstOrFail()

      // Lấy thông tin về phân trang tin nhắn
      const payload = request.all()
      const validatedData = await messagesPaginationValidator.validate(payload)
      const page = validatedData.page || 1
      const limit = validatedData.limit || 50
      // Lấy danh sách tin nhắn
      const messagesQuery = Message.query()
        .where('conversation_id', conversation.id)
        .preload('sender')
        .orderBy('created_at', 'desc')

      // Thêm điều kiện filter thời gian
      if (validatedData.before) {
        try {
          const beforeId = Number(validatedData.before)
          const beforeMessage = await Message.find(beforeId)
          if (beforeMessage && beforeMessage.created_at) {
            const isoDate = beforeMessage.created_at.toISO()
            if (isoDate) {
              messagesQuery.where('created_at', '<', isoDate)
            }
          }
        } catch (error) {
          console.error('Lỗi xử lý before ID:', error)
        }
      }

      if (validatedData.after) {
        try {
          const afterId = Number(validatedData.after)
          const afterMessage = await Message.find(afterId)
          if (afterMessage && afterMessage.created_at) {
            const isoDate = afterMessage.created_at.toISO()
            if (isoDate) {
              messagesQuery.where('created_at', '>', isoDate)
            }
          }
        } catch (error) {
          console.error('Lỗi xử lý after ID:', error)
        }
      }

      const messages = await messagesQuery.paginate(page, limit)

      // Đánh dấu tin nhắn đã đọc
      await Message.query()
        .where('conversation_id', conversation.id)
        .where('sender_id', '!=', auth.user.id)
        .whereNull('read_at')
        .update({ read_at: DateTime.now().toSQL() })

      return inertia.render('conversations/show', { conversation, messages })
    } catch (error) {
      // Xử lý lỗi
      if (error && typeof error === 'object' && 'messages' in error) {
        return inertia.render('conversations/index', {
          validationErrors: error.messages,
        })
      }
      throw error
    }
  }
}
