import type { HttpContext } from '@adonisjs/core/http'
import GetUserMetadata from '#actions/users/get_user_metadata'
import ListConversationsQuery from '#actions/conversations/queries/list_conversations_query'
import CreateConversationCommand from '#actions/conversations/commands/create_conversation_command'
import { ListConversationsDTO } from '#actions/conversations/dtos/list_conversations_dto'
import { CreateConversationDTO } from '#actions/conversations/dtos/create_conversation_dto'

/**
 * Controller xử lý các chức năng liệt kê, tạo và lưu cuộc trò chuyện
 */
export default class ConversationsController {
  /**
   * Liệt kê danh sách cuộc trò chuyện
   */
  async index(ctx: HttpContext) {
    const { request, inertia } = ctx
    const page = request.input('page', 1)
    const limit = request.input('limit', 15)
    const search = request.input('search')

    const dto = new ListConversationsDTO(page, limit, search)

    const listConversationsQuery = new ListConversationsQuery(ctx)
    const conversations = await listConversationsQuery.execute(dto)
    return inertia.render('conversations/index', { conversations })
  }

  /**
   * Hiển thị form tạo cuộc trò chuyện mới
   */
  async create(ctx: HttpContext) {
    const { inertia } = ctx
    const getUserMetadata = new GetUserMetadata(ctx)
    const metadata = await getUserMetadata.handle()
    return inertia.render('conversations/create', { metadata })
  }

  /**
   * Lưu cuộc trò chuyện mới vào database
   */
  async store(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    try {
      let participants = request.input('participants', [])

      // Thử chuyển đổi nếu là chuỗi JSON
      if (!Array.isArray(participants) && typeof participants === 'string') {
        try {
          participants = JSON.parse(participants)
        } catch (parseError) {
          // Nếu không thể parse, giữ nguyên giá trị
        }
      }

      const participantIds = Array.isArray(participants) ? participants : []
      const initialMessage = request.input('initial_message')
      const title = request.input('title')
      const organizationId = auth.user?.current_organization_id || undefined

      const dto = new CreateConversationDTO(participantIds, initialMessage, title, organizationId)

      const createConversationCommand = new CreateConversationCommand(ctx)
      const conversation = await createConversationCommand.execute(dto)

      session.flash('success', 'Cuộc trò chuyện đã được tạo thành công')
      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo cuộc trò chuyện')
      return response.redirect().back()
    }
  }
}
