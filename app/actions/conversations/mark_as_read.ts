import { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import { errors } from '@vinejs/vine'
import { markAsReadValidator } from '#validators/conversation'
import { DateTime } from 'luxon'

export default class MarkAsRead {
  constructor(private ctx: HttpContext) {}

  async execute() {
    const { request, response, auth } = this.ctx

    if (!auth.user) {
      return response.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const data = await markAsReadValidator.validate(request.all())

      if (data.messageIds && data.messageIds.length > 0) {
        // Đánh dấu các tin nhắn cụ thể đã đọc
        await Message.query()
          .whereIn('id', data.messageIds)
          .where('sender_id', '!=', auth.user.id)
          .whereNull('read_at')
          .update({ read_at: DateTime.now().toSQL() })
      } else if (data.conversationId) {
        // Đánh dấu tất cả tin nhắn trong cuộc trò chuyện đã đọc
        await Message.query()
          .where('conversation_id', data.conversationId)
          .where('sender_id', '!=', auth.user.id)
          .whereNull('read_at')
          .update({ read_at: DateTime.now().toSQL() })
      }

      return response.json({ success: true })
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.status(422).json({ errors: error.messages })
      }
      throw error
    }
  }
}
