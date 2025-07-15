import type { HttpContext } from '@adonisjs/core/http'

import { mapPendingApprovalUsersApiBody } from './mappers/response/user_response_mapper.js'

import GetPendingApprovalUsersQuery from '#actions/users/queries/get_pending_approval_users_query'
import { requireSystemUserAdminAccess } from '#controllers/authorization/require_system_user_admin_access'


/**
 * GET /api/users/pending-approval → JSON list of pending approval users
 */
export default class PendingApprovalUsersApiController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    const accessContext = await requireSystemUserAdminAccess(ctx)

    const query = new GetPendingApprovalUsersQuery()
    const formattedUsers = await query.getList(accessContext.organizationId)

    response.json(mapPendingApprovalUsersApiBody(formattedUsers))
  }
}
