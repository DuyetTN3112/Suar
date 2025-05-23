import Conversation from '#models/conversation'
import Message from '#models/message'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Logger from '@adonisjs/core/services/logger'

type MessageData = {
  conversation_id: number
  message: string
}

@inject()
export default class SendMessage {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: MessageData }) {
    try {
      const user = this.ctx.auth.user!
      // Kiểm tra người dùng có quyền truy cập cuộc trò chuyện này không
      const conversation = await Conversation.query()
        .where('id', data.conversation_id)
        .whereNull('deleted_at')
        .whereHas('participants', (builder) => {
          builder.where('user_id', user.id)
        })
        .firstOrFail()

      // Ghi log nếu chuỗi dài bất thường
      if (data.message.length > 5000) {
        Logger.warn(`Chuỗi dài bất thường từ user ${user.id}: ${data.message.length} ký tự`)
      }

      // Sử dụng stored procedure để gửi tin nhắn
      await db.rawQuery('CALL send_message(?, ?, ?)', [data.conversation_id, user.id, data.message])
      // Cập nhật thời gian cập nhật của cuộc trò chuyện
      await conversation.merge({ updated_at: DateTime.now() }).save()
      // Truy vấn tin nhắn vừa tạo
      const message = await Message.query()
        .where('conversation_id', data.conversation_id)
        .where('sender_id', user.id)
        .orderBy('created_at', 'desc')
        .first()
      return message
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error)
      throw error
    }
  }
}
