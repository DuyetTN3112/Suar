import type { HttpContext } from '@adonisjs/core/http'
import GetPendingApprovalUsersQuery from '#actions/users/queries/get_pending_approval_users_query'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import { HttpStatus, ErrorMessages } from '#constants/error_constants'

/**
 * GET /api/users/pending-approval/count → JSON count of pending approval users
 */
export default class PendingApprovalCountApiController {
  async handle(ctx: HttpContext) {
    const { response, auth } = ctx

    try {
      const hasPermission = await this.checkSuperAdminPermission(auth, response)
      if (!hasPermission) return

      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
        return
      }

      const query = new GetPendingApprovalUsersQuery(ctx)
      const count = await query.getCount(organizationId)

      response.json({
        success: true,
        count,
      })
      return
    } catch (error: unknown) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Có lỗi xảy ra khi đếm số lượng người dùng chờ phê duyệt.',
        error: error instanceof Error ? error.message : String(error),
      })
      return
    }
  }

  private async checkSuperAdminPermission(
    auth: HttpContext['auth'],
    response: HttpContext['response']
  ): Promise<boolean> {
    const user = auth.user
    if (!user) {
      response
        .status(HttpStatus.UNAUTHORIZED)
        .json({ success: false, message: ErrorMessages.PLEASE_LOGIN })
      return false
    }

    const organizationId = user.current_organization_id ?? ''
    if (!organizationId) {
      response
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: ErrorMessages.ORGANIZATION_NOT_FOUND })
      return false
    }

    const isSuperAdmin = await CheckSuperAdminPermissionQuery.execute(user.id, organizationId)
    if (!isSuperAdmin) {
      response
        .status(HttpStatus.FORBIDDEN)
        .json({ success: false, message: ErrorMessages.FORBIDDEN })
      return false
    }

    return true
  }
}
