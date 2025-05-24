import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListConversations from '#actions/conversations/list_conversations'
import CreateConversation from '#actions/conversations/create_conversation'
import GetUserMetadata from '#actions/users/get_user_metadata'

/**
 * Controller xử lý các chức năng liệt kê, tạo và lưu cuộc trò chuyện
 */
export default class ConversationsController {
  /**
   * Liệt kê danh sách cuộc trò chuyện
   */
  @inject()
  async index({ request, inertia }: HttpContext, listConversations: ListConversations) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 15)
    const search = request.input('search')
    const options = { page, limit, search }
    const conversations = await listConversations.handle(options)
    return inertia.render('conversations/index', { conversations })
  }

  /**
   * Hiển thị form tạo cuộc trò chuyện mới
   */
  @inject()
  async create({ inertia }: HttpContext, getUserMetadata: GetUserMetadata) {
    const metadata = await getUserMetadata.handle()
    return inertia.render('conversations/create', { metadata })
  }

  /**
   * Lưu cuộc trò chuyện mới vào database
   */
  @inject()
  async store({ request, response, session, auth }: HttpContext, createConversation: CreateConversation) {
    try {
      const data = {
        title: request.input('title'),
        participants: request.input('participants', []),
        initial_message: request.input('initial_message'),
      }

      // Thử chuyển đổi nếu là chuỗi JSON
      if (!Array.isArray(data.participants) && typeof data.participants === 'string') {
        try {
          data.participants = JSON.parse(data.participants)
        } catch (parseError) {
          // Nếu không thể parse, giữ nguyên giá trị
        }
      }

      const conversation = await createConversation.handle({ data })

      session.flash('success', 'Cuộc trò chuyện đã được tạo thành công')
      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo cuộc trò chuyện')
      return response.redirect().back()
    }
  }
}
