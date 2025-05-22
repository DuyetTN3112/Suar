import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ListConversations from '#actions/conversations/list_conversations'
import CreateConversation from '#actions/conversations/create_conversation'
import GetConversation from '#actions/conversations/get_conversation'
import AddParticipant from '#actions/conversations/add_participant'
import SendMessage from '#actions/conversations/send_message'
import MarkAsRead from '#actions/conversations/mark_as_read'
import DeleteConversation from '#actions/conversations/delete_conversation'

export default class ConversationController {
  /**
   * Hiển thị danh sách cuộc trò chuyện của người dùng
   */
  @inject()
  async index({ request, inertia }: HttpContext, listConversations: ListConversations) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const conversations = await listConversations.handle({ page, limit })
    return inertia.render('conversations/index', { conversations })
  }

  /**
   * Hiển thị form tạo cuộc trò chuyện mới
   */
  @inject()
  async create({ inertia, auth }: HttpContext) {
    if (!auth.user) {
      return inertia.location('/login')
    }

    return inertia.render('conversations/create')
  }

  /**
   * Tạo cuộc trò chuyện mới
   */
  @inject()
  async store({ request, response, inertia }: HttpContext, createConversation: CreateConversation) {
    const data = {
      title: request.input('title'),
      participants: request.input('participants', []),
      initial_message: request.input('initial_message'),
    }
    try {
      const conversation = await createConversation.handle({ data })
      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    } catch (error: any) {
      return inertia.render('conversations/create', {
        error: error.message || 'Đã xảy ra lỗi khi tạo cuộc trò chuyện',
      })
    }
  }

  /**
   * Hiển thị chi tiết cuộc trò chuyện
   */
  @inject()
  async show({ params, inertia }: HttpContext, getConversation: GetConversation) {
    try {
      const conversation = await getConversation.handle({ id: params.id })
      return inertia.render('conversations/show', { conversation })
    } catch (error: any) {
      return inertia.render('errors/not-found', {
        message: error.message || 'Không tìm thấy cuộc trò chuyện',
      })
    }
  }

  /**
   * Thêm người tham gia vào cuộc trò chuyện
   */
  @inject()
  async addParticipant({ response }: HttpContext, addParticipant: AddParticipant) {
    try {
      await addParticipant.execute()
      return response.redirect().back()
    } catch (error) {
      return response.redirect().back()
    }
  }

  /**
   * Gửi tin nhắn trong cuộc trò chuyện
   */
  @inject()
  async sendMessage({ params, request, response }: HttpContext, sendMessage: SendMessage) {
    const message = request.input('message')
    await sendMessage.handle({
      data: {
        conversation_id: params.id,
        message,
      },
    })
    return response.redirect().back()
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  @inject()
  async markAsRead({ response }: HttpContext, markAsRead: MarkAsRead) {
    try {
      await markAsRead.execute()
      return response.redirect().back()
    } catch (error) {
      return response.redirect().back()
    }
  }

  /**
   * Xóa cuộc trò chuyện (soft delete)
   */
  @inject()
  async destroy({ response }: HttpContext, deleteConversation: DeleteConversation) {
    try {
      await deleteConversation.execute()
      return response.redirect().toRoute('conversations.index')
    } catch (error) {
      return response.redirect().back()
    }
  }
}
