import type { HttpContext } from '@adonisjs/core/http'
import GetUsersInOrganizationQuery from '#actions/organizations/queries/get_users_in_organization_query'
import loggerService from '#services/logger_service'

/**
 * GET /api/users-in-organization → Get users in current organization
 */
export default class GetUsersInOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { auth, response, session } = ctx
    try {
      if (!auth.user) {
        response.status(401).json({ success: false, message: 'Chưa đăng nhập' })
        return
      }

      const userOrgId = auth.user.current_organization_id
      const sessionOrgId = session.get('current_organization_id') as string | undefined
      const organizationId = userOrgId ?? sessionOrgId

      if (!organizationId) {
        response.status(400).json({ success: false, message: 'Người dùng chưa chọn tổ chức' })
        return
      }

      const query = new GetUsersInOrganizationQuery(ctx)
      const formattedUsers = await query.execute(organizationId, auth.user.id)

      response.json({ success: true, users: formattedUsers })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi lấy danh sách người dùng trong tổ chức', err)
      response.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách người dùng trong tổ chức',
        error: err.message,
      })
      return
    }
  }
}
