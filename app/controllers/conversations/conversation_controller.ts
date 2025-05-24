import { HttpContext } from '@adonisjs/core/http'
import ListConversationsQuery from '#actions/conversations/queries/list_conversations_query'
import CreateConversationCommand from '#actions/conversations/commands/create_conversation_command'
import GetConversationDetailQuery from '#actions/conversations/queries/get_conversation_detail_query'
import AddParticipantCommand from '#actions/conversations/commands/add_participant_command'
import SendMessageCommand from '#actions/conversations/commands/send_message_command'
import { MarkAsReadCommand } from '#actions/conversations/commands/mark_as_read_command'
import DeleteConversationCommand from '#actions/conversations/commands/delete_conversation_command'
import { ListConversationsDTO } from '#actions/conversations/dtos/list_conversations_dto'
import { CreateConversationDTO } from '#actions/conversations/dtos/create_conversation_dto'
import { GetConversationDetailDTO } from '#actions/conversations/dtos/get_conversation_detail_dto'
import { AddParticipantDTO } from '#actions/conversations/dtos/add_participant_dto'
import { SendMessageDTO } from '#actions/conversations/dtos/send_message_dto'
import { MarkAsReadDTO } from '#actions/conversations/dtos/mark_as_read_dto'
import { DeleteConversationDTO } from '#actions/conversations/dtos/delete_conversation_dto'

export default class ConversationController {
  /**
   * Hiển thị danh sách cuộc trò chuyện của người dùng
   */
  async index(ctx: HttpContext) {
    const { request, inertia } = ctx

    // Manual instantiation
    const listConversationsQuery = new ListConversationsQuery(ctx)

    const page = request.input('page', 1)
    const limit = request.input('limit', 10)

    const dto = new ListConversationsDTO(page, limit)
    const conversations = await listConversationsQuery.execute(dto)

    return inertia.render('conversations/index', { conversations })
  }

  /**
   * Hiển thị form tạo cuộc trò chuyện mới
   */
  async create(ctx: HttpContext) {
    const { inertia, auth } = ctx
    if (!auth.user) {
      return inertia.location('/login')
    }

    return inertia.render('conversations/create')
  }

  /**
   * Tạo cuộc trò chuyện mới
   */
  async store(ctx: HttpContext) {
    const { request, response, inertia, auth } = ctx

    // Manual instantiation
    const createConversationCommand = new CreateConversationCommand(ctx)

    try {
      const participantIds = request.input('participants', [])
      const initialMessage = request.input('initial_message')
      const title = request.input('title')
      const organizationId = auth.user?.current_organization_id || undefined

      const dto = new CreateConversationDTO(participantIds, initialMessage, title, organizationId)
      const conversation = await createConversationCommand.execute(dto)

      return response.redirect().toRoute('conversations.show', { id: conversation.id })
    } catch (error: unknown) {
      return inertia.render('conversations/create', {
        error: error.message || 'Đã xảy ra lỗi khi tạo cuộc trò chuyện',
      })
    }
  }

  /**
   * Hiển thị chi tiết cuộc trò chuyện
   */
  async show(ctx: HttpContext) {
    const { params, inertia } = ctx

    // Manual instantiation
    const getConversationDetailQuery = new GetConversationDetailQuery(ctx)

    try {
      const conversationId = Number.parseInt(params.id)
      const dto = new GetConversationDetailDTO(conversationId)

      const conversation = await getConversationDetailQuery.execute(dto)
      return inertia.render('conversations/show', { conversation })
    } catch (error: unknown) {
      return inertia.render('errors/not-found', {
        message: error.message || 'Không tìm thấy cuộc trò chuyện',
      })
    }
  }

  /**
   * Thêm người tham gia vào cuộc trò chuyện
   */
  async addParticipant(ctx: HttpContext) {
    const { params, request, response } = ctx

    // Manual instantiation
    const addParticipantCommand = new AddParticipantCommand(ctx)

    try {
      const conversationId = Number.parseInt(params.id)
      const userId = request.input('user_id')

      const dto = new AddParticipantDTO(conversationId, userId)
      await addParticipantCommand.execute(dto)

      return response.redirect().back()
    } catch (error) {
      return response.redirect().back()
    }
  }

  /**
   * Gửi tin nhắn trong cuộc trò chuyện
   */
  async sendMessage(ctx: HttpContext) {
    const { params, request, response } = ctx

    // Manual instantiation
    const sendMessageCommand = new SendMessageCommand(ctx)

    const conversationId = Number.parseInt(params.id)
    const message = request.input('message')

    const dto = new SendMessageDTO(conversationId, message)
    await sendMessageCommand.execute(dto)

    return response.redirect().back()
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(ctx: HttpContext) {
    const { params, response } = ctx

    // Manual instantiation
    const markAsReadCommand = new MarkAsReadCommand(ctx)

    try {
      const conversationId = Number.parseInt(params.id)
      const dto = new MarkAsReadDTO(conversationId)

      await markAsReadCommand.execute(dto)
      return response.redirect().back()
    } catch (error) {
      return response.redirect().back()
    }
  }

  /**
   * Xóa cuộc trò chuyện (soft delete)
   */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx

    // Manual instantiation
    const deleteConversationCommand = new DeleteConversationCommand(ctx)

    try {
      const conversationId = Number.parseInt(params.id)
      const dto = new DeleteConversationDTO(conversationId)

      await deleteConversationCommand.execute(dto)
      return response.redirect().toRoute('conversations.index')
    } catch (error) {
      return response.redirect().back()
    }
  }
}
