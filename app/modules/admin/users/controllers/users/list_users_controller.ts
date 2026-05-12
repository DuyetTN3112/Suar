import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { ADMIN_PAGINATION } from '#modules/admin/users/actions/dtos/common/admin_pagination'
import { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/admin_user_action_factory'
import {
  mapAdminUserResponse,
  wrapAdminCollectionResponse,
} from '#modules/admin/users/controllers/mappers/response/users/admin_api_response_mapper'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'


const ADMIN_USERS_PER_PAGE = 20

/**
 * ListUsersController
 *
 * Show list of all users
 *
 * GET /admin/users
 */
@inject()
export default class ListUsersController {
  constructor(private readonly actions: AdminUserActionFactory) {}

  private buildListInput(ctx: HttpContext) {
    const { request } = ctx

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const qs = request.qs() as Record<string, unknown>
    const pagination = normalizePagination(
      {
        page: qs['page'],
        perPage: ADMIN_USERS_PER_PAGE,
      },
      ADMIN_PAGINATION,
      { perPage: ADMIN_USERS_PER_PAGE }
    )
    const search = toOptionalString(qs['search'])
    const systemRole = toOptionalString(qs['system_role'])
    const status = toOptionalString(qs['status'])

    return {
      page: pagination.page,
      ...(search ? { search } : {}),
      ...(systemRole ? { systemRole } : {}),
      ...(status ? { status } : {}),
    }
  }

  private async list(ctx: HttpContext) {
    const { page, search, systemRole, status } = this.buildListInput(ctx)
    const execCtx = actionContextFromHttp(ctx)

    const result = await this.actions
      .makeListUsersQuery(execCtx)
      .executeAndWrap({
        page,
        perPage: ADMIN_USERS_PER_PAGE,
        ...(search ? { search } : {}),
        ...(systemRole ? { systemRole } : {}),
        ...(status ? { status } : {}),
      })
      .then((outcome) => outcome.getValue())

    return { result, filters: { search, systemRole, status } }
  }

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const { result, filters } = await this.list(ctx)

    return inertia.render('users/index', {
      users: result.data,
      pagination: toCanonicalPagePagination(result.meta),
      filters: {
        search: filters.search ?? '',
        systemRole: filters.systemRole ?? null,
        status: filters.status ?? null,
      },
    })
  }

  async apiIndex(ctx: HttpContext) {
    const { result, filters } = await this.list(ctx)

    ctx.response.status(HttpStatus.OK).json(
      wrapAdminCollectionResponse(
        result.data.map(mapAdminUserResponse),
        result.meta,
        {
          filters: {
            search: filters.search ?? '',
            systemRole: filters.systemRole ?? null,
            status: filters.status ?? null,
          },
        }
      )
    )
  }
}
