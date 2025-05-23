import { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class DeleteConversation {
  constructor(private ctx: HttpContext) {}

  async execute() {
    const { params, response, session, auth, request } = this.ctx

    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để thực hiện hành động này')
      return response.redirect().back()
    }

    try {
      // Lấy thông tin về cuộc trò chuyện
      const conversation = await Conversation.query()
        .where('id', params.id)
        .whereNull('deleted_at')
        .whereHas('participants', (participantQuery) => {
          participantQuery.where('user_id', auth.user!.id)
        })
        .firstOrFail()

      // Sử dụng truy vấn trực tiếp để đánh dấu cuộc trò chuyện đã bị xóa
      await db.rawQuery('UPDATE conversations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [
        conversation.id,
      ])

      // Sử dụng stored procedure để ghi log
      await db.rawQuery('CALL log_audit(?, ?, ?, ?, ?, ?, ?, ?)', [
        auth.user.id,
        'delete',
        'conversation',
        conversation.id,
        JSON.stringify(conversation.toJSON()),
        null,
        request.ip(),
        request.header('user-agent'),
      ])

      session.flash('success', 'Cuộc trò chuyện đã được xóa')
      return response.redirect().toRoute('conversations.index')
    } catch (error) {
      session.flash('error', 'Không thể xóa cuộc trò chuyện')
      return response.redirect().back()
    }
  }
}
