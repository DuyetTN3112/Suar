import type { HttpContext } from '@adonisjs/core/http'

import ListUsersQuery from '#modules/admin/actions/users/queries/list_users_query'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


const ADMIN_USERS_PER_PAGE = 20

/**
 * ListUsersController
 *
 * Show list of all users
 *
 * GET /admin/users
 */
export default class ListUsersController {
  private buildListInput(ctx: HttpContext) {
    const { request } = ctx

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

    return { page, search, systemRole, status }
  }

  private async list(ctx: HttpContext) {
    const { page, search, systemRole, status } = this.buildListInput(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const query = new ListUsersQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: ADMIN_USERS_PER_PAGE,
      search,
      systemRole,
      status,
    })

    return { result, filters: { search, systemRole, status } }
  }

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const { result, filters } = await this.list(ctx)

    return inertia.render('admin/users/index', {
      users: result.data,
      meta: result.meta,
      filters: {
        search: filters.search ?? '',
        systemRole: filters.systemRole ?? null,
        status: filters.status ?? null,
      },
    })
  }

  async apiIndex(ctx: HttpContext) {
    const { result, filters } = await this.list(ctx)

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      meta: result.meta,
      filters: {
        search: filters.search ?? '',
        systemRole: filters.systemRole ?? null,
        status: filters.status ?? null,
      },
    });
  }
}
