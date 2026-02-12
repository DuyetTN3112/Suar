import type { HttpContext } from '@adonisjs/core/http'

import GetUserDetailsQuery from '#modules/admin/actions/users/queries/get_user_details_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


/**
 * ShowUserController
 *
 * Show user details
 *
 * GET /admin/users/:id
 */
export default class ShowUserController {
  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const execCtx = actionContextFromHttp(ctx)
    const query = new GetUserDetailsQuery(execCtx)
    const userId = String(params.id)

    const user = await query.handle({ userId })

    return inertia.render('admin/users/show', { user })
  }
}
