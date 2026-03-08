import type { HttpContext } from '@adonisjs/core/http'
import GetUsersInOrganizationQuery from '#actions/organizations/queries/get_users_in_organization_query'
import loggerService from '#services/logger_service'
import { HttpStatus, ErrorMessages } from '#constants/error_constants'

/**
 * GET /api/users-in-organization → Get users in current organization
 */
export default class GetUsersInOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { auth, response, session } = ctx
    try {
      if (!auth.user) {
        response
          .status(HttpStatus.UNAUTHORIZED)
          .json({ success: false, message: ErrorMessages.NOT_AUTHENTICATED })
        return
      }

      const userOrgId = auth.user.current_organization_id
      const sessionOrgId = session.get('current_organization_id') as string | undefined
      const organizationId = userOrgId ?? sessionOrgId

      if (!organizationId) {
        response
          .status(HttpStatus.BAD_REQUEST)
          .json({ success: false, message: ErrorMessages.REQUIRE_ORGANIZATION })
        return
      }

      const query = new GetUsersInOrganizationQuery(ctx)
      const formattedUsers = await query.execute(organizationId, auth.user.id)

      response.json({ success: true, users: formattedUsers })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi lấy danh sách người dùng trong tổ chức', err)
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Lỗi khi lấy danh sách người dùng trong tổ chức',
        error: err.message,
      })
      return
    }
  }
}
