import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import GetUserMetadata from '#actions/users/get_user_metadata'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/request/get_users_list_dto'
import { PaginationDTO } from '#actions/shared/index'
import { OrganizationUserStatus } from '#constants/organization_constants'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'

/**
 * GET /users/pending-approval → Inertia page for pending approval users
 */
export default class PendingApprovalUsersController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()
    const { request, inertia, auth } = ctx

    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))
    const organizationId = auth.user?.current_organization_id
    if (!organizationId) {
      inertia.location('/users')
      return
    }

    const canAccessQueue = await CheckSuperAdminPermissionQuery.execute(
      auth.user.id,
      organizationId
    )
    if (!canAccessQueue) {
      inertia.location('/users')
      return
    }

    const dto = new GetUsersListDTO(
      new PaginationDTO(page, limit),
      organizationId,
      new UserFiltersDTO(
        request.input('search') as string | undefined,
        undefined,
        undefined,
        undefined,
        OrganizationUserStatus.PENDING
      )
    )

    const users = await getUsersListQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render('users/pending_approval', {
      users,
      metadata,
      filters: {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        search: dto.filters.search,
      },
    })
  }
}
