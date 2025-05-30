import type { HttpContext } from '@adonisjs/core/http'
import GetUserMetadata from '#actions/users/get_user_metadata'
import ListConversationsQuery from '#actions/conversations/queries/list_conversations_query'
import CreateConversationCommand from '#actions/conversations/commands/create_conversation_command'
import { ListConversationsDTO } from '#actions/conversations/dtos/list_conversations_dto'
import { CreateConversationDTO } from '#actions/conversations/dtos/create_conversation_dto'
import { getErrorMessage } from '#utils/error_utils'

/**
 * Controller xử lý các chức năng liệt kê, tạo và lưu cuộc trò chuyện
 */
export default class ConversationsController {
  /**
   * Liệt kê danh sách cuộc trò chuyện
   */
  async index(ctx: HttpContext) {
    const { request, inertia } = ctx
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 15))
    const search = request.input('search') as string | undefined

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
      let participants: number[] = request.input('participants', []) as number[]

      // Thử chuyển đổi nếu là chuỗi JSON
      if (!Array.isArray(participants)) {
        const participantsStr = participants as unknown as string
        try {
          participants = JSON.parse(participantsStr) as number[]
        } catch {
          // Nếu không thể parse, giữ nguyên giá trị
          participants = []
        }
      }

      const participantIds = Array.isArray(participants) ? participants : []
      const initialMessage = request.input('initial_message') as string | undefined
      const title = request.input('title') as string | undefined
      const organizationId = auth.user?.current_organization_id ?? undefined

      const dto = new CreateConversationDTO(participantIds, initialMessage, title, organizationId)

      const createConversationCommand = new CreateConversationCommand(ctx)
      const conversation = await createConversationCommand.execute(dto)

      session.flash('success', 'Cuộc trò chuyện đã được tạo thành công')
      response.redirect().toRoute('conversations.show', { id: conversation.id })
      return
    } catch (error: unknown) {
      session.flash('error', getErrorMessage(error, 'Có lỗi xảy ra khi tạo cuộc trò chuyện'))
      response.redirect().back()
      return
    }
  }
}
