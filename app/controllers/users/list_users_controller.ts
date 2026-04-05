import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import GetUserMetadata from '#actions/users/get_user_metadata'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/request/get_users_list_dto'
import { PaginationDTO } from '#actions/shared/index'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { UserStatusName } from '#constants/user_constants'
import { PAGINATION } from '#constants/common_constants'

const USERS_DEFAULT_LIMIT = 10

/**
 * GET /users → Paginated list of users for current organization
 */
export default class ListUsersController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    const page = Number(request.input('page', PAGINATION.DEFAULT_PAGE))
    const limit = Number(request.input('limit', USERS_DEFAULT_LIMIT))
    const organizationId = auth.user?.current_organization_id
    if (!organizationId) {
      return inertia.render('users/index', {
        users: { data: [], meta: { total: 0, per_page: limit, current_page: page, last_page: 1 } },
        metadata: { roles: [], statuses: [], total_count: 0 },
        filters: { page, limit, role: undefined, status: undefined, search: undefined },
      })
    }

    const dto = new GetUsersListDTO(
      new PaginationDTO(page, limit),
      organizationId,
      new UserFiltersDTO(
        request.input('search') as string | undefined,
        request.input('role') as string | undefined,
        request.input('status') as string | undefined,
        UserStatusName.INACTIVE,
        OrganizationUserStatus.APPROVED
      )
    )

    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()

    const users = await getUsersListQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render('users/index', {
      users,
      metadata,
      filters: {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        role: dto.filters.roleId,
        status: dto.filters.statusId,
        search: dto.filters.search,
      },
    })
  }
}
