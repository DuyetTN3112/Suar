import type { HttpContext } from '@adonisjs/core/http'


import { buildSystemUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapSystemUsersApiBody } from './mappers/response/user_response_mapper.js'

import { requireSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'

/**
 * GET /api/system-users → Get system users (not in current organization)
 * Permission: Superadmin only
 */
export default class SystemUsersApiController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(actionContextFromHttp(ctx))
    const { request, response } = ctx
    const accessContext = await requireSystemUserAdminAccess(ctx)

    const dto = buildSystemUsersListDTO(request, accessContext.organizationId)

    const users = await getUsersListQuery.handle(dto)

    response.json(mapSystemUsersApiBody(users))
  }
}
