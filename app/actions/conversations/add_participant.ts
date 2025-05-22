import { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'
import AuditLog from '#models/audit_log'
import { errors } from '@vinejs/vine'
import { addParticipantValidator } from '#validators/conversation'

export default class AddParticipant {
  constructor(private ctx: HttpContext) {}

  async execute() {
    const { params, request, response, session, auth } = this.ctx

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

      // Xác thực dữ liệu
      const data = await addParticipantValidator.validate(request.all())

      // Kiểm tra xem người dùng đã tham gia cuộc trò chuyện chưa
      const existingParticipant = await ConversationParticipant.query()
        .where('conversation_id', conversation.id)
        .where('user_id', data.userId)
        .first()

      if (existingParticipant) {
        session.flash('info', 'Người dùng đã là thành viên của cuộc trò chuyện')
        return response.redirect().back()
      }

      // Thêm người tham gia mới
      await ConversationParticipant.create({
        conversation_id: conversation.id,
        user_id: Number(data.userId),
      })

      // Ghi log
      await AuditLog.create({
        user_id: auth.user.id,
        action: 'add_participant',
        entity_type: 'conversation',
        entity_id: conversation.id,
        new_values: { user_id: data.userId },
        ip_address: request.ip(),
        user_agent: request.header('user-agent'),
      })

      session.flash('success', 'Đã thêm người tham gia vào cuộc trò chuyện')
      return response.redirect().back()
    } catch (error) {
      if (error instanceof errors.E_VALIDATION_ERROR) {
        session.flash('errors', error.messages)
        return response.redirect().back()
      }
      throw error
    }
  }
}
