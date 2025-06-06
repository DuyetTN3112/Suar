import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CheckExistingConversationQuery from '#actions/conversations/queries/check_existing_conversation_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /api/check-existing-conversation → Check if conversation already exists
 */
export default class CheckExistingConversationApiController {
  async handle(ctx: HttpContext) {
    const { request, auth, response } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const currentUser = auth.user
    const { participants } = request.body()

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      throw new BusinessLogicException('Danh sách người tham gia không hợp lệ')
    }

    const participantsList = participants.filter((p): p is string => typeof p === 'string')

    if (participantsList.length !== participants.length) {
      throw new BusinessLogicException('Danh sách người tham gia chứa giá trị không hợp lệ')
    }

    const organizationId = currentUser.current_organization_id
    if (!organizationId) {
      throw new BusinessLogicException('Không tìm thấy ID tổ chức hiện tại')
    }

    const query = new CheckExistingConversationQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.execute(organizationId, currentUser.id, participantsList)

    if (result.exists) {
      response.json({ exists: true, conversation: result.conversation })
      return
    }

    response.json({ exists: false })
  }
}
