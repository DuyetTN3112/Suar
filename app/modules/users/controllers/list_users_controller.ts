import type { HttpContext } from '@adonisjs/core/http'

import { buildUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapUsersIndexPageProps } from './mappers/response/user_response_mapper.js'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import GetUserMetadata from '#modules/users/actions/get_user_metadata'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
import { USER_PAGINATION as PAGINATION } from '#modules/users/application/dtos/common/user_pagination'

/**
 * GET /users → Paginated list of users for current organization
 */
export default class ListUsersController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        limit: request.input('limit', 10) as unknown,
      },
      PAGINATION,
      { perPage: 10 }
    )
    const organizationId = resolveCurrentOrganizationId(ctx)
    if (!organizationId) {
      return inertia.render(
        'users/index',
        mapUsersIndexPageProps(
          {
            data: [],
            meta: {
              total: 0,
              per_page: pagination.perPage,
              current_page: pagination.page,
              last_page: 1,
            },
          },
          { roles: [], statuses: [] },
          {
            page: pagination.page,
            limit: pagination.perPage,
            role: undefined,
            status: undefined,
            search: undefined,
          }
        )
      )
    }

    const dto = buildUsersListDTO(request, organizationId)

    const getUsersListQuery = new GetUsersListQuery(actionContextFromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()

    const users = await getUsersListQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render(
      'users/index',
      mapUsersIndexPageProps(users, metadata, {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        role: dto.filters.roleId,
        status: dto.filters.statusId,
        search: dto.filters.search,
      })
    )
  }
}
