import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import GetUserMetadata from '#actions/users/get_user_metadata'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import { buildPendingApprovalUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapPendingApprovalUsersPageProps } from './mappers/response/user_response_mapper.js'

/**
 * GET /users/pending-approval → Inertia page for pending approval users
 */
export default class PendingApprovalUsersController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()
    const { request, inertia, auth } = ctx

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

    const dto = buildPendingApprovalUsersListDTO(request, organizationId)

    const users = await getUsersListQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render(
      'users/pending_approval',
      mapPendingApprovalUsersPageProps(users, metadata, {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        search: dto.filters.search,
      })
    )
  }
}
