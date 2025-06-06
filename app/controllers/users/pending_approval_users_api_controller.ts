import type { HttpContext } from '@adonisjs/core/http'
import GetPendingApprovalUsersQuery from '#actions/users/queries/get_pending_approval_users_query'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * GET /api/users/pending-approval → JSON list of pending approval users
 */
export default class PendingApprovalUsersApiController {
  async handle(ctx: HttpContext) {
    const { response, auth } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const organizationId = user.current_organization_id
    if (!organizationId) {
      throw new BusinessLogicException('Organization not found')
    }

    const isSuperAdmin = await CheckSuperAdminPermissionQuery.execute(user.id, organizationId)
    if (!isSuperAdmin) {
      throw new ForbiddenException()
    }

    const query = new GetPendingApprovalUsersQuery(ctx)
    const formattedUsers = await query.getList(organizationId)

    response.json({
      success: true,
      users: formattedUsers,
      meta: {
        total: formattedUsers.length,
        per_page: formattedUsers.length,
        current_page: 1,
        last_page: 1,
      },
    })
  }
}
