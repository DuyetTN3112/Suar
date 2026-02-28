import type { HttpContext } from '@adonisjs/core/http'
import type GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/get_users_list_dto'
import { PaginationDTO } from '#actions/shared/index'

/**
 * GET /api/system-users → Get system users (not in current organization)
 * Permission: Superadmin only
 */
export default class SystemUsersApiController {
  async handle(ctx: HttpContext, getUsersListQuery: GetUsersListQuery) {
    const { request, response, auth } = ctx

    try {
      const user = auth.user
      if (!user) {
        response.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục' })
        return
      }

      const organizationId = user.current_organization_id ?? ''
      if (!organizationId) {
        response.status(400).json({ success: false, message: 'Không tìm thấy tổ chức hiện tại' })
        return
      }

      const isSuperAdmin = await CheckSuperAdminPermissionQuery.execute(user.id, organizationId)
      if (!isSuperAdmin) {
        response
          .status(403)
          .json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này' })
        return
      }

      const page = Number(request.input('page', 1))
      const limit = Number(request.input('limit', 10))

      const dto = new GetUsersListDTO(
        new PaginationDTO(page, limit),
        organizationId,
        new UserFiltersDTO(
          request.input('search', '') as string | undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true // exclude_organization_members
        )
      )

      const users = await getUsersListQuery.handle(dto)

      response.json({ success: true, users })
      return
    } catch (error: unknown) {
      response.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy danh sách người dùng',
        error: error instanceof Error ? error.message : String(error),
      })
      return
    }
  }
}
