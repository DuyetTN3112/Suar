import type { HttpContext } from '@adonisjs/core/http'
import GetPendingApprovalUsersQuery from '#actions/users/queries/get_pending_approval_users_query'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'

/**
 * GET /api/users/pending-approval → JSON list of pending approval users
 */
export default class PendingApprovalUsersApiController {
  async handle(ctx: HttpContext) {
    const { response, auth } = ctx

    try {
      const hasPermission = await this.checkSuperAdminPermission(auth, response)
      if (!hasPermission) return

      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        response.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
        return
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
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách người dùng chờ phê duyệt.',
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
      response.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục' })
      return false
    }

    const organizationId = user.current_organization_id ?? ''
    if (!organizationId) {
      response.status(400).json({ success: false, message: 'Không tìm thấy tổ chức hiện tại' })
      return false
    }

    const isSuperAdmin = await CheckSuperAdminPermissionQuery.execute(user.id, organizationId)
    if (!isSuperAdmin) {
      response
        .status(403)
        .json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này' })
      return false
    }

    return true
  }
}
