import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListUsersQuery from '#actions/admin/users/queries/list_users_query'

const ADMIN_USERS_PER_PAGE = 50

/**
 * ListUsersController
 *
 * Show list of all users
 *
 * GET /admin/users
 */
export default class ListUsersController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const qs = request.qs() as Record<string, unknown>
    const page = toPageNumber(qs.page)
    const search = toOptionalString(qs.search)
    const systemRole = toOptionalString(qs.system_role)
    const status = toOptionalString(qs.status)

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListUsersQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: ADMIN_USERS_PER_PAGE,
      search,
      systemRole,
      status,
    })

    return inertia.render('admin/users/index', {
      users: result.data,
      meta: result.meta,
      filters: {
        search: search ?? '',
        systemRole: systemRole ?? null,
        status: status ?? null,
      },
    })
  }
}
