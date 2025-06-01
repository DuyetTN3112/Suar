import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CheckExistingConversationQuery from '#actions/conversations/queries/check_existing_conversation_query'
import loggerService from '#services/logger_service'

/**
 * POST /api/check-existing-conversation → Check if conversation already exists
 */
export default class CheckExistingConversationApiController {
  async handle(ctx: HttpContext) {
    const { request, auth, response } = ctx
    try {
      if (!auth.user) {
        response.status(401).json({ success: false, message: 'Chưa đăng nhập' })
        return
      }

      const currentUser = auth.user
      const { participants } = request.body()

      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        response.status(400).json({
          success: false,
          message: 'Danh sách người tham gia không hợp lệ',
        })
        return
      }

      const participantsList = participants.filter((p): p is string => typeof p === 'string')

      if (participantsList.length !== participants.length) {
        response.status(400).json({
          success: false,
          message: 'Danh sách người tham gia chứa giá trị không hợp lệ',
        })
        return
      }

      const organizationId = currentUser.current_organization_id
      if (!organizationId) {
        response.status(400).json({
          success: false,
          message: 'Không tìm thấy ID tổ chức hiện tại',
        })
        return
      }

      const query = new CheckExistingConversationQuery(ExecutionContext.fromHttp(ctx))
      const result = await query.execute(organizationId, currentUser.id, participantsList)

      if (result.exists) {
        response.json({ exists: true, conversation: result.conversation })
        return
      }

      response.json({ exists: false })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi kiểm tra cuộc hội thoại đã tồn tại', err)
      response.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra cuộc hội thoại đã tồn tại',
        error: err.message,
      })
      return
    }
  }
}
