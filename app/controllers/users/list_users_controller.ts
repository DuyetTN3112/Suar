import type { HttpContext } from '@adonisjs/core/http'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import GetUserMetadata from '#actions/users/get_user_metadata'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/request/get_users_list_dto'
import { PaginationDTO } from '#actions/shared/index'
import { OrganizationUserStatus } from '#constants/organization_constants'
import { UserStatusName } from '#constants/user_constants'

/**
 * GET /users → Paginated list of users for current organization
 */
export default class ListUsersController {
  async handle(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))
    const organizationId = auth.user?.current_organization_id ?? ''

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

    const getUsersListQuery = new GetUsersListQuery(ctx)
    const getUserMetadata = new GetUserMetadata(ctx)

    const [users, metadata] = await Promise.all([
      getUsersListQuery.handle(dto),
      getUserMetadata.handle(),
    ])

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
