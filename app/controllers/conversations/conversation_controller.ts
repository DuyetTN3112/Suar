import type { HttpContext } from '@adonisjs/core/http'
import { getErrorMessage } from '#utils/error_utils'
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

    const page = request.input('page', 1) as number
    const limit = request.input('limit', 10) as number

    const dto = new ListConversationsDTO(page, limit)
    const conversations = await listConversationsQuery.execute(dto)

    return await inertia.render('conversations/index', { conversations })
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
      const participantIds = request.input('participants', []) as number[]
      const initialMessage = request.input('initial_message') as string | undefined
      const title = request.input('title') as string | undefined
      const organizationId = auth.user?.current_organization_id as number | undefined

      const dto = new CreateConversationDTO(participantIds, initialMessage, title, organizationId)
      const conversation = await createConversationCommand.execute(dto)

      response.redirect().toRoute('conversations.show', { id: conversation.id })
      return
    } catch (error: unknown) {
      return await inertia.render('conversations/create', {
        error: getErrorMessage(error, 'Đã xảy ra lỗi khi tạo cuộc trò chuyện'),
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
      const conversationId = Number.parseInt(params.id as string)
      const dto = new GetConversationDetailDTO(conversationId)

      const conversation = await getConversationDetailQuery.execute(dto)
      return await inertia.render('conversations/show', { conversation })
    } catch (error: unknown) {
      return await inertia.render('errors/not-found', {
        message: getErrorMessage(error, 'Không tìm thấy cuộc trò chuyện'),
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
      const conversationId = Number.parseInt(params.id as string)
      const userId = request.input('user_id') as number

      const dto = new AddParticipantDTO(conversationId, userId)
      await addParticipantCommand.execute(dto)

      response.redirect().back()
      return
    } catch (_error: unknown) {
      response.redirect().back()
      return
    }
  }

  /**
   * Gửi tin nhắn trong cuộc trò chuyện
   */
  async sendMessage(ctx: HttpContext) {
    const { params, request, response } = ctx

    // Manual instantiation
    const sendMessageCommand = new SendMessageCommand(ctx)

    const conversationId = Number.parseInt(params.id as string)
    const message = request.input('message') as string

    const dto = new SendMessageDTO(conversationId, message)
    await sendMessageCommand.execute(dto)

    response.redirect().back()
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(ctx: HttpContext) {
    const { params, response } = ctx

    // Manual instantiation
    const markAsReadCommand = new MarkAsReadCommand(ctx)

    try {
      const conversationId = Number.parseInt(params.id as string)
      const dto = new MarkAsReadDTO(conversationId)

      await markAsReadCommand.execute(dto)
      response.redirect().back()
      return
    } catch (_error: unknown) {
      response.redirect().back()
      return
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
      const conversationId = Number.parseInt(params.id as string)
      const dto = new DeleteConversationDTO(conversationId)

      await deleteConversationCommand.execute(dto)
      response.redirect().toRoute('conversations.index')
      return
    } catch (_error: unknown) {
      response.redirect().back()
      return
    }
  }
}
