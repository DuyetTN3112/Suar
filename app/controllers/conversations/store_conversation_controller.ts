import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateConversationCommand from '#actions/conversations/commands/create_conversation_command'
import { CreateConversationDTO } from '#actions/conversations/dtos/request/create_conversation_dto'

/**
 * POST /conversations → Store new conversation
 */
export default class StoreConversationController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const participantsRaw = request.input('participants', [])
    const participantIds: string[] = Array.isArray(participantsRaw) ? participantsRaw : []

    const initialMessage = request.input('initial_message') as string | undefined
    const title = request.input('title') as string | undefined
    const organizationId = auth.user?.current_organization_id ?? undefined

    const dto = new CreateConversationDTO(participantIds, initialMessage, title, organizationId)
    const createConversationCommand = new CreateConversationCommand(ExecutionContext.fromHttp(ctx))
    const conversation = await createConversationCommand.execute(dto)

    session.flash('success', 'Cuộc trò chuyện đã được tạo thành công')
    response.redirect().toRoute('conversations.show', { id: conversation.id })
  }
}
