import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUsersListDTO } from './mappers/request/user_request_mapper.js'
import {
  buildUserMetadataResponseSource,
  mapUsersIndexPageProps,
} from './mappers/response/user_response_mapper.js'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { USER_PAGINATION as PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'

/**
 * GET /users → Paginated list of users for current organization
 */
@inject()
export default class ListUsersController {
  constructor(private readonly administrationQueries: UserAdministrationQueryFactory) {}

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

    const getUsersListQuery = this.administrationQueries.makeUsersList(actionContextFromHttp(ctx))

    const users = await getUsersListQuery.handle(dto)
    const metadata = buildUserMetadataResponseSource()

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
