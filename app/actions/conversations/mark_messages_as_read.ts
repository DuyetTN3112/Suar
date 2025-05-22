import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class MarkMessagesAsRead {
  constructor(protected ctx: HttpContext) {}

  async handle(conversationId: number | string): Promise<boolean> {
    try {
      const user = this.ctx.auth.user!

      // Sử dụng stored procedure để đánh dấu tin nhắn đã đọc
      await db.rawQuery('CALL mark_messages_as_read(?, ?)', [conversationId, user.id])
      return true
    } catch (error) {
      console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error)
      return false
    }
  }
}
