import type { HttpContext } from '@adonisjs/core/http'

import { buildSystemUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapSystemUsersApiBody } from './mappers/response/user_response_mapper.js'

import CheckSuperAdminPermissionQuery from '#actions/users/queries/check_super_admin_permission_query'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'


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

    const dto = buildSystemUsersListDTO(request, organizationId)

    const users = await getUsersListQuery.handle(dto)

    response.json(mapSystemUsersApiBody(users))
  }
}
