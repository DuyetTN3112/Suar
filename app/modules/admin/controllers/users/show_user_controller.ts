import type { HttpContext } from '@adonisjs/core/http'

import GetUserDetailsQuery from '#modules/admin/actions/users/queries/get_user_details_query'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'


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
    const userId = String(params['userId'])

    const user = await query.handle({ userId })

    return inertia.render('users/show', { user })
  }
}
