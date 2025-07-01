import type { HttpContext } from '@adonisjs/core/http'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/request/get_users_list_dto'
import { PaginationDTO } from '#actions/shared/index'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import { ExecutionContext } from '#types/execution_context'
import { ErrorMessages } from '#constants/error_constants'
import { PAGINATION } from '#constants/common_constants'

const SYSTEM_USERS_DEFAULT_LIMIT = 10

/**
 * GET /api/system-users → Get system users (not in current organization)
 * Permission: Superadmin only
 */
export default class SystemUsersApiController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
    const { request, response, auth } = ctx

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

    const page = Number(request.input('page', PAGINATION.DEFAULT_PAGE))
    const limit = Number(request.input('limit', SYSTEM_USERS_DEFAULT_LIMIT))

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
  }
}
