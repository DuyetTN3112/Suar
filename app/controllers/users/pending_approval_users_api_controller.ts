import type { HttpContext } from '@adonisjs/core/http'
import GetPendingApprovalUsersQuery from '#actions/users/queries/get_pending_approval_users_query'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { ErrorMessages } from '#constants/error_constants'
import { mapPendingApprovalUsersApiBody } from './mapper/response/user_response_mapper.js'

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
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const isSuperAdmin = await CheckSuperAdminPermissionQuery.execute(user.id, organizationId)
    if (!isSuperAdmin) {
      throw new ForbiddenException()
    }

    const query = new GetPendingApprovalUsersQuery()
    const formattedUsers = await query.getList(organizationId)

    response.json(mapPendingApprovalUsersApiBody(formattedUsers))
  }
}
