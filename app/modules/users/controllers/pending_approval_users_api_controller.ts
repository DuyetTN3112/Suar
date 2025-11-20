import type { HttpContext } from '@adonisjs/core/http'

import { mapPendingApprovalUsersApiBody } from './mappers/response/user_response_mapper.js'

import { requireSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import GetPendingApprovalUsersQuery from '#modules/users/actions/queries/get_pending_approval_users_query'

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
