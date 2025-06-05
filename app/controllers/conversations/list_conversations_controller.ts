import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListConversationsQuery from '#actions/conversations/queries/list_conversations_query'
import { ListConversationsDTO } from '#actions/conversations/dtos/request/list_conversations_dto'

/**
 * GET /conversations → List conversations
 */
export default class ListConversationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 15))
    const search = request.input('search') as string | undefined

    const dto = new ListConversationsDTO(page, limit, search)
    const listConversationsQuery = new ListConversationsQuery(ExecutionContext.fromHttp(ctx))
    const conversations = await listConversationsQuery.execute(dto)
    return inertia.render('conversations/index', { conversations })
  }
}
