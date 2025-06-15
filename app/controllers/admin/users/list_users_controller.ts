import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListUsersQuery from '#actions/admin/users/queries/list_users_query'

/**
 * ListUsersController
 *
 * Show list of all users
 *
 * GET /admin/users
 */
export default class ListUsersController {
  async handle({ inertia, request, auth }: HttpContext) {
    const page = Number(request.qs().page) || 1
    const search = request.qs().search
    const systemRole = request.qs().system_role
    const status = request.qs().status

    const execCtx = ExecutionContext.fromHttp({ auth, request })
    const query = new ListUsersQuery(execCtx)

    const result = await query.execute({
      page,
      perPage: 50,
      search,
      systemRole,
      status,
    })

    return inertia.render('admin/users/index', {
      users: result.data,
      meta: result.meta,
      filters: { search, systemRole, status },
    })
  }
}
