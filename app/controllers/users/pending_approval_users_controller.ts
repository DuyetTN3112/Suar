import type { HttpContext } from '@adonisjs/core/http'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import GetUserMetadata from '#actions/users/get_user_metadata'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/request/get_users_list_dto'
import { PaginationDTO } from '#actions/shared/index'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'

/**
 * GET /users/pending-approval → Inertia page for pending approval users
 */
export default class PendingApprovalUsersController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(ctx)
    const getUserMetadata = new GetUserMetadata(ctx)
    const { request, inertia, auth } = ctx

    // Check superadmin permission
    const userExtras = auth.user?.$extras as { organization_role?: string } | undefined
    const isSuperAdmin = userExtras?.organization_role === OrganizationRole.OWNER

    if (!isSuperAdmin) {
      inertia.location('/users')
      return
    }

    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))
    const organizationId = auth.user?.current_organization_id
    if (!organizationId) {
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

    const [users, metadata] = await Promise.all([
      getUsersListQuery.handle(dto),
      getUserMetadata.handle(),
    ])

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
