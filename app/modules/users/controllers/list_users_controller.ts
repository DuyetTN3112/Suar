import type { HttpContext } from '@adonisjs/core/http'

import { buildUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapUsersIndexPageProps } from './mappers/response/user_response_mapper.js'

import GetUserMetadata from '#modules/users/actions/get_user_metadata'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
import { ExecutionContext } from '#types/execution_context'
import { PAGINATION } from '#types/pagination'

/**
 * GET /users → Paginated list of users for current organization
 */
export default class ListUsersController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    const page = Number(request.input('page', PAGINATION.DEFAULT_PAGE))
    const limit = Number(request.input('limit', 10))
    const organizationId = auth.user?.current_organization_id
    if (!organizationId) {
      return inertia.render(
        'users/index',
        mapUsersIndexPageProps(
          {
            data: [],
            meta: {
              total: 0,
              per_page: limit,
              current_page: page,
              last_page: 1,
            },
          },
          { roles: [], statuses: [] },
          { page, limit, role: undefined, status: undefined, search: undefined }
        )
      )
    }

    const dto = buildUsersListDTO(request, organizationId)

    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
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
