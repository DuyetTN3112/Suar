import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListInvitationsQuery from '#actions/organization/invitations/queries/list_invitations_query'

/**
 * ListInvitationsController
 *
 * Show sent invitations
 *
 * GET /org/invitations
 */
export default class ListInvitationsController {
  async handle({ inertia, request }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ request } as any)

    // Parse query params
    const page = request.input('page', 1)
    const search = request.input('search')
    const status = request.input('status')

    // Execute query
    const query = new ListInvitationsQuery(execCtx)
    const result = await query.handle({
      page,
      search,
      status,
    })

    return inertia.render('org/invitations/index', result)
  }
}
