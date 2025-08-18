import type { HttpContext } from '@adonisjs/core/http'

import GetUserDetailsQuery from '#actions/admin/users/queries/get_user_details_query'
import { ExecutionContext } from '#types/execution_context'

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

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetUserDetailsQuery(execCtx)
    const userId = String(params.id)

    const user = await query.handle({ userId })

    return inertia.render('admin/users/show', { user })
  }
}
