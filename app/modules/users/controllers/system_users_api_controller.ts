import type { HttpContext } from '@adonisjs/core/http'

import { buildSystemUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapSystemUsersApiBody } from './mappers/response/user_response_mapper.js'

import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import { requireSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /api/system-users → Get system users (not in current organization)
 * Permission: Superadmin only
 */
export default class SystemUsersApiController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
    const { request, response } = ctx
    const accessContext = await requireSystemUserAdminAccess(ctx)

    const dto = buildSystemUsersListDTO(request, accessContext.organizationId)

    const users = await getUsersListQuery.handle(dto)

    response.json(mapSystemUsersApiBody(users))
  }
}
