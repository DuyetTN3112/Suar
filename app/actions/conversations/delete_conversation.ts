import { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'

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

      // Đánh dấu cuộc trò chuyện đã bị xóa
      conversation.deleted_at = DateTime.now()
      await conversation.save()

      // Ghi log
      await AuditLog.create({
        user_id: auth.user.id,
        action: 'delete',
        entity_type: 'conversation',
        entity_id: conversation.id,
        old_values: conversation.toJSON(),
        ip_address: request.ip(),
        user_agent: request.header('user-agent'),
      })

      session.flash('success', 'Cuộc trò chuyện đã được xóa')
      return response.redirect().toRoute('conversations.index')
    } catch (error) {
      session.flash('error', 'Không thể xóa cuộc trò chuyện')
      return response.redirect().back()
    }
  }
}
